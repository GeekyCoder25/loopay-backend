const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const ReferralSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		balance: Number,
		referrals: {
			type: [Object],
			required: true,
			referral: {
				required: true,
				email: {
					type: String,
					required: [true, 'Please input your email address'],
					validate: [isEmail, 'Invalid email address'],
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
				// verified: Boolean,
			},
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('referral', ReferralSchema);
