const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const transactionSchema = new Schema(
	{
		id: {type: String, required: [true, 'Please provide transaction id']},
		status: {
			type: String,
			required: [true, 'Please provide transaction status'],
		},
		transactionType: {
			type: String,
			required: [true, 'Please provide transaction type'],
		},
		senderAccount: {
			type: String,
			required: [true, "Please provide transaction sender's account"],
		},
		receiverAccount: {
			type: String,
			required: [true, "Please provide transaction receiver's account"],
		},
		sourceBank: {
			type: String,
			required: [true, 'Please provide transaction source bank'],
		},
		destinationBank: {
			type: String,
			required: [true, 'Please provide transaction destination bank'],
		},
		amount: {
			type: String,
			required: [true, 'Please provide transaction amount'],
		},
		description: {
			type: String,
		},
		reference: {
			type: String,
			required: [true, "Please provide transaction's refence"],
		},
		payStackReference: String,
		currency: {
			type: String,
			required: [true, "Please provide transaction's currency"],
		},
		metadata: Schema.Types.Mixed,
	},
	{timestamps: true}
);

const TransactionModel = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		phoneNumber: {
			type: String,
			required: [true, 'Please input your phone number'],
			unique: true,
			validate: [isMobilePhone, 'Invalid phone number'],
		},

		transactions: [transactionSchema],
	},
	{timestamps: true}
);

module.exports = mongoose.model('transaction', TransactionModel);
