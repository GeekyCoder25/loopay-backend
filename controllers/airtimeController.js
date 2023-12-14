const LocalWallet = require('../models/wallet');
const Notification = require('../models/notification');
const {addingDecimal} = require('../utils/addingDecimal');
const AirtimeTransaction = require('../models/transaction');
const {default: axios} = require('axios');

const getOperators = async (req, res) => {
	try {
		const {country} = req.query;
		const url = `${process.env.RELOADLY_URL}/operators/countries/${country}`;
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
		const url = `${process.env.RELOADLY_URL}/operators/auto-detect/phone/${phone}/countries/${country}?&suggestedAmounts=true`;
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
					? 'Server Error'
					: error.message || error.error
			);
	}
};
const buyAirtime = async (req, res) => {
	try {
		const {currency, id, amount, network, phoneNo, operatorId, countryCode} =
			req.body;
		const connectWithAPI = async () => {
			const token = req.airtimeAPIToken;

			const url = `${process.env.RELOADLY_URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount,
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
		const {email, phoneNumber} = req.user;
		const wallet = await LocalWallet.findOne({phoneNumber});
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
				transactionType: 'airtime',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: apiData.transactionId,
				currency,
				metadata: apiData,
			};
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
			throw new Error('Server Error');
		} else {
			console.log(apiData);
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
		const url = `${process.env.RELOADLY_URL}/operators/countries/${country}?&includeData=true`;
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
		console.log(error);
		res.status(400).json({message: error});
	}
};

const buyData = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {
			amount,
			currency,
			id,
			network,
			metadata,
			phoneNo,
			plan,
			operatorId,
			countryCode,
		} = req.body;

		const connectWithAPI = async () => {
			const token = req.airtimeAPIToken;

			const url = `${process.env.RELOADLY_URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount,
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

		const wallet = await LocalWallet.findOne({phoneNumber});
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
		} else {
			throw new Error('Server error');
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
