const {default: axios} = require('axios');

const listBanks = async (req, res) => {
	const {currency} = req.query;
	try {
		if (!currency) throw new Error('No currency provided in query');

		if (currency === 'naira' || currency === 'NGN') {
			const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
			const config = {
				headers: {
					Authorization: `Bearer ${SECRET_KEY}`,
					'Content-Type': 'application/json',
				},
			};
			const url = 'https://api.paystack.co/bank';
			const response = await axios.get(url, config);
			if (!response) throw new Error('Server Error');
			return res.status(200).json(response.data.data);
		}
		throw new Error(`No supported banks for ${currency} at the moment`);
	} catch (err) {
		res
			.status(400)
			.json(err.message.includes('paystack') ? 'Server error' : err.message);
		console.error(err.message);
	}
};

module.exports = {
	listBanks,
};
