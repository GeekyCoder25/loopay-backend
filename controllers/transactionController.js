const TransactionModel = require('../models/transaction');

const getTransactions = async (req, res) => {
	try {
		const {date} = req.query;
		const {email} = req.user;
		const transactionModel = await TransactionModel.findOne({email});
		if (!transactionModel)
			return res.status(204).json('No transactions found for this user');
		const transactions = transactionModel.transactions;
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
						date: date,
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
const postTransaction = async (req, res, transaction, wallet) => {
	try {
		const {email} = req.user;
		const {_id} = req.body;
		const {reference, amount} = transaction;
		const requiredKeys = ['id', 'domain', 'status', 'reference', 'amount'];
		let unavailableKeys = [];
		requiredKeys.forEach(key => {
			if (!Object.keys(transaction).includes(key)) {
				unavailableKeys.push(key);
			}
		});
		if (unavailableKeys.length > 0)
			throw new Error(
				`Please provide all required keys '${[unavailableKeys]}'`
			);
		const transactionsExists = await TransactionModel.findOne({email});
		let transactions;
		if (transactionsExists) {
			const previousTransactions = transactionsExists.transactions;
			const transactionExist = previousTransactions.find(
				transaction => transaction.reference === reference
			);
			if (!transactionExist) {
				transactions = [transaction, ...previousTransactions];
				wallet.balance += amount;
				await wallet.save();
			} else {
				transactions = previousTransactions;
			}
			await TransactionModel.findOneAndUpdate(
				{email},
				{transactions},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			wallet.balance += amount;
			await wallet.save();
			await TransactionModel.create({
				_id,
				email,
				transactions: [transaction],
			});
		}
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = {
	getTransactions,
	postTransaction,
};
