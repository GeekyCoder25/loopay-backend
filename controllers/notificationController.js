const Notification = require('../models/notification');

const getNotifications = async (req, res) => {
	const {email} = req.user;
	const notifications = await Notification.find({email}).sort('-createdAt');

	res.status(200).json(notifications);
};
const updateNotification = async (req, res) => {
	await Notification.findByIdAndUpdate(req.params.id, {
		status: 'read',
	});
	res.status(200).json('Update successful');
};
const adminUpdateNotification = async (req, res) => {
	await Notification.findByIdAndUpdate(req.params.id, {
		adminStatus: 'read',
	});
	res.status(200).json('Update successful');
};

const updateNotifications = async (req, res) => {
	await Notification.updateMany({}, {adminStatus: 'read'});
	res.status(200).json('Update successful');
};

module.exports = {
	getNotifications,
	updateNotification,
	adminUpdateNotification,
	updateNotifications,
};
