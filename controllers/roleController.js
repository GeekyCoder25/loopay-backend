const User = require('../models/user');

const getRole = async (req, res) => {
	try {
		const {email} = req.user;
		const result = await User.findOne({email});
		res.status(200).json({role: result.role});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {getRole};
