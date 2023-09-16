const CurrencyRate = require('../models/currency');

const getRate = async (req, res) => {
	const rates = await CurrencyRate.find().select([
		'-__v',
		'-createdAt',
		'-updatedAt',
		'-_id',
	]);
	if (!rates.length) {
		const currenciesSwapTo = [
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
		];

		CurrencyRate.insertMany(
			currenciesSwapTo.map(currency => {
				return {
					currency,
					fee: 0,
					rate: 0,
				};
			})
		);
	}
	res.status(200).json(rates);
};

const updateRate = async (req, res) => {
	const {currency, rate, fee} = req.body;
	const rates = await CurrencyRate.updateOne({currency}, {currency, rate, fee});
	res.status(200).json(rates);
};

module.exports = {
	getRate,
	updateRate,
};
