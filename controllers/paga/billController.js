const {default: axios} = require('axios');
const {pagaHash} = require('../../middleware/pagaMiddleWare');
const LocalWallet = require('../../models/wallet');
const DollarWallet = require('../../models/walletDollar');
const EuroWallet = require('../../models/walletEuro');
const PoundWallet = require('../../models/walletPound');
const BillTransaction = require('../../models/transaction');
const Notification = require('../../models/notification');

//! LIVE
const PAGA_API_URL =
	'https://mypaga.com/paga-webservices/business-rest/secured';
const principal = '16F6C921-FC62-4C91-B2B4-BE742138B831';
const credentials = 'zF2@u5U*Sx6dcGM';
const hashKey =
	'514ac2afcc6b4317a592e5d0a3786ada2c75778b9b9f48dc8a28ecfa764d6440291533a2ecfa4ab589d285f07216a497d49c89cfb7604641b687f2a55aee3f83';

//? TEST
// const PAGA_API_URL =
// 	'https://beta.mypaga.com/paga-webservices/business-rest/secured';
// const principal = '3D3A120F-498C-4688-AD1C-E6151900D974';
// const credentials = 'uE2#e8BnMx+G@g3';
// const hashKey =
// 	'4bd289fa4ba745e6a2acead0c61a63e86137c83ff6354548a7f2e2fc59970c9c45ddd98cce1c42de85788c0acb142efa29c856efff064d72aaaeeecba529dfd9';

const PagaGetBills = async (req, res) => {
	try {
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
		const url = `${PAGA_API_URL}/merchantPayment`;
		const body = {
			referenceNumber: req.body.referenceNumber,
			amount: Number(req.body.amount),
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

		const query = Object.keys(req.query)[0];
		const {email, phoneNumber} = req.user;
		const {
			amount,
			provider,
			referenceId,
			subscriberAccountNumber,
			paymentCurrency,
		} = req.body;

		let nairaAmount = amount;
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

		if (wallet.balance < amount * 100) {
			return res.status(400).json('Insufficient balance');
		}
		if (paymentCurrency && paymentCurrency !== 'NGN') {
			const getRate = async () => {
				const apiData = await axios.get(
					`https://open.er-api.com/v6/latest/NGN`
				);
				const rates = apiData.data.rates;
				const rate =
					rates[paymentCurrency] >= 1
						? rates[paymentCurrency]
						: 1 / rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			nairaAmount = Math.floor(amount * rate);
			if (nairaAmount < provider.minLocalTransactionAmount) {
				const num = provider.minLocalTransactionAmount / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return res
					.status(400)
					.json(`Minimum amount in ${paymentCurrency} is ${roundedNum}`);
			} else if (nairaAmount > provider.maxLocalTransactionAmount) {
				const num = provider.maxLocalTransactionAmount / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return res
					.status(400)
					.json(`Maximum amount in ${paymentCurrency} is ${roundedNum}`);
			}
		}

		const apiBody = {
			referenceNumber: req.body.referenceNumber,
			amount: Number(req.body.amount),
			currency: 'NGN',
			merchantAccount: req.body.billerId,
			merchantReferenceNumber: req.body.meterNo,
			merchantService: [req.body.meterType],
		};

		const response = await axios.post(url, apiBody, config);
		if (response.data.integrationStatus !== 'SUCCESSFUL') {
			throw new Error(response.data.message);
		}
		const token = response.data.additionalProperties?.token?.split(': ')[1];
		wallet.balance -= amount * 100;
		await wallet.save();
		const id = referenceId;
		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'successful',
			debitAccount: wallet.loopayAccNo,
			transactionType: 'bill',
			billType: query,
			billName: provider.name,
			token,
			amount,
			reference: id,
			currency: wallet.currency,
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

		const transactionExists = await BillTransaction.findOne({id});
		let savedTransaction = transactionExists;
		if (!transactionExists) {
			savedTransaction = await BillTransaction.create(transaction);
			await Notification.create(notification);
		}

		response.data.token = token;

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
