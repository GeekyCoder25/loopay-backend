const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail} = require('validator');
// const UserProfile = require('./userProfile');
const {isMobilePhone} = require('validator');

const UserDataSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		userProfile: {
			type: {
				firstName: String,
				lastName: String,
				userName: String,
				dob: String,
				phoneNumber: {
					type: String,
					required: [true, 'Please input your phone number'],
					unique: true,
					validate: [isMobilePhone, 'Invalid phone number'],
				},
				address: String,
				city: String,
				state: String,
				zipCode: Number,
			},
			required: true,
		},
		pin: String,
		accNo: Number,
		accountType: {type: String, enum: ['Personal', 'Business']},
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
		notificationLength: Number,
		photo: String,
		photoURL: String,
	},
	{timestamps: true}
);
module.exports = mongoose.model('userData', UserDataSchema);
