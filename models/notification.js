const mongoose = require('mongoose');
const {default: isEmail} = require('validator/lib/isEmail');
const Schema = mongoose.Schema;
const {isMobilePhone} = require('validator');

const NotificationSchema = new Schema(
	{
		id: {
			type: String,
			required: [true, 'Please input notifiaction ID'],
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
	const changeSymbol = (currencyName, currencySymbol) => {
		if (this.message.includes(currencyName))
			this.message = this.message.replace(currencyName, currencySymbol);
		if (this.adminMessage.includes(currencyName))
			this.adminMessage = this.adminMessage.replace(
				currencyName,
				currencySymbol
			);
	};
	changeSymbol('naira', '₦');
	changeSymbol('dollar', '$');
	changeSymbol('euro', '€');
	changeSymbol('pound', '£');

	this.adminStatus = 'unread';
});

module.exports = mongoose.model('notitfication', NotificationSchema);
