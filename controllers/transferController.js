const axios = require('axios');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const {requiredKeys} = require('../utils/requiredKeys');
const {addingDecimal} = require('../utils/addingDecimal');
const {sendMail} = require('../utils/sendEmail');

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

		const {
			amount,
			fee,
			reason,
			phoneNumber,
			recipientCode: recipient,
		} = req.body;

		if (
			requiredKeys(req, res, [
				'amount',
				'fee',
				'reason',
				'phoneNumber',
				'email',
				'recipientCode',
			])
		)
			return;
		const wallet = await LocalWallet.findOne({phoneNumber});
		const senderWallet = wallet;
		if (!wallet) throw new Error('wallet not found');

		const convertToKobo = () => amount * 100;
		const data = {
			source: 'balance',
			reason,
			amount: convertToKobo(),
			recipient,
		};

		const convertToKoboWithFee = () => (Number(amount) + Number(fee)) * 100;
		if (wallet.balance < convertToKoboWithFee())
			throw new Error('Insufficient funds');
		try {
			const response = await axios.post(url, data, config);

			if (response.data.status) {
				wallet.balance -= convertToKoboWithFee();
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
					status: 'success',
					type: 'inter',
					method: 'inter',
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
					metadata: {...transaction, transactionType: 'debit'},
				};

				const transactionExists = await TransactionModel.findOne({id});
				let savedTransaction = transactionExists;

				if (!transactionExists) {
					savedTransaction = await TransactionModel.create({
						email,
						phoneNumber,
						...transaction,
					});

					await Notification.create(notification);
				}
				req.schedule && (await req.schedule(req));
				return res.status(200).json({
					...response.data.data,
					amount: response.data.data.amount / 100,
					transaction: savedTransaction,
				});
			} else if (response.data.message.includes('insufficient')) {
				console.log('Insufficient balance');
				return sendMail(
					{
						from: process.env.ADMIN_EMAIL,
						to: process.env.ADMIN_EMAIL,
						subject: 'Insufficient balance',
						html: String.raw`<div
					style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
				>
					<div style="text-align: center">
						<img
							src="${process.env.CLOUDINARY_APP_ICON}"
							style="width: 200px; margin: 50px auto"
						/>
					</div>
					<p>
						A customer trying to send ₦${Number(
							amount
						).toLocaleString()} to other local banks just experienced a <b>server error</b>  due to insufficient funds
						in your Paystack account dashboard, recharge now so you
						customers can experience seamless experience while transacting.
						<a href="https://dashboard.paystack.com/">Click here</a> to go to API dashboard
					</p>
				</div>`,
					},
					'',
					'',
					() => res.status(400).json({message: 'Server error'})
				);
			} else {
				throw new Error(response.data.message);
			}
		} catch (err) {
			console.log(err.response?.data?.message || err);
			return res.status(500).json('Server Error');
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
					return LocalWallet;
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
				default:
					return LocalWallet;
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
			method: 'intra',
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
		let savedTransaction = senderTransactionExists;
		if (!senderTransactionExists) {
			savedTransaction = await TransactionModel.create({
				email: senderWallet.email,
				phoneNumber: req.user.phoneNumber,
				transactionType: 'debit',
				...transaction,
			});
			const notification = {
				id,
				email: senderWallet.email,
				phoneNumber,
				type: 'transfer',
				header: 'Debit transaction',
				message: `You sent ${
					currency + addingDecimal(Number(amount).toLocaleString())
				} ${req.user.firstName} ${req.user.lastName}`,
				adminMessage: `${req.user.firstName} ${req.user.lastName} sent ${
					currency + addingDecimal(Number(amount).toLocaleString())
				} to ${fullName}`,
				status: 'unread',
				photo: senderPhoto,
				metadata: {...transaction, transactionType: 'credit'},
			};
			await Notification.create(notification);
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
		req.schedule && (await req.schedule(req));

		res.status(200).json({
			message: 'Transfer Successful',
			...req.body,
			transaction: savedTransaction,
		});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const reverseTransaction = async (req, res) => {
	try {
		const {reference} = req.body;
		if (!reference) throw new Error('Reference ID not provided');

		const sender = await TransactionModel.findOne({
			reference,
			transactionType: 'credit',
		});
		const receiver = await TransactionModel.findOne({
			reference,
			transactionType: 'debit',
		});

		if (!sender)
			throw new Error("Can't find transaction with this reference ID");

		const selectWallet = currency => {
			switch (currency) {
				case 'naira':
					return LocalWallet;
				case 'dollar':
					return DollarWallet;
				case 'euro':
					return EuroWallet;
				case 'pound':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const currencyWallet = selectWallet(sender.currency);

		const senderWallet = await currencyWallet.findOne({
			email: sender.email,
		});
		const receiverWallet = await currencyWallet.findOne({
			email: receiver.email,
		});
		const amount = await receiver.amount;
		const amountInUnits = amount * 100;
		await TransactionModel.findOneAndUpdate(
			{reference, transactionType: 'credit'},
			{status: 'refunded'}
		);
		await TransactionModel.findOneAndUpdate(
			{reference, transactionType: 'debit'},
			{status: 'reversed'}
		);

		senderWallet.balance -= amountInUnits;
		receiverWallet.balance += amountInUnits;
		await senderWallet.save();
		await receiverWallet.save();

		res.status(200).json({status: true, message: 'Transaction reversed'});
	} catch (err) {
		console.log(err.message);
		res.status(400).json({status: false, message: err.message});
	}
};

module.exports = {
	initiateTransfer,
	initiateTransferToLoopay,
	reverseTransaction,
};
