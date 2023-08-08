const WebhookModel = require('../models/webhook');

const webhookHandler = async (req, res) => {
	res.send(200);
	const event = req.body;
	console.log(event);
	await WebhookModel.create(event);
	// Do something with event
};

module.exports = {
	webhookHandler,
};
