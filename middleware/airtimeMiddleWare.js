const {default: axios} = require('axios');
const AirtimeApiTokenModel = require('../models/airtimeAPIToken');

const airtimeAPIToken = async (req, res, next) => {
	const token = await AirtimeApiTokenModel.findOne({});

	const getToken = async () => {
		try {
			const url = 'https://auth.reloadly.com/oauth/token';
			const data = JSON.stringify({
				client_id: process.env.RELOADLY_CLIENT_ID,
				client_secret: process.env.RELOADLY_CLIENT_SECRET,
				grant_type: 'client_credentials',
				audience: 'https://topups-sandbox.reloadly.com',
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
			const error = err.response;
			console.log(error);
		}
	};

	if (!token) {
		const newToken = await getToken();
		const createToken = await AirtimeApiTokenModel.create({
			token: newToken.token,
			scope: newToken.scope,
		});
		req.airtimeAPIToken = createToken.token;
	} else {
		const previousTime = new Date(token.updatedAt);
		const currentTime = new Date();
		const twentyFourHoursAgo = new Date(currentTime);
		twentyFourHoursAgo.setHours(currentTime.getHours() - 24);
		if (twentyFourHoursAgo > previousTime) {
			const newToken = await getToken();
			const updateToken = await AirtimeApiTokenModel.updateOne(
				{},
				{token: newToken.token, scope: newToken.scope},
				{new: true, runValidators: true}
			);
			req.airtimeAPIToken = updateToken.token;
		} else {
			req.airtimeAPIToken = token.token;
		}
	}
	next();
};

module.exports = airtimeAPIToken;
