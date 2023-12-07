const User = require('../models/user');
const Transaction = require('../models/transaction');
const AirtimeTransactionModel = require('../models/airtimeTransaction');
const SwapModel = require('../models/swapTransaction');
const BillTransactionModel = require('../models/billTransaction');
const Session = require('../models/session');
const UserData = require('../models/userData');
const Recent = require('../models/recent');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const axios = require('axios');
const Notification = require('../models/notification');
const VerificationModel = require('../models/verification');
const {sendMail} = require('../utils/sendEmail');
const cloudinary = require('cloudinary').v2;

const getAllAdminInfo = async (req, res) => {
	try {
		const users = await User.find().select(['-password', '-__v']);
		const userDatas = await UserData.find().select(['-__v']);
		let transactions = await Transaction.find()
			.select(['-__v'])
			.sort('-createdAt');
		const airtimeTransactionModel = await AirtimeTransactionModel.find()
			.select(['-__v'])
			.sort('-createdAt');
		const swapTransactions = await SwapModel.find()
			.select(['-__v'])
			.sort('-createdAt');
		const billTransactions = await BillTransactionModel.find()
			.select(['-__v'])
			.sort('-createdAt');
		transactions = transactions.concat(
			airtimeTransactionModel,
			swapTransactions,
			billTransactions
		);
		transactions.sort((a, b) => {
			const dateA = new Date(a.createdAt);
			const dateB = new Date(b.createdAt);
			return dateB - dateA;
		});

		let wallets = await LocalWallet.find();
		let recents = await Recent.find({email: {$ne: req.user.email}})
			.select('-__v')
			.sort('-updatedAt');
		let localBalanceModel = await LocalWallet.find().select('+ balance');
		let dollarBalanceModel = await DollarWallet.find().select('+ balance');
		let euroBalanceModel = await EuroWallet.find().select('+ balance');
		let poundBalanceModel = await PoundWallet.find().select('+ balance');

		if (!localBalanceModel.length) localBalanceModel = [0];
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

		const localBalance =
			localBalanceModel
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
			localBalance,
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
	const allBalance = await LocalWallet.find().select('+ balance');
	if (!allBalance) return res.status(200).json({balance: 0});
	const balance =
		allBalance.map(balance => balance.balance).reduce((a, b) => a + b) / 100;
	res.status(200).json({balance});
};

const getUser = async (req, res) => {
	let {id} = req.params;
	if (!id) throw new Error('Provide search params');
	id = id.toLowerCase();
	let user = await UserData.findOne({
		$or: [
			{tagName: id},
			{'userProfile.userName': id},
			{email: id},
			{'userProfile.phoneNumber': id},
		],
	}).select('-__v');
	if (!user) {
		const wallet = await LocalWallet.findOne({loopayAccNo: id});
		if (wallet) {
			user = await UserData.findOne({
				tagName: wallet.tagName,
			}).select('-__v');
		}
	}

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
			throw new Error("Can't transfer to sender's account");
		}

		const selectWallet = currency => {
			switch (currency) {
				case 'naira':
					return LocalWallet;
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const currencyWallet = selectWallet(currency);

		const senderWallet = await currencyWallet.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeWallet = await currencyWallet.findOne({phoneNumber});
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

		const data = await Recent.findOneAndUpdate({email}, recent, {upsert: true});
		senderWallet.balance -= convertToKobo();
		sendeeWallet.balance += convertToKobo();
		await senderWallet.save();
		await sendeeWallet.save();
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
			{status: 'declined'},
			{new: true, runValidators: true}
		);
		res.status(200).json({transaction});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getVerifications = async (req, res) => {
	try {
		const query = Object.keys(req.query)[0];
		const verifications = query
			? await VerificationModel.find({status: query})
			: await VerificationModel.find();
		res.status(200).json(verifications);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const updateVerification = async (req, res) => {
	try {
		const query = Object.keys(req.query)[0];
		const {email, subject, message, country, idType} = req.body;
		if (!email) throw new Error('Please provide user email');
		if (query === 'approve') {
			await VerificationModel.findOneAndUpdate(
				{email},
				{status: 'verified'},
				{new: true, runValidators: true}
			);
			await UserData.findOneAndUpdate(
				{email},
				{verificationStatus: 'verified', level: 2},
				{new: true, runValidators: true}
			);
			return res.status(200).json({status: 'success'});
		} else if (query === 'email') {
			if (!message) throw new Error('Please provide email message');
			const html = String.raw`<div
				style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
			>
				<div style="text-align: center">
					<img
						src="${process.env.CLOUDINARY_APP_ICON}"
						style="width: 200px; margin: 50px auto"
					/>
				</div>
				<p>${message}</p>
				<p>
					Best regards,<br />
					Loopay Support Team
				</p>
			</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: email,
				subject: subject || 'Account Verification',
				html,
			};
			await VerificationModel.findOneAndUpdate(
				{email},
				{status: 'declined'},
				{new: true, runValidators: true}
			);
			await UserData.findOneAndUpdate(
				{email},
				{verificationStatus: 'unVerified', level: 1},
				{new: true, runValidators: true}
			);
			sendMail(mailOptions, res, req.body);
		} else if (query === 'decline') {
			await VerificationModel.findOneAndUpdate(
				{email},
				{status: 'declined'},
				{new: true, runValidators: true}
			);
			await UserData.findOneAndUpdate(
				{email},
				{verificationStatus: 'unVerified', level: 1},
				{new: true, runValidators: true}
			);
			return res.status(200).json({status: 'success'});
		} else if (query === 'delete') {
			await VerificationModel.findOneAndRemove({
				email,
			});
			await UserData.findOneAndUpdate(
				{email},
				{verificationStatus: 'unVerified', level: 1},
				{new: true, runValidators: true}
			);
			cloudinary.api.delete_resources(
				[
					`loopay/verifications/${country}/${idType}/${email}/back`,
					`loopay/verifications/${country}/${idType}/${email}/front`,
				],
				{type: 'upload', resource_type: 'image'}
			);
			return res.status(200).json({status: 'success'});
		}
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const blockAccount = async (req, res) => {
	try {
		const {email, tagName, accNo, mailData} = req.body;
		const {mail} = req.query;
		let userData;
		let wallet;
		if (!email && tagName) {
			userData = await UserData.findOne({tagName});
		} else if (!email && accNo) {
			wallet = await LocalWallet.findOne({tagName});
		}
		if (mail) {
			const html = String.raw`<div
				style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
			>
				<div style="text-align: center">
					<img
						src="${process.env.CLOUDINARY_APP_ICON}"
						style="width: 200px; margin: 50px auto"
					/>
				</div>
				<p>${mailData.message}</p>
				<p>
					Best regards,<br />
					Loopay Support Team
				</p>
			</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: email,
				subject: mailData.subject || 'Account Deactivation',
				html,
			};
			sendMail(mailOptions);
		}
		const user = await User.findOneAndUpdate(
			{email: email || userData?.email || wallet.email},
			{status: 'blocked', blockedAt: new Date()},
			{new: true, runValidators: true}
		);
		res.status(200).json(user);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const suspendAccount = async (req, res) => {
	try {
		const {email, tagName, accNo, blockEnd, mailData} = req.body;
		const {mail} = req.query;
		if (!blockEnd) throw new Error('Please provide suspend end date');
		let userData;
		let wallet;
		if (!email && tagName) {
			userData = await UserData.findOne({tagName});
		} else if (!email && accNo) {
			wallet = await LocalWallet.findOne({tagName});
		}

		if (mail) {
			const html = String.raw`<div
				style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
			>
				<div style="text-align: center">
					<img
						src="${process.env.CLOUDINARY_APP_ICON}"
						style="width: 200px; margin: 50px auto"
					/>
				</div>
				<p>${mailData.message}</p>
				<p>
					Best regards,<br />
					Loopay Support Team
				</p>
			</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: email,
				subject: mailData.subject || 'Account Suspension',
				html,
			};
			sendMail(mailOptions);
		}
		const user = await User.findOneAndUpdate(
			{email: email || userData?.email || wallet.email},
			{status: 'blocked', blockedAt: new Date(), blockEnd},
			{new: true, runValidators: true}
		);
		res.status(200).json(user);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};
const unblockAccount = async (req, res) => {
	try {
		const {email, tagName, accNo, mailData} = req.body;
		const {mail} = req.query;
		let userData;
		let wallet;
		if (!email && tagName) {
			userData = await UserData.findOne({tagName});
		} else if (!email && accNo) {
			wallet = await LocalWallet.findOne({tagName});
		}

		console.log(req.body);
		if (mail) {
			const html = String.raw`<div
				style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
			>
				<div style="text-align: center">
					<img
						src="${process.env.CLOUDINARY_APP_ICON}"
						style="width: 200px; margin: 50px auto"
					/>
				</div>
				<p>${mailData.message}</p>
				<p>
					Best regards,<br />
					Loopay Support Team
				</p>
			</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: email,
				subject: mailData.subject || 'Account Activation',
				html,
			};
			sendMail(mailOptions);
		}
		const user = await User.findOneAndUpdate(
			{email: email || userData?.email || wallet.email},
			{status: 'active'},
			{new: true, runValidators: true}
		);
		user.blockedAt = undefined;
		user.blockEnd = undefined;
		await user.save();
		res.status(200).json(user);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const unsuspendAccount = async (req, res) => {
	try {
		const {email, tagName, accNo, mailData} = req.body;
		const {mail} = req.query;
		let userData;
		let wallet;
		if (!email && tagName) {
			userData = await UserData.findOne({tagName});
		} else if (!email && accNo) {
			wallet = await LocalWallet.findOne({tagName});
		}
		if (mail) {
			const html = String.raw`<div
				style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
			>
				<div style="text-align: center">
					<img
						src="${process.env.CLOUDINARY_APP_ICON}"
						style="width: 200px; margin: 50px auto"
					/>
				</div>
				<p>${mailData.message}</p>
				<p>
					Best regards,<br />
					Loopay Support Team
				</p>
			</div>`;

			const mailOptions = {
				from: process.env.EMAIL,
				to: email,
				subject: mailData.subject || 'Account Activation',
				html,
			};
			sendMail(mailOptions);
		}
		const user = await User.findOneAndUpdate(
			{email: email || userData?.email || wallet.email},
			{status: 'active'},
			{new: true, runValidators: true}
		);
		user.blockedAt = undefined;
		user.blockEnd = undefined;
		await user.save();
		res.status(200).json(user);
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
	getVerifications,
	updateVerification,
	blockAccount,
	suspendAccount,
	unblockAccount,
	unsuspendAccount,
};
