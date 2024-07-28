const WebhookModel = require('../models/webhook');
const TransactionModel = require('../models/transaction');
const UserDataModel = require('../models/userData');
const {addingDecimal} = require('../utils/addingDecimal');
const Notification = require('../models/notification');
const jwt = require('jsonwebtoken');
const {sendMail} = require('../utils/sendEmail');
const crypto = require('crypto');
const {default: axios} = require('axios');
const pushNotification = require('../models/pushNotification');
const {default: Expo} = require('expo-server-sdk');
const sendPushNotification = require('../utils/pushNotification');
const selectWallet = require('../services/selectWallet');

const webhookHandler = async (req, res) => {
	try {
		const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
		const config = {
			headers: {
				Authorization: `Bearer ${SECRET_KEY}`,
				'Content-Type': 'application/json',
			},
		};
		const hash = crypto
			.createHmac('sha512', SECRET_KEY)
			.update(JSON.stringify(req.body))
			.digest('hex');

		if (hash == req.headers['x-paystack-signature']) {
			const event = req.body;
			if (event.event === 'charge.success') {
				if (event?.data?.channel === 'card') {
					const transactionRef = event?.data?.reference;
					const response = await axios.get(
						`https://api.paystack.co/transaction/verify/${transactionRef}`,
						config
					);
					if (response.data.status === true) {
						await cardWebhook(response.data);
					}
				} else {
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

					const {id, amount, customer, currency, reference, metadata, paidAt} =
						event.data;
					const {email, phone} = customer;

					const currencyWallet = selectWallet(currency);
					const wallet = await currencyWallet.findOne({email});

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
						amount: amount / 100,
						description: narration || '',
						reference: `TR${id}`,
						paystackReference: reference,
						currency,
						metadata: metadata || null,
						createdAt: paidAt,
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
								event.data.currency + addingDecimal(amount / 100)
							}`,
							adminMessage: `${
								account_name || sender_name || 'An external user'
							} sent ${event.data.currency + addingDecimal(amount / 100)} to ${
								userData.userProfile.fullName
							}`,
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
						const expoPushToken = (await pushNotification.findOne({email}))
							?.token;
						if (expoPushToken) {
							if (Expo.isExpoPushToken(expoPushToken)) {
								await sendPushNotification({
									token: expoPushToken,
									title: 'Incoming Credit Transaction',
									message: `${
										account_name || sender_name || 'An external user'
									} sent you ${wallet.currencyDetails.symbol}${addingDecimal(
										amount / 100
									)} to your ${wallet.currencyDetails.code} account`,
									data: {notificationType: 'transaction', data: transaction},
								});
							}
						}
					}
				}
			}
			await WebhookModel.create(event);
			res.send(200);
		}
	} catch (err) {
		const error =
			err.response?.data?.message || err.data?.message || err.message || err;
		console.log(error);
		res.status(400).json(error);
	}
};

const cardWebhook = async event => {
	const userData = await UserDataModel.findOne({
		email: event.data.customer.email,
	});
	const {last4, bank} = event.data.authorization;
	const {id, amount, customer, currency, metadata} = event.data;
	const {email, phone, first_name, last_name} = customer;
	const amountMinusFee = amount - Number(metadata.fee);

	const currencyWallet = selectWallet(currency);
	const wallet = await currencyWallet.findOne({email});
	const transaction = {
		id,
		status: event.data.status,
		type: 'inter',
		transactionType: 'credit',
		method: 'card',
		senderAccount: `Card ...${last4}`,
		senderName: `Card ...${last4}`,
		receiverAccount: wallet.accNo || wallet.loopayAccNo,
		receiverName: userData.userProfile.fullName,
		sourceBank: bank,
		fromBalance: wallet.balance,
		toBalance: wallet.balance + amountMinusFee,
		destinationBank: wallet.bank || 'Loopay Bank',
		amount: amountMinusFee / 100,
		description: 'Card deposit',
		reference: `TR${id}`,
		paystackReference: event.data.reference,
		currency,
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
				event.data.currency + addingDecimal(amountMinusFee / 100)
			} has been deposited to your account via card ...${last4}`,
			adminMessage: `${first_name} ${last_name} (${email}) deposited ${
				event.data.currency + addingDecimal(amountMinusFee / 100)
			} to account using card ...${last4}`,
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
		wallet.balance += amountMinusFee;
		await wallet.save();

		const expoPushToken = (await pushNotification.findOne({email}))?.token;
		if (expoPushToken) {
			if (Expo.isExpoPushToken(expoPushToken)) {
				await sendPushNotification({
					token: expoPushToken,
					title: 'Incoming Credit Card Transaction',
					message: `${wallet.currencyDetails.symbol}${addingDecimal(
						amountMinusFee / 100
					)} has been added to your ${
						wallet.currencyDetails.code
					} account via card ...${last4}`,
					data: {notificationType: 'transaction', data: transaction},
				});
			}
		}
	}
	await WebhookModel.create(event);
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
		currency,
	} = transaction;

	const currencyWallet = selectWallet(currency);
	const wallet = await currencyWallet.findOne({email});
	const currencySymbol = wallet.currencyDetails.symbol;

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
						[${currencySymbol}${Number(amount).toLocaleString()}]
						<!-- <span style="display: none">${reference}</span> -->
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
										<div style="padding: 10px 2px;">
											<div style="display: inline-block;
								width: 49%;
								vertical-align: top;
								padding-right: 10px;">
												<h3
													style="text-transform: capitalize; white-space: nowrap;"
												>
													${index.key}
												</h3>
											</div>
											<div
												style="display: inline-block; width: 49%; text-align: right;"
											>
												${
													!index.noTransform
														? String.raw`<span
															class="status"
															style="text-transform: capitalize;"
													  >
															${index.value}
													  </span>`
														: String.raw`<span class="status">${index.value}</span>`
												}
											</div>
										</div>
										<hr />
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
								<!-- <span style="display: none">${reference}</span> -->
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
							}/api/email/unsubscribe/${hashedEmail}">here</a> to unsubscribe 
							<!-- <span style="display: none">${reference}</span> -->
						</span>
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

const webhookLiveSample = {
	event: 'charge.success',
	data: {
		id: 4018390851,
		domain: 'live',
		status: 'success',
		reference: '100004240727031605117242819003',
		amount: 10000,
		message: null,
		gateway_response: 'Approved',
		paid_at: '2024-07-27T03:16:45.000Z',
		created_at: '2024-07-27T03:16:45.000Z',
		channel: 'dedicated_nuban',
		currency: 'NGN',
		ip_address: null,
		metadata: {
			receiver_account_number: '9300691729',
			receiver_bank: 'Wema Bank',
			custom_fields: [Array],
		},
		fees_breakdown: {amount: '100', formula: null, type: 'paystack'},
		log: null,
		fees: 100,
		fees_split: null,
		authorization: {
			authorization_code: 'AUTH_ycajymqsg7',
			bin: '907XXX',
			last4: 'X599',
			exp_month: '06',
			exp_year: '2024',
			channel: 'dedicated_nuban',
			card_type: 'transfer',
			bank: 'OPay Digital Services Limited (OPay)',
			country_code: 'NG',
			brand: 'Managed Account',
			reusable: false,
			signature: null,
			account_name: null,
			sender_country: 'NG',
			sender_bank: 'OPay Digital Services Limited (OPay)',
			sender_bank_account_number: 'XXXXXX2599',
			sender_name: 'TOYIB ADEOLA LAWAL',
			narration: '09073002599/9300691729/TRILUXYWAYSLI/L',
			receiver_bank_account_number: '9300691729',
			receiver_bank: 'Wema Bank',
		},
		customer: {
			id: 163472468,
			first_name: 'Toyyib',
			last_name: 'Lawal',
			email: 'toyibe233@gmail.com',
			customer_code: 'CUS_qyxn4dkoa2iyuo9',
			phone: '+2349030582706',
			metadata: {},
			risk_action: 'default',
			international_format_phone: '+2349030582706',
		},
		plan: {},
		subaccount: {},
		split: {},
		order_id: null,
		paidAt: '2024-07-27T03:16:45.000Z',
		requested_amount: 10000,
		pos_transaction_data: null,
		source: null,
	},
};

const webhookTestSample = {
	event: 'charge.success',
	data: {
		id: 4018394236,
		domain: 'test',
		status: 'success',
		reference: '17220504894941q3e25clz3kedna',
		amount: 20000,
		message: null,
		gateway_response: 'Approved',
		paid_at: '2024-07-27T03:21:29.000Z',
		created_at: '2024-07-27T03:21:29.000Z',
		channel: 'dedicated_nuban',
		currency: 'NGN',
		ip_address: null,
		metadata: {
			receiver_account_number: '1238073915',
			receiver_bank: 'Test Bank',
			custom_fields: [Array],
		},
		fees_breakdown: null,
		log: null,
		fees: 200,
		fees_split: null,
		authorization: {
			authorization_code: 'AUTH_ahqod536ra',
			bin: '008XXX',
			last4: 'X553',
			exp_month: '06',
			exp_year: '2024',
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
			receiver_bank_account_number: '1238073915',
			receiver_bank: 'Test Bank',
		},
		customer: {
			id: 132987957,
			first_name: 'John',
			last_name: 'Doe',
			email: 'toyibe233@gmail.com',
			customer_code: 'CUS_2y2mxrldxxp8tkk',
			phone: '9030582706',
			metadata: [Object],
			risk_action: 'default',
			international_format_phone: '+9030582706',
		},
		plan: {},
		subaccount: {},
		split: {},
		order_id: null,
		paidAt: '2024-07-27T03:21:29.000Z',
		requested_amount: 20000,
		pos_transaction_data: null,
		source: null,
	},
};

const cardSample = {
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
