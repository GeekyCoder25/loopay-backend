/* eslint-disable no-mixed-spaces-and-tabs */
const User = require('../models/user');
const Transaction = require('../models/transaction');
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
const Wallet = require('../models/wallet');
const PaymentProof = require('../models/paymentproof');
const {addingDecimal} = require('../utils/addingDecimal');
const ReportModel = require('../models/report');
const PopUp = require('../models/popUp');
const international = require('../models/international');
const cloudinary = require('cloudinary').v2;

const getAllAdminInfo = async (req, res) => {
	try {
		const totalTransactionsCount = await Transaction.countDocuments();

		let localBalanceModel = await LocalWallet.find().select('+ balance');
		let dollarBalanceModel = await DollarWallet.find().select('+ balance');
		let euroBalanceModel = await EuroWallet.find().select('+ balance');
		let poundBalanceModel = await PoundWallet.find().select('+ balance');

		if (!localBalanceModel.length) localBalanceModel = [0];
		if (!dollarBalanceModel.length) dollarBalanceModel = [0];
		if (!euroBalanceModel.length) euroBalanceModel = [0];
		if (!poundBalanceModel.length) poundBalanceModel = [0];

		const totalTransactionStatusBalance = async (currency, status) =>
			await Transaction.aggregate([
				{
					$match: {
						currency,
						status,
					},
				},
				{
					$group: {
						_id: null,
						[currency]: {
							$sum: {$toDouble: '$amount'}, // Assuming the amount field is stored as a string, convert it to a number
						},
					},
				},
				{
					$project: {
						_id: 0,
						[currency]: 1,
					},
				},
			]);

		const totalTransactionStatusLength = async (currency, status) =>
			await Transaction.find({currency, status}).countDocuments();

		// Transaction.countDocuments();

		const currencies = ['naira', 'dollar', 'euro', 'pound'];
		const reduceFunc = params =>
			params.reduce((acc, obj) => {
				const key = Object.keys(obj)[0];
				const value = obj[key];
				acc[key] = value;
				return acc;
			}, {});

		const successTransactionsAmount = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusBalance(currency, 'success'))[0]
						? (await totalTransactionStatusBalance(currency, 'success'))[0]
						: {[currency]: 0};
				})
			)
		);

		// );

		const pendingTransactionsAmount = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusBalance(currency, 'pending'))[0]
						? (await totalTransactionStatusBalance(currency, 'pending'))[0]
						: {[currency]: 0};
				})
			)
		);

		const reversedTransactionsAmount = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusBalance(currency, 'reversed'))[0]
						? (await totalTransactionStatusBalance(currency, 'reversed'))[0]
						: {[currency]: 0};
				})
			)
		);

		const blockedTransactionsAmount = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusBalance(currency, 'blocked'))[0]
						? (await totalTransactionStatusBalance(currency, 'blocked'))[0]
						: {[currency]: 0};
				})
			)
		);

		const successTransactionsLength = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusLength(currency, 'success'))
						? {
								[currency]: await totalTransactionStatusLength(
									currency,
									'success'
								),
						  }
						: {[currency]: 0};
				})
			)
		);

		const pendingTransactionsLength = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusLength(currency, 'pending'))
						? {
								[currency]: await totalTransactionStatusLength(
									currency,
									'pending'
								),
						  }
						: {[currency]: 0};
				})
			)
		);
		const reversedTransactionsLength = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusLength(currency, 'reversed'))
						? {
								[currency]: await totalTransactionStatusLength(
									currency,
									'reversed'
								),
						  }
						: {[currency]: 0};
				})
			)
		);
		const blockedTransactionsLength = reduceFunc(
			await Promise.all(
				currencies.map(async currency => {
					return (await totalTransactionStatusLength(currency, 'blocked'))
						? {
								[currency]: await totalTransactionStatusLength(
									currency,
									'blocked'
								),
						  }
						: {[currency]: 0};
				})
			)
		);

		const statusTransactionsAmount = {
			success: successTransactionsAmount,
			pending: pendingTransactionsAmount,
			reversed: reversedTransactionsAmount,
			blocked: blockedTransactionsAmount,
		};
		const statusTransactionsLength = {
			success: successTransactionsLength,
			pending: pendingTransactionsLength,
			reversed: reversedTransactionsLength,
			blocked: blockedTransactionsLength,
		};

		const totalCurrencyWallet = async (currencyModal, currency) =>
			await currencyModal.aggregate([
				{
					$match: {
						currency,
					},
				},
				{
					$group: {
						_id: null,
						totalBalance: {$sum: '$balance'},
					},
				},
				{
					$project: {
						_id: 0,
						totalBalance: {$round: [{$divide: ['$totalBalance', 100]}, 2]}, // Divide totalBalance by 100
					},
				},
			]);
		const localBalanceArray = await totalCurrencyWallet(LocalWallet, 'naira');
		const dollarBalanceArray = await totalCurrencyWallet(
			DollarWallet,
			'dollar'
		);
		const euroBalanceArray = await totalCurrencyWallet(EuroWallet, 'euro');
		const poundBalanceArray = await totalCurrencyWallet(PoundWallet, 'pound');

		const localBalance = localBalanceArray[0]
			? localBalanceArray[0].totalBalance
			: 0;
		const dollarBalance = dollarBalanceArray[0]
			? dollarBalanceArray[0].totalBalance
			: 0;
		const euroBalance = euroBalanceArray[0]
			? euroBalanceArray[0].totalBalance
			: 0;
		const poundBalance = poundBalanceArray[0]
			? poundBalanceArray[0].totalBalance
			: 0;

		const allBalances = {
			localBalance,
			dollarBalance,
			euroBalance,
			poundBalance,
		};
		//Active Sessions
		const lastActiveSessions = await Session.find({}, {updatedAt: 1, email: 1});

		const unReadNotifications = await Notification.find({
			adminStatus: 'unread',
		}).countDocuments();

		const users = {
			total: await User.countDocuments(),
			page: req.query.users || 1,
		};
		const userData = {
			total: await UserData.countDocuments(),
			page: req.query.users || 1,
		};
		const transactions = {
			total: totalTransactionsCount,
			page: req.query.transactions || 1,
		};
		const notifications = {
			total: await Notification.countDocuments(),
			page: req.query.notifications || 1,
		};

		const drawerCount = {};

		const documentsToCount = [
			{doc: PaymentProof, label: 'proofs'},
			{doc: PopUp, label: 'announcements'},
			{doc: VerificationModel, label: 'verifications'},
			{doc: ReportModel, label: 'reports'},
		];

		for (const index of documentsToCount) {
			drawerCount[index.label] = await index.doc.find().countDocuments();
		}

		res.status(200).json({
			users,
			allBalances,
			transactions,
			lastActiveSessions,
			userData,
			notifications,
			statusTransactionsAmount,
			statusTransactionsLength,
			unReadNotifications,
			drawerCount,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getAllUsers = async (req, res) => {
	const {limit = 50, page = 1, userData} = req.query;
	const roundedLimit = Math.round(Number(limit) || 25);
	const skip = (page - 1 >= 0 ? page - 1 : 0) * roundedLimit;

	try {
		const users = userData
			? (
					await User.aggregate([
						{
							$lookup: {
								from: 'userdatas', // Name of the other collection
								localField: 'email', // Field from the 'User' collection
								foreignField: 'email', // Field from the 'UserData' collection
								as: 'userData', // Output array field name
							},
						},
						// {$skip: skip},
						// {$limit: Number(limit)},
					]).exec()
			  ).map(({userData, ...rest}) => {
					return {
						...rest,
						...userData[0],
					};
			  })
			: await User.find().select(['-password', '-__v']);

		const totalUsersCount = await User.countDocuments();
		if (!users) throw new Error('No users found');
		res.status(200).json({
			page: Number(page) || 1,
			pageSize: users.length,
			totalPages: totalUsersCount / roundedLimit,
			total: totalUsersCount,
			data: users,
		});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const getNotifications = async (req, res) => {
	const {limit = 25, page = 1, status, start, end} = req.query;
	const roundedLimit = Math.round(Number(limit) || 25);
	const skip = (page - 1 >= 0 ? page - 1 : 0) * roundedLimit;

	try {
		let query = {};
		let dateQuery = {};
		if (status) {
			query.status = status.split(',');
		}
		if (start) {
			const date = new Date(start);
			!isNaN(date.getTime()) ? (dateQuery.$gte = date) : '';
		}
		if (end) {
			const date = new Date(end);
			!isNaN(date.getTime()) ? (dateQuery.$lte = date) : '';
		}
		if (Object.keys(dateQuery).length) {
			query.createdAt = dateQuery;
		}
		const totalNotificationsCount = await Notification.find(
			query
		).countDocuments();

		const notifications = await Notification.find(query)
			.skip(skip)
			.limit(roundedLimit)
			.select('-__v')
			.sort('-createdAt');

		res.status(200).json({
			page: Number(page) || 1,
			pageSize: notifications.length,
			totalPages: totalNotificationsCount / roundedLimit,
			total: totalNotificationsCount,
			data: notifications,
		});
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};
const getTransactions = async (req, res) => {
	const {
		limit = 25,
		page = 1,
		currency,
		status,
		start,
		end,
		userId,
		swap,
	} = req.query;
	const roundedLimit = Math.round(Number(limit) || 25);
	const skip = (page - 1 >= 0 ? page - 1 : 0) * roundedLimit;

	try {
		const query = {};
		let dateQuery = {};
		if (userId) {
			const idType = userId.split(':')[0];
			const idValue = userId.split(':')[1];
			query[idType] = idValue;
		}
		if (currency) {
			query.currency = currency.split(',');
		}
		if (status) {
			query.status = status.split(',');
		}
		if (swap && JSON.parse(swap) === false) {
			query.transactionType = {$ne: 'swap'};
		}
		if (start) {
			const date = new Date(start);
			!isNaN(date.getTime()) ? (dateQuery.$gte = date) : '';
		}
		if (end) {
			const date = new Date(end);
			!isNaN(date.getTime()) ? (dateQuery.$lte = date) : '';
		}
		if (Object.keys(dateQuery).length) {
			query.createdAt = dateQuery;
		}
		const totalTransactionsCount = await Transaction.find(
			query
		).countDocuments();
		const transactions = await Transaction.find(query)
			.skip(skip)
			.limit(roundedLimit)
			.select(['-__v'])
			.sort('-createdAt');
		res.status(200).json({
			page: Number(page) || 1,
			pageSize: transactions.length,
			totalPages: totalTransactionsCount / roundedLimit,
			total: totalTransactionsCount,
			data: transactions,
		});
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
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
	try {
		let {id} = req.params;
		if (!id) throw new Error('Provide search params');

		const findUser = async queryParam => {
			const user = await User.findOne(queryParam);
			if (user) {
				const userData = await UserData.findOne({email: user.email});
				const wallet = await Wallet.findOne({email: user.email});
				const dollarWallet = await DollarWallet.findOne({email: user.email});
				const euroWallet = await EuroWallet.findOne({email: user.email});
				const poundWallet = await PoundWallet.findOne({email: user.email});
				return {
					...user.toObject(),
					...userData.toObject(),
					wallet: {...wallet.toObject()},
					dollarWallet: {...dollarWallet.toObject()},
					euroWallet: {...euroWallet.toObject()},
					poundWallet: {...poundWallet.toObject()},
				};
			}
			return null;
		};

		let user = await findUser({
			$or: [
				{tagName: id},
				{'userProfile.userName': id},
				{email: id},
				{'userProfile.phoneNumber': id},
			],
		});

		if (!user) {
			const userData = await UserData.findOne({
				$or: [
					{tagName: id},
					{'userProfile.userName': id},
					{email: id},
					{'userProfile.phoneNumber': id},
				],
			});
			if (userData) {
				user = await findUser({email: userData.email});
			}
		}
		if (!user) {
			const wallet = await LocalWallet.findOne({loopayAccNo: id});
			if (wallet) {
				user = await findUser({email: wallet.email});
			}
		}

		if (!user) {
			return res.status(404).json('No user found');
		}
		if (!user.tagName) user.tagName = user.userProfile.userName;
		return res.status(200).json(user);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};

const getRecent = async (req, res) => {
	try {
		const {limit = 50} = req.user;
		let recent = (
			await Recent.aggregate([
				{
					$match: {
						email: {$ne: req.user.email},
					},
				},
				{$sort: {updatedAt: -1}},
				{$limit: Number(limit)},
				{
					$lookup: {
						from: 'userdatas', // Name of the UserData collection
						localField: 'email', // Field to match in Recent collection
						foreignField: 'email', // Field to match in UserData collection
						as: 'userData',
					},
				},
				{$project: {userData: {pin: 0, __v: 0}, __v: 0}},
			]).exec()
		).map(({userData, ...rest}) => {
			return {
				...rest,
				...userData[0],
			};
		});
		return res.status(200).json(recent);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
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
			? await VerificationModel.find({status: query}).sort('-updatedAt')
			: await VerificationModel.find().sort('-updatedAt');
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
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
				from: {
					name: 'Loopay',
					address: process.env.SUPPORT_EMAIL,
				},
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

const getSummary = async (req, res) => {
	try {
		const {currency} = req.query;

		const addAmountsAggregate = async ({
			currency,
			status,
			transactionType,
			type,
		}) => {
			const query = {};
			if (currency) {
				query.currency = currency.split(',');
			}

			if (status) {
				query.status = status.split(',');
			}
			if (transactionType) {
				query.transactionType = transactionType;
			}
			if (type) {
				query.type = type;
			}
			return await Transaction.aggregate([
				{
					$match: query,
				},
				{
					$group: {
						_id: null,
						amount: {
							$sum: {$toDouble: '$amount'}, // Assuming the amount field is stored as a string, convert it to a number
						},
					},
				},
				{
					$project: {
						_id: 0,
						amount: 1,
					},
				},
			]);
		};
		const empty = {
			amount: 0,
		};
		const incomeArray = await addAmountsAggregate({
			currency,
			type: 'inter',
			status: 'success',
			transactionType: 'credit',
		});
		const income = incomeArray[0] || empty;
		const outgoingArray = await addAmountsAggregate({
			currency,
			type: 'inter',
			status: 'success',
			transactionType: 'debit',
		});
		const outgoing = outgoingArray[0] || empty;

		const pendingArray = await addAmountsAggregate({
			currency,
			type: 'inter',
			status: 'pending',
		});
		const pending = pendingArray[0] || empty;
		res.status(200).json({currency, data: {income, outgoing, pending}});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getStatement = async (req, res) => {
	try {
		const {start, end, currency} = req.query;
		if (!start || !end)
			throw new Error('Please provide the start and end dates query');
		if (!currency) throw new Error('Please provide the statement currency');
		const startDate = new Date(start);
		const endDate = new Date(end);
		const query = {
			createdAt: {$gte: startDate, $lte: endDate},
			currency,
		};
		const transactions = await Transaction.find(query).sort('-createdAt');
		res
			.status(200)
			.json({currency, count: transactions.length, data: transactions});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getPaymentProofs = async (req, res) => {
	try {
		const {limit = 50, page = 1, currency} = req.query;
		const roundedLimit = Math.round(Number(limit) || 25);
		const skip = (page - 1 >= 0 ? page - 1 : 0) * roundedLimit;
		const query = {};

		if (currency) {
			query.currency = currency.split(',');
		}
		const totalProofsCount = await PaymentProof.find(query).countDocuments();
		const proofs = (
			await PaymentProof.aggregate([
				{$match: query},
				{$skip: skip},
				{$limit: Number(limit)},
				{
					$lookup: {
						from: 'userdatas', // Name of the other collection
						localField: 'email', // Field from the 'User' collection
						foreignField: 'email', // Field from the 'UserData' collection
						as: 'userData', // Output array field name
					},
				},
				{$skip: skip},
				{$limit: Number(limit)},
			]).exec()
		).map(({userData, ...rest}) => {
			return {
				...rest,
				userData: {
					...userData[0].userProfile,
					verificationStatus: userData[0].verificationStatus,
					country: userData[0].country,
				},
			};
		});
		res.status(200).json({
			page: Number(page) || 1,
			pageSize: proofs.length,
			totalPages: totalProofsCount / roundedLimit,
			data: proofs,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const approveProof = async (req, res) => {
	try {
		const {email, _id, tagName, amount, currency, type: method} = req.body;

		const selectWallet = currency => {
			switch (currency) {
				case 'NGN':
					return LocalWallet;
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
		const currencyWallet = selectWallet(currency);

		const senderWallet = await currencyWallet.findOne({
			email: req.user.email,
		});
		const sendeeWallet = await currencyWallet.findOne({email});
		await UserData.findOne({email});
		if (sendeeWallet?.tagName !== tagName)
			throw new Error('Invalid Account Transfer');

		const convertToKobo = () => amount * 100;
		if (senderWallet.balance < convertToKobo())
			throw new Error('Insufficient funds');

		const data = await PaymentProof.findByIdAndRemove(_id);
		const user = await UserData.findOne({email});
		await Transaction.create({
			email: sendeeWallet.email,
			phoneNumber: sendeeWallet.phoneNumber,
			transactionType: 'credit',
			method,
			id: _id,
			status: 'success',
			type: 'intra',
			senderAccount: senderWallet.loopayAccNo,
			senderPhoto: '',
			receiverAccount: sendeeWallet.loopayAccNo,
			receiverName: user.userProfile.fullName,
			receiverPhoto: user.photoURL || '',
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount,
			description: 'deposit',
			reference: `TR${_id}`,
			currency,
			createdAt: new Date(),
		});

		senderWallet.balance -= convertToKobo();
		sendeeWallet.balance += convertToKobo();
		await senderWallet.save();
		await sendeeWallet.save();
		res.status(200).json({
			message: 'Transaction approved successfully',
			data,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const declineProof = async (req, res) => {
	try {
		const {id} = req.params;
		const {amount, email, currency, tagName} = req.body;
		const user = await UserData.findOne({email});
		const notification = {
			email,
			id,
			phoneNumber: user.userProfile.phoneNumber,
			type: 'proof',
			header: 'Proof declined',
			message: `Your payment proof of ${
				currency + addingDecimal(Number(amount).toLocaleString())
			} has been declined`,
			adminMessage: `${req.user.firstName} ${
				req.user.lastName
			} declined #${tagName} proof of ${
				currency + addingDecimal(Number(amount).toLocaleString())
			}`,
			status: 'unread',
			photo: user.photoURL,
		};
		const data = await PaymentProof.findByIdAndRemove({_id: id});
		await Notification.create(notification);
		cloudinary.api.delete_resources(
			`loopay/payment-proofs/${email}_${req.user._id}`,
			{
				type: 'upload',
				resource_type: 'image',
			}
		);
		res.status(200).json({
			message: 'Transaction declined successfully',
			data,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const getInternational = async (req, res) => {
	const result = await international.find({}).sort('-createdAt');
	res.status(200).json({status: true, data: result});
};

const updateInternational = async (req, res) => {
	try {
		const {id} = req.params;
		const internationalSend = await international.findById({_id: id});
		const response = await Transaction.findOneAndUpdate(
			{id: internationalSend.id},
			{status: 'success'},
			{new: true, runValidators: true}
		);
		await international.findByIdAndRemove({_id: id});
		res.status(200).json({status: true, data: response});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const deleteInternational = async (req, res) => {
	try {
		const {id} = req.params;
		const response = await international.findById(id);
		const data = await Transaction.findOneAndUpdate(
			{id: response.id},
			{status: 'reversed'},
			{new: true, runValidators: true}
		);
		await international.findByIdAndRemove(id);

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

		const {currency} = response;
		const currencyWallet = selectWallet(currency);
		const wallet = await currencyWallet.findOne({email: response.email});
		const amountInUnits = response.amount * 100 + response.fee * 100;
		wallet.balance += amountInUnits;
		await wallet.save();
		res.status(200).json({status: true, data});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const deleteResources = async (req, res) => {
	const {prefix} = req.query;
	if (!prefix) {
		return res.status(400).json('Please provide prefix resource to delete');
	}
	cloudinary.api
		.delete_resources_by_prefix(prefix)
		.then(res.status(200).json('Deleted'));
};

module.exports = {
	getAllAdminInfo,
	getUser,
	getAllUsers,
	getNotifications,
	getTransactions,
	getRecent,
	getAllNairaBalance,
	transferToLoopayUser,
	finalizeWithdrawal,
	approveProof,
	declineProof,
	blockTransaction,
	getVerifications,
	updateVerification,
	blockAccount,
	suspendAccount,
	unblockAccount,
	unsuspendAccount,
	getSummary,
	getStatement,
	getPaymentProofs,
	getInternational,
	updateInternational,
	deleteInternational,
	deleteResources,
};
