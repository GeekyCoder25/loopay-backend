const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const UserDataModel = require('../models/userData');
const WalletModel = require('../models/wallet');

const webhookHandler = async (req, res) => {
	try {
		const event = req.body;
		if (event.event === 'charge.success') {
			const userData = await UserDataModel.findOne({
				email: event.data.customer.email,
			});
			if (!event.data.amount.toString().includes('.')) {
				event.data.amount += Number('.00');
			}
			const {
				sender_bank_account_number,
				account_name,
				sender_name,
				sender_bank,
				receiver_bank_account_number,
				receiver_bank,
				narration,
			} = event.data.authorization;

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
				type: 'inter',
				transactionType: 'credit',
				senderAccount: sender_bank_account_number,
				senderName: account_name || sender_name || 'null',
				receiverAccount: receiver_bank_account_number,
				receiverName: userData.userProfile.fullName,
				sourceBank: sender_bank || 'null',
				destinationBank: receiver_bank,
				amount: addingDecimal(event.data.amount / 100),
				description: narration || '',
				reference: `TR${event.data.id}`,
				payStackReference: event.data.reference,
				currency: 'NGN',
				metadata: event.data.metadata || null,
				createdAt: event.data.paidAt,
			};
			const {id, amount, customer} = event.data;
			const {email, phone} = customer;

			const transactionsExists = await TransactionModel.findOne({id});
			if (!transactionsExists) {
				await TransactionModel.create({
					email,
					phoneNumber: phone,
					...transaction,
				});
				const wallet = await WalletModel.findOne({email});
				wallet.balance += amount;
				await wallet.save();
			}
		}
		await WebhookModel.create(event);
		res.send(200);
		console.log(req.body);
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
		id: 3019783140,
		domain: 'test',
		status: 'success',
		reference: '1691789255720d97c26jll73n488',
		amount: 250000,
		message: null,
		gateway_response: 'Approved',
		paid_at: '2023-08-11T21:27:36.000Z',
		created_at: '2023-08-11T21:27:36.000Z',
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
			authorization_code: 'AUTH_9kvzqxb1ov',
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
		paidAt: '2023-08-11T21:27:36.000Z',
		requested_amount: 250000,
		pos_transaction_data: null,
		source: null,
		transactionType: 'credit',
	},
};
