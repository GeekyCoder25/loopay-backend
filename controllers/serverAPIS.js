const {default: axios} = require('axios');
const serverAPIs = require('../models/serverAPIs');

const getAPIs = async (req, res) => {
	const response = await serverAPIs.findOne({});
	res.status(200).json(response);
};
const updateAPIs = async (req, res) => {
	try {
		const response = await serverAPIs.findOneAndUpdate({}, req.body, {
			new: true,
			runValidators: true,
		});
		const protocol = req.protocol;
		const host = req.get('host');
		const fullUrl = `${protocol}://${host}`;

		const token = req.headers.authorization.split(' ')[1];
		await axios.get(`${fullUrl}/api/admin/restart`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});
		res.status(200).json(response);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getAPIs,
	updateAPIs,
};
