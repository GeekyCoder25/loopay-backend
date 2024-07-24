const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const BeneficiarySchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		beneficiaries: {
			type: [Object],
			required: true,
			beneficiary: {
				required: true,
				email: {
					type: String,
					required: [true, 'Please provide beneficiary email'],
				},
				// fullName: {
				// 	type: String,
				// 	required: [true, "Please provide the user's name"],
				// },
				// phoneNumber: {
				// 	type: String,
				// 	required: [true, "Please provide the user's phone Number"],
				// 	unique: true,
				// },
				// photo: {
				// 	type: String,
				// 	unique: true,
				// },
				// tagName: {
				// 	type: String,
				// 	required: [true, "Please provide user loopay's tag name"],
				// 	unique: true,
				// },
				// accNo: {
				// 	type: String,
				// 	required: [true, 'Please provide user account number'],
				// 	unique: true,
				// },
			},
		},
	},
	{timestamps: true}
);
module.exports = mongoose.model('beneficiary', BeneficiarySchema);
