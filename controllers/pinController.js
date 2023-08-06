const bcrypt = require('bcryptjs');
const UserDataModel = require('../models/userData');

const setTransactionPin = async (req, res) => {
	try {
		const {pin} = req.body;
		if (!pin) throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(pin, salt);
		result.pin = hash;
		result.save();
		res.status(200).json('Transaction pin set successfully');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const checkTransactionPin = async (req, res) => {
	try {
		const {pin} = req.body;
		if (!pin) throw new Error('No pin is provided');
		const {email} = req.user;
		const result = await UserDataModel.findOne({email});
		if (!result) throw new Error('No account is associated with this email');
		if (!result.pin) throw new Error('Pin not set yet');
		const compare = await bcrypt.compare(req.body.pin, result.pin);
		if (!compare) throw new Error('Invalid Pin');
		res.status(200).json(compare);
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	setTransactionPin,
	checkTransactionPin,
};
