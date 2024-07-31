const {Expo} = require('expo-server-sdk');
const expo = new Expo();

const sendPushNotification = async ({
	token: targetExpoPushToken,
	title,
	message,
	data,
	retryCount = 0,
}) => {
	if (!Expo.isExpoPushToken(targetExpoPushToken)) {
		console.error(
			`Push token ${targetExpoPushToken} is not a valid Expo push token`
		);
		return;
	}

	const chunks = expo.chunkPushNotifications([
		{
			to: targetExpoPushToken,
			sound: 'default',
			title: title || '',
			body: message,
			data: data || {},
		},
	]);

	const sendChunks = async () => {
		try {
			const promises = chunks.map(async chunk => {
				try {
					const tickets = await expo.sendPushNotificationsAsync(chunk);
					// console.log('Tickets:', tickets); // Log the tickets
					return tickets;
				} catch (error) {
					console.error('Error sending chunk', error.message);
					throw error;
				}
			});

			const results = await Promise.all(promises);

			const receipts = await getReceipts(results.flat());

			for (let receipt of receipts) {
				if (receipt.status === 'error') {
					handleReceiptError(receipt);
				} else if (receipt.status === 'ok') {
					console.log(
						`Notification delivered successfully to ${targetExpoPushToken}`
					);
				} else {
					// Retry sending if receipt status is not 'ok'
					const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
					console.log(`Retrying in ${delay} ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
					return sendPushNotification({
						token: targetExpoPushToken,
						title,
						message,
						data,
						retryCount: retryCount + 1,
					});
				}
			}

			return results;
		} catch (error) {
			console.error('Error sending chunks', error);
			const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
			console.log(`Retrying in ${delay} ms...`);
			await new Promise(resolve => setTimeout(resolve, delay));
			return sendPushNotification({
				token: targetExpoPushToken,
				title,
				message,
				data,
				retryCount: retryCount + 1,
			});
		}
	};

	const getReceipts = async tickets => {
		const receiptIds = tickets
			.filter(ticket => ticket.id)
			.map(ticket => ticket.id);
		const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

		let receipts = [];
		for (let chunk of receiptIdChunks) {
			try {
				const receiptChunk = await expo.getPushNotificationReceiptsAsync(chunk);
				receipts.push(...Object.values(receiptChunk));
			} catch (error) {
				console.error('Error getting receipt chunk', error);
			}
		}
		return receipts;
	};

	const handleReceiptError = receipt => {
		if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
			// Handle device unregistration, e.g., remove token from database
			console.log(`Device not registered: ${receipt.details.error}`);
		} else {
			console.error(`Notification error: ${receipt.details.error}`);
		}
	};

	await sendChunks();
};

module.exports = sendPushNotification;
