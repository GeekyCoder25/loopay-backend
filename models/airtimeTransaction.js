const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const AirtimeTransactionSchema = new Schema(
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
			enum: ['airtime', 'data'],
		},
		networkProvider: {
			type: String,
			enum: ['mtn', 'airtel', 'glo', '9mobile'],
			required: [true, 'Please provide network provider'],
		},
		phoneNo: {
			type: String,
			required: [true, 'Please input your phone number'],
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		amount: {
			type: String,
			required: [true, 'Please provide transaction amount'],
		},
		dataPlan: String,
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
module.exports = mongoose.model(
	'airtime-transaction',
	AirtimeTransactionSchema
);
