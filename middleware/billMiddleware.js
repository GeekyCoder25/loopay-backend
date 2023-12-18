const {default: axios} = require('axios');

const billAPIToken = async (req, res, next) => {
	const getToken = async () => {
		try {
			const url = 'https://auth.reloadly.com/oauth/token';
			const data = JSON.stringify({
				client_id: process.env.RELOADLY_CLIENT_ID,
				client_secret: process.env.RELOADLY_CLIENT_SECRET,
				grant_type: 'client_credentials',
				audience: process.env.RELOADLY_BILL_URL,
			});
			const config = {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
			};
			const response = await axios.post(url, data, config);
			return {token: response.data.access_token, scope: response.data.scope};
		} catch (err) {
			const error = err.response?.data?.message || err.message;
			console.log(error);
		}
	};

	const token = await getToken();
	req.billAPIToken = token.token;
	next();
};

module.exports = billAPIToken;
