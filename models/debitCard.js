const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const DebitCardSchema = new Schema(
	{
		id: {
			type: String,
			required: [true, 'Please input card ID'],
			unique: true,
		},
		currency: String,
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
		cardNo: {
			type: String,
			required: [true, 'Please provide card number'],
		},
		expiryMonth: {
			type: String,
			required: [true, 'Please provide card expiry month'],
		},
		expiryYear: {
			type: String,
			required: [true, 'Please provide card expiry year'],
		},
		cvv: {
			type: String,
			required: [true, 'Please provide card cvv'],
		},
		type: {
			type: String,
			required: [true, 'Please provide card type'],
		},
		cardType: {
			type: String,
			required: [true, 'Please provide card type'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('debit-card', DebitCardSchema);
