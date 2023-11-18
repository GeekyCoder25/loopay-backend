const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const BillTransactionSchema = new Schema(
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
		debitAccount: {
			type: String,
			required: [true, 'Please provide debit account'],
		},
		transactionType: {
			type: String,
			required: [true, 'Please provide transaction type'],
			enum: ['bill'],
		},
		type: {
			type: String,
			required: [true, 'Please provide bill type'],
		},
		name: {
			type: String,
			required: [true, 'Please provide bill name'],
		},
		amount: {
			type: String,
			required: [true, 'Please provide transaction amount'],
		},
		reference: {
			type: String,
			required: [true, "Please provide transaction's reference"],
			unique: true,
		},
		currency: {
			type: String,
			required: [true, "Please provide transaction's currency"],
		},
		metadata: Schema.Types.Mixed,
	},
	{timestamps: true}
);
module.exports = mongoose.model('bill-transaction', BillTransactionSchema);
