const axios = require('axios');
const LocalWallet = require('../models/wallet');
const Notification = require('../models/notification');
const BillTransaction = require('../models/billTransaction');
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
			process.env.RELOADLY_BILL_URL
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
		} = req.body;
		const wallet = await LocalWallet.findOne({phoneNumber});
		if (wallet.balance < amount * 100) {
			return res.status(400).json('Insufficient balance');
		}

		const url = `${process.env.RELOADLY_BILL_URL}/pay`;
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
			amount,
			amountId: amountId || null,
			billerId: provider.id,
			useLocalAmount: true,
			referenceId,
			additionalInfo: metadata,
		});
		const response = await axios.post(url, body, config);
		if (response.data.status === 'PROCESSING') {
			wallet.balance -= amount * 100;
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
				metadata: response.data,
			};
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

			const transactionExists = await BillTransaction.findOne({id});
			if (!transactionExists) {
				await BillTransaction.create(transaction);
				await Notification.create(notification);
			}
			return res.status(200).json(response.data);
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
		const url = `${process.env.RELOADLY_BILL_URL}/transactions/${
			referenceID || ''
		}`;
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
