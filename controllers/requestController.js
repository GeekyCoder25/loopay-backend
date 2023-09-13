const RequestModel = require('../models/request');
const UserData = require('../models/userData');
const NairaWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const {addingDecimal} = require('../utils/addingDecimal');

const getFundRequest = async (req, res) => {
	try {
		const {email} = req.user;
		const wallet = await NairaWallet.findOne({email});
		const requests = await RequestModel.find({
			requesteeAccount: wallet.tagName,
		}).sort('-createdAt');

		res.status(200).json(requests);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postFundRequest = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const {amount, currency, description, fee, id, tagName} = req.body;
		const wallet = await NairaWallet.findOne({email});
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
			header: 'Fund request',
			message: `${userData.userProfile.fullName} has requested ${
				currency + addingDecimal(amount.toLocaleString())
			} from you`,
			adminMessage: `${userData.userProfile.fullName} requested ${
				currency + addingDecimal(amount).toLocaleString()
			} from ${requesteeUserData.userProfile.fullName}`,
			status: 'unread',
			photo: userData.photoURL,
		};

		await Notification.create(notification);
		res.status(200).json('Request sent');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const confirmRequest = async (req, res) => {
	const {
		_id,
		amount,
		currency,
		id,
		fee,
		status,
		requesterAccount,
		requesteeAccount,
	} = req.body;
	const {email, phoneNumber} = req.user;

	const amountInUnits = amount * 100;
	const toReceive = amount - fee;

	try {
		const selectWallet = currency => {
			switch (currency) {
				case 'naira':
					return NairaWallet;
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
			}
		};

		const request = await RequestModel.findById(_id);
		const WalletModel = selectWallet(currency);
		const wallet = await WalletModel.findOne({tagName: requesteeAccount});
		const requesterWallet = await WalletModel.findOne({
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
			amount: amount,
			description: request.description,
			reference: `TR${id}`,
			currency,
			createdAt: new Date(),
		};
		if (status === 'accept') {
			if (amount > wallet.balance)
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
				amount: toReceive,
			});
			await Notification.create({
				...notification,
				header: 'Request Approval',
				message: `${
					userData.userProfile.fullName
				} has approved your request and sent you ${
					currency + addingDecimal(amount.toLocaleString())
				}`,
				adminMessage: `${userData.userProfile.fullName} has approved ${
					requesterUserData.userProfile.fullName
				} fund request and sent ${
					currency + addingDecimal(amount.toLocaleString())
				}`,
			});
			wallet.balance -= amountInUnits;
			requesterWallet.balance += toReceive * 100;
			await wallet.save();
			await requesterWallet.save();
			await request.deleteOne();

			res.status(200).json('Request accepted successfully');
		} else if (status === 'decline') {
			await Notification.create({
				...notification,
				header: 'Request Denied',
				message: `${userData.userProfile.fullName} has denied your request of ${
					currency + addingDecimal(amount.toLocaleString())
				}`,
			});
			await request.deleteOne();
			res.status(200).json('Request declined');
		} else if (status === 'block') {
			await Notification.create({
				...notification,
				header: 'Request Denied',
				message: `${userData.userProfile.fullName} has denied your request of ${
					currency + addingDecimal(amount.toLocaleString())
				}`,
			});
			await request.deleteOne();
			await UserData.updateOne(
				{email},
				{$push: {blockedUsers: {$each: [requesterWallet.email], $position: 0}}}
			);
			res.status(200).json('Request block');
		}
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getFundRequest,
	postFundRequest,
	confirmRequest,
};
