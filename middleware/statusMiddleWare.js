const User = require('../models/user');

const accountStatus = async (req, res, next) => {
	const user = await User.findOne({email: req.user.email}).select('-password');
	if (user) {
		if (user.status === 'blocked' && user.blockEnd) {
			if (new Date() > user.blockEnd) {
				user.status = 'active';
				user.blockedAt = undefined;
				await user.save();
				return next();
			}
			return res
				.status(401)
				.json(
					`Your account has been suspended from performing transactions till ${user.blockedAt.toLocaleDateString()}`
				);
		} else if (user.status === 'blocked') {
			return res.status(401).json(`Your account has been blocked`);
		}
	} else {
		return res.status(400).json('User account not found');
	}
	next();
};

module.exports = {
	accountStatus,
};
