const UserDataModel = require('../models/userData');

const unsubscribeEmailAlerts = async (req, res) => {
	try {
		const {email} = req.user;

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
