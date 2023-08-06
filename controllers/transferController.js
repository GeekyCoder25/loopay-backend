const axios = require('axios');
const WalletModel = require('../models/wallet');

const transferRecipent = async recipientData => {
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
		console.log('Recipient created:', response.data.data.recipient_code);
		return response.data.data.recipient_code;
	} catch (error) {
		console.error('Error creating recipient:', error.response.data);
	}
};

const intitiateTransfer = async (req, res) => {
	const url = 'https://api.paystack.co/transfer';
	const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
	const config = {
		headers: {
			Authorization: `Bearer ${SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
	};

	const {fullName: name, amount, reason, phoneNumber} = req.body;
	const wallet = await WalletModel.findOne({phoneNumber});
	const account_number = wallet.accNo;
	const bank_code = process.env.PREFERRED_BANK === 'wema_bank' ? '035' : '044';
	// const banks = await axios.get('https://api.paystack.co/bank');
	// const bank_code = banks.data.find(walllet.apiData.bank.name === );

	// const recipientData = {
	// 	type: 'nuban',
	// 	name,
	// 	account_number,
	// 	bank_code,
	// 	currency: 'NGN',
	// };

	const recipientData = {
		type: 'nuban',
		name: 'Toyib Lawal',
		account_number: '2123503170',
		bank_code: '033',
		currency: 'NGN',
	};
	const recipient = await transferRecipent(recipientData);
	const convertToKobo = () => {
		const naira = amount.split('.')[0];
		const kobo = amount.split('.')[1];
		if (kobo === '00') {
			return naira * 100;
		}
		return naira * 100 + Number(kobo);
	};
	const data = {
		source: 'balance',
		reason,
		amount: convertToKobo(),
		recipient,
	};

	axios
		.post(url, data, config)
		.then(response => {
			console.log(response.data);
			// verifyTransfer(response.data.reference);
		})
		.catch(error => {
			console.error('Error:', error.response.data);
		});
};

const intitiateTransferToLoopay = async (req, res) => {
	try {
		const {phoneNumber, tagName, userName, amount} = req.body;
		const sendeeWallet = await WalletModel.findOne({phoneNumber});
		const senderWallet = await WalletModel.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		if (sendeeWallet.tagName !== (tagName || userName))
			throw new Error('Invalid Account Transfer');
		const convertToKobo = () => {
			const naira = amount.split('.')[0];
			const kobo = amount.split('.')[1];
			if (kobo === '00') {
				return naira * 100;
			}
			return naira * 100 + Number(kobo);
		};
		if (senderWallet.balance < convertToKobo())
			throw new Error('Insufficient funds');
		senderWallet.balance -= convertToKobo();
		sendeeWallet.balance += convertToKobo();
		await senderWallet.save();
		await sendeeWallet.save();
		res.status(200).json({
			message: 'Transfer Successful',
			data: req.body,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

// const verifyTransfer = reference => {
// 	console.log(reference);
// 	const url = `https://api.paystack.co/transaction/verify/${reference}`;
// 	axios
// 		.get(url, config)
// 		.then(response => {
// 			console.log('Response:', response.data);
// 		})
// 		.catch(error => {
// 			console.error('Error2:', error.response.data);
// 		});
// };

module.exports = {
	intitiateTransfer,
	intitiateTransferToLoopay,
};
