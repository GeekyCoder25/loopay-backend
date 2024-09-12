const axios = require('axios');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const Notification = require('../models/notification');
const BillTransaction = require('../models/transaction');
const FeesModal = require('../models/fees');
const uuid = require('uuid').v4;

const getBills = async (req, res) => {
	try {
		const {type, country: countryCode} = req.query;
		const billType = () => {
			switch (type) {
				case 'electricity':
					return 'ELECTRICITY_BILL_PAYMENT';
				case 'tv':
					return 'TV_BILL_PAYMENT';
				case 'internet':
					return 'INTERNET_BILL_PAYMENT';
				case 'water':
					return 'WATER_BILL_PAYMENT';
				default:
					break;
			}
		};
		const url = `${
			req.apiConfig.URL
		}/billers?countryISOCode=${countryCode}&size=50&type=${billType()}`;
		const token = req.billAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.utilities-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		return res.status(200).json(response.data.content);
	} catch (err) {
		console.log(err.response?.data?.message || err.message);
		res.status(400).json('Server Error');
	}
};
const payABill = async (req, res) => {
	try {
		const query = Object.keys(req.query)[0];
		const {email, phoneNumber} = req.user;
		const {
			amount,
			amountId,
			provider,
			metadata,
			referenceId,
			subscriberAccountNumber,
			paymentCurrency,
		} = req.body;

		let nairaAmount = Number(amount);
		let rate;

		const selectWallet = currency => {
			switch (currency) {
				case 'USD':
					return DollarWallet;
				case 'EUR':
					return EuroWallet;
				case 'GBP':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const wallet = await selectWallet(paymentCurrency).findOne({phoneNumber});

		if (paymentCurrency && paymentCurrency !== 'NGN') {
			const getRate = async () => {
				const apiData = await axios.get(
					`https://open.er-api.com/v6/latest/NGN`
				);
				const rates = apiData.data.rates;
				const rate = rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			nairaAmount = amount * rate;
		}
		if (nairaAmount < provider.minLocalTransactionAmount) {
			const num = provider.minLocalTransactionAmount / rate;
			const precision = 2;
			const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
			return res
				.status(400)
				.json(`Minimum amount in ${paymentCurrency} is ${roundedNum}`);
		} else if (nairaAmount > provider.maxLocalTransactionAmount) {
			const num = provider.maxLocalTransactionAmount / rate;
			const precision = 2;
			const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
			return res
				.status(400)
				.json(`Maximum amount in ${paymentCurrency} is ${roundedNum}`);
		}

		const feeDoc = await FeesModal.findOne({feeName: 'bill'});
		let fee = feeDoc.amount || 100;

		if (paymentCurrency !== 'NGN') {
			fee = fee * rate;
		}
		if (wallet.balance < (Number(amount) + fee) * 100) {
			return res.status(400).json('Insufficient balance');
		}

		const url = `${req.apiConfig.URL}/pay`;
		const token = req.billAPIToken;
		const config = {
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.utilities-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};

		const body = JSON.stringify({
			subscriberAccountNumber,
			amount: nairaAmount,
			amountId: amountId || null,
			billerId: provider.id,
			useLocalAmount: true,
			referenceId,
			additionalInfo: metadata,
		});
		const response = await axios.post(url, body, config);

		if (response.data.status === 'PROCESSING') {
			wallet.balance -= (Number(amount) + fee) * 100;
			await wallet.save();
			const id = referenceId;
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'pending',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'bill',
				billType: query,
				billName: provider.name,
				amount,
				reference: id,
				currency: wallet.currency,
				fromBalance: wallet.balance,
				toBalance: wallet.balance - (Number(amount) + fee) * 100,
				metadata: response.data,
			};

			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'bill',
				header: `${query} purchase`,
				message: `Your purchase of ${provider.name} to ${subscriberAccountNumber} was successful`,
				adminMessage: `${req.user.firstName} ${req.user.lastName} purchased ${provider.name} to ${subscriberAccountNumber}`,
				status: 'unread',
				metadata: {...transaction, apiResponse: response.data},
			};
			const feeNotification = {
				email,
				id: uuid(),
				transactionId: referenceId,
				phoneNumber,
				type: 'fee',
				header: `${query} purchase fee charge`,
				message: `Your account has been charged ${
					wallet.currencyDetails.symbol + fee.toLocaleString()
				} for the purchase fee of ${provider.name}`,
				adminMessage: `${req.user.firstName} ${
					req.user.lastName
				} have been charged ${
					wallet.currencyDetails.symbol + fee.toLocaleString()
				} for the purchase fee of purchased ${
					provider.name
				} to ${'subscriberAccountNumber'}`,
				status: 'unread',
				metadata: {...transaction, apiResponse: response.data},
			};
			const transactionExists = await BillTransaction.findOne({id});
			let savedTransaction = transactionExists;
			if (!transactionExists) {
				savedTransaction = await BillTransaction.create(transaction);
				await Notification.create(notification);
				await Notification.create(feeNotification);
			}
			return res
				.status(200)
				.json({...response.data, transaction: savedTransaction});
		}
		throw new Error('Server error');
	} catch (err) {
		const error = err.response?.data?.message || err.message;
		console.log(error);
		res.status(400).json(error);
	}
};

const getBillsTransactions = async (req, res) => {
	try {
		const {id: referenceID} = req.params;
		const url = `${req.apiConfig.URL}/transactions/${referenceID || ''}`;
		const token = req.billAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.utilities-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		return res.status(200).json(response.data.content);
	} catch (err) {
		console.log(err.response?.data?.message || err.message);
		res.status(400).json('Server Error');
	}
};

module.exports = {getBills, payABill, getBillsTransactions};
