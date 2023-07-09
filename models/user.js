const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail, isMobilePhone} = require('validator');
const UserSchema = new Schema(
	{
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
		},
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			unique: true,
			validate: [isEmail, 'Invalid email address'],
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
	},
	{timestamps: true}
);

module.exports = mongoose.model('user', UserSchema);
