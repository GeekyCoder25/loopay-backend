const RequestModel = require('../models/request');
const UserData = require('../models/userData');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const {addingDecimal} = require('../utils/addingDecimal');
const pushNotification = require('../models/pushNotification');
const {default: Expo} = require('expo-server-sdk');
const sendPushNotification = require('../utils/pushNotification');
const selectWallet = require('../services/selectWallet');

const getFundRequest = async (req, res) => {
	try {
		const {email} = req.user;
		const wallet = await LocalWallet.findOne({email});
		const requests = await RequestModel.find({
			requesteeAccount: wallet.tagName,
		}).sort('-createdAt');

		res.status(200).json(requests);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postFundRequest = async (req, res) => {
	const {amount, currency, description, fee, id, tagName} = req.body;
	try {
		const {email, phoneNumber} = req.user;
		const currencyWallet = selectWallet(currency);
		const wallet = await currencyWallet.findOne({email});
		const userData = await UserData.findOne({email});
		const requesteeUserData = await UserData.findOne({tagName});

		const request = {
			requesterAccount: wallet.tagName,
			requesterName: userData.userProfile.fullName,
			requesterPhoto: userData.photoURL,
			requesteeAccount: tagName,
			requesteeName: requesteeUserData.userProfile.fullName,
			requesteePhoto: requesteeUserData.photoURL,
			currency,
			amount,
			fee,
			description,
			reference: `TRF${id}`,
		};

		await RequestModel.create(request);

		const notification = {
			id,
			email: requesteeUserData.email,
			phoneNumber,
			type: 'request',
			header: 'Incoming Fund request',
			message: `${userData.userProfile.fullName} has requested ${
				wallet.currencyDetails.symbol + addingDecimal(amount)
			} from you`,
			adminMessage: `${userData.userProfile.fullName} requested ${
				wallet.currencyDetails.symbol + addingDecimal(amount)
			} from ${requesteeUserData.userProfile.fullName}`,
			status: 'unread',
			photo: userData.photoURL,
		};

		const savedNotification = await Notification.create(notification);
		const expoPushToken = (
			await pushNotification.findOne({email: requesteeUserData.email})
		)?.token;
		if (expoPushToken) {
			await sendPushNotification({
				token: expoPushToken,
				title: 'Incoming Fund request',
				message: `${userData.userProfile.fullName} has requested ${
					wallet.currencyDetails.symbol + addingDecimal(amount)
				} from you`,
				data: {notificationType: 'notification', data: savedNotification},
			});
		}

		res.status(200).json('Request sent');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const confirmRequest = async (req, res) => {
	const {_id, currency, id, fee, status, requesterAccount, requesteeAccount} =
		req.body;
	const {email, phoneNumber} = req.user;
	const amount = Number(req.body.amount);
	const amountInUnits = amount * 100;
	const toReceive = amount - fee;

	try {
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
			}
		};

		const request = await RequestModel.findById(_id);
		const selectedWallet = selectWallet(currency);
		const currencyWallet = selectWallet(currency);
		const wallet = await currencyWallet.findOne({tagName: requesteeAccount});
		const requesterWallet = await selectedWallet.findOne({
			tagName: requesterAccount,
		});
		const userData = await UserData.findOne({email});
		const requesterUserData = await UserData.findOne({
			email: requesterWallet.email,
		});

		const notification = {
			id,
			email: requesterWallet.email,
			phoneNumber: requesterWallet.phoneNumber,
			type: 'request_confirm',
			status: 'unread',
			photo: userData.photoURL,
		};

		const transaction = {
			id,
			status: 'success',
			type: 'intra',
			senderAccount: wallet.loopayAccNo,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderPhoto: userData.photoURL || '',
			receiverAccount: requesterWallet.loopayAccNo,
			receiverName: requesterUserData.userProfile.fullName,
			receiverPhoto: requesterUserData.photoURL || '',
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount,
			description: request.description,
			reference: `TR${id}`,
			currency,
			fromBalance: wallet.balance,
			toBalance: wallet.balance - amountInUnits,
			createdAt: new Date(),
		};

		if (status === 'accept') {
			if (amountInUnits > wallet.balance)
				throw new Error(`Insufficient ${currency} balance`);

			await TransactionModel.create({
				email,
				phoneNumber,
				transactionType: 'debit',
				...transaction,
			});
			await TransactionModel.create({
				email: requesterWallet.email,
				phoneNumber: requesterWallet.phoneNumber,
				transactionType: 'credit',
				...transaction,
			});
			const savedNotification = await Notification.create({
				...notification,
				header: 'Request Approval',
				message: `${
					userData.userProfile.fullName
				} has approved your request and sent you ${
					wallet.currencyDetails.symbol + addingDecimal(amount)
				}`,
				adminMessage: `${userData.userProfile.fullName} has approved ${
					requesterUserData.userProfile.fullName
				} fund request and sent ${
					wallet.currencyDetails.symbol + addingDecimal(amount)
				}`,
			});
			wallet.balance -= amountInUnits;
			requesterWallet.balance += toReceive * 100;
			await wallet.save();
			await requesterWallet.save();
			await request.deleteOne();
			const expoPushToken = (
				await pushNotification.findOne({email: requesterWallet.email})
			)?.token;
			if (expoPushToken) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Request Fund Approval',
					message: `${
						userData.userProfile.fullName
					} has approved your request and sent you ${
						wallet.currencyDetails.symbol + addingDecimal(amount)
					}`,
					data: {notificationType: 'notification', data: savedNotification},
				});
			}

			res.status(200).json('Request accepted successfully');
		} else if (status === 'decline') {
			const savedNotification = await Notification.create({
				...notification,
				header: 'Request Fund Denied',
				message: `${userData.userProfile.fullName} has denied your request of ${
					wallet.currencyDetails.symbol + addingDecimal(amount)
				}`,
				adminMessage: `${userData.userProfile.fullName} has denied ${
					requesterUserData.userProfile.fullName
				} request for ${wallet.currencyDetails.symbol + addingDecimal(amount)}`,
			});
			await request.deleteOne();
			const expoPushToken = (
				await pushNotification.findOne({email: requesterWallet.email})
			)?.token;
			if (expoPushToken) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Request Fund Denied',
					message: `${
						userData.userProfile.fullName
					} has denied your request of ${
						wallet.currencyDetails.symbol + addingDecimal(amount)
					}`,
					data: {notificationType: 'notification', data: savedNotification},
				});
			}
			res.status(200).json('Request declined');
		} else if (status === 'block') {
			const savedNotification = await Notification.create({
				...notification,
				header: 'Request Fund Denied',
				message: `${userData.userProfile.fullName} has denied your request of ${
					wallet.currencyDetails.symbol + addingDecimal(amount)
				}`,
				adminMessage: `${
					userData.userProfile.fullName
				} has denied and blocked ${
					requesterUserData.userProfile.fullName
				} request for ${wallet.currencyDetails.symbol + addingDecimal(amount)}`,
			});
			await request.deleteOne();
			await UserData.updateOne(
				{email},
				{$push: {blockedUsers: {$each: [requesterWallet.email], $position: 0}}}
			);
			const expoPushToken = (
				await pushNotification.findOne({email: requesterWallet.email})
			)?.token;
			if (expoPushToken) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Request Fund Denied',
					message: `${
						userData.userProfile.fullName
					} has denied your request of ${
						wallet.currencyDetails.symbol + addingDecimal(amount)
					}`,
					data: {notificationType: 'notification', data: savedNotification},
				});
			}
			res.status(200).json('User blocked');
		}
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	getFundRequest,
	postFundRequest,
	confirmRequest,
};
