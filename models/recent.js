const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const RecentSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		phoneNumber: {
			type: String,
			required: [true, 'Please input your phone number'],
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		adminUser: {
			type: String,
			required: [true, 'Please provide user admin email'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('recent', RecentSchema);
