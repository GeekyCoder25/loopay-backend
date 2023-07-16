const SessionModel = require('../models/session');
const {handleErrors} = require('./authController');

const getSession = async (req, res) => {
	try {
		let sessions;
		const {email} = req.user;
		const checkSessionExists = await SessionModel.findOne({email});
		if (!checkSessionExists) {
			return res.status(200).json('No active sessions was found for this user');
		}
		sessions = checkSessionExists.sessions;
		const pluralS = sessions.length > 1 ? 's' : '';
		res.status(200).json({
			message: `${sessions.length} active session${pluralS} found`,
			sessions,
		});
	} catch (err) {
		res.status(400).json(err.message);
	}
};

const postSession = async (req, res) => {
	try {
		let sessions;
		const {email} = req.user;
		const checkSessionExists = await SessionModel.findOne({email});

		if (checkSessionExists) {
			const previousSessionsData = checkSessionExists.sessions;
			const sessionsID = previousSessionsData.map(session => session.deviceID);
			if (sessionsID.includes(req.body.deviceID)) {
				return res.status(400).json('Each device must have a unique ID');
			}
			sessions = [req.body, ...previousSessionsData];
			await SessionModel.findOneAndUpdate(
				{email},
				{sessions},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			await SessionModel.create({email, sessions: [req.body]});
		}
		res
			.status(200)
			.json({message: 'Session saved successfully', session: req.body});
	} catch (err) {
		const error = handleErrors(err);
		res.status(400).json(error);
	}
};

const updateSession = async (req, res) => {
	try {
		let sessions;
		let session;
		const {email} = req.user;
		const checkSessionExists = await SessionModel.findOne({email});

		if (checkSessionExists) {
			const previousSessionsData = checkSessionExists.sessions;
			const sessionToUpdate = previousSessionsData.filter(
				session => session.deviceID === req.params.id
			);
			const sessionsNotToUpdate = previousSessionsData.filter(
				session => session.deviceID !== req.params.id
			);
			if (sessionToUpdate.length < 1) {
				return res.status(400).json('No active session with the given ID');
			}
			session = {...sessionToUpdate[0], ...req.body};
			sessions = [session, ...sessionsNotToUpdate];
			await SessionModel.findOneAndUpdate(
				{email},
				{sessions},
				{
					new: true,
					runValidators: true,
				}
			);
		} else {
			return res.status(400).json('No active session for this user');
		}
		res.status(200).json({message: 'Session Updated successfully', session});
	} catch (err) {
		const error = handleErrors(err);
		res.status(400).json(error);
	}
};

const deleteSession = async (req, res) => {
	try {
		const {email} = req.user;
		let sessions;
		const checkSessionExists = await SessionModel.findOne({email});
		const previousSessionsData = checkSessionExists.sessions;
		const sessionToDelete = previousSessionsData.filter(
			session => session.deviceID === req.params.id
		);
		const sessionAfterDelete = previousSessionsData.filter(
			session => session.deviceID !== req.params.id
		);
		sessions = sessionAfterDelete;
		await SessionModel.findOneAndUpdate(
			{email},
			{sessions},
			{
				new: true,
				runValidators: true,
			}
		);
		if (sessionToDelete.length < 1) {
			return res
				.status(200)
				.json('No Session with that device ID was found this user');
		}
		res.status(200).json('Session Deleted successfully');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	getSession,
	postSession,
	updateSession,
	deleteSession,
};
