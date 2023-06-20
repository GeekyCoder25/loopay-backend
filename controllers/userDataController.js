const UserDataModel = require('../models/userData');

const excludedFields = {
	updatedAt: 0,
	createdAt: 0,
	__v: 0,
};
const getUserData = async (req, res) => {
	if (req.user) {
		const userData = await UserDataModel.findOne(
			{email: req.user.email},
			excludedFields
		);
		res.status(200).json(userData);
	}
};

const postUserData = async (req, res) => {
	if (req.user) {
		try {
			const userData = await UserDataModel.create(req.body);
			res.status(200).json(userData);
		} catch (err) {
			console.log(err.message);
			handleErrors(err, res);
		}
	}
};

const putUserData = async (req, res) => {
	console.log('put', req.body);
	if (req.user) {
		try {
			const userData = await UserDataModel.updateOne(
				{email: req.user.email},
				{$set: req.body}
			);
			res.status(200).json({...req.body, updateData: userData});
		} catch (err) {
			console.log(err.message);
			handleErrors(err, res);
		}
	}
};

const handleErrors = (err, res) => {
	let errors = {};
	if (err.code === 11000) {
		const errorKey = () =>
			Object.keys(err.keyPattern)[0].includes('.')
				? Object.keys(err.keyPattern)[0].split('.')[1]
				: Object.keys(err.keyPattern)[0];
		res.status(400).json({
			[errorKey()]:
				errorKey() === 'email'
					? 'Email has already been used with another account'
					: 'Phone number has already been used with another account',
		});
	} else if (err.message.includes('user validation failed')) {
		const errors = Object.values(err.errors).forEach(({properties}) => {
			errors[properties.path] = properties.message;
		});
		res.status(400).json({[Object.keys(errors)[0]]: Object.values(errors)[0]});
	}
	return errors;
};

module.exports = {getUserData, postUserData, putUserData};
