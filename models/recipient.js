const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const RecipientSchema = new Schema(
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
		type: {
			type: String,
			required: [true, "Please provide bank's type"],
		},
		name: {
			type: String,
			required: [true, "Please provide bank's account name"],
		},
		accNo: {
			type: String,
			required: [true, "Please provide bank's accNo"],
		},
		bankCode: {
			type: String,
			required: [true, "Please provide bank's code"],
		},
		currency: {
			type: String,
			required: [true, "Please provide bank's currency"],
		},
		bankName: {
			type: String,
			required: [true, "Please provide bank's name"],
		},
		slug: {
			type: String,
			required: [true, "Please provide bank's slug"],
		},
		recipientCode: {
			type: String,
			required: [true, "Please provide bank's recipient code"],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('recipients', RecipientSchema);
