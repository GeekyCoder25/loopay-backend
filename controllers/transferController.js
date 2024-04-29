/* eslint-disable no-mixed-spaces-and-tabs */
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
// const htmlToImage = require('html-to-image');

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

		const twoMinutesAgo = new Date();
		twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

		const duplicateTransaction = await TransactionModel.findOne({
			amount,
			senderAccount: senderWallet.loopayAccNo,
			receiverAccount: req.body.accNo,
			destinationBankSlug: req.body.slug,
			destinationBank: req.body.bankName,
			type: 'inter',
			method: 'inter',
			createdAt: {$gt: twoMinutesAgo},
		});

		if (duplicateTransaction) {
			const transactionTime = new Date(duplicateTransaction.createdAt);
			if (transactionTime > twoMinutesAgo) {
				throw new Error(
					'Duplicate transfer suspected, if this is deliberate kindly wait for two minutes before trying again'
				);
			}
		}

		if (!wallet) throw new Error('wallet not found');

		const convertToKobo = () => amount * 100;
		const data = {
			source: 'balance',
			reason,
			amount: convertToKobo(),
			recipient,
		};

		const convertToKoboWithFee = (Number(amount) + Number(fee)) * 100;
		if (wallet.balance < convertToKoboWithFee)
			throw new Error('Insufficient funds');
		try {
			const response = await axios.post(url, data, config);
			let transaction = {};
			if (response.data.status) {
				try {
					wallet.balance -= convertToKoboWithFee;
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
					transaction = {
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
						fromBalance: senderWallet.balance,
						toBalance: senderWallet.balance - convertToKoboWithFee,
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

					await sendReceipt({
						allCurrencies: req.body.allCurrencies,
						email,
						transaction: savedTransaction,
					});

					return res.status(200).json({
						...response.data.data,
						amount: response.data.data.amount / 100,
						transaction: savedTransaction,
					});
				} catch (err) {
					console.log(err.message);
					return res.status(200).json({
						...response.data.data,
						amount: response.data.data.amount / 100,
						transaction,
					});
				}
			} else if (response.data.message.includes('insufficient')) {
				console.log('Insufficient balance');
				return sendMail(
					{
						from: process.env.SUPPORT_EMAIL,
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
								A customer trying to send ₦${Number(amount).toLocaleString()} to
								other local banks just experienced a <b>server error</b> due to
								insufficient funds in your Paystack account dashboard, recharge
								now so you customers can experience seamless experience while
								transacting.
								<a href="https://dashboard.paystack.com/">Click here</a> to go
								to API dashboard
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

		const twoMinutesAgo = new Date();
		twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
		const duplicateTransaction = await TransactionModel.findOne({
			currency,
			amount,
			receiverAccount: sendeeWallet.loopayAccNo,
			createdAt: {$gt: twoMinutesAgo},
		});
		if (duplicateTransaction) {
			const transactionTime = new Date(duplicateTransaction.createdAt);
			if (transactionTime > twoMinutesAgo) {
				throw new Error(
					'Duplicate transfer suspected, if this is deliberate kindly wait for two minutes before trying again'
				);
			}
		}
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
				fromBalance: senderWallet.balance,
				toBalance: senderWallet.balance - amountInUnits,
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
				fromBalance: sendeeWallet.balance,
				toBalance: sendeeWallet.balance + amountInUnits,
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
		const amount = receiver.amount;
		const amountInUnits = amount * 100;
		const transaction = await TransactionModel.findOne({reference});

		if (
			transaction.status === 'refunded' ||
			transaction.status === 'reversed'
		) {
			await TransactionModel.findOneAndUpdate(
				{reference, transactionType: 'credit'},
				{status: 'success'}
			);
			await TransactionModel.findOneAndUpdate(
				{reference, transactionType: 'debit'},
				{status: 'success'}
			);
			senderWallet.balance -= amountInUnits;
			receiverWallet.balance += amountInUnits;

			await senderWallet.save();
			await receiverWallet.save();

			res.status(200).json({status: true, message: 'Transaction unreversed'});
		} else {
			await TransactionModel.findOneAndUpdate(
				{reference, transactionType: 'credit'},
				{status: 'refunded'}
			);
			await TransactionModel.findOneAndUpdate(
				{reference, transactionType: 'debit'},
				{status: 'reversed'}
			);
			senderWallet.balance += amountInUnits;
			receiverWallet.balance -= amountInUnits;

			await senderWallet.save();
			await receiverWallet.save();

			res.status(200).json({status: true, message: 'Transaction reversed'});
		}
	} catch (err) {
		console.log(err.message);
		res.status(400).json({status: false, message: err.message});
	}
};

const sendReceipt = async receiptData => {
	const {allCurrencies, email, transaction} = receiptData;
	const {
		status,
		receiverName,
		amount,
		transactionType,
		createdAt,
		sourceBank,
		destinationBank,
		senderAccount,
		receiverAccount,
		currency,
		description,
		reference,
		accNo,
		swapFrom,
		swapTo,
		swapFromAmount,
		swapToAmount,
		swapRate,
		networkProvider,
		rechargePhoneNo,
		billName,
		billType,
		token,
	} = transaction;

	const currencySymbol = allCurrencies.find(
		id => currency === id.currency || currency === id.acronym
	)?.symbol;

	const swapFromSymbol = allCurrencies.find(
		id => swapFrom === id.currency
	)?.symbol;

	const swapToSymbol = allCurrencies.find(id => swapTo === id.currency)?.symbol;

	const shareReceiptData = () => {
		if (transactionType === 'airtime' || transactionType === 'data') {
			return [
				{
					key: 'Transaction type',
					value: `Debit - ${transactionType} `,
				},
				{key: 'Network', value: networkProvider},
				{key: 'Phone Number', value: rechargePhoneNo},
				{key: 'Reference Id', value: reference},
				{key: 'Status', value: status},
			];
		} else if (transactionType === 'bill') {
			return [
				{
					key: 'Transaction type',
					value: `${transactionType} Payment - Debit`,
				},
				{key: 'Bill Type', value: billType},
				{key: 'Bill Service', value: billName},
				token && {key: 'Token', value: token},
				{key: 'Reference Id', value: reference},
				{key: 'Status', value: status},
			].filter(Boolean);
		} else if (transactionType === 'swap') {
			return [
				{key: 'Transaction type', value: 'Swap'},
				{key: 'Account', value: accNo},
				{key: 'Swap from currency', value: swapFrom},
				{key: 'Swap to currency', value: swapTo},
				{
					key: 'Swap from amount',
					value: `${swapFromSymbol}${addingDecimal(
						Number(swapFromAmount).toLocaleString()
					)}`,
				},
				{
					key: 'Swap to amount',
					value: `${swapToSymbol}${addingDecimal(
						Number(swapToAmount).toLocaleString()
					)}`,
				},
				{
					key: 'Swap Rate',
					value:
						swapRate < 1
							? `${swapToSymbol}1 = ${swapFromSymbol}${addingDecimal(
									Number(1 / swapRate || 0).toLocaleString()
							  )}`
							: `${swapFromSymbol}1 = ${swapToSymbol}
              ${addingDecimal(Number(swapRate || 0).toLocaleString())}`,
				},
				{key: 'Reference Id', value: reference},
				{key: 'Status', value: status},
			];
		}
		return [
			{key: 'Receiver Account', value: receiverAccount},
			{key: 'Sender Account', value: senderAccount},
			{key: 'Receiver Name', value: receiverName},
			{key: 'Transaction type', value: transactionType},
			{
				key: [transactionType === 'credit' ? 'Sender Bank' : 'Receiver Bank'],
				value: transactionType === 'credit' ? sourceBank : destinationBank,
			},
			{key: 'Reference Id', value: reference},
			{key: 'Narration', value: description, noTransform: true},
			{key: 'Status', value: status},
		];
	};

	// const node = String.raw`<html lang="en">
	// 		<head>
	// 			<meta
	// 				name="viewport"
	// 				content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
	// 			/>
	// 			<title>Loopay Receipt</title>
	// 			<link
	// 				rel="stylesheet"
	// 				href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
	// 			/>
	// 			<style>
	// 				@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');
	// 				* {
	// 					padding: 0;
	// 					margin: 0;
	// 				}
	// 				body{
	// 					font-family: 'Inter', sans-serif;
	// 					padding: 20px;
	// 				}
	// 				h1{
	// 					text-transform: capitalize
	// 				}
	// 				main {
	// 					max-width: 800px;
	// 					margin-top: 50px;
	// 				}
	// 				.container {
	// 					width: 100%;
	// 					height: 100%;
	// 					display: flex;
	// 					flex-direction: column;
	// 				}
	// 				.logo {
	// 					width: 150px;
	// 					height: 100px;
	// 					object-fit: contain;
	// 				}
	// 				header {
	// 					display: flex;
	// 					align-items: center;
	// 					justify-content: space-between;
	// 					gap: 20px;
	// 					width: 100%;
	// 					margin-bottom: 50px;
	// 				}
	// 				header span {
	// 					display: inline-block;
	// 					padding-top: 6px;
	// 				}
	// 				.title {
	// 					font-size: 2rem;
	// 				}
	// 				.amount {
	// 					display: flex;
	// 					align-items: flex-end;
	// 				}
	// 				.amount h4 {
	// 					margin-right: 5px;
	// 					margin-bottom: 2px;
	// 					font-size: 1.3rem;
	// 				}
	// 				.amount h5 {
	// 					margin-right: 10px;
	// 					margin-bottom: 2px;
	// 					font-size: 1.5rem;
	// 				}
	// 				.statusHeader {
	// 					font-weight: 600;
	// 					margin-top: 20px;
	// 					display: inline-block;
	// 					text-transform: capitalize;
	// 				}
	// 				.success {
	// 					color: #0fb52d;
	// 				}
	// 				.pending {
	// 					color: #ffa500;
	// 				}
	// 				.blocked,
	// 				.declined,
	// 				.abandoned {
	// 					color: #ed4c5c;
	// 				}
	// 				section {
	// 					margin-top: 30px;
	// 				}
	// 				section div {
	// 					display: flex;
	// 					align-items: center;
	// 					justify-content: space-between;
	// 					border-bottom: 1px solid #000;
	// 					padding: 10px 2px;
	// 				}
	// 				section .value {
	// 					text-transform: capitalize;
	// 				}
	// 				footer {
	// 					padding: 50px 20px 10px;
	// 					text-align: justify;
	// 					margin-top: auto;
	// 					line-height: 25px;
	// 					display: flex;
	// 					flex-direction: column;
	// 					gap: 10px;
	// 				}
	// 				footer h3 {
	// 					display: inline-block;
	// 				}
	// 				footer img {
	// 					width: 200px;
	// 					height: 200px;
	// 					margin-left: auto;
	// 				}
	// 			</style>
	// 		</head>
	// 		<body>
	// 			<h1>${transactionType} Transaction Alert - [₦${Number(
	// 	amount
	// ).toLocaleString()}]</h1>
	// 			<main>
	// 				<div class="container">
	// 					<header>
	// 						<div>
	// 							<h2 class="title">Receipt</h2>
	// 							<span>${new Date(createdAt).toString()}</span>
	// 						</div>
	// 						<img
	// 							src="https://res.cloudinary.com/geekycoder/image/upload/v1688782340/loopay/appIcon.png"
	// 							alt=""
	// 							class="logo"
	// 						/>
	// 					</header>
	// 					<div class="amount">
	// 						<h4>${currencySymbol}</h4>
	// 						<h1>
	// 							${
	// 								Number(amount || swapToAmount)
	// 									.toLocaleString()
	// 									.split('.')[0]
	// 							}
	// 						</h1>
	// 						<h5>.${Number(amount).toLocaleString().split('.')[1] || '00'}</h5>
	// 					</div>
	// 					<span class="statusHeader ${status}">${status}</span>
	// 					<section>
	// 						${shareReceiptData()
	// 							.map(
	// 								index =>
	// 									String.raw`
	// 										<div>
	// 											<h3>${index.key}</h3>
	// 											<p
	// 												class="status"
	// 												style="${!index.noTransform && 'text-transform: capitalize;'}"
	// 											>
	// 												${index.value}
	// 											</p>
	// 										</div>
	// 									`
	// 							)
	// 							.join('')}
	// 					</section>

	// 					<footer>
	// 						<div>
	// 							<h3>DISCLAIMER:</h3>
	// 							Your transaction has been successfully processed. Note. however,
	// 							that completion of any transfer may be affected by other factors
	// 							including but not limited to transmission errors, incomplete
	// 							information, fluctuations on the network/internet,
	// 							interruptions, glitch, delayed information or other matters
	// 							beyond the Bank's control which may impact on the transaction
	// 							and for which the Bank will not be liable. All transactions are
	// 							subject to Loopay confirmation and fraud proof verification.
	// 						</div>
	// 						<img
	// 							src="https://res.cloudinary.com/geekycoder/image/upload/v1703481253/loopay/qrcode.png"
	// 						/>
	// 					</footer>
	// 				</div>
	// 			</main>
	// 		</body>
	// 	</html>`;
	// const receiptImage = await htmlToImage.toPng(`<div
	// 					>
	// 					</div>`);
	// console.log('receiptImage');
	// console.log(receiptImage);
	await sendMail({
		from: process.env.SUPPORT_EMAIL,
		to: email,
		subject: 'Loopay Debit Transaction Alert',
		html: String.raw`<html lang="en">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
    <title>Loopay Receipt</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />
    <style>
        /* CSS styles will be converted to inline styles */
    </style>
</head>
<body style="font-family: 'Inter', sans-serif; padding: 20px; margin: 0;">
    <h1 style="text-transform: capitalize;">${transactionType} Transaction Alert - [₦${Number(
			amount
		).toLocaleString()}]</h1>
    <main style="max-width: 800px; margin-top: 50px;">
        <div class="container" style="width: 100%; height: 100%;">
            <header style="display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; margin-bottom: 50px;">
                <div>
                    <h2 class="title" style="font-size: 2rem;">Receipt</h2>
                    <span style="display: inline-block; padding-top: 6px;">${new Date(
											createdAt
										).toString()}</span>
                </div>
                <img src="https://res.cloudinary.com/geekycoder/image/upload/v1688782340/loopay/appIcon.png" alt="" class="logo" style="width: 150px; height: 100px; object-fit: contain;">
            </header>
            <div class="amount" style="display: flex; align-items: flex-end;">
                <h4 style="margin-right: 5px; margin-bottom: 2px; font-size: 1.3rem;">${currencySymbol}</h4>
                <h1 style="margin-right: 5px; margin-bottom: 2px; font-size: 1.5rem;">${
									Number(amount || swapToAmount)
										.toLocaleString()
										.split('.')[0]
								}</h1>
                <h5 style="margin-right: 5px; margin-bottom: 2px; font-size: 1.3rem;">.${
									Number(amount).toLocaleString().split('.')[1] || '00'
								}</h5>
            </div>
            <span class="statusHeader ${status}" style="font-weight: 600; margin-top: 20px; display: inline-block; text-transform: capitalize; ">${status}</span>
            <section style="margin-top: 30px;">
                ${shareReceiptData()
									.map(
										index => String.raw`
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #000; padding: 10px 2px;">
                        <h3 style="text-transform: capitalize;">${
													index.key
												}</h3>
                        <p class="status" style="${
													!index.noTransform
														? 'text-transform: capitalize;'
														: ''
												}">${index.value}</p>
                    </div>
                `
									)
									.join('')}
            </section>
            <footer style="padding: 50px 20px 10px; text-align: justify; margin-top: auto; line-height: 25px;">
                <div>
                    <h3 style="display: inline-block;">DISCLAIMER:</h3>
                    Your transaction has been successfully processed. Note. however, that completion of any transfer may be affected by other factors including but not limited to transmission errors, incomplete information, fluctuations on the network/internet, interruptions, glitch, delayed information or other matters beyond the Bank's control which may impact on the transaction and for which the Bank will not be liable. All transactions are subject to Loopay confirmation and fraud proof verification.
                </div>
                <img src="https://res.cloudinary.com/geekycoder/image/upload/v1703481253/loopay/qrcode.png" style="width: 200px; height: 200px; margin-left: auto; margin-top:10px;" />
            </footer>
        </div>
    </main>
</body>
</html>`,
	});
};

module.exports = {
	initiateTransfer,
	initiateTransferToLoopay,
	reverseTransaction,
};
