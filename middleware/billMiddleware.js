const {default: axios} = require('axios');
const {env} = require('../utils/environments');

const billAPIToken = async (req, res, next) => {
	const reloadly = env.reloadlyBill();
	const getToken = async () => {
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
			return {token: response.data.access_token, scope: response.data.scope};
		} catch (err) {
			const error = err.response?.data?.message || err.message;
			console.log(error);
		}
	};

	const token = await getToken();
	req.billAPIToken = token?.token;
	req.apiConfig = reloadly;

	next();
};

module.exports = billAPIToken;
