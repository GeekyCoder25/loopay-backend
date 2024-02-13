const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const TransactionModel = new Schema(
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
		id: {type: String, required: [true, 'Please provide transaction id']},
		status: {
			type: String,
			required: [true, 'Please provide transaction status'],
		},
		type: {
			type: String,
			// required: [true, 'Please provide transfer type'],
			enum: ['intra', 'inter'],
		},
		transactionType: {
			type: String,
			required: [true, 'Please provide transaction type'],
			enum: ['credit', 'debit', 'airtime', 'data', 'bill', 'swap'],
		},
		method: {
			type: String,
			enum: ['intra', 'inter', 'card', 'deposit', 'transfer'],
		},
		senderAccount: {
			type: String,
			// required: [true, "Please provide transaction sender's account"],
		},
		senderName: {
			type: String,
			// required: [true, "Please provide transaction sender's name"],
		},
		senderPhoto: String,
		receiverAccount: {
			type: String,
			// required: [true, "Please provide transaction receiver's account"],
		},
		receiverName: {
			type: String,
			// required: [true, "Please provide transaction receiver's name"],
		},
		receiverPhoto: String,
		sourceBank: {
			type: String,
			// required: [true, 'Please provide transaction source bank'],
		},
		sourceBankSlug: {
			type: String,
		},
		destinationBank: {
			type: String,
			// required: [true, 'Please provide transaction destination bank'],
		},
		destinationBankSlug: {
			type: String,
		},
		amount: {
			type: String,
			// required: [true, 'Please provide transaction amount'],
		},
		description: {
			type: String,
		},
		reference: {
			type: String,
			required: [true, "Please provide transaction's reference"],
		},
		paystackReference: String,
		transferCode: String,
		currency: {
			type: String,
			required: [true, "Please provide transaction's currency"],
		},
		networkProvider: {
			type: String,
			// enum: ['mtn', 'airtel', 'glo', '9mobile'],
		},
		rechargePhoneNo: {
			type: String,
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		debitAccount: {
			type: String,
			// required: [true, 'Please provide debit account'],
		},
		dataPlan: Schema.Types.Mixed,
		billType: String,
		billName: String,
		rate: String,
		swapFrom: String,
		swapTo: String,
		swapFromAmount: String,
		swapToAmount: String,
		swapRate: Number,
		accNo: String,
		tagName: String,
		fullName: String,
		metadata: Schema.Types.Mixed,
	},
	{timestamps: true}
);

TransactionModel.pre('save', function (next) {
	if (this.currency === 'NGN') this.currency = 'naira';
	if (this.currency === 'USD') this.currency = 'dollar';
	if (this.currency === 'EUR') this.currency = 'euro';
	if (this.currency === 'GBP') this.currency = 'pound';
	next();
});

module.exports = mongoose.model('transaction', TransactionModel);
