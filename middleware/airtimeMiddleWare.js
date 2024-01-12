const {default: axios} = require('axios');
const {env} = require('../utils/environments');

const airtimeAPIToken = async (req, res, next) => {
	const reloadly = env.reloadly();
	try {
		const url = 'https://auth.reloadly.com/oauth/token';
		const data = JSON.stringify({
			client_id: reloadly.ID,
			client_secret: reloadly.SECRET,
			grant_type: 'client_credentials',
			audience: reloadly.URL,
		});
		const config = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
		};
		const response = await axios.post(url, data, config);

		const token = {
			token: response.data.access_token,
			scope: response.data.scope,
		};
		req.airtimeAPIToken = token?.token;
		req.apiConfig = reloadly;

		return next();
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
		res.status(400).json('Server error');
	}
};

module.exports = airtimeAPIToken;
