const {default: axios} = require('axios');

const addMoneyCard = async (req, res) => {
	const protocol = req.protocol;
	const host = req.get('host');
	const fullUrl = `${protocol}://${host}`;
	try {
		const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
		const config = {
			headers: {
				Authorization: `Bearer ${SECRET_KEY}`,
				'Content-Type': 'application/json',
			},
		};

		const response = await axios.post(
			'https://api.paystack.co/transaction/initialize',
			{
				email: req.user.email,
				amount: req.body.amount * 100,
				callback_url: `${fullUrl}/card-success.html`,
				channels: ['card'],
				metadata: {cancel_action: `${fullUrl}/webview-cancel.html`},
			},
			config
		);

		if (response.status === 200) {
			return res.status(200).json(response.data);
		}
		throw new Error(response.data);
	} catch (err) {
		console.log('error', err.data?.message || err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {addMoneyCard};
