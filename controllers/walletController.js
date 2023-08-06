const Wallet = require('../models/wallet');
const {handleErrors} = require('./userDataController');
const {createVirtualAccount} = require('../middleware/createVirtualAccount');
const {excludedFieldsInObject} = require('../utils/mongodbExclude');

const getWallet = async (req, res) => {
	try {
		const {phoneNumber} = req.user;
		const wallet = await Wallet.findOne({phoneNumber}, excludedFieldsInObject);
		if (!wallet) throw new Error('No wallet found');
		const convertToNaira = amountInKobo => {
			const naira = Math.floor(amountInKobo / 100);
			const kobo = amountInKobo % 100;
			return `${naira}.${kobo.toString().padStart(2, '0')}`;
		};
		wallet.balance = convertToNaira(wallet.balance);
		res.status(200).json(wallet);
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
		const walletExists = await Wallet.findOne({phoneNumber}, {__v: 0, _id: 0});
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
			accNo: account_number,
			accNo2: phoneNumber.slice(4),
			bank: bank.name,
			tagName: userName,
			firstName: customer.first_name,
			lastName: customer.last_name,
			phoneNumber: customer.phone,
			apiData: paystack,
		};
		await Wallet.create(paystackData);
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
