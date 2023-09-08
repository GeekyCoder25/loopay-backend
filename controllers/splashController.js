const UserDataModel = require('../models/userData');
const {excludedFieldsInObject} = require('../utils/mongodbExclude');

const getSplashData = async (req, res) => {
	try {
		const {email} = req.user;
		const userData = await UserDataModel.findOne(
			{email},
			excludedFieldsInObject
		);
		if (!userData) return res.status(404).json('No user found');
		const result = Object.assign(userData, {pin: userData.pin ? true : false});
		res.status(200).json(result);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getSplashData,
};
