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
		axios
			.post(url, data, config)
			.then(async response => {
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
							transactionType: 'Debit',
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
						const {_id} = req.user;
						const transactionModelExists = await TransactionModel.findOne({
							email,
						});
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
							await TransactionModel.create({
								_id,
								email,
								phoneNumber,
								transactions: [transaction],
							});
						}
					} catch (err) {
						console.log(err.message);
					}
					res.status(200).json({
						...response.data.data,
						amount: response.data.data.amount / 100,
					});
				} else {
					console.log();
					throw new Error(response.data.message);
				}
				// finalizeTransfer(response.data.data.transfer_code);
			})
			.catch(err => {
				res.status(500).json('Server Error');
				console.log(err.message);
			});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const intitiateTransferToLoopay = async (req, res) => {
	try {
		const {_id} = req.body;
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
