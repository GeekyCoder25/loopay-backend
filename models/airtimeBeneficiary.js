const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const BeneficiarySchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		phoneNo: {
			type: String,
			required: [true, 'Please provide phone number'],
		},
		network: {
			type: String,
			required: [true, 'Please provide network'],
		},
	},
	{timestamps: true}
);
module.exports = mongoose.model('airtime-beneficiary', BeneficiarySchema);
