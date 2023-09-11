const DebitCard = require('../models/debitCard');

const getCards = async (req, res) => {
	const {email} = req.user;
	const {currency} = req.params;
	const cards = await DebitCard.find({email, currency});
	res.status(200).json(cards);
};

const postCard = async (req, res) => {
	const {email, phoneNumber} = req.user;
	const {cardNo, currency, expiryMonth, expiryYear, cvv} = req.body;
	const id = currency + cardNo + expiryMonth + expiryYear + cvv;

	try {
		const cards = await DebitCard.create({
			id,
			email,
			phoneNumber,
			currency,
			cardNo,
			expiryMonth,
			expiryYear,
			cvv,
			type: 'Visa Card',
			cardType: 'debit',
		});

		res.status(200).json(cards);
	} catch (err) {
		res.status(400).json(err.message);
		await DebitCard.deleteOne({id, email});

		console.log(err.message);
	}
};

module.exports = {
	getCards,
	postCard,
};
