const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;

const VerificationSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},

		country: {
			type: String,
			required: [true, "Please provide the user's name"],
		},
		idType: {
			type: String,
			required: [true, 'Please provide ID type for verification'],
			unique: true,
		},
		front: {
			type: String,
			required: [true, 'Please provide url to iD front image'],
			unique: true,
		},
		back: {
			type: String,
			required: [true, 'Please provide url to iD back image'],
			unique: true,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('verification', VerificationSchema);
