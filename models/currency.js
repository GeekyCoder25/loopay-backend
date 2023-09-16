const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CurrencyRateModel = new Schema(
	{
		currency: {
			type: String,
			required: [true, 'Please provide CurrencyToCurrency name'],
			enum: [
				'NairaToDollar',
				'NairaToEuro',
				'NairaToPound',
				'DollarToNaira',
				'DollarToEuro',
				'DollarToPound',
				'EuroToNaira',
				'EuroToDollar',
				'EuroToPound',
				'PoundToNaira',
				'PoundToDollar',
				'PoundToEuro',
			],
		},
		rate: {
			type: Number,
			required: [true, 'Please provide swap rate'],
		},
		fee: {
			type: Number,
			required: [true, 'Please provide swap fee'],
		},
	},
	{timestamps: true}
);

module.exports = mongoose.model('currency-rate', CurrencyRateModel);
