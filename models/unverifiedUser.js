const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail, isMobilePhone} = require('validator');
const {handlePhoneNumber} = require('../utils/checkPhoneNumber');
const UserSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
		},
		role: {
			type: String,
			enum: ['user', 'admin'],
		},
		firstName: {
			type: String,
			required: [true, 'Please input Your first name'],
		},
		lastName: {
			type: String,
			required: [true, 'Please input Your last name'],
		},
		userName: {
			type: String,
			required: [true, 'Please input Your Username'],
			minlength: [6, 'Your username should be at least 6 characters long'],
			maxlength: [
				16,
				'Your username should not be more than 16 characters long',
			],
			unique: true,
		},
		phoneNumber: {
			type: String,
			required: [true, 'Please input your phone number'],
			unique: true,
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		password: {
			type: String,
			required: [true, 'Please input a password'],
			minlength: [6, 'Your password must be at least 6 characters'],
		},
		otpCode: String,
		emailOtpCode: String,
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
		referrerCode: String,
	},
	{timestamps: true}
);

UserSchema.pre('save', function (next) {
	if (!this.role) this.role = 'user';
	if (!this.phoneNumber) this.phoneNumber = handlePhoneNumber(this.phoneNumber);
	if (this.userName.endsWith(' ')) {
		this.userName = this.userName.slice(0, -1);
	}
	this.userName = this.userName.toLowerCase().split(' ').join('_');
	next();
});
module.exports = mongoose.model('unverified-user', UserSchema);
