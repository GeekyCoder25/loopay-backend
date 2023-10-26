const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const NotificationSchema = new Schema(
	{
		id: {
			type: String,
			required: [true, 'Please input notification ID'],
			unique: true,
		},
		email: {
			type: String,
			required: [true, 'Please input your email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		phoneNumber: {
			type: String,
			required: [true, 'Please provide your phone number'],
			validate: [isMobilePhone, 'Invalid phone number'],
		},
		type: {
			type: String,
			required: [true, 'Please provide notification type'],
		},
		header: {
			type: String,
			required: [true, 'Please provide notification header'],
		},
		message: {
			type: String,
			required: [true, 'Please provide notification message'],
		},
		adminMessage: {
			type: String,
			required: [true, 'Please provide admin notification message'],
		},
		status: {
			type: String,
			required: [true, 'Please provide notification status'],
			enum: ['read', 'unread'],
		},
		adminStatus: {
			type: String,
			enum: ['read', 'unread'],
		},
		photo: String,
		metadata: {
			type: Schema.Types.Mixed,
		},
	},
	{timestamps: true}
);
NotificationSchema.pre('save', function () {
	const changeSymbol = (currencyName, currencyAcronym, currencySymbol) => {
		if (this.message.includes(currencyName)) {
			this.message = this.message.replace(currencyName, currencySymbol);
		} else if (this.message.includes(currencyAcronym))
			this.message = this.message.replace(currencyAcronym, currencySymbol);
		if (this.adminMessage.includes(currencyName)) {
			this.adminMessage = this.adminMessage.replace(
				currencyName,
				currencySymbol
			);
		} else if (this.adminMessage.includes(currencyAcronym)) {
			this.adminMessage = this.adminMessage.replace(
				currencyAcronym,
				currencySymbol
			);
		}
	};
	changeSymbol('naira', 'NGN', '₦');
	changeSymbol('dollar', 'USD', '$');
	changeSymbol('euro', 'EUR', '€');
	changeSymbol('pound', 'GBP', '£');

	this.adminStatus = 'unread';
});

module.exports = mongoose.model('notification', NotificationSchema);
