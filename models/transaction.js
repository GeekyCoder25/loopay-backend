const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const TransactionModel = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		transactions: {
			type: [Object],
			required: true,
			transaction: {
				required: true,
			},
		},
	},
	{timestamps: true}
);
module.exports = mongoose.model('transaction', TransactionModel);
