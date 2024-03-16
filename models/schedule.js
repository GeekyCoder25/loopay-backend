const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail, isMobilePhone} = require('validator');

const ScheduleSchema = new Schema({
	email: {
		type: String,
		required: [true, 'Please input your email address'],
		validate: [isEmail, 'Invalid email address'],
	},
	phoneNumber: {
		type: String,
		required: [true, 'Please input your phone number'],
		validate: [isMobilePhone, 'Invalid phone number'],
	},
	id: {
		type: String,
		required: [true, 'A schedule id is required'],
		unique: true,
	},
	title: {
		type: String,
		required: [true, 'Please provide schedule title'],
		unique: true,
	},
	frequency: {
		id: {
			type: String,
			required: [true, 'Please provide schedule frequency'],
		},
		label: {
			type: String,
			required: [true, 'Please provide schedule frequency label'],
		},
	},
	description: String,
	transactionType: {
		type: String,
		enum: ['loopay', 'others', 'airtime', 'data', 'bill'],
		required: [true, 'Provide transaction type'],
	},
	currency: {
		type: String,
		required: [true, 'Provide schedule currency'],
	},
	period: {
		period: String,
		label: String,
	},
	second: String,
	minute: String,
	hour: String,
	dayOfWeek: String,
	dateOfMonth: String,
	month: String,
	lastRunAt: Date,
	startDate: {
		type: Date,
		required: [true, 'Provide schedule start date'],
	},
	endDate: Date,
	transactionData: Object,
	user: Object,
	query: Object,
});

module.exports = mongoose.model('schedule-payment', ScheduleSchema);
