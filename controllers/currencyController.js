const {default: axios} = require('axios');
const CurrencyRate = require('../models/currency');

const getRate = async (req, res) => {
	try {
		const apiData = await axios.get(
			`https://open.er-api.com/v6/latest/${req.params.currency}`
		);
		const rates = apiData.data.rates;
		res.status(200).json(rates);
	} catch (err) {
		res.status(400).json(err.message);
	}
};
// const getRate = async (req, res) => {
// 	const rates = await CurrencyRate.find().select([
// 		'-__v',
// 		'-createdAt',
// 		'-updatedAt',
// 		'-_id',
// 	]);
// 	if (!rates.length) {
// 		const currenciesSwapTo = [
// 			'NairaToDollar',
// 			'NairaToEuro',
// 			'NairaToPound',
// 			'DollarToNaira',
// 			'DollarToEuro',
// 			'DollarToPound',
// 			'EuroToNaira',
// 			'EuroToDollar',
// 			'EuroToPound',
// 			'PoundToNaira',
// 			'PoundToDollar',
// 			'PoundToEuro',
// 		];

// 		CurrencyRate.insertMany(
// 			currenciesSwapTo.map(currency => {
// 				return {
// 					currency,
// 					fee: 0,
// 					rate: 0,
// 				};
// 			})
// 		);
// 	}
// 	res.status(200).json(rates);
// };

const updateRate = async (req, res) => {
	try {
		const {currency, rate, fee} = req.body;
		const rates = await CurrencyRate.updateOne(
			{currency},
			{currency, rate, fee}
		);
		res.status(200).json(rates);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getRate,
	updateRate,
};
