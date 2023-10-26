const NairaWallet = require('../models/wallet');
const Notification = require('../models/notification');
const {addingDecimal} = require('../utils/addingDecimal');
const AirtimeTransaction = require('../models/airtimeTransaction');

const buyAirtime = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {currency, id, amount, network, metadata, phoneNo} = req.body;
		const wallet = await NairaWallet.findOne({phoneNumber});
		wallet.balance -= amount * 100;
		await wallet.save();
		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'success',
			transactionType: 'airtime',
			networkProvider: network,
			phoneNo,
			amount,
			// reference: response.data.data.reference,w3 r4
			reference: id,
			currency,
			metadata: metadata || null,
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
		if (!transactionExists) {
			await AirtimeTransaction.create(transaction);
			await Notification.create(notification);
		}
		res
			.status(200)
			.json({status: 'success', message: 'Airtime purchase successful'});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const buyData = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {currency, id, network, metadata, phoneNo, plan} = req.body;
		const wallet = await NairaWallet.findOne({phoneNumber});
		const amount = 200;
		wallet.balance -= amount * 100;
		await wallet.save();
		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'success',
			transactionType: 'data',
			networkProvider: network,
			phoneNo,
			amount,
			// reference: response.data.data.reference,w3 r4
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
			message: `Your purchase of ${plan}-NGN${addingDecimal(
				Number(amount).toLocaleString()
			)} to ${phoneNo} was successful`,
			adminMessage: `${req.user.firstName} ${
				req.user.lastName
			} purchased ${network} data plan of ${plan}-NGN${addingDecimal(
				Number(amount).toLocaleString()
			)} to ${phoneNo}`,
			status: 'unread',
			photo: network,
			metadata: {...transaction, network},
		};

		const transactionExists = await AirtimeTransaction.findOne({id});
		if (!transactionExists) {
			await AirtimeTransaction.create(transaction);
			await Notification.create(notification);
		}
		res
			.status(200)
			.json({status: 'success', message: 'Airtime purchase successful'});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	buyAirtime,
	buyData,
};
