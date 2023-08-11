const axios = require('axios');
const WalletModel = require('../models/wallet');
const TransactionModel = require('../models/transaction');

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

	const recipientData = {
		type: 'nuban',
		name,
		account_number,
		bank_code,
		currency: 'NGN',
	};

	// const recipientData = {
	// 	type: 'nuban',
	// 	name: 'Toyib Lawal',
	// 	account_number: '2123503170',
	// 	bank_code: '033',
	// 	currency: 'NGN',
	// };
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
		const {_id} = req.body;
		const {
			phoneNumber,
			tagName,
			userName,
			fullName,
			amount,
			id,
			description,
			metadata,
		} = req.body;
		const senderWallet = await WalletModel.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeWallet = await WalletModel.findOne({phoneNumber});
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
		const transaction = {
			id,
			status: 'success',
			senderAccount: senderWallet.accNo2,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			receiverAccount: sendeeWallet.accNo2,
			receiverName: fullName,
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount,
			description,
			reference: `TR${id}`,
			currency: 'NGN',
			metadata: metadata || null,
			createdAt: new Date(),
		};
		const senderTransactionModelExists = await TransactionModel.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeTransactionModelExists = await TransactionModel.findOne({
			phoneNumber,
		});
		let senderTransactions;
		let sendeeTransactions;
		if (senderTransactionModelExists) {
			const previousTransactions = senderTransactionModelExists.transactions;
			const transactionExist = previousTransactions.find(
				transaction => transaction.id === id
			);
			if (transactionExist) {
				senderTransactions = previousTransactions;
			} else {
				senderTransactions = [
					{...transaction, transactionType: 'Debit'},
					...previousTransactions,
				];
			}
			await TransactionModel.findOneAndUpdate(
				{email: senderWallet.email},
				{transactions: senderTransactions},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			await TransactionModel.create({
				_id,
				email: senderWallet.email,
				phoneNumber: req.user.phoneNumber,
				transactions: [{...transaction, transactionType: 'Debit'}],
			});
		}

		if (sendeeTransactionModelExists) {
			const previousTransactions = sendeeTransactionModelExists.transactions;
			const transactionExist = previousTransactions.find(
				transaction => transaction.id === id
			);
			if (transactionExist) {
				sendeeTransactions = previousTransactions;
			} else {
				sendeeTransactions = [
					{...transaction, transactionType: 'Credit'},
					...previousTransactions,
				];
			}
			await TransactionModel.findOneAndUpdate(
				{email: sendeeWallet.email},
				{transactions: sendeeTransactions},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			await TransactionModel.create({
				_id: sendeeWallet._id,
				email: sendeeWallet.email,
				phoneNumber: sendeeWallet.phoneNumber,
				transactions: [{...transaction, transactionType: 'Credit'}],
			});
		}

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
