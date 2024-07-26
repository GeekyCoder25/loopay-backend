const {Expo} = require('expo-server-sdk');

const sendPushNotification = async ({
	token: targetExpoPushToken,
	title,
	message,
	data,
}) => {
	const expo = new Expo();
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
					return tickets;
				} catch (error) {
					console.log('Error sending chunk', error);
					throw error;
				}
			});

			const results = await Promise.all(promises);
			return results;
		} catch (error) {
			console.log('Error sending chunks', error);
		}
	};

	await sendChunks();
};

module.exports = sendPushNotification;
