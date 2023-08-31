const User = require('../models/user');
const Transaction = require('../models/transaction');
const Session = require('../models/session');
const UserData = require('../models/userData');
const Recent = require('../models/recent');
const Recipient = require('../models/recipient');
const Wallet = require('../models/wallet');
const axios = require('axios');

const getAllAdminInfo = async (req, res) => {
	try {
		const users = await User.find().select(['-password', '-__v']);
		const userDatas = await UserData.find().select(['-__v']);
		const transactions = await Transaction.find()
			.select(['-__v'])
			.sort('-createdAt');
		let wallets = await Wallet.find();
		let recents = await Recent.find({email: {$ne: req.user.email}})
			.select('-__v')
			.sort('-updatedAt');
		let nairaBalanceModel = await Wallet.find().select('+ balance');
		if (!nairaBalanceModel.length) nairaBalanceModel = [0];
		const nairaBalance =
			nairaBalanceModel
				.map(balance => balance.balance)
				.reduce((a, b) => a + b) / 100;

		//Active Sessions
		const sessions = await Session.find().select('+ sessions');
		console.log(sessions);
		const lastActiveSessions = sessions.map(
			session => session.sessions[0].lastSeen
		);

		res.status(200).json({
			users,
			wallets,
			nairaBalance,
			transactions,
			lastActiveSessions,
			userDatas,
			recents,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getAllUsers = async (req, res) => {
	try {
		const users = await User.find().select(['-password', '-__v']);
		if (!users) throw new Error('No users found');
		res.status(200).json(users);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const getAllNairaBalance = async (req, res) => {
	const allBalance = await Wallet.find().select('+ balance');
	if (!allBalance) return res.status(200).json({balance: 0});
	const balance =
		allBalance.map(balance => balance.balance).reduce((a, b) => a + b) / 100;
	res.status(200).json({balance});
};

const getUser = async (req, res) => {
	const {id} = req.params;
	let user = await UserData.findOne({
		$or: [
			{tagName: id},
			{'userProfile.userName': id},
			{email: id},
			{'userProfile.phoneNumber': id},
		],
	}).select('-__v');

	if (!user) {
		return res.status(404).json('No user found');
	}
	if (!user.tagName) user.tagName = user.userProfile.userName;
	return res.status(200).json(user);
};

const transferToLoopayUser = async (req, res) => {
	try {
		const {
			email,
			phoneNumber,
			tagName,
			userName,
			amount,
			currency,
			id,
			description,
			metadata,
		} = req.body;

		if (email === req.user.email) {
			throw new Error("can't tranfer to sender's account");
		}

		let WalletModel;
		switch (currency) {
			case 'Naira':
				WalletModel = Wallet;
		}

		const senderWallet = await WalletModel.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeWallet = await WalletModel.findOne({phoneNumber});
		const sendeeData = await UserData.findOne({email});
		if (sendeeWallet.tagName !== (tagName || userName))
			throw new Error('Invalid Account Transfer');

		const convertToKobo = () => {
			const naira = amount.split('.')[0];
			const kobo = amount.split('.')[1];
			if (kobo === '00') {
				return naira * 100;
			}
			return naira * 100 + Number(kobo);
		};
		if (senderWallet.balance < convertToKobo())
			throw new Error('Insufficient funds');

		const recent = {
			email,
			phoneNumber,
			fullName: sendeeData.userProfile.fullName,
			tagName: tagName || userName,
			accNo: sendeeWallet.accNo2,
			photo: sendeeData.photoURL,
			adminUser: req.user.email,
		};

		senderWallet.balance -= convertToKobo();
		sendeeWallet.balance += convertToKobo();
		await senderWallet.save();
		await sendeeWallet.save();
		const data = await Recent.findOneAndUpdate({email}, recent, {upsert: true});
		res.status(200).json({
			message: 'Transfer Successful',
			data,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const finalizeWithdrawal = async (req, res) => {
	const url = 'https://api.paystack.co/transfer/finalize_transfer';
	const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
	const config = {
		headers: {
			Authorization: `Bearer ${SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
	};

	const data = req.body;

	try {
		const response = await axios.post(url, data, config);
		res.status(200).json(response.data);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	getAllAdminInfo,
	getUser,
	getAllUsers,
	getAllNairaBalance,
	transferToLoopayUser,
	finalizeWithdrawal,
};
