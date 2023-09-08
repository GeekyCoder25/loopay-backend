const RequestModel = require('../models/request');
const UserData = require('../models/userData');
const NairaWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');

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
		const {email} = req.user;
		const {amount, currency, fee, id, tagName} = req.body;
		const wallet = await NairaWallet.findOne({email});
		const userData = await UserData.findOne({email});
		const requesteeWallet = await NairaWallet.findOne({tagName});
		const requesteeUserData = await UserData.findOne({tagName});

		const request = {
			requesterAccount: wallet.tagName,
			requesterName: userData.userProfile.fullName,
			requesterPhoto: userData.photoURL,
			requesteeAccount: requesteeWallet.tagName,
			requesteeName: requesteeUserData.userProfile.fullName,
			requesteePhoto: requesteeUserData.photoURL,
			currency,
			amount,
			fee,
			description: '',
			reference: `TRF${id}`,
		};

		await RequestModel.create(request);
		res.status(200).json('Request sent');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const confirmRequest = async (req, res) => {
	const {_id, currency, status, requesterAccount, requesteeAccount} = req.body;
	let {amount} = req.body;
	const {email} = req.user;

	amount *= 100;

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
		if (status === 'accept') {
			if (amount > wallet.balance)
				throw new Error(`Insufficient ${currency} balance`);
			wallet.balance -= amount;
			requesterWallet.balance += amount;
			await wallet.save();
			await requesterWallet.save();
			// await request.deleteOne();
			res.status(200).json('Request accepted successfully');
		} else if (status === 'decline') {
			// await request.deleteOne();
			res.status(200).json('Request declined');
		} else if (status === 'block') {
			// await request.deleteOne();
			const userData = await UserData.updateOne(
				{email},
				{$push: {blockedUsers: {$each: [requesterWallet.email], $position: 0}}}
			);
			console.log(userData);
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
