const ReferralModel = require('../models/referral');
const UserDataModel = require('../models/userData');
const walletDollar = require('../models/walletDollar');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const unverifiedUser = require('../models/unverifiedUser');
const uuid = require('uuid').v4;

const getReferrals = async (req, res) => {
	try {
		const {email} = req.user;
		const referral = await ReferralModel.findOne({email});

		if (!referral) {
			return res.status(200).json({balance: 0, referrals: []});
		}
		const referrals = referral.referrals;
		const referralsAfterupdateCheck = [];
		await Promise.all(
			referrals.map(async indexReferral => {
				const result = await UserDataModel.findOne({
					email: indexReferral.email,
				});
				if (result) {
					referralsAfterupdateCheck.push({
						...indexReferral,
						photo: result.photoURL || '',
						tagName: result.tagName,
						fullName: result.userProfile.fullName,
						verified: result.verificationStatus === 'verified' ? true : false,
					});
				}
			})
		);
		referral.referrals = referralsAfterupdateCheck;
		referral.balance = referral.balance / 100;
		res.status(200).json(referral);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postReferral = async (req, res, {referrerEmail, refereeEmail}) => {
	try {
		const email = referrerEmail || req.user.email;
		const referralEmail = refereeEmail || req.body.email;
		const referralsExists = await ReferralModel.findOne({email});
		const referralUser = await unverifiedUser.findOne({email: referralEmail});
		const referralUserData = await UserDataModel.findOne({
			email: referralEmail,
		});

		if (!referralUserData) throw new Error('Invalid user account');
		else if (referralEmail === email) {
			throw new Error("You can't refer yourself");
		} else if (!referralUser) {
			// throw new Error('not a new user');
		}

		if (referralsExists) {
			let referrals;
			const previousReferees = referralsExists.referrals;
			const previousRefereesNotTheSameWithNewReferee = previousReferees.filter(
				referee => referee.email !== referralEmail
			);
			const previousRefereeTheSameWithNewReferee = previousReferees.filter(
				referee => referee.email === referralEmail
			);
			if (previousRefereeTheSameWithNewReferee.length) {
				throw new Error('referral already added');
			}

			const bodyData = {
				email: referralUserData.email,
				fullName: referralUserData.userProfile.fullName,
				phoneNumber: referralUserData.userProfile.phoneNumber,
				photo: referralUserData.photoURL || '',
				tagName: referralUserData.tagName,
				verified:
					referralUserData.verificationStatus === 'verified' ? true : false,
			};
			referrals = [bodyData, ...previousRefereesNotTheSameWithNewReferee];
			const {balance} = referralsExists;
			await ReferralModel.findOneAndUpdate(
				{email},
				{referrals, balance: balance + 20},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			const bodyData = {
				email: referralUserData.email,
			};
			await ReferralModel.create({
				email,
				referrals: [bodyData],
				balance: 20,
			});
		}
		if (res)
			return res.status(200).json({
				message: 'Referral added successfully',
				referral: req.body,
			});
	} catch (err) {
		console.log(err.message);
		if (res) {
			return res.status(400).json(err.message);
		}
	}
};

const referralWithdraw = async (req, res) => {
	try {
		const {email, phoneNumber} = req.user;
		const referral = await ReferralModel.findOne({email});

		if (!referral) {
			throw new Error('No referral team');
		}
		if (referral.balance < 500) {
			throw new Error(`Minimum withdrawal is $${5}`);
		}

		const wallet = await walletDollar.findOne({email});
		const userData = await UserDataModel.findOne({
			email,
		});
		const {userProfile, photoURL: photo} = userData;
		const id = uuid();
		const transaction = {
			id,
			status: 'success',
			type: 'intra',
			transactionType: 'credit',
			senderAccount: 'Loopay team',
			senderName: 'Loopay team',
			senderPhoto: 'loopay',
			receiverAccount: wallet.loopayAccNo,
			receiverName: userProfile.fullName,
			receiverPhoto: photo || '',
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount: referral.balance / 100,
			description: 'Referral reward',
			reference: `TR${id}`,
			currency: 'dollar',
			createdAt: new Date(),
		};
		const notification = {
			email,
			id,
			phoneNumber,
			type: 'transfer',
			header: 'Referral reward',
			message: `You have been rewarded $${referral.balance / 100}`,
			adminMessage: `${req.user.firstName} ${
				req.user.lastName
			} have been rewarded $${referral.balance / 100} for referral`,
			status: 'unread',
			photo,
			metadata: {...transaction, transactionType: 'credit'},
		};

		const transactionExists = await TransactionModel.findOne({id});

		if (!transactionExists) {
			await TransactionModel.create({
				email,
				phoneNumber,
				...transaction,
			});

			await Notification.create(notification);
		}

		wallet.balance = wallet.balance + referral.balance;
		referral.balance = 0;
		await wallet.save();
		await referral.save();

		res.status(200).json('Withdraw to wallet successfully');
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

module.exports = {
	getReferrals,
	postReferral,
	referralWithdraw,
};
