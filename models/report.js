const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const {isEmail} = require('validator');

const ReportSchema = new Schema(
	{
		email: {
			type: String,
			required: [true, 'Please provide email address'],
			validate: [isEmail, 'Invalid email address'],
		},
		title: {
			type: String,
			required: [true, 'Please provide report title'],
		},
		message: {
			type: String,
		},
		id: {
			type: String,
			required: [true, 'Please provide report transaction id'],
			unique: true,
		},
		metadata: {
			type: Object,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('report', ReportSchema);
