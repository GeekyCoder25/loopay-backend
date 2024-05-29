const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InternationalModel = new Schema(
	{
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
	},
	{timestamps: true}
);

module.exports = mongoose.model('international', InternationalModel);
