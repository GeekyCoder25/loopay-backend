const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const PushNotificationSchema = new Schema(
	{
		id: {
			type: String,
			required: [true, 'Please input notification ID'],
		},
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
			unique: true,
		},
		token: {
			type: String,
			required: [true, 'Please input your Notification Token'],
			unique: true,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('pushToken', PushNotificationSchema);
