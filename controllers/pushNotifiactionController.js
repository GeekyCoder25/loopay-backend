const {default: Expo} = require('expo-server-sdk');
const PushNotificationModel = require('../models/pushNotification');

const postToken = async (req, res) => {
	try {
		const {email} = req.user;
		const token = req.body.token;
		if (!token) {
			throw new Error('Token not provided');
		} else if (!Expo.isExpoPushToken(token)) {
			throw new Error('Invalid token provided');
		}
		await PushNotificationModel.findOneAndUpdate(
			{email},
			{
				email,
				token: req.body.token,
			},
			{
				upsert: true,
				runValidators: true,
				new: true,
			}
		);
		res.status(200).json({
			status: true,
			message: 'Token saved successfully',
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	postToken,
};
