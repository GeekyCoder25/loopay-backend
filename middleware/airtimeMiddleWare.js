const {default: axios} = require('axios');

const airtimeAPIToken = async (req, res, next) => {
	const getToken = async () => {
		try {
			const url = 'https://auth.reloadly.com/oauth/token';
			const data = JSON.stringify({
				client_id: process.env.RELOADLY_CLIENT_ID,
				client_secret: process.env.RELOADLY_CLIENT_SECRET,
				grant_type: 'client_credentials',
				audience: process.env.RELOADLY_URL,
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
			const error = err.response?.data || err.message;
			console.log(error);
		}
	};

	const token = await getToken();
	req.airtimeAPIToken = token?.token;

	next();
};

module.exports = airtimeAPIToken;
