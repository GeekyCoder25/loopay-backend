const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const SessionSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		sessions: {
			type: [Object],
			required: true,
			session: {
				required: true,
				deviceManufacturer: {
					type: String,
					required: [true, 'Please provide the device manufacturer'],
				},
				deviceName: {
					type: String,
					required: [true, 'Please provide the device name'],
				},
				deviceID: {
					type: String,
					required: [true, 'Please provide the device unque ID'],
					unique: true,
				},
				firstSignIn: {
					type: Date,
					required: [true, 'Please provide first sign in'],
				},
				lastSeen: {
					type: Date,
					required: [true, 'Please provide last seen'],
				},
			},
		},
	},
	{timestamps: true}
);
module.exports = mongoose.model('session', SessionSchema);
