const {default: axios} = require('axios');
const RecipientModel = require('../models/recipient');
const {requiredKeys} = require('../utils/requiredKeys');

const createRecipient = async recipientData => {
	const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
	const config = {
		headers: {
			Authorization: `Bearer ${SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
	};
	try {
		const url = 'https://api.paystack.co/transferrecipient';
		const response = await axios.post(url, recipientData, config);
		return response.data;
	} catch (error) {
		return error.response.data;
	}
};

const getRecipients = async (req, res) => {
	try {
		const {email} = req.user;
		const {limit, currency} = req.query;
		let query = {};
		if (!currency) {
			throw new Error('Currency not provided');
		}
		query.email = email;
		query.currency = currency.split(',');
		const recipient = await RecipientModel.find(query).limit(limit);
		res.status(200).json(recipient);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};

const checkRecipient = async (req, res) => {
	try {
		if (requiredKeys(req, res, ['bank', 'accNo'])) return;
		const {code, currency, slug, type} = req.body.bank;
		const {email, phoneNumber} = req.user;
		const transferRecipientData = {
			type,
			name: req.body.fullName,
			account_number: req.body.accNo,
			bank_code: code,
			currency,
		};
		const transferRecipient = await createRecipient(transferRecipientData);

		if (!transferRecipient.status) throw new Error(transferRecipient.message);

		const recipient = {
			email,
			phoneNumber,
			type: transferRecipient.data.type,
			name: transferRecipient.data.details.account_name,
			accNo: transferRecipient.data.details.account_number,
			bankCode: transferRecipient.data.details.bank_code,
			currency,
			bankName: transferRecipient.data.details.bank_name,
			slug,
			recipientCode: transferRecipient.data.recipient_code,
		};
		res.status(200).json(recipient);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};
const postRecipient = async (req, res) => {
	try {
		if (requiredKeys(req, res, ['bank', 'accNo'])) return;
		const {code, currency, slug, type} = req.body.bank;
		const {email, phoneNumber} = req.user;
		const transferRecipientData = {
			type,
			name: req.body.fullName,
			account_number: req.body.accNo,
			bank_code: code,
			currency,
		};
		const transferRecipient = await createRecipient(transferRecipientData);

		if (!transferRecipient.status) throw new Error(transferRecipient.message);
		const checkRecipientExists = await RecipientModel.findOne({
			email,
			recipientCode: transferRecipient.data.recipient_code,
		});
		if (checkRecipientExists) return res.status(200).json(checkRecipientExists);
		const recipient = await RecipientModel.create({
			email,
			phoneNumber,
			type: transferRecipient.data.type,
			name: transferRecipient.data.details.account_name,
			accNo: transferRecipient.data.details.account_number,
			bankCode: transferRecipient.data.details.bank_code,
			currency,
			bankName: transferRecipient.data.details.bank_name,
			slug,
			recipientCode: transferRecipient.data.recipient_code,
		});

		res.status(200).json(recipient);
	} catch (err) {
		res.status(400).json(err.message);
		console.log(err.message);
	}
};

module.exports = {
	getRecipients,
	checkRecipient,
	postRecipient,
};
