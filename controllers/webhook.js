const WebhookModel = require('../models/webhook');

const webhookHandler = async (req, res) => {
	res.send(200);
	const event = req.body;
	console.log(event);
	console.log(webhookSample);
	await WebhookModel.create(webhookSample);
	// Do something with event
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
