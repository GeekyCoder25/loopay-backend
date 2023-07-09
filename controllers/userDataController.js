const UserDataModel = require('../models/userData');

const excludedFields = {
	updatedAt: 0,
	createdAt: 0,
	__v: 0,
	pin: 0,
};
const getUserData = async (req, res) => {
	const userData = await UserDataModel.findOne(
		{email: req.user.email},
		excludedFields
	);
	res.status(200).json(userData);
};

const postUserData = async (req, res) => {
	try {
		const userData = await UserDataModel.create(req.body);
		res.status(200).json(userData);
	} catch (err) {
		console.log(err.message);
		handleErrors(err, res);
	}
};

const putUserData = async (req, res) => {
	try {
		const checkUserExists = await UserDataModel.findOne({
			email: req.user.email,
		});
		if (!checkUserExists) return res.status(400).json('User data not found');

		if (req.body.email) {
			return res.status(400).json("Your email is unique and can't be changed");
		}
		const updateData = await UserDataModel.findOneAndUpdate(
			{email: req.user.email},
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);
		return res.status(200).json({...req.body, updateData});
	} catch (err) {
		console.log(err.message);
		handleErrors(err, res);
	}
};

const updateProfile = async (req, res) => {
	try {
		const {email} = req.user;
		const checkUserExists = await UserDataModel.findOne({email});
		if (!checkUserExists) return res.status(400).json('User data not found');
		if (req.body.email) {
			return res.status(400).json("Your email is unique and can't be changed");
		}

		const previousProfileData = checkUserExists.userProfile;
		const userProfile = Object.assign(previousProfileData, req.body);
		const updateData = await UserDataModel.findOneAndUpdate(
			{email},
			{
				userProfile,
			},
			{
				new: true,
				runValidators: true,
			}
		);
		if (updateData) {
			const {userProfile} = updateData;
			return res.status(200).json(userProfile);
		}
		res.status(200).json('No data updated');
	} catch (err) {
		console.log(err.message);
		handleErrors(err, res);
	}
};

const handleErrors = (err, res) => {
	let errors = {};
	if (err.code === 11000) {
		const errorKey = () =>
			Object.keys(err.keyPattern)[0].includes('.')
				? Object.keys(err.keyPattern)[0].split('.')[1]
				: Object.keys(err.keyPattern)[0];
		return res.status(400).json({
			[errorKey()]:
				errorKey() === 'email'
					? 'Email has already been used with another account'
					: 'Phone number has already been used with another account',
		});
	} else if (err.message.includes('validation failed')) {
		console.log(err.message);
		Object.values(err.errors).forEach(({properties}) => {
			if (properties) errors[properties.path] = properties.message;
		});
		const error = Object.keys(errors)[0]
			? {[Object.keys(errors)[0]]: Object.values(errors)[0]}
			: err.message;
		return res.status(400).json(error);
	}
	res.status(400).json(err.message);
	return errors;
};

module.exports = {getUserData, postUserData, putUserData, updateProfile};
