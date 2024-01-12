const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const Notification = require('../models/notification');
const {addingDecimal} = require('../utils/addingDecimal');
const AirtimeTransaction = require('../models/transaction');
const {default: axios} = require('axios');
const {sendMail} = require('../utils/sendEmail');

const getOperators = async (req, res) => {
	try {
		const {country} = req.query;
		const url = `${req.apiConfig.URL}/operators/countries/${country}`;
		const token = req.airtimeAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		res.status(200).json(response.data);
	} catch (err) {
		const error = err.response?.data.message || err.message;
		console.log(error);
		res.status(400).json(error);
	}
};

const getNetwork = async (req, res) => {
	try {
		const {phone, country} = req.query;
		const url = `${req.apiConfig.URL}/operators/auto-detect/phone/${phone}/countries/${country}?&suggestedAmounts=true`;
		const token = req.airtimeAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		res.status(200).json(response.data);
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
		res
			.status(400)
			.json(
				typeof error === 'string' && error.startsWith('getaddrinfo')
					? 'Server error'
					: error.message || error.error || 'Server error'
			);
	}
};
const buyAirtime = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {
			currency,
			id,
			amount,
			network,
			phoneNo,
			operatorId,
			countryCode,
			paymentCurrency,
		} = req.body;

		const connectWithAPI = async () => {
			const token = req.airtimeAPIToken;
			const url = `${req.apiConfig.URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount: nairaAmount,
				useLocalAmount: true,
				customIdentifier: `${phoneNo}, ${currency}${amount}, ${Date.now()}`,
				recipientPhone: {countryCode, number: phoneNo},
			});
			const headers = {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			};
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
			});
			return response.json();
		};
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

		const apiData = await connectWithAPI();
		if (apiData.status === 'SUCCESSFUL') {
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
				header: 'Airtime Purchase',
				message: `You purchased NGN${addingDecimal(
					Number(amount).toLocaleString()
				)} airtime to ${phoneNo}`,
				adminMessage: `${req.user.firstName} ${
					req.user.lastName
				} purchased ${network} airtime recharge of NGN${addingDecimal(
					Number(amount).toLocaleString()
				)} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await AirtimeTransaction.findOne({id});
			let savedTransaction = transactionExists;
			if (!transactionExists) {
				savedTransaction = await AirtimeTransaction.create(transaction);
				await Notification.create(notification);
			}
			res.status(200).json({
				status: 'success',
				message: 'Airtime purchase successful',
				reference: apiData.transactionId,
				transaction: savedTransaction,
			});
		} else if (apiData.errorCode === 'INSUFFICIENT_BALANCE') {
			console.log('Insufficient balance');
			sendMail(
				{
					from: process.env.ADMIN_EMAIL,
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
						A customer trying to buy ₦${Number(
							nairaAmount
						).toLocaleString()} airtime recharge just experienced a <b>server error</b>  due to insufficient funds
						in your airtime and data API account dashboard, recharge now so you
						customers can experience seamless experience while transacting.
						<a href="">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				'',
				res.status(400).json({message: 'Server error'})
			);
		} else {
			throw new Error(apiData.message);
		}
	} catch (err) {
		console.log(err);
		const error = err.response?.data || err.message;
		res.status(400).json({message: error});
	}
};

const getDataPlans = async (req, res) => {
	try {
		const {provider, country} = req.query;
		const url = `${req.apiConfig.URL}/operators/countries/${country}?&includeData=true`;
		const token = req.airtimeAPIToken;
		const config = {
			headers: {
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			},
		};
		const response = await axios.get(url, config);
		let data = response.data
			.filter(
				index =>
					(index.name.toLowerCase().startsWith(provider) ||
						index.name.toLowerCase().endsWith(provider)) &&
					Object.entries(index.fixedAmountsDescriptions).length
			)
			.map(index => {
				return Object.entries({
					...index.fixedAmountsDescriptions,
					...index.localFixedAmountsDescriptions,
				}).map(plan => {
					const [key, value] = plan;
					return {
						operatorId: index.operatorId,
						amount: key,
						value,
					};
				});
			});

		res.status(200).json([].concat(...data));
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log();
		res.status(400).json({message: error});
	}
};

const buyData = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {
			currency,
			id,
			network,
			metadata,
			phoneNo,
			plan,
			operatorId,
			countryCode,
			paymentCurrency,
		} = req.body;

		const connectWithAPI = async () => {
			const token = req.airtimeAPIToken;
			const url = `${req.apiConfig.URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount: nairaAmount,
				useLocalAmount: true,
				customIdentifier: `${phoneNo}, ${currency}${amount}, ${
					plan.value
				}, ${Date.now()}`,
				recipientPhone: {countryCode, number: phoneNo},
			});
			const headers = {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			};
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
			});
			return response.json();
		};

		let {amount} = req.body;
		const nairaAmount = amount;
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
				const rate =
					rates[paymentCurrency] >= 1
						? rates[paymentCurrency]
						: 1 / rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			amount = amount / rateCalculate;

			if (wallet.balance < amount * 100) {
				return res.status(400).json(`Insufficient ${paymentCurrency} balance`);
			}
		}
		if (wallet.balance < amount * 100) {
			return res.status(400).json('Insufficient balance');
		}
		const apiData = await connectWithAPI();
		if (apiData.status === 'SUCCESSFUL') {
			wallet.balance -= amount * 100;
			await wallet.save();
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'success',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'data',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: id,
				currency,
				dataPlan: plan,
				metadata: metadata || null,
			};
			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'data',
				header: 'Data Purchase',
				message: `Your purchase of ${plan.value} to ${phoneNo} was successful`,
				adminMessage: `${req.user.firstName} ${req.user.lastName} purchased ${network} data plan of ${plan.value} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await AirtimeTransaction.findOne({id});
			let savedTransaction = transactionExists;
			if (!transactionExists) {
				savedTransaction = await AirtimeTransaction.create(transaction);
				await Notification.create(notification);
			}
			res.status(200).json({
				status: 'success',
				message: 'Data purchase successful',
				transaction: savedTransaction,
			});
		} else if (apiData.errorCode === 'INSUFFICIENT_BALANCE') {
			console.log('Insufficient balance');
			sendMail(
				{
					from: process.env.ADMIN_EMAIL,
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
						A customer trying to buy ₦${Number(
							nairaAmount
						).toLocaleString()} data recharge just
						experienced a <b>server error</b> due to insufficient funds in your airtime and data API account
						dashboard, recharge now so you customers can experience seamless
						experience while transacting.
						<a href="">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				'',
				res.status(400).json({message: 'Server error'})
			);
		} else {
			console.log(apiData);
			throw new Error(apiData.message);
		}
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

module.exports = {
	getOperators,
	getNetwork,
	buyAirtime,
	getDataPlans,
	buyData,
};
