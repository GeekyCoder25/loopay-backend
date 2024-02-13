const axios = require('axios');

const createVirtualAccount = async data => {
	const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
	const createDVA = async id => {
		// const url = `https://api.paystack.co/dedicated_account/${id}`;
		const url = 'https://api.paystack.co/dedicated_account';
		const headers = {
			Authorization: `Bearer ${SECRET_KEY}`,
			'Content-Type': 'application/json',
		};
		try {
			const response = await axios.post(url, id, {headers});
			return response.data;
		} catch (error) {
			console.error('Error:');
		}
	};
	const url = 'https://api.paystack.co/customer';
	const headers = {
		Authorization: `Bearer ${SECRET_KEY}`,
		'Content-Type': 'application/json',
	};
	try {
		const response = await axios.post(url, data, {headers});
		if (!response.data?.data.id) {
			throw new Error('Server Error');
		}
		return await createDVA({customer: response.data?.data.id});
	} catch (error) {
		console.log(error.message);
		return 'Server error';
	}
};
module.exports = {
	createVirtualAccount,
};
