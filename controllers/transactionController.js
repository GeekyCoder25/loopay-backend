const TransactionModel = require('../models/transaction');

const getTransactions = async (req, res) => {
	try {
		const {limit = 25, page = 1, currency, start, end} = req.query;
		const {email} = req.user;
		const query = {email};
		const roundedLimit = Math.round(Number(limit) || 25);
		const skip = (page - 1 >= 0 ? page - 1 : 0) * roundedLimit;

		if (currency) {
			query.currency = currency.split(',');
		}
		let dateQuery = {};
		if (start) {
			const date = new Date(start);
			!isNaN(date.getTime()) ? (dateQuery.$gte = date) : '';
		}
		if (end) {
			const date = new Date(end);
			!isNaN(date.getTime()) ? (dateQuery.$lte = date) : '';
		}
		if (Object.keys(dateQuery).length) {
			query.createdAt = dateQuery;
		}
		let transactions;
		transactions = await TransactionModel.find(query)
			.skip(skip)
			.limit(roundedLimit)
			.select(['-__v'])
			.limit(limit)
			.sort('-createdAt');

		const totalTransactionsCount = await TransactionModel.find(
			query
		).countDocuments();
		res.status(200).json({
			page: Number(page) || 1,
			pageSize: transactions.length,
			totalPages: totalTransactionsCount / roundedLimit,
			total: totalTransactionsCount,
			data: transactions,
		});
	} catch (err) {
		console.log(err.message);
		return res.status(400).json(err.message);
	}
};
const postTransaction = async (req, res) => {
	try {
		const {email} = req.user;
		const {id} = req.body;
		const transactionsExists = await TransactionModel.findOne({id});
		if (transactionsExists) {
			return res.status(200).json(transactionsExists);
		}
		const transaction = await TransactionModel.create({
			email,
			...req.body,
		});
		return res.status(201).json(transaction);
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = {
	getTransactions,
	postTransaction,
};
