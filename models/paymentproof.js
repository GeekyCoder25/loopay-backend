const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail} = require('validator');

const PaymentProofModel = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		tagName: {
			type: String,
			required: [true, 'Please provide tag name'],
		},
		accNo: {
			type: String,
			required: [true, 'Please provide account number'],
		},
		amount: {
			type: String,
			required: [true, 'please provide payment proof'],
		},
		currency: {
			type: String,
			required: [true, 'please provide payment currency'],
		},
		message: String,
		image: {
			type: String,
			// required: [true, 'please provide image url'],
		},
		type: {
			type: String,
			required: [true, 'Please provide proof type'],
			enum: ['card', 'transfer', 'deposit'],
		},
		reference: String,
	},
	{timestamps: true}
);

module.exports = mongoose.model('payment-proof', PaymentProofModel);
