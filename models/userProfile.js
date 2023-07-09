const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const UserProfile = new Schema({
	email: {
		type: String,
		required: [true, 'Please input your email address'],
		unique: true,
		validate: [isEmail, 'Invalid email address'],
	},
	fullName: String,
	userName: String,
	dob: String,
	phoneNumber: {
		type: String,
		unique: true,
		required: [true, 'please input your phone no'],
	},
	address: String,
	city: String,
	state: String,
	zipCode: Number,
	required: true,
});

module.exports = UserProfile;
