const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const UserDataModel = require('../models/userData');
const LocalWallet = require('../models/wallet');
const {addingDecimal} = require('../utils/addingDecimal');
const Notification = require('../models/notification');
const jwt = require('jsonwebtoken');
const {sendMail} = require('../utils/sendEmail');

const webhookHandler = async (req, res) => {
	try {
		const event = req.body;
		console.log(event);
		if (event.event === 'charge.success') {
			const userData = await UserDataModel.findOne({
				email: event.data.customer.email,
			});
			const {
				sender_bank_account_number,
				account_name,
				sender_name,
				sender_bank,
				receiver_bank_account_number,
				receiver_bank,
				narration,
			} = event.data.authorization;

			const {id, amount, customer} = event.data;
			const {email, phone} = customer;
			const wallet = await LocalWallet.findOne({email});

			const transaction = {
				id,
				status: event.data.status,
				type: 'inter',
				transactionType: 'credit',
				method: 'inter',
				senderAccount: sender_bank_account_number,
				senderName: account_name || sender_name || 'An external user',
				receiverAccount: receiver_bank_account_number,
				receiverName: userData.userProfile.fullName,
				sourceBank: sender_bank || 'External bank',
				fromBalance: wallet.balance,
				toBalance: wallet.balance + amount,
				destinationBank: receiver_bank,
				amount: addingDecimal(`${event.data.amount / 100}`),
				description: narration || '',
				reference: `TR${id}`,
				paystackReference: event.data.reference,
				currency: event.data.currency,
				metadata: event.data.metadata || null,
				createdAt: event.data.paidAt,
			};

			const transactionsExists = await TransactionModel.findOne({id});

			if (!transactionsExists) {
				await TransactionModel.create({
					email,
					phoneNumber: phone || wallet.phoneNumber,
					...transaction,
				});

				const notification = {
					id,
					email: wallet.email,
					phoneNumber: wallet.phoneNumber,
					type: 'transfer',
					header: 'Credit transaction',
					message: `${
						account_name || sender_name || 'An external user'
					} has sent you ${
						event.data.currency + addingDecimal((amount / 100).toLocaleString())
					}`,
					adminMessage: `${
						account_name || sender_name || 'An external user'
					} sent ${
						event.data.currency + addingDecimal((amount / 100).toLocaleString())
					} to ${userData.userProfile.fullName}`,
					status: 'unread',
					photo: '',
					metadata: {...transaction, transactionType: 'credit'},
				};

				await Notification.create(notification);

				if (userData.isEmailAlertSubscribed) {
					await sendReceipt({
						email,
						transaction,
					});
				}
				wallet.balance += amount;
				await wallet.save();
			}
		}
		await WebhookModel.create(event);
		res.send(200);
	} catch (err) {
		console.log(err.message);
	}
};

const sendReceipt = async receiptData => {
	const {email, transaction} = receiptData;
	const {
		status,
		receiverName,
		amount,
		transactionType,
		createdAt,
		sourceBank,
		senderAccount,
		receiverAccount,
		description,
		reference,
	} = transaction;

	const currencySymbol = '₦';

	const shareReceiptData = () => {
		return [
			{key: 'Receiver Account', value: receiverAccount},
			{key: 'Sender Account', value: senderAccount},
			{key: 'Receiver Name', value: receiverName},
			{key: 'Transaction type', value: transactionType},
			{key: 'Sender Bank', value: sourceBank},
			{key: 'Reference ID', value: reference},
			{key: 'Narration', value: description, noTransform: true},
			{key: 'Status', value: status},
		];
	};

	const hashedEmail = jwt.sign(email, process.env.JWT_SECRET);

	await sendMail({
		from: {
			name: 'Loopay',
			address: process.env.SUPPORT_EMAIL,
		},
		to: email,
		subject: `Loopay ${
			transactionType[0].toUpperCase() + transactionType.slice(1)
		} Transaction Alert`,
		html: String.raw`<html lang="en">
			<head>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no"
				/>
				<title>Loopay Receipt</title>
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css"
				/>
				<style>
					* {
						padding: 0;
						margin: 0;
						box-sizing: border-box;
					}
					.success {
						color: #0fb52d;
					}
					.pending {
						color: #ffa500;
					}
					.blocked,
					.declined,
					.abandoned {
						color: #ed4c5c;
					}
				</style>
			</head>
			<body style="font-family: 'Inter', sans-serif;">
				<main style="max-width: 800px; margin-top: 50px; padding: 20px;">
					<h1 style="text-transform: capitalize">
						${transactionType} Transaction Alert -
						[₦${Number(amount).toLocaleString()}]
						<span style="display: none">${reference}</span>
					</h1>
					<img
								src="https://res.cloudinary.com/geekycoder/image/upload/v1688782340/loopay/appIcon.png"
								alt=""
								class="logo"
								style="width: 150px; height: 100px; object-fit: contain; float: right"
							/>
					<div class="container" style="width: 100%; height: 100%; clear: right;">
						<header
						style="
						gap: 20px;
						width: 100%;
						margin-bottom: 30px;
					"
						>
						<div>
							<h2 class="title" style="font-size: 2rem">Receipt</h2>
								<span style="display: inline-block; padding-top: 6px"
									>${new Date(createdAt).toString()}</span
								>
							</div>
						</header>
						<div class="amount">
							<h4 style="font-size: 1.3rem; display: inline-block;">
								${currencySymbol}
							</h4>
							<h1
								style="margin-top: -20px; font-size: 2.5rem; display: inline-block"
							>
								${Number(amount).toLocaleString().split('.')[0]}
							</h1>
							<h5
								style="margin-right: 5px; font-size: 1.3rem; display: inline-block"
							>
								.${Number(amount).toLocaleString().split('.')[1] || '00'}
							</h5>
						</div>
						<span
							class="statusHeader ${status}"
							style="
						font-weight: 600;
						margin-top: 20px;
						display: inline-block;
						text-transform: capitalize;
					"
							>${status}</span
						>
						<section style="margin-top: 30px">
							${shareReceiptData()
								.map(
									index => String.raw`
										<div
											style="padding: 10px 2px"
										>
											<h3 style="text-transform: capitalize; display: inline">
												${index.key} <span style="display: none">${reference}</span>
											</h3>
											${
												!index.noTransform
													? String.raw`<span
														class="status"
														style="text-transform: capitalize; float: right; clear: both;"
												  >
												  ${index.value} <span style="display: none">${reference}</span>
												  </span>`
													: String.raw`<span
														class="status"
														style="float: right; clear: both;"
														>${index.value}</span
												  >`
											}
										<hr />
										</div>
									`
								)
								.join('')}
						</section>
						<aside
							style="
						padding: 30px 0px 10px;
						text-align: justify;
						line-height: 25px;
					"
						>
							<div>
								<span style="display: inline-block; font-weight: 600;"
									>DISCLAIMER:</span
								>
								Your transaction has been successfully processed. Note. however,
								that completion of any transfer may be affected by other factors
								including but not limited to transmission errors, incomplete
								information, fluctuations on the network/internet,
								interruptions, glitch, delayed information or other matters
								beyond the Bank's control which may impact on the transaction
								and for which the Bank will not be liable. All transactions are
								subject to Loopay confirmation and fraud proof verification.
								<span style="display: none">${reference}</span>
							</div>
							<img
								src="https://res.cloudinary.com/geekycoder/image/upload/v1703481253/loopay/qrcode.png"
								style="
							width: 200px;
							height: 200px;
							margin-left: auto;
							margin-top: 10px;
							float: right;
							clear: right;
						"
							/>
							<span>Click <a href="${
								process.env.BASE_URL
							}/api/email/unsubscribe/${hashedEmail}">here</a> to unsubscribe <span style="display: none">${reference}</span></span>
						</aside>
					</div>
				</main>
			</body>
		</html>`,
	});
};

module.exports = {
	webhookHandler,
};

const webhookSample = {
	event: 'charge.success',
	data: {
		id: 3019783140,
		domain: 'test',
		status: 'success',
		reference: '1691789255720d97c26jll73n488',
		amount: 250000,
		message: null,
		gateway_response: 'Approved',
		paid_at: '2023-08-11T21:27:36.000Z',
		created_at: '2023-08-11T21:27:36.000Z',
		channel: 'dedicated_nuban',
		currency: 'NGN',
		ip_address: null,
		metadata: {
			receiver_account_number: '1238075081',
			receiver_bank: 'Test Bank',
			custom_fields: [Array],
		},
		fees_breakdown: null,
		log: null,
		fees: 2500,
		fees_split: null,
		authorization: {
			authorization_code: 'AUTH_9kvzqxb1ov',
			bin: '008XXX',
			last4: 'X553',
			exp_month: '07',
			exp_year: '2023',
			channel: 'dedicated_nuban',
			card_type: 'transfer',
			bank: null,
			country_code: 'NG',
			brand: 'Managed Account',
			reusable: false,
			signature: null,
			account_name: null,
			sender_country: 'NG',
			sender_bank: null,
			sender_bank_account_number: 'XXXXXX4553',
			receiver_bank_account_number: '1238075081',
			receiver_bank: 'Test Bank',
		},
		customer: {
			id: 130796347,
			first_name: 'Toyyib',
			last_name: 'Lawal',
			email: 'toyibe25@gmail.com',
			customer_code: 'CUS_iriumgn1avi1aq8',
			phone: '+2349073002599',
			metadata: {},
			risk_action: 'default',
			international_format_phone: '+2349073002599',
		},
		plan: {},
		subaccount: {},
		split: {},
		order_id: null,
		paidAt: '2023-08-11T21:27:36.000Z',
		requested_amount: 250000,
		pos_transaction_data: null,
		source: null,
		transactionType: 'credit',
	},
};
