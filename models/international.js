const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const InternationalModel = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		amount: {
			type: Number,
			required: [true, 'Please provide fee name'],
		},
		description: String,
		id: {
			type: String,
			required: [true, 'Please provide transaction id'],
		},
		receiverAccountNo: {
			type: Number,
			required: [true, 'Please provide receiver account number'],
		},
		receiverBank: {
			type: String,
			required: [true, 'Please provide receiver bank name'],
		},
		receiverName: {
			type: String,
			required: [true, 'Please provide receiver name'],
		},
		sendFromCurrency: {
			type: String,
			required: [true, 'Please provide receiver name'],
		},
		sendFrom: {
			type: Object,
			required: [true, 'Please provide currency to send from '],
		},
		sendTo: {
			type: Object,
			required: [true, 'Please provide currency to send to '],
		},
		toReceiveAmount: {
			type: Number,
			required: [true, 'Please provide amount to be received'],
		},
		rate: {
			from: String,
			to: String,
			rate: Number,
		},
		fee: {
			type: Number,
			required: [true, 'Please provide transaction amount'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('international', InternationalModel);
