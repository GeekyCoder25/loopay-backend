const NairaWallet = require('../models/wallet');
const {handleErrors} = require('../utils/ErrorHandler');
const {createVirtualAccount} = require('../services/createVirtualAccount');
const {excludedFieldsInObject} = require('../utils/mongodbExclude');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');

const getWallet = async (req, res) => {
	try {
		const {email} = req.user;
		const walletNaira = await NairaWallet.findOne(
			{email},
			excludedFieldsInObject
		);
		const walletDollar = await DollarWallet.findOne(
			{email},
			excludedFieldsInObject
		);
		const walletEuro = await EuroWallet.findOne(
			{email},
			excludedFieldsInObject
		);
		const walletPound = await PoundWallet.findOne(
			{email},
			excludedFieldsInObject
		);

		if (!walletNaira) throw new Error('No wallet found');

		const convertToNaira = amountInKobo => amountInKobo / 100;

		walletNaira.balance = convertToNaira(walletNaira.balance);
		walletDollar.balance = convertToNaira(walletDollar.balance);
		walletEuro.balance = convertToNaira(walletEuro.balance);
		walletPound.balance = convertToNaira(walletPound.balance);

		res.status(200).json({walletNaira, walletDollar, walletEuro, walletPound});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postWallet = async (req, res) => {
	try {
		const {email, firstName, middleName, lastName, userName, phoneNumber} =
			req.body;
		const data = {
			email,
			first_name: firstName,
			middle_name: middleName,
			last_name: lastName,
			phone: phoneNumber,
			preferred_bank: process.env.PREFERRED_BANK,
			country: 'NG',
		};
		const walletExists = await NairaWallet.findOne(
			{phoneNumber},
			{__v: 0, _id: 0}
		);
		if (walletExists)
			return res
				.status(200)
				.json({message: 'User Already Exists', data: walletExists});
		const paystack = await createVirtualAccount(data);
		if (typeof paystack === 'string') {
			return res.status(400).json(paystack);
		}
		const {id, customer, account_number, bank} = paystack.data;
		const paystackData = {
			walletID: Number(id),
			email: customer.email,
			loopayAccNo: phoneNumber.slice(4),
			accNo: account_number,
			bank: bank.name,
			tagName: userName,
			firstName: customer.first_name,
			lastName: customer.last_name,
			phoneNumber: customer.phone,
			currency: 'naira',
		};
		await NairaWallet.create(paystackData);
		res.status(201).json({
			message: 'Wallet created sucessfully',
			paystackData,
		});
	} catch (err) {
		handleErrors(err, res);
	}
};

module.exports = {
	getWallet,
	postWallet,
};
