const jwt = require('jsonwebtoken');
const User = require('../models/user');
const SessionModel = require('../models/session');
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
			token = req.headers.authorization.split(' ')[1].split('...')[0];

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = await User.findById(decoded.id).select('-password');
			req.sessionID = req.headers.authorization.split(' ')[1].split('...')[1];
			if (!req.user) throw new Error();
			req.body._id = decoded.id;
			const checkSessionsExist = await SessionModel.findOne({
				email: req.user.email,
			});

			if (checkSessionsExist && req.sessionID) {
				const previousSessionsData = checkSessionsExist.sessions;
				const sessionToUpdate = previousSessionsData.filter(
					session => session.deviceID === req.sessionID
				);
				const sessionsNotToUpdate = previousSessionsData.filter(
					session => session.deviceID !== req.sessionID
				);
				if (sessionToUpdate.length === 1) {
					let session = {...sessionToUpdate[0], lastSeen: Date.now()};
					let sessions = [session, ...sessionsNotToUpdate];
					await SessionModel.findOneAndUpdate(
						{email: req.user.email},
						{sessions},
						{
							new: true,
							runValidators: true,
						}
					);
				}
			}
		} catch (err) {
			return res.status(401).json('Not authorised, Invalid token');
		}
	}
	if (!token) {
		return res.status(401).json('Not authorised, no token');
	}
	next();
};

const authorize = (...roles) => {
	return (req, res, next) => {
		if (!roles.includes(req.user.role)) {
			return res
				.status(403)
				.json(
					`User role ${req.user.role} is not authorized to access this route`
				);
		}
		next();
	};
};

module.exports = {
	protect,
	authorize,
};
