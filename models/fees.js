const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CurrencyRateModel = new Schema(
	{
		feeName: {
			type: String,
			required: [true, 'Please provide fee name'],
		},
		currency: {
			type: String,
			required: [true, 'Please provide currency'],
			enum: ['naira', 'dollar', 'euro', 'pound'],
		},
		group: {
			type: String,
			required: [true, 'Please provide fee group'],
		},
		amount: {
			type: Number,
			required: [true, 'Please provide fee amount'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('fees', CurrencyRateModel);
