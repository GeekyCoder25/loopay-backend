const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UpdateModel = new Schema(
	{
		message: {
			type: Object,
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('update-test', UpdateModel);
