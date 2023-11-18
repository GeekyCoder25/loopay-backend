const {default: axios} = require('axios');
const BillTokenModel = require('../models/airtimeAPIToken');

const billAPIToken = async (req, res, next) => {
	const token = await BillTokenModel.findOne({});

	const getToken = async () => {
		try {
			const url = 'https://auth.reloadly.com/oauth/token';
			const data = JSON.stringify({
				client_id: process.env.RELOADLY_CLIENT_ID,
				client_secret: process.env.RELOADLY_CLIENT_SECRET,
				grant_type: 'client_credentials',
				audience: 'https://utilities-sandbox.reloadly.com',
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
	if (!token) {
		const newToken = await getToken();
		const createToken = await BillTokenModel.create({
			token: newToken.token,
			scope: newToken.scope,
		});
		req.billAPIToken = createToken.token;
	} else {
		// const previousTime = new Date(token.updatedAt);
		const currentTime = new Date();
		const twentyFourHoursAgo = new Date(currentTime);
		twentyFourHoursAgo.setHours(currentTime.getHours() - 12);
		// if (twentyFourHoursAgo > previousTime) {
		const newToken = await getToken();
		if (newToken && newToken.token !== token.token) {
			const updateToken = await BillTokenModel.findOneAndUpdate(
				{},
				{token: newToken.token, scope: newToken.scope},
				{new: true, runValidators: true}
			);
			req.billAPIToken = updateToken.token;
			// }
		} else {
			req.billAPIToken = token.token;
		}
	}
	next();
};

module.exports = billAPIToken;
