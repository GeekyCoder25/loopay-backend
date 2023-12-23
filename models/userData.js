const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail, isMobilePhone} = require('validator');
// const UserProfile = require('./userProfile');

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
		invalidPinTried: Number,
		lastPinCheck: Date,
		accountType: {type: String, enum: ['Personal', 'Business']},
		verificationStatus: {
			type: String,
			enum: ['verified', 'pending', 'unVerified'],
		},
		photo: String,
		photoURL: String,
		localCurrencyCode: {
			type: String,
			required: [true, 'Please provide local currency code'],
		},
		country: {
			type: {
				name: String,
				code: String,
			},
		},
		level: {
			type: Number,
		},
		bvn: String,
		referralCode: String,
		sessionTime: Date,
		blockedUsers: [String],
		popUps: [],
		popUpIDs: [String],
		popUpLastQuery: Date,
	},
	{timestamps: true}
);

UserDataSchema.pre('save', function (next) {
	if (!this.userProfile.fullName)
		this.userProfile.fullName =
			this.userProfile.firstName + ' ' + this.userProfile.lastName;
	if (!this.referralCode)
		this.referralCode = Math.random().toString(36).substring(2, 8);
	if (!this.limit) this.limit = 1;
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
	next();
});

module.exports = mongoose.model('userData', UserDataSchema);
