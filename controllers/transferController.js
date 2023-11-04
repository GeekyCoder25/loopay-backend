const axios = require('axios');
const NairaWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const {requiredKeys} = require('../utils/requiredKeys');
const {addingDecimal} = require('../utils/addingDecimal');

const initiateTransfer = async (req, res) => {
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
		const wallet = await NairaWallet.findOne({phoneNumber});
		const senderWallet = wallet;
		if (!wallet) throw new Error('wallet not found');

		const convertToKobo = () => {
			amount * 100;
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
				const {email, phoneNumber} = req.user;
				const transaction = {
					id,
					status: 'pending',
					type: 'inter',
					transactionType: 'debit',
					senderAccount: senderWallet.loopayAccNo,
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
					reference: response.data.data.reference,
					transferCode: response.data.data.transfer_code,
					currency,
					metadata: metadata || null,
					createdAt: new Date(),
				};
				const notification = {
					email,
					id,
					phoneNumber,
					type: 'transfer',
					header: 'Debit transaction',
					message: `You sent ${
						currency + addingDecimal(Number(amount).toLocaleString())
					} to ${name}`,
					adminMessage: `${req.user.firstName} ${req.user.lastName} sent ${
						currency + addingDecimal(Number(amount).toLocaleString())
					} to an external bank account ${name}`,
					status: 'unread',
					photo: senderPhoto,
					metadata: {...transaction, transactionType: 'credit'},
				};

				const transactionExists = await TransactionModel.findOne({id});
				if (!transactionExists) {
					await TransactionModel.create({
						email,
						phoneNumber,
						...transaction,
					});

					await Notification.create(notification);
				}

				res.status(200).json({
					...response.data.data,
					amount: response.data.data.amount / 100,
				});
			} else {
				throw new Error(response.data.message);
			}
		} catch (err) {
			res.status(500).json('Server Error');
			console.log(err.response.data.message);
		}
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const initiateTransferToLoopay = async (req, res) => {
	try {
		const {
			phoneNumber,
			tagName,
			userName,
			fullName,
			photo,
			senderPhoto,
			amount,
			currency,
			id,
			description,
			metadata,
		} = req.body;

		const selectWallet = currency => {
			switch (currency) {
				case 'naira':
					return NairaWallet;
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
			}
		};
		const currencyWallet = selectWallet(currency);

		const senderWallet = await currencyWallet.findOne({
			phoneNumber: req.user.phoneNumber,
		});
		const sendeeWallet = await currencyWallet.findOne({phoneNumber});
		if (phoneNumber === req.user.phoneNumber)
			throw new Error("You can't send to yourself");
		if (!sendeeWallet) throw new Error('User not found');
		if (sendeeWallet.tagName !== (tagName || userName))
			throw new Error('Invalid Account Transfer');

		const amountInUnits = amount * 100;

		if (senderWallet.balance < amountInUnits)
			throw new Error('Insufficient funds');
		const transaction = {
			id,
			status: 'success',
			type: 'intra',
			senderAccount: senderWallet.loopayAccNo,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderPhoto: senderPhoto || '',
			receiverAccount: sendeeWallet.loopayAccNo,
			receiverName: fullName,
			receiverPhoto: photo || '',
			sourceBank: 'Loopay',
			destinationBank: 'Loopay',
			amount,
			description,
			reference: `TR${id}`,
			currency,
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

			const notification = {
				id,
				email: sendeeWallet.email,
				phoneNumber,
				type: 'transfer',
				header: 'Credit transaction',
				message: `${req.user.firstName} ${req.user.lastName} has sent you ${
					currency + addingDecimal(Number(amount).toLocaleString())
				}`,
				adminMessage: `${req.user.firstName} ${req.user.lastName} sent ${
					currency + addingDecimal(Number(amount).toLocaleString())
				} to ${fullName}`,
				status: 'unread',
				photo: senderPhoto,
				metadata: {...transaction, transactionType: 'credit'},
			};

			await Notification.create(notification);
		}

		senderWallet.balance -= amountInUnits;
		sendeeWallet.balance += amountInUnits;
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
	initiateTransfer,
	initiateTransferToLoopay,
};
