const User = require('../models/user');
const Transaction = require('../models/transaction');
const Session = require('../models/session');
const UserData = require('../models/userData');
const Recent = require('../models/recent');
const NairaWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const axios = require('axios');
const Notification = require('../models/notification');

const getAllAdminInfo = async (req, res) => {
	try {
		const users = await User.find().select(['-password', '-__v']);
		const userDatas = await UserData.find().select(['-__v']);
		const transactions = await Transaction.find()
			.select(['-__v'])
			.sort('-createdAt');
		let wallets = await NairaWallet.find();
		let recents = await Recent.find({email: {$ne: req.user.email}})
			.select('-__v')
			.sort('-updatedAt');
		let nairaBalanceModel = await NairaWallet.find().select('+ balance');
		let dollarBalanceModel = await DollarWallet.find().select('+ balance');
		let euroBalanceModel = await EuroWallet.find().select('+ balance');
		let poundBalanceModel = await PoundWallet.find().select('+ balance');

		if (!nairaBalanceModel.length) nairaBalanceModel = [0];
		if (!dollarBalanceModel.length) dollarBalanceModel = [0];
		if (!euroBalanceModel.length) euroBalanceModel = [0];
		if (!poundBalanceModel.length) poundBalanceModel = [0];

		const getPendingTransactionsAmount = currency => {
			const pendingTransactions = transactions
				.filter(
					transaction =>
						transaction.currency === currency &&
						transaction.status === 'pending'
				)
				.map(transaction => Number(transaction.amount));
			return pendingTransactions.length
				? pendingTransactions?.reduce((a, b) => a + b)
				: 0;
		};
		const getBlockedTransactionsAmount = currency => {
			const pendingTransactions = transactions
				.filter(
					transaction =>
						transaction.currency === currency &&
						transaction.status === 'blocked'
				)
				.map(transaction => Number(transaction.amount));
			return pendingTransactions.length
				? pendingTransactions?.reduce((a, b) => a + b)
				: 0;
		};

		const nairaBalance =
			nairaBalanceModel
				.map(balance => balance.balance)
				.reduce((a, b) => a + b) /
				100 +
			getPendingTransactionsAmount('naira') +
			getBlockedTransactionsAmount('naira');
		const dollarBalance =
			dollarBalanceModel
				.map(balance => balance.balance)
				.reduce((a, b) => a + b) /
				100 +
			getPendingTransactionsAmount('dollar') +
			getBlockedTransactionsAmount('dollar');

		const euroBalance =
			euroBalanceModel.map(balance => balance.balance).reduce((a, b) => a + b) /
				100 +
			getPendingTransactionsAmount('euro') +
			getBlockedTransactionsAmount('euro');

		const poundBalance =
			poundBalanceModel
				.map(balance => balance.balance)
				.reduce((a, b) => a + b) /
				100 +
			getPendingTransactionsAmount('pound') +
			getBlockedTransactionsAmount('pound');

		//Active Sessions
		const lastActiveSessions = await Session.find().select('-__v');

		const notifications = await Notification.find()
			.select('-__v')
			.sort('-createdAt');
		res.status(200).json({
			users,
			wallets,
			nairaBalance,
			dollarBalance,
			euroBalance,
			poundBalance,
			transactions,
			lastActiveSessions,
			userDatas,
			recents,
			notifications,
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
	const allBalance = await NairaWallet.find().select('+ balance');
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
		const {email, phoneNumber, tagName, userName, amount, currency} = req.body;

		if (email === req.user.email) {
			throw new Error("can't tranfer to sender's account");
		}

		let WalletModel;
		switch (currency) {
			case 'Naira':
				WalletModel = NairaWallet;
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
			accNo: sendeeWallet.loopayAccNo,
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
			data: data || recent,
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
	const {transfer_code, otp} = req.body;
	const data = {transfer_code, otp};
	try {
		console.log(data);
		const response = await axios.post(url, data, config);
		res.status(200).json(response.data);
		await Transaction.updateOne(
			{paystackReference: transfer_code},
			{status: 'success'}
		);
	} catch (err) {
		res.status(400).json(err.response.data.message);
	}
};

const blockTransaction = async (req, res) => {
	try {
		const {_id} = req.body;
		const transaction = await Transaction.findByIdAndUpdate(
			{_id},
			{status: 'blocked'}
		);
		res.status(200).json({transaction});
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
	blockTransaction,
};
