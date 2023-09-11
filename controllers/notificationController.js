const Notification = require('../models/notification');
const UserData = require('../models/userData');

const getNotifications = async (req, res) => {
	const {email} = req.user;
	const notifications = await Notification.find({email});
	const userData = await UserData.find({email});

	res.status(200).json(notifications);
};

module.exports = {
	getNotifications,
};
