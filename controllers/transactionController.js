const TransactionModel = require('../models/transaction');

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
	postTransaction,
};
