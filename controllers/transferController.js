const axios = require('axios');
const WalletModel = require('../models/wallet');
const TransactionModel = require('../models/transaction');
const {requiredKeys} = require('../utils/requiredKeys');

const intitiateTransfer = async (req, res) => {
	try {
		const url = 'https://api.paystack.co/transfer';
		const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
		const config = {
			headers: {
				Authorization: `Bearer ${SECRET_KEY}`,
				'Content-Type': 'application/json',
			},
		};

		const {amount, reason, phoneNumber, recipientCode: recipient} = req.body;
		if (
			requiredKeys(req, res, [
				'amount',
				'reason',
				'phoneNumber',
				'email',
				'recipientCode',
			])
		)
			return;
		const wallet = await WalletModel.findOne({phoneNumber});
		const senderWallet = wallet;
		if (!wallet) throw new Error('wallet not found');

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
		if (wallet.balance < convertToKobo()) throw new Error('Insufficient funds');
		try {
			const response = await axios.post(url, data, config);

			if (response.data.status) {
				wallet.balance -= convertToKobo();
				await wallet.save();
				const {
					bankName,
					name,
					photo,
					senderPhoto,
					amount,
					id,
					reason,
					currency,
					metadata,
					slug,
					accNo,
				} = req.body;
				try {
					const transaction = {
						id,
						status: 'pending',
						type: 'inter',
						transactionType: 'debit',
						senderAccount: senderWallet.accNo2,
						senderName: `${req.user.firstName} ${req.user.lastName}`,
						senderPhoto: senderPhoto || '',
						receiverAccount: accNo,
						receiverName: name,
						receiverPhoto: photo || '',
						sourceBank: 'Loopay',
						destinationBank: bankName,
						destinationBankSlug: slug,
						amount,
						description: reason,
						reference: `TR${id}`,
						paystackRefrence: response.data.data.transfer_code,
						currency,
						metadata: metadata || null,
						createdAt: new Date(),
					};
					const {email, phoneNumber} = req.user;
					const transactionsExists = await TransactionModel.findOne({id});
					if (!transactionsExists) {
						await TransactionModel.create({
							email,
							phoneNumber,
							...transaction,
						});
					}
				} catch (err) {
					console.log(err.message);
				}
				res.status(200).json({
					...response.data.data,
					amount: response.data.data.amougvbnt / 100,
				});
			} else {
				throw new Error(response.data.message);
			}
			// finalizeTransfer(response.data.data.transfer_code);
		} catch (err) {
			res.status(500).json('Server Error');
			console.log(err.message);
		}
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const intitiateTransferToLoopay = async (req, res) => {
	try {
		const {
			phoneNumber,
			tagName,
			userName,
			fullName,
			photo,
			senderPhoto,
			amount,
			id,
			description,
			metadata,
		} = req.body;
		const senderWallet = await WalletModel.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeWallet = await WalletModel.findOne({phoneNumber});
		console.log(sendeeWallet);
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
			type: 'intra',
			senderAccount: senderWallet.accNo2,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderPhoto: senderPhoto || '',
			receiverAccount: sendeeWallet.accNo2,
			receiverName: fullName,
			receiverPhoto: photo || '',
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount,
			description,
			reference: `TR${id}`,
			currency: 'NGN',
			metadata: metadata || null,
			createdAt: new Date(),
		};
		const senderTransactionExists = await TransactionModel.findOne({
			id,
		});
		const sendeeTransactionExists = await TransactionModel.findOne({
			id,
		});
		if (!senderTransactionExists) {
			await TransactionModel.create({
				email: senderWallet.email,
				phoneNumber: req.user.phoneNumber,
				transactionType: 'debit',
				...transaction,
			});
		}
		if (!sendeeTransactionExists) {
			await TransactionModel.create({
				email: sendeeWallet.email,
				phoneNumber: sendeeWallet.phoneNumber,
				transactionType: 'credit',
				...transaction,
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
