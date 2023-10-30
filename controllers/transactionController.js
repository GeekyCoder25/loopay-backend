const AirtimeTransactionModel = require('../models/airtimeTransaction');
const SwapModel = require('../models/swapTransaction');
const TransactionModel = require('../models/transaction');

const getTransactions = async (req, res) => {
	try {
		const {date, swap} = req.query;
		const {email} = req.user;
		const transactionModel = await TransactionModel.find({email}).sort(
			'-createdAt'
		);
		const airtimeTransactionModel = await AirtimeTransactionModel.find({
			email,
		}).sort('-createdAt');
		const swapTransactions = await SwapModel.find({email});
		if (!transactionModel && !airtimeTransactionModel)
			return res.status(204).json('No transactions found for this user');
		let transactions = transactionModel;

		if (airtimeTransactionModel) {
			transactions = transactions.concat(airtimeTransactionModel);
		}

		if (swap) {
			transactions = transactions.concat(swapTransactions);
		}
		transactions.sort((a, b) => {
			const dateA = new Date(a.createdAt);
			const dateB = new Date(b.createdAt);
			return dateB - dateA;
		});

		if (date && JSON.parse(date)) {
			const groupTransactionsByDate = inputArray => {
				const groupedByDate = {};

				inputArray.forEach(transaction => {
					const dateObject = new Date(transaction.createdAt);
					const options = {month: 'short'};
					const date = `${dateObject.getDate()} ${dateObject.toLocaleString(
						'en-US',
						options
					)} ${dateObject.getFullYear()}`;
					if (!groupedByDate[date]) {
						groupedByDate[date] = [];
					}
					groupedByDate[date].push(transaction);
				});

				const resultArray = Object.keys(groupedByDate).map(date => {
					return {
						date,
						histories: groupedByDate[date],
					};
				});

				return resultArray;
			};
			return res.status(200).json(groupTransactionsByDate(transactions));
		}
		res.status(200).json({count: transactions.length, transactions});
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
