const User = require('../models/user');
const UserData = require('../models/userData');

const accountStatus = async (req, res, next) => {
	const user = await User.findOne({email: req.user.email}).select('-password');
	const userData = await UserData.findOne({email: req.user.email});
	if (user) {
		if (user.status === 'blocked' && user.blockEnd) {
			if (new Date() > user.blockEnd) {
				user.status = 'active';
				user.blockedAt = undefined;
				await user.save();
				return next();
			}
			return res
				.status(400)
				.json(
					`Your account has been suspended from performing transactions till ${user.blockedAt.toLocaleDateString()}`
				);
		} else if (user.status === 'blocked') {
			return res.status(400).json(`Your account has been blocked`);
		} else if (userData.verificationStatus !== 'verified') {
			if (userData.verificationStatus === 'pending') {
				return res
					.status(400)
					.json(
						"Your account verification is pending, transaction can't be completed"
					);
			} else if (userData.verificationStatus === 'blocked') {
				return res
					.status(400)
					.json(
						'Your account verification is denied, kindly reverify your account to continue making transactions'
					);
			}
		}
	} else {
		return res.status(400).json('User account not found');
	}
	next();
};

module.exports = {
	accountStatus,
};
