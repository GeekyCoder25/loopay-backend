const serverAPIs = require('../models/serverAPIs');

const getAPIs = async (req, res) => {
	const response = await serverAPIs.findOne({});
	res.status(200).json(response);
};
const updateAPIs = async (req, res) => {
	const response = await serverAPIs.findOneAndUpdate({}, req.body);
	res.status(200).json(response);
};

module.exports = {
	getAPIs,
	updateAPIs,
};
