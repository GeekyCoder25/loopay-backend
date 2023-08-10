const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const WalletModel = require('../models/wallet');

const webhookHandler = async (req, res) => {
	try {
		res.send(200);
		const event = req.body;
		event.data.transactionType = 'Credit';
		if (event.event === 'charge.success') {
			const {_id} = req.body;
			const transaction = {
				id: event.data.id,
				status: event.data.status,
				transactionType: event.data.transactionType,
				senderAccount: event.data.authorization.sender_bank_account_number,
				receiverAccount: event.data.authorization.receiver_bank_account_number,
				sourceBank: 'Loopay',
				destinationBank: 'Loopay',
				amount: event.data.amount,
				description: event.data.desc || '',
				reference: `TR${event.data.id}`,
				payStackReference: event.data.reference,
				currency: 'NGN',
				metadata: event.data.metadata || null,
			};
			const {id, amount, customer} = event.data;
			const {email, phone} = customer;
			const requiredKeys = ['id', 'status', 'reference', 'amount'];
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
			const transactionModelExists = await TransactionModel.findOne({email});
			const wallet = await WalletModel.findOne({email});
			if (transactionModelExists) {
				let transactions;
				const previousTransactions = transactionModelExists.transactions;
				const transactionExist = previousTransactions.find(
					transaction => transaction.id === id
				);
				if (transactionExist) {
					transactions = previousTransactions;
				} else {
					transactions = [transaction, ...previousTransactions];
					wallet.balance += amount;
					await wallet.save();
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
					phoneNumber: phone,
					transactions: [transaction],
				});
			}
		}
		await WebhookModel.create(event);
	} catch (err) {
		console.log(err.message);
	}
};

module.exports = {
	webhookHandler,
};
