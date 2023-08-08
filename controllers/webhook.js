const webhookHandler = (req, res) => {
	const event = req.body;
	console.log(event);
	// Do something with event
	res.send(200);
};

module.exports = {
	webhookHandler,
};
