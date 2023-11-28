const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const VerificationSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
			unique: true,
		},
		country: {
			type: String,
			required: [true, "Please provide the user's name"],
		},
		idType: {
			type: String,
			required: [true, 'Please provide ID type for verification'],
		},
		idValue: String,
		front: String,
		back: String,
		status: {
			type: String,
			required: [true, 'Please provide verification status'],
			enum: ['verified', 'pending', 'declined'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('verification', VerificationSchema);
