const {default: axios} = require('axios');
const {pagaHash} = require('../../middleware/pagaMiddleWare');
const {sendMail} = require('../../utils/sendEmail');
const {addingDecimal} = require('../../utils/addingDecimal');
const Transaction = require('../../models/transaction');
const Notification = require('../../models/notification');
const LocalWallet = require('../../models/wallet');
const DollarWallet = require('../../models/walletDollar');
const EuroWallet = require('../../models/walletEuro');
const PoundWallet = require('../../models/walletPound');
const airtimeBeneficiary = require('../../models/airtimeBeneficiary');
const pushNotification = require('../../models/pushNotification');
const {default: Expo} = require('expo-server-sdk');
const sendPushNotification = require('../../utils/pushNotification');
// const PAGA_API_URL =
// 	'https://beta.mypaga.com/paga-webservices/business-rest/secured';
// const credentials = 'xT3*wEXcDRy7Ry5';
// const principal = '3D3A120F-498C-4688-AD1C-E6151900D974';
// const hashKey =
// 	'4bd289fa4ba745e6a2acead0c61a63e86137c83ff6354548a7f2e2fc59970c9c45ddd98cce1c42de85788c0acb142efa29c856efff064d72aaaeeecba529dfd9';

const PagaGetOperators = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const url = `${PAGA_API_URL}/getMobileOperators`;
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
		let response = apiResponse.data.mobileOperator;
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

const PagaBuyAirtime = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const {email, phoneNumber} = req.user;
		const {currency, id, network, phoneNo, paymentCurrency} = req.body;
		let {amount} = req.body;
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
			nairaAmount = Math.floor(amount * rateCalculate);
			if (nairaAmount < 50) {
				const num = 50 / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return res
					.status(400)
					.json(`Minimum amount in ${paymentCurrency} is ${roundedNum}`);
			}
		}

		const connectWithAPI = async () => {
			const url = `${PAGA_API_URL}/airtimePurchase`;

			const body = {
				referenceNumber: req.body.referenceNumber,
				amount: nairaAmount,
				destinationPhoneNumber: phoneNo,
			};
			const config = {
				headers: {
					'Content-Type': 'application/json',
					principal,
					credentials,
					hash: pagaHash(body, hashKey),
				},
			};

			if (req.body.type === 'data') {
				body.isDataBundle = true;
				body.mobileOperatorServiceId = req.body.operatorId;
			}

			const response = await axios.post(url, body, config);

			return response.data;
		};
		const apiData = await connectWithAPI();

		amount = Math.ceil(amount);

		if (apiData.transactionId) {
			wallet.balance -= amount * 100;
			await wallet.save();
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'success',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'airtime',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: apiData.transactionId,
				currency,
				metadata: apiData,
			};
			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'airtime',
				header: 'Airtime Purchase Successful',
				message: `Your purchase of ${
					wallet.currencyDetails.symbol
				}${addingDecimal(
					amount
				)} airtime to ${phoneNo} has been processed successfully`,
				adminMessage: `${req.user.firstName} ${
					req.user.lastName
				} purchased ${network} airtime recharge of ${
					wallet.currencyDetails.symbol
				}${addingDecimal(amount)} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await Transaction.findOne({id});
			let savedTransaction = transactionExists;
			if (!transactionExists) {
				savedTransaction = await Transaction.create(transaction);
				await Notification.create(notification);
			}

			await airtimeBeneficiary.findOneAndUpdate(
				{email, phoneNo, network},
				{email, phoneNo, network},
				{upsert: true}
			);

			req.schedule && (await req.schedule(req));

			const expoPushToken = (await pushNotification.findOne({email}))?.token;
			if (expoPushToken) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Airtime Purchase Successful',
					message: `Your purchase of ${
						wallet.currencyDetails.symbol
					}${addingDecimal(
						amount
					)} airtime to ${phoneNo} has been processed successfully`,
					data: {notificationType: 'transaction', data: transaction},
				});
			}
			res.status(200).json({
				status: 'success',
				message: 'Airtime purchase successful',
				reference: apiData.transactionId,
				transaction: savedTransaction,
			});
		} else if (apiData.message.includes('insufficient balance')) {
			console.log('Paga Insufficient balance');
			sendMail(
				{
					from: {
						name: 'Loopay',
						address: process.env.SUPPORT_EMAIL,
					},
					to: process.env.ADMIN_EMAIL,
					subject: 'Insufficient balance',
					html: String.raw`<div
					style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
				>
					<div style="text-align: center">
						<img
							src="${process.env.CLOUDINARY_APP_ICON}"
							style="width: 200px; margin: 50px auto"
						/>
					</div>
					<p>
						A customer trying to buy ₦${addingDecimal(
							nairaAmount
						)} airtime recharge just experienced a <b>server error</b>  due to insufficient funds
						in your Paga airtime API account dashboard, recharge now so you
						customers can experience seamless experience while transacting.
						<a href="https://www.mypaga.com/paga-business/">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				'',
				() => res.status(400).json({message: 'Server error'})
			);
		} else {
			throw new Error(apiData.message);
		}
	} catch (err) {
		const error =
			err.response?.data?.errorMessage || err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

const PagaGetDataPlans = async (req, res) => {
	const {provider} = req.query;
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const getOperators = async () => {
			const url = `${PAGA_API_URL}/getMobileOperators`;
			const body = {referenceNumber: req.body.referenceNumber};
			const config = {
				headers: {
					'Content-Type': 'application/json',
					principal,
					credentials,
					hash: pagaHash(body, hashKey),
				},
			};

			const response = await axios.post(url, body, config);

			return response.data;
		};

		const connectWithAPI = async operatorCode => {
			const url = `${PAGA_API_URL}/getDataBundleByOperator`;

			const body = {
				referenceNumber: req.body.referenceNumber,
				operatorPublicId: operatorCode,
			};

			const config = {
				headers: {
					'Content-Type': 'application/json',
					principal,
					credentials,
					hash: pagaHash(body, hashKey),
				},
			};

			const response = await axios.post(url, body, config);

			return response.data;
		};

		const operatorCodeApiData = await getOperators();
		if (operatorCodeApiData.mobileOperator) {
			const operatorCode = operatorCodeApiData.mobileOperator.find(
				operator => operator.name.toLowerCase() === provider
			)?.mobileOperatorCode;
			if (operatorCode) {
				const apiData = await connectWithAPI(operatorCode);
				const data = apiData.mobileOperatorServices.map(api => {
					return {
						operatorId: api.serviceId,
						amount: api.servicePrice,
						value: api.serviceName,
					};
				});
				return res.status(200).json(data);
			}

			throw new Error('Server error');
		}
	} catch (err) {
		const error =
			err.response?.data?.errorMessage || err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

const PagaBuyData = async (req, res) => {
	try {
		const PAGA_API_URL = process.env.PAGA_API_URL;
		const principal = process.env.PAGA_PRINCIPAL;
		const credentials = process.env.PAGA_CREDENTIALS;
		const hashKey = process.env.PAGA_HASH_KEY;
		const {email, phoneNumber} = req.user;
		const {currency, id, network, phoneNo, paymentCurrency, plan} = req.body;
		let {amount} = req.body;
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
			nairaAmount = Math.floor(amount * rateCalculate);
			if (nairaAmount < 50) {
				const num = 50 / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return res
					.status(400)
					.json(`Minimum amount in ${paymentCurrency} is ${roundedNum}`);
			}
		}

		const connectWithAPI = async () => {
			const url = `${PAGA_API_URL}/airtimePurchase`;
			const body = {
				referenceNumber: req.body.referenceNumber,
				amount: nairaAmount,
				currency: 'NGN',
				destinationPhoneNumber: phoneNo,
				isDataBundle: true,
				mobileOperatorServiceId: req.body.operatorId,
			};
			const config = {
				headers: {
					'Content-Type': 'application/json',
					principal,
					credentials,
					hash: pagaHash(
						{
							referenceNumber: req.body.referenceNumber,
							amount: nairaAmount,
							destinationPhoneNumber: phoneNo,
						},
						hashKey
					),
				},
			};

			const response = await axios.post(url, body, config);

			return response.data;
		};
		const apiData = await connectWithAPI();
		amount = Math.ceil(amount);
		if (apiData.transactionId) {
			wallet.balance -= amount * 100;
			await wallet.save();
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'success',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'airtime',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: apiData.transactionId,
				currency,
				metadata: apiData,
			};
			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'airtime',
				header: 'Data Purchase Successful',
				message: `Your purchase of ${plan.value} to ${phoneNo} was successful`,
				adminMessage: `${req.user.firstName} ${req.user.lastName} purchased ${network} data plan of ${plan.value} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await Transaction.findOne({id});
			let savedTransaction = transactionExists;
			if (!transactionExists) {
				savedTransaction = await Transaction.create(transaction);
				await Notification.create(notification);
			}

			await airtimeBeneficiary.findOneAndUpdate(
				{email, phoneNo, network},
				{email, phoneNo, network},
				{upsert: true}
			);

			req.schedule && (await req.schedule(req));
			const expoPushToken = (await pushNotification.findOne({email}))?.token;
			if (expoPushToken) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Data Purchase Successful',
					message: `Your purchase of ${plan.value} to ${phoneNo} was successful`,
					data: {notificationType: 'transaction', data: transaction},
				});
			}
			res.status(200).json({
				status: 'success',
				message: 'Airtime purchase successful',
				reference: apiData.transactionId,
				transaction: savedTransaction,
			});
		} else if (apiData.message.includes('insufficient balance')) {
			console.log('Paga Insufficient balance');
			sendMail(
				{
					from: {
						name: 'Loopay',
						address: process.env.SUPPORT_EMAIL,
					},
					to: process.env.ADMIN_EMAIL,
					subject: 'Insufficient balance',
					html: String.raw`<div
					style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
				>
					<div style="text-align: center">
						<img
							src="${process.env.CLOUDINARY_APP_ICON}"
							style="width: 200px; margin: 50px auto"
						/>
					</div>
					<p>
						A customer trying to buy ₦${addingDecimal(
							nairaAmount
						)} data recharge just experienced a <b>server error</b>  due to insufficient funds
						in your Paga data API account dashboard, recharge now so you
						customers can experience seamless experience while transacting.
						<a href="https://www.mypaga.com/paga-business/">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				'',
				() => res.status(400).json({message: 'Server error'})
			);
		} else {
			throw new Error(apiData.message);
		}
	} catch (err) {
		const error =
			err.response?.data?.errorMessage || err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

module.exports = {
	PagaGetOperators,
	PagaBuyAirtime,
	PagaGetDataPlans,
	PagaBuyData,
};
