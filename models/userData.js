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
				fullName: String,
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
		tagName: {type: String, unique: true, sparse: true},
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
		referralCode: String,
	},
	{timestamps: true}
);

UserDataSchema.pre('save', function (next) {
	this.userProfile.fullName =
		this.userProfile.firstName + ' ' + this.userProfile.lastName;
	this.referralCode = Math.random().toString(36).substring(2, 8);
	next();
});

UserDataSchema.pre('findOneAndUpdate', function (next) {
	if (
		this._update?.userProfile?.firstName &&
		this._update?.userProfile?.lastName
	) {
		this._update.userProfile.fullName =
			this._update.userProfile.firstName +
			' ' +
			this._update.userProfile.lastName;
	}
	this.referralCode = Math.random().toString(36).substring(2, 8);
	next();
});

module.exports = mongoose.model('userData', UserDataSchema);
