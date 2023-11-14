const User = require('../models/user');
const UserDataModel = require('../models/userData');
const SessionModel = require('../models/session');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');

const removeUnverifiedUsers = async (req, res, next) => {
	try {
		const fiveMinutesAgo = new Date();
		fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

		const users = await User.find({
			createdAt: {$lt: fiveMinutesAgo},
			emailOtpCode: {$exists: true},
		});
		if (users.length) {
			users.forEach(async user => {
				const {_id} = user;
				await User.findOneAndRemove(_id);
				await UserDataModel.findByIdAndRemove(_id);
				await SessionModel.findByIdAndRemove(_id);
				await LocalWallet.findByIdAndRemove(_id);
				await DollarWallet.findByIdAndRemove(_id);
				await EuroWallet.findByIdAndRemove(_id);
				await PoundWallet.findByIdAndRemove(_id);
			});
		}

		next();
	} catch {
		next();
	}
};

module.exports = {removeUnverifiedUsers};
