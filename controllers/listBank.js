const {default: axios} = require('axios');

const listBanks = async (req, res) => {
	const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
	const config = {
		headers: {
			Authorization: `Bearer ${SECRET_KEY}`,
			'Content-Type': 'application/json',
		},
	};
	try {
		const url = 'https://api.paystack.co/bank';
		const response = await axios.get(url, config);
		if (!response) throw new Error('Server Error');
		return res.status(200).json(response.data.data);
	} catch (err) {
		res.status(400).json(err.message);
		console.error(err.message);
	}
};

module.exports = {
	listBanks,
};
