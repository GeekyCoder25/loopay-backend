const AirtimeTransactionModel = require('../models/airtimeTransaction');
const TransactionModel = require('../models/transaction');

const getStatements = async (req, res) => {
	try {
		const {start, end, format, currency} = req.query;
		const {email} = req.user;
		if (!start || !end)
			throw new Error('Please provide the start and end dates query');
		const startDate = new Date(start);
		const endDate = new Date(end);
		const query = {
			email,
			createdAt: {$gte: startDate, $lte: endDate},
			currency,
		};
		const transactionModel = await TransactionModel.find(query);
		const airtimeTransaction = await AirtimeTransactionModel.find(query);
		const transactions = transactionModel
			.concat(airtimeTransaction)
			.sort((a, b) => {
				const dateA = new Date(a.createdAt);
				const dateB = new Date(b.createdAt);
				return dateA - dateB;
			});
		res.status(200).json(transactions);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	getStatements,
};
