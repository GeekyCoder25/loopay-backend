const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const WalletModel = require('../models/wallet');

const webhookHandler = async (req, res) => {
	try {
		res.send(200);
		// const event = webhookSample;
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

const webhookSample = {
	event: 'charge.success',
	data: {
		id: 3012151281,
		domain: 'test',
		status: 'success',
		reference: '1691523940636d97c26jll2pohss',
		amount: 250000,
		message: null,
		gateway_response: 'Approved',
		paid_at: '2023-08-08T19:45:41.000Z',
		created_at: '2023-08-08T19:45:41.000Z',
		channel: 'dedicated_nuban',
		currency: 'NGN',
		ip_address: null,
		metadata: {
			receiver_account_number: '1238075081',
			receiver_bank: 'Test Bank',
			custom_fields: [Array],
		},
		fees_breakdown: null,
		log: null,
		fees: 2500,
		fees_split: null,
		authorization: {
			authorization_code: 'AUTH_rgq974zjft',
			bin: '008XXX',
			last4: 'X553',
			exp_month: '07',
			exp_year: '2023',
			channel: 'dedicated_nuban',
			card_type: 'transfer',
			bank: null,
			country_code: 'NG',
			brand: 'Managed Account',
			reusable: false,
			signature: null,
			account_name: null,
			sender_country: 'NG',
			sender_bank: null,
			sender_bank_account_number: 'XXXXXX4553',
			receiver_bank_account_number: '1238075081',
			receiver_bank: 'Test Bank',
		},
		customer: {
			id: 130796347,
			first_name: 'Toyyib',
			last_name: 'Lawal',
			email: 'toyibe25@gmail.com',
			customer_code: 'CUS_iriumgn1avi1aq8',
			phone: '+2349073002599',
			metadata: {},
			risk_action: 'default',
			international_format_phone: '+2349073002599',
		},
		plan: {},
		subaccount: {},
		split: {},
		order_id: null,
		paidAt: '2023-08-08T19:45:41.000Z',
		requested_amount: 250000,
		pos_transaction_data: null,
		source: null,
	},
};
