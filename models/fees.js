const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CurrencyRateModel = new Schema(
	{
		feeName: {
			type: String,
			required: [true, 'Please provide fee name'],
		},
		amount: {
			type: Number,
			required: [true, 'Please provide fee amount'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('fees', CurrencyRateModel);
