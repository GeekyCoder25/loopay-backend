const jwt = require('jsonwebtoken');
const User = require('../models/user');
const SessionModel = require('../models/session');
// const {handlePhoneNumber} = require('../utils/checkPhoneNumber');

const protect = async (req, res, next) => {
	let token;

	// if (req.body.phoneNumber)
	// 	req.body.phoneNumber = handlePhoneNumber(req.body.phoneNumber);
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		try {
			token = req.headers.authorization.split(' ')[1].split('...')[0];

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			req.user = await User.findById(decoded.id).select('-password');
			req.sessionID = req.headers.authorization.split(' ')[1].split('...')[1];
			if (!req.user) throw new Error('Invalid user account');
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

				if (
					sessionToUpdate.length === 1 &&
					sessionToUpdate[0].status === 'active'
				) {
					const lastSeen = new Date();
					let session = {...sessionToUpdate[0], lastSeen};
					req.sessionTime = lastSeen;
					let sessions = [session, ...sessionsNotToUpdate];
					await SessionModel.findOneAndUpdate(
						{email: req.user.email},
						{sessions},
						{
							new: true,
							runValidators: true,
						}
					);
				} else {
					const sessionsAfterDelete = previousSessionsData.filter(
						session => session.deviceID !== req.sessionID
					);
					await SessionModel.findOneAndUpdate(
						{email: req.user.email},
						{sessions: sessionsAfterDelete},
						{
							new: true,
							runValidators: true,
						}
					);
					return res
						.status(401)
						.json('Your account has been logged in on another device');
				}
			}
		} catch (err) {
			console.log(err);
			return res.status(401).json('Not authorized, Invalid token');
		}
	}
	if (!token) {
		console.log('No token');
		return res.status(401).json('Not authorized, no token');
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
