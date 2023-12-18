const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentProofModel = new Schema(
	{
		amount: {
			type: String,
			required: [true, 'please provide payment proof'],
		},
		message: String,
		image: {
			type: String,
			required: [true, 'please provide image url'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('payment-proof', PaymentProofModel);
