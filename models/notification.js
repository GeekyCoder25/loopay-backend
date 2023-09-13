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
			required: [true, 'Please provide notification status'],
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
	if (this.message.includes('naira'))
		this.message = this.message.replace('naira', '₦');
	if (this.message.includes('dollar'))
		this.message = this.message.replace('dollar', '$');
	if (this.message.includes('euro'))
		this.message = this.message.replace('euro', '€');
	if (this.message.includes('pound'))
		this.message = this.message.replace('pound', '£');

	this.adminStatus = 'unread';
});

module.exports = mongoose.model('notitfication', NotificationSchema);
