const jwt = require('jsonwebtoken');
const UserDataModel = require('../models/userData');

const unsubscribeEmailAlerts = async (req, res) => {
	try {
		const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
		const email = decoded;

		const userData = await UserDataModel.findOne({email});
		if (userData.isEmailAlertSubscribed === false)
			throw new Error('User already unsubscribed');
		await UserDataModel.updateOne({email}, {isEmailAlertSubscribed: false});

		res.status(200).json({
			status: 'success',
			message: 'Unsubscribed successfully',
		});
	} catch (error) {
		console.log(error.message);
		res.status(400).json({
			status: 'success',
			message: `Couldn't unsubscribe user. Error: ${error.message}`,
		});
	}
};

module.exports = {
	unsubscribeEmailAlerts,
};
