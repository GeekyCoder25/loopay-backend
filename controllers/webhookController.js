const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const UserDataModel = require('../models/userData');
const WalletModel = require('../models/wallet');

const webhookHandler = async (req, res) => {
	try {
		res.send(200);
		const event = req.body;
		event.data.transactionType = 'Credit';
		if (event.event === 'charge.success') {
			const userData = await UserDataModel.findOne({
				email: event.data.customer.email,
			});
			console.log(event);
			const {_id} = req.body;
			if (!event.data.amount.toString().includes('.')) {
				event.data.amount += Number('.00');
			}
			const addingDecimal = value => {
				if (!value.toString().includes('.')) {
					return value + '.00';
				} else if (value.toString().split('.')[1].length === 0) {
					return value + '00';
				} else if (value.toString().split('.')[1].length === 1) {
					return value + '0';
				}
				return value.toString();
			};

			const transaction = {
				id: event.data.id,
				status: event.data.status,
				transactionType: event.data.transactionType,
				senderAccount: event.data.authorization.sender_bank_account_number,
				senderName: event.data.authorization.account_name || 'null',
				receiverAccount: event.data.authorization.receiver_bank_account_number,
				receiverName: userData.userProfile.fullName,
				sourceBank: event.data.authorization.sender_bank || 'null',
				destinationBank: event.data.authorization.receiver_bank,
				amount: addingDecimal(event.data.amount),
				description: event.data.desc || '',
				reference: `TR${event.data.id}`,
				payStackReference: event.data.reference,
				currency: 'NGN',
				metadata: event.data.metadata || null,
				createdAt: event.data.paidAt,
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
			const convertToKobo = () => {
				const naira = addingDecimal(amount).split('.')[0];
				const kobo = addingDecimal(amount).split('.')[1];
				if (kobo === '00') {
					return naira * 100;
				}
				return naira * 100 + Number(kobo);
			};

			const transactionModelExists = await TransactionModel.findOne({email});
			const wallet = await WalletModel.findOne({email});
			if (transactionModelExists) {
				let transactions;
				const previousTransactions = transactionModelExists.transactions;

				const transactionExist = previousTransactions.find(
					transaction => transaction.id == id
				);
				if (transactionExist) {
					transactions = previousTransactions;
				} else {
					transactions = [transaction, ...previousTransactions];
					wallet.balance += convertToKobo();
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
				wallet.balance += convertToKobo();
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
