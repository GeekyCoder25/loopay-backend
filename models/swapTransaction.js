const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const SwapTransactionModel = new Schema(
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
		id: {
			type: String,
			required: [true, 'Please provide transaction id'],
			unique: true,
		},
		status: {
			type: String,
			required: [true, 'Please provide transaction status'],
		},
		transactionType: {
			type: String,
			required: [true, 'Please provide transaction type'],
			enum: ['swap'],
		},
		accNo: {
			type: String,
			required: [true, "Please provide user's account number"],
			minLength: 10,
		},
		tagName: {
			type: String,
			required: [true, "Please provide user's tag name"],
		},
		fullName: {
			type: String,
			required: [true, "Please provide user's fullname"],
		},
		userPhoto: String,
		swapFrom: {
			type: String,
			required: [true, 'Please provide swap from currency'],
			enum: ['naira', 'dollar', 'euro', 'pound'],
		},
		swapTo: {
			type: String,
			required: [true, 'Please provide swap to currency'],
			enum: ['naira', 'dollar', 'euro', 'pound'],
		},
		swapFromAmount: {
			type: String,
			required: [true, 'Please provide swap from amounr'],
		},
		swapToAmount: {
			type: String,
			required: [true, 'Please provide swap to amount'],
		},
		currency: {
			type: String,
			required: [true, "Please provide transaction's currency"],
		},
		description: {
			type: String,
		},
		reference: {
			type: String,
			required: [true, "Please provide transaction's refrence"],
			unique: true,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('swap-transaction', SwapTransactionModel);
