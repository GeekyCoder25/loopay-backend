const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {handlephoneNumber} = require('../utils/checkPhoneNumber');

const protect = async (req, res, next) => {
	let token;

	if (req.body.phoneNumber)
		req.body.phoneNumber = handlephoneNumber(req.body.phoneNumber);
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		try {
			token = req.headers.authorization.split(' ')[1];

			// eslint-disable-next-line no-undef
			const decoded = jwt.verify(token, process.env.JWT_SECRET);

			req.user = await User.findById(decoded.id).select('-password');
			if (!req.user) throw new Error();
			req.body._id = decoded.id;
		} catch (err) {
			return res.status(401).json('Not authorised, Invalid token');
		}
	}
	if (!token) {
		return res.status(401).json('Not authorised, no token');
	}
	next();
};

module.exports = {
	protect,
};
