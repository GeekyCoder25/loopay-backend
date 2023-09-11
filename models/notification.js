const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const NotificationSchema = new Schema(
	{
		id: {
			type: String,
			required: [true, 'Please input notifiaction ID'],
			unique: true,
		},
		// currency: String,
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		phoneNumber: {
			type: String,
			required: [true, 'Please provide your phone number'],
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		type: {
			type: String,
			required: [true, 'Please provide notification type'],
		},
		header: {
			type: String,
			required: [true, 'Please provide notification header'],
		},
		message: {
			type: String,
			required: [true, 'Please provide notification message'],
		},
		status: {
			type: String,
			required: [true, 'Please provide notification status'],
			enum: ['read', 'unread'],
		},
		metadata: {
			type: Schema.Types.Mixed,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('notitfication', NotificationSchema);
