const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RequestModel = new Schema(
	{
		requesterAccount: {
			type: String,
			required: [true, "Please provide transaction sender's account"],
		},
		requesterName: {
			type: String,
			required: [true, "Please provide transaction sender's name"],
		},
		requesterPhoto: String,
		requesteeAccount: {
			type: String,
			required: [true, "Please provide transaction receiver's account"],
		},
		requesteeName: {
			type: String,
			required: [true, "Please provide transaction receiver's name"],
		},
		requesteePhoto: String,
		currency: {
			type: String,
			required: [true, "Please provide transaction's currency"],
		},
		amount: {
			type: String,
			required: [true, 'Please provide transaction amount'],
		},
		fee: {
			type: String,
			required: [true, 'Please provide transaction fee'],
		},
		description: {
			type: String,
		},
		reference: {
			type: String,
			unique: true,
			required: [true, "Please provide transaction's refrence"],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('request', RequestModel);
