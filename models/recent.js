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
		fullName: {
			type: String,
			required: [true, "Please provide the user's name"],
		},
		tagName: {
			type: String,
			required: [true, "Please provide user loopay's tag name"],
			unique: true,
		},
		accNo: {
			type: String,
			required: [true, 'Please provide user account number'],
			unique: true,
		},
		photo: {
			type: String,
		},
		adminUser: {
			type: String,
			required: [true, 'Please provide user admin email'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('recent', RecentSchema);
