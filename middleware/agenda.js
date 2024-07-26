const cron = require('node-cron');
const schedule = require('../models/schedule');
const axios = require('axios');
const LocalWallet = require('../models/wallet');
const DollarWallet = require('../models/walletDollar');
const EuroWallet = require('../models/walletEuro');
const PoundWallet = require('../models/walletPound');
const TransactionModel = require('../models/transaction');
const Notification = require('../models/notification');
const ScheduleModal = require('../models/schedule');
const {addingDecimal} = require('../utils/addingDecimal');
const {sendMail} = require('../utils/sendEmail');
const {env} = require('../utils/environments');
const {pagaHash} = require('./pagaMiddleWare');

const scheduledTasks = {};

// Retrieve scheduled tasks from the database and schedule them
const handleSchedule = task => {
	const {_id, transactionType, transactionData, user, query} = task;
	switch (transactionType) {
		case 'loopay':
			initiateTransferToLoopay(_id, transactionData, user);
			break;
		case 'others':
			initiateTransferToOthers(_id, transactionData, user);
			break;
		case 'airtime':
			buyAirtime(_id, transactionData, user);
			break;
		case 'data':
			buyData(_id, transactionData, user);
			break;
		case 'bill':
			payBill(_id, transactionData, user, query);
			break;

		default:
			break;
	}
	console.log(`Schedule ${transactionType} initiated...`);
};

function generateCronExpression(task) {
	if (task.minute) {
		return `${task.second || '0'} ${task.minute} * * * *`; // Run every hour
	} else if (task.hour) {
		return `${task.minute || '0'} ${task.hour} * * *`; // Run once a day
	} else if (task.dayOfWeek) {
		return `0 8 * * ${task.dayOfWeek}`; // Run once a week at 8am
	} else if (task.dateOfMonth) {
		return `0 8 ${task.dateOfMonth} * *`; // Run once a month at 8am
	} else if (task.month) {
		return `0 8 1 ${task.month} *`; // Run once a year on the 1st day of the month at 8am
	}
}

const runSchedule = async () => {
	try {
		const schedules = await schedule.find({});

		schedules.forEach(task => {
			const expression = generateCronExpression(task);

			if (expression) {
				const scheduledTask = cron.schedule(expression, () =>
					handleSchedule(task)
				);
				scheduledTasks[task._id] = scheduledTask;
			}
		});
		await viewScheduledTasks();
	} catch (error) {
		console.log(error.message);
	}
};
runSchedule();

function viewScheduledTasks() {
	// console.log('Scheduled Tasks: ', scheduledTasks);
	// Object.values(scheduledTasks).forEach((scheduledTask, index) => {
	// 	console.log(`Task ${index + 1}: ${scheduledTask}`);
	// });
}

const initiateTransferToLoopay = async (_id, transactionData, user) => {
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
			description = 'Sent from Loopay',
			metadata,
		} = transactionData;

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
			phoneNumber: user.phoneNumber,
		});
		const sendeeWallet = await currencyWallet.findOne({phoneNumber});
		if (phoneNumber === user.phoneNumber)
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
			senderName: `${user.firstName} ${user.lastName}`,
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
				phoneNumber: user.phoneNumber,
				transactionType: 'debit',
				...transaction,
			});
			const notification = {
				id,
				email: senderWallet.email,
				phoneNumber,
				type: 'transfer',
				header: 'Schedule debit transaction',
				message: `You sent ${currency + addingDecimal(Number(amount))} ${
					user.firstName
				} ${user.lastName}`,
				adminMessage: `${user.firstName} ${user.lastName} sent ${
					currency + addingDecimal(Number(amount))
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
				message: `${user.firstName} ${user.lastName} has sent you ${
					currency + addingDecimal(Number(amount))
				}`,
				adminMessage: `${user.firstName} ${user.lastName} sent ${
					currency + addingDecimal(Number(amount))
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

		await ScheduleModal.findByIdAndUpdate(_id, {lastRunAt: new Date()});
	} catch (err) {
		console.log(err.message);
	}
};

const initiateTransferToOthers = async (_id, transactionData, user) => {
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
		} = transactionData;

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
					reason = 'Sent from Loopay',
					currency,
					metadata,
					slug,
					accNo,
				} = transactionData;
				const {email, phoneNumber} = user;
				const transaction = {
					id,
					status: 'pending',
					type: 'inter',
					method: 'inter',
					transactionType: 'debit',
					senderAccount: senderWallet.loopayAccNo,
					senderName: `${user.firstName} ${user.lastName}`,
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
						currency + addingDecimal(Number(amount))
					} to ${name}`,
					adminMessage: `${user.firstName} ${user.lastName} sent ${
						currency + addingDecimal(Number(amount))
					} to an external bank account ${name}`,
					status: 'unread',
					photo: senderPhoto,
					metadata: {...transaction, transactionType: 'debit'},
				};

				const transactionExists = await TransactionModel.findOne({id});

				if (!transactionExists) {
					await Notification.create(notification);
				}

				await ScheduleModal.findByIdAndUpdate(_id, {
					lastRunAt: new Date(),
				});
				return;
			} else {
				throw new Error(response.data.message);
			}
		} catch (err) {
			console.log(err.message);
		}
	} catch (err) {
		console.log(err.message);
	}
};

const buyAirtime = async (_id, transactionData, user) => {
	try {
		const {email, phoneNumber} = user;
		const {
			currency,
			id,
			amount,
			network,
			phoneNo,
			operatorId,
			countryCode,
			paymentCurrency,
		} = transactionData;

		const reloadly = env.reloadly();
		const url = 'https://auth.reloadly.com/oauth/token';
		const data = JSON.stringify({
			client_id: reloadly.ID,
			client_secret: reloadly.SECRET,
			grant_type: 'client_credentials',
			audience: reloadly.URL,
		});
		const config = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		};
		const response = await axios.post(url, data, config);

		const token = {
			token: response.data.access_token,
			scope: response.data.scope,
		};
		const airtimeAPIToken = token?.token;
		const apiConfig = reloadly;

		const connectWithAPI = async () => {
			const token = airtimeAPIToken;
			const url = `${apiConfig.URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount: nairaAmount,
				useLocalAmount: true,
				customIdentifier: `${phoneNo}, ${currency}${amount}, ${Date.now()}`,
				recipientPhone: {countryCode, number: phoneNo},
			});
			const headers = {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			};
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
			});
			return response.json();
		};
		let nairaAmount = amount;
		let rate;

		const selectWallet = currency => {
			switch (currency) {
				case 'USD':
					return DollarWallet;
				case 'EUR':
					return EuroWallet;
				case 'GBP':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const wallet = await selectWallet(paymentCurrency).findOne({phoneNumber});
		if (wallet.balance < amount * 100) {
			return;
		}
		if (paymentCurrency && paymentCurrency !== 'NGN') {
			const getRate = async () => {
				const apiData = await axios.get(
					`https://open.er-api.com/v6/latest/NGN`
				);
				const rates = apiData.data.rates;
				const rate =
					rates[paymentCurrency] >= 1
						? rates[paymentCurrency]
						: 1 / rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			nairaAmount = Math.floor(amount * rateCalculate);
			if (nairaAmount < 50) {
				const num = 50 / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return console.log(
					`Minimum amount in ${paymentCurrency} is ${roundedNum}`
				);
			}
		}

		const apiData = await connectWithAPI();
		if (apiData.status === 'SUCCESSFUL') {
			wallet.balance -= amount * 100;
			await wallet.save();
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'success',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'airtime',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: apiData.transactionId,
				currency,
				metadata: apiData,
			};
			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'airtime',
				header: 'Airtime Purchase',
				message: `You purchased NGN${addingDecimal(
					Number(amount).toLocaleString()
				)} airtime to ${phoneNo}`,
				adminMessage: `${user.firstName} ${
					user.lastName
				} purchased ${network} airtime recharge of NGN${addingDecimal(
					Number(amount).toLocaleString()
				)} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await TransactionModel.findOne({id});
			if (!transactionExists) {
				await Notification.create(notification);
			}
			await ScheduleModal.findByIdAndUpdate(_id, {lastRunAt: new Date()});
		} else if (apiData.errorCode === 'INSUFFICIENT_BALANCE') {
			console.log('Insufficient balance');
			sendMail(
				{
					from: {
						name: 'Loopay',
						address: process.env.SUPPORT_EMAIL,
					},
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
						A customer trying to buy ₦${Number(
							nairaAmount
						).toLocaleString()} airtime recharge just experienced a <b>server error</b>  due to insufficient funds
						in your airtime and data API account dashboard, recharge now so you
						customers can experience seamless experience while transacting.
						<a href="https://dashboard.reloadly.com/">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				''
			);
		} else {
			throw new Error(apiData.message);
		}
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
	}
};

const buyData = async (_id, transactionData, user) => {
	try {
		const {email, phoneNumber} = user;
		const {
			currency,
			id,
			network,
			metadata,
			phoneNo,
			plan,
			operatorId,
			countryCode,
			paymentCurrency,
		} = transactionData;

		const reloadly = env.reloadly();
		const url = 'https://auth.reloadly.com/oauth/token';
		const data = JSON.stringify({
			client_id: reloadly.ID,
			client_secret: reloadly.SECRET,
			grant_type: 'client_credentials',
			audience: reloadly.URL,
		});
		const config = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		};
		const response = await axios.post(url, data, config);

		const token = {
			token: response.data.access_token,
			scope: response.data.scope,
		};
		const airtimeAPIToken = token?.token;
		const apiConfig = reloadly;

		const connectWithAPI = async () => {
			const token = airtimeAPIToken;
			const url = `${apiConfig.URL}/topups`;
			const body = JSON.stringify({
				operatorId,
				amount: nairaAmount,
				useLocalAmount: true,
				customIdentifier: `${phoneNo}, ${currency}${amount}, ${
					plan.value
				}, ${Date.now()}`,
				recipientPhone: {countryCode, number: phoneNo},
			});
			const headers = {
				'Content-Type': 'application/json',
				Accept: 'application/com.reloadly.topups-v1+json',
				Authorization: `Bearer ${token}`,
			};
			const response = await fetch(url, {
				method: 'POST',
				headers,
				body,
			});
			return response.json();
		};

		let {amount} = transactionData;
		const nairaAmount = amount;
		let rate;

		const selectWallet = currency => {
			switch (currency) {
				case 'USD':
					return DollarWallet;
				case 'EUR':
					return EuroWallet;
				case 'GBP':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const wallet = await selectWallet(paymentCurrency).findOne({phoneNumber});

		if (paymentCurrency && paymentCurrency !== 'NGN') {
			const getRate = async () => {
				const apiData = await axios.get(
					`https://open.er-api.com/v6/latest/NGN`
				);
				const rates = apiData.data.rates;
				const rate =
					rates[paymentCurrency] >= 1
						? rates[paymentCurrency]
						: 1 / rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			amount = amount / rateCalculate;

			if (wallet.balance < amount * 100) {
				return;
			}
		}
		if (wallet.balance < amount * 100) {
			return;
		}
		const apiData = await connectWithAPI();
		if (apiData.status === 'SUCCESSFUL') {
			wallet.balance -= amount * 100;
			await wallet.save();
			const transaction = {
				email,
				phoneNumber,
				id,
				status: 'success',
				debitAccount: wallet.loopayAccNo,
				transactionType: 'data',
				networkProvider: network,
				rechargePhoneNo: phoneNo,
				amount,
				reference: id,
				currency,
				dataPlan: plan,
				metadata: metadata || null,
			};
			if (rate) {
				transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
			}
			const notification = {
				email,
				id,
				phoneNumber,
				type: 'data',
				header: 'Data Purchase',
				message: `Your purchase of ${plan.value} to ${phoneNo} was successful`,
				adminMessage: `${user.firstName} ${user.lastName} purchased ${network} data plan of ${plan.value} to ${phoneNo}`,
				status: 'unread',
				photo: network,
				metadata: {...transaction, network},
			};

			const transactionExists = await TransactionModel.findOne({id});
			if (!transactionExists) {
				await Notification.create(notification);
			}
			await ScheduleModal.findByIdAndUpdate(_id, {lastRunAt: new Date()});
		} else if (apiData.errorCode === 'INSUFFICIENT_BALANCE') {
			console.log('Insufficient balance');
			sendMail(
				{
					from: {
						name: 'Loopay',
						address: process.env.SUPPORT_EMAIL,
					},
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
						A customer trying to buy ₦${Number(
							nairaAmount
						).toLocaleString()} data recharge just
						experienced a <b>server error</b> due to insufficient funds in your airtime and data API account
						dashboard, recharge now so you customers can experience seamless
						experience while transacting.
						<a href="">Click here</a> to go to API dashboard
					</p>
				</div>`,
				},
				'',
				''
			);
		} else {
			console.log(apiData);
			throw new Error(apiData.message);
		}
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
	}
};

const payBill = async (_id, transactionData, user, queryObject) => {
	try {
		const query = Object.keys(queryObject)[0];
		const {email, phoneNumber} = user;
		const {
			amount,
			provider,
			referenceId,
			subscriberAccountNumber,
			paymentCurrency,
		} = transactionData;

		let nairaAmount = amount;
		let rate;

		const selectWallet = currency => {
			switch (currency) {
				case 'USD':
					return DollarWallet;
				case 'EUR':
					return EuroWallet;
				case 'GBP':
					return PoundWallet;
				default:
					return LocalWallet;
			}
		};
		const wallet = await selectWallet(paymentCurrency).findOne({phoneNumber});

		if (wallet.balance < amount * 100) {
			return console.log('Insufficient balance');
			//  res.status(400).json('Insufficient balance');
		}
		if (paymentCurrency && paymentCurrency !== 'NGN') {
			const getRate = async () => {
				const apiData = await axios.get(
					`https://open.er-api.com/v6/latest/NGN`
				);
				const rates = apiData.data.rates;
				const rate =
					rates[paymentCurrency] >= 1
						? rates[paymentCurrency]
						: 1 / rates[paymentCurrency];
				return rate;
			};
			const rateCalculate = await getRate();
			rate = rateCalculate;
			nairaAmount = Math.floor(amount * rate);
			if (nairaAmount < provider.minLocalTransactionAmount) {
				const num = provider.minLocalTransactionAmount / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return console.log(
					`Minimum amount in ${paymentCurrency} is ${roundedNum}`
				);
				//  res
				// 	.status(400)
				// 	.json(`Minimum amount in ${paymentCurrency} is ${roundedNum}`);
			} else if (nairaAmount > provider.maxLocalTransactionAmount) {
				const num = provider.maxLocalTransactionAmount / rateCalculate;
				const precision = 2;
				const roundedNum = Math.ceil(num * 10 ** precision) / 10 ** precision;
				return console.log(
					`Maximum amount in ${paymentCurrency} is ${roundedNum}`
				);
				//  res
				// 	.status(400)
				// 	.json(`Maximum amount in ${paymentCurrency} is ${roundedNum}`);
			}
		}

		const PAGA_API_URL =
			'https://mypaga.com/paga-webservices/business-rest/secured';
		const principal = '16F6C921-FC62-4C91-B2B4-BE742138B831';
		const credentials = 'zF2@u5U*Sx6dcGM';
		const hashKey =
			'514ac2afcc6b4317a592e5d0a3786ada2c75778b9b9f48dc8a28ecfa764d6440291533a2ecfa4ab589d285f07216a497d49c89cfb7604641b687f2a55aee3f83';
		const url = `${PAGA_API_URL}/merchantPayment`;
		const body = {
			referenceNumber: transactionData.referenceNumber,
			amount: nairaAmount,
			merchantAccount: transactionData.billerId,
			merchantReferenceNumber: transactionData.meterNo,
		};

		const apiBody = {
			referenceNumber: transactionData.referenceNumber,
			amount: nairaAmount,
			currency: 'NGN',
			merchantAccount: transactionData.billerId,
			merchantReferenceNumber: transactionData.meterNo,
			merchantService: [transactionData.meterType],
		};

		const config = {
			headers: {
				'Content-Type': 'application/json',
				principal,
				credentials,
				hash: pagaHash(body, hashKey),
			},
		};

		const response = await axios.post(url, apiBody, config);
		if (response.data.integrationStatus !== 'SUCCESSFUL') {
			throw new Error(response.data.message);
		}
		const token = response.data.additionalProperties?.token?.split(': ')[1];
		wallet.balance -= amount * 100;
		await wallet.save();
		const id = referenceId;
		const transaction = {
			email,
			phoneNumber,
			id,
			status: 'success',
			debitAccount: wallet.loopayAccNo,
			transactionType: 'bill',
			billType: query,
			billName: provider.name,
			token,
			amount,
			reference: id,
			currency: wallet.currency,
			metadata: response.data,
		};
		if (rate) {
			transaction.rate = `1 ${paymentCurrency} = ${rate.toFixed(2)} NGN`;
		}
		const notification = {
			email,
			id,
			phoneNumber,
			type: 'bill',
			header: `${query} purchase`,
			message: `Your purchase of ${provider.name} to ${subscriberAccountNumber} was successful`,
			adminMessage: `${user.firstName} ${user.lastName} purchased ${provider.name} to ${subscriberAccountNumber}`,
			status: 'unread',
			metadata: {...transaction, apiResponse: response.data},
		};

		const transactionExists = await TransactionModel.findOne({id});
		if (!transactionExists) {
			await Notification.create(notification);
		}

		response.data.token = token;

		await ScheduleModal.findByIdAndUpdate(_id, {lastRunAt: new Date()});
		return;
		// res
		// 	.status(200)
		// 	.json({...response.data, transaction: savedTransaction});
	} catch (error) {
		const err =
			error.response?.data?.message ||
			error.response?.data?.error ||
			error.response?.data?.errorMessage ||
			error.message;
		return console.log(err);
		// res.status(400).json(err);
	}
};

module.exports = {scheduledTasks, handleSchedule, generateCronExpression};
