const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail} = require('validator');

const UserDataSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		userProfile: {
			fullName: String,
			userName: String,
			phoneNumber: {
				type: String,
				unique: true,
			},
		},
		accountType: String,
		currencies: [
			{
				currency: String,
				acronym: String,
				amount: Number,
				symbol: String,
				minimumAmountToAdd: Number,
				fee: Number,
			},
		],
		verficationStaus: Boolean,
	},
	{timestamps: true}
);
module.exports = mongoose.model('userData', UserDataSchema);
