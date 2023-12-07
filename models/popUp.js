const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PopUpModel = new Schema(
	{
		title: {
			type: String,
			required: [true, 'Please provide pop up title'],
		},
		message: {
			type: String,
		},
		image: {
			type: String,
		},
		video: {
			type: String,
		},
		popUpID: {
			type: String,
			required: [true, 'Please provide pop up ID'],
			unique: true,
		},
		expireAt: Date,
	},
	{timestamps: true}
);

module.exports = mongoose.model('popUp', PopUpModel);
