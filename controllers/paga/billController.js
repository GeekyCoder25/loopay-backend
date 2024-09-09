const {default: axios} = require('axios');
const {pagaHash} = require('../../middleware/pagaMiddleWare');
const LocalWallet = require('../../models/wallet');
const DollarWallet = require('../../models/walletDollar');
const EuroWallet = require('../../models/walletEuro');
const PoundWallet = require('../../models/walletPound');
const BillTransaction = require('../../models/transaction');
const Notification = require('../../models/notification');
const FeesModal = require('../../models/fees');
const pushNotification = require('../../models/pushNotification');
const sendPushNotification = require('../../utils/pushNotification');
const {default: Expo} = require('expo-server-sdk');
const uuid = require('uuid').v4;
//? TEST

// const PAGA_API_URL =
// 	'https://beta.mypaga.com/paga-webservices/business-rest/secured';
// const principal = '3D3A120F-498C-4688-AD1C-E6151900D974';
// const credentials = 'uE2#e8BnMx+G@g3';
// const hashKey =
// 	'4bd289fa4ba745e6a2acead0c61a63e86137c83ff6354548a7f2e2fc59970c9c45ddd98cce1c42de85788c0acb142efa29c856efff064d72aaaeeecba529dfd9';

const PagaGetBills = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const url = `${PAGA_API_URL}/getMerchants`;
		const body = req.body;
		const config = {
			headers: {
				'Content-Type': 'application/json',
				principal,
				credentials,
				hash: pagaHash(body, hashKey),
			},
		};

		const {type, country: countryCode} = req.query;

		const apiResponse = await axios.post(url, body, config);

		let response = [];
		const billType = () => {
			switch (type) {
				case 'electricity':
					return (response = apiResponse.data.merchants.filter(merchant =>
						merchant.name.toLowerCase().includes('elec')
					));
				case 'tv':
					return (response = apiResponse.data.merchants.filter(merchant =>
						merchant.name.toLowerCase().includes('tv')
					));
				case 'school':
					return (response = apiResponse.data.merchants.filter(merchant =>
						merchant.name.toLowerCase().includes('school')
					));
				case 'water':
					return (response = apiResponse.data.merchants.filter(merchant =>
						merchant.name.toLowerCase().includes('water')
					));
				default:
					return (response = apiResponse.data.merchants);
			}
		};

		countryCode === 'NG' && billType();
		if (response.length) {
			response?.forEach(service => (service.billerId = service.uuid));
		}
		return res.status(200).json(response);
	} catch (error) {
		console.log(
			error.response?.data?.message ||
				error.response?.data?.error ||
				error.response?.data?.errorMessage ||
				error.message
		);
		return res.status(400).json('Server error');
	}
};

const PagaGetMerchantsServices = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const url = `${PAGA_API_URL}/getMerchantServices`;
		const body = {
			referenceNumber: req.body.referenceNumber,
			merchantPublicId: req.body.billerId,
		};
		const config = {
			headers: {
				'Content-Type': 'application/json',
				principal,
				credentials,
				hash: pagaHash(body, hashKey),
			},
		};
		const apiResponse = await axios.post(url, body, config);
		apiResponse.data?.services?.forEach(
			service => (service.meterType = service.code)
		);
		return res.status(200).json(apiResponse.data?.services);
	} catch (error) {
		console.log(
			error.response?.data?.message ||
				error.response?.data?.error ||
				error.response?.data?.errorMessage ||
				error.message
		);
		return res.status(400).json('Server error');
	}
};

const PagaValidateCustomer = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const url = `${PAGA_API_URL}/getMerchantAccountDetails`;
		const body = {
			referenceNumber: req.body.referenceNumber,
			merchantAccount: req.body.billerId,
			merchantReferenceNumber: req.body.meterNo,
			merchantServiceProductCode: req.body.meterType,
		};
		const config = {
			headers: {
				'Content-Type': 'application/json',
				principal,
				credentials,
				hash: pagaHash(body, hashKey),
			},
		};

		const apiResponse = await axios.post(url, body, config);
		if (!apiResponse.data.customerName) {
			console.log(apiResponse.data);
			return res.status(400).json("Can't find customer details");
		}

		return res.status(200).json(apiResponse.data);
	} catch (error) {
		console.log(
			error.response?.data?.message ||
				error.response?.data?.error ||
				error.response?.data?.errorMessage ||
				error.message
		);
		return res.status(400).json('Server error');
	}
};

const PagaPayBill = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const query = Object.keys(req.query)[0];
		const {email, phoneNumber} = req.user;
		const {amount, provider, referenceId, paymentCurrency} = req.body;

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
		let fee = feeDoc?.amount || 100;

		if (paymentCurrency !== 'NGN') {
			fee = fee * rate;
		}
		if (wallet.balance < (Number(amount) + fee) * 100) {
			return res.status(400).json('Insufficient balance');
		}

		const url = `${PAGA_API_URL}/merchantPayment`;
		const body = {
			referenceNumber: req.body.referenceNumber,
			amount: nairaAmount,
			merchantAccount: req.body.billerId,
			merchantReferenceNumber: req.body.meterNo,
		};

		const config = {
			headers: {
				'Content-Type': 'application/json',
				principal,
				credentials,
				hash: pagaHash(body, hashKey),
			},
		};

		const apiBody = {
			referenceNumber: req.body.referenceNumber,
			amount: nairaAmount,
			currency: 'NGN',
			merchantAccount: req.body.billerId,
			merchantReferenceNumber: req.body.meterNo,
			merchantService: [req.body.meterType],
		};

		const response = await axios.post(url, apiBody, config);
		if (response.data.integrationStatus !== 'SUCCESSFUL') {
			throw new Error(
				response.data.message.includes('Paga insufficient balance')
					? 'Server error'
					: response.data.message
			);
		}
		const token = response.data.additionalProperties?.token?.split(': ')[1];
		wallet.balance -= (Number(amount) + fee) * 100;
		await wallet.save();
		const id = referenceId;
		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'success',
			debitAccount: wallet.loopayAccNo,
			transactionType: 'bill',
			billType: query,
			billName: provider.name,
			token,
			amount,
			reference: id,
			currency: wallet.currency,
			fromBalance: wallet.balance + (Number(amount) + fee) * 100,
			toBalance: wallet.balance,
			metadata: response.data,
		};
		if (rate) {
			transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
		}
		const subscriberAccountNumber = req.body.meterNo;
		const notification = {
			email,
			id,
			phoneNumber,
			type: 'bill',
			header: `${
				query[0].toUpperCase() + query.slice(1, query.length)
			} Purchase Successful`,
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
			header: `${
				query[0].toUpperCase() + query.slice(1, query.length)
			} purchase fee charge`,
			message: `Your have been charged ${
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

		response.data.token = token;
		req.schedule && (await req.schedule(req));

		const expoPushToken = (await pushNotification.findOne({email}))?.token;
		if (expoPushToken) {
			await sendPushNotification({
				token: expoPushToken,
				title: `${
					query[0].toUpperCase() + query.slice(1, query.length)
				} Purchase Successful`,
				message: `Your purchase of ${provider.name} to ${subscriberAccountNumber} was successful`,
				data: {notificationType: 'transaction', data: transaction},
			});
		}
		return res
			.status(200)
			.json({...response.data, transaction: savedTransaction});
	} catch (error) {
		const err =
			error.response?.data?.message ||
			error.response?.data?.error ||
			error.response?.data?.errorMessage ||
			error.message;
		console.log(err);
		return res.status(400).json(err);
	}
};

module.exports = {
	PagaGetBills,
	PagaGetMerchantsServices,
	PagaValidateCustomer,
	PagaPayBill,
};
