const UserDataModel = require('../models/userData');
const {
	excludedFieldsInObject,
	excludedFieldsInArray,
} = require('../utils/mongodbExclude');

const getUserData = async (req, res) => {
	const userData = await UserDataModel.findOne(
		{email: req.user.email},
		excludedFieldsInObject
	);
	if (!userData) return res.status(404).json('No user found');
	const result = Object.assign(userData, {pin: userData.pin ? true : false});
	res.status(200).json(result);
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
		if (req.body.email) {
			return res.status(400).json("Your email is unique and can't be changed");
		}
		const result = await UserDataModel.findOneAndUpdate(
			{email: req.user.email},
			req.body,
			{
				new: true,
				runValidators: true,
			}
		).select(excludedFieldsInArray);
		const updateData = Object.assign(result, {
			pin: result.pin ? true : false,
		});
		return res.status(200).json({...req.body, updateData});
	} catch (err) {
		console.log(err.message);
		handleErrors(err, res);
	}
};

const updateProfile = async (req, res) => {
	try {
		const {email} = req.user;
		const checkUser = await UserDataModel.findOne({email});

		if (req.body.email) {
			return res.status(400).json("Your email is unique and can't be changed");
		}

		const previousProfileData = checkUser.userProfile;
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
		).select([...excludedFieldsInArray, '-pin']);
		console.log(updateData);
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

		const errorValue = errorKey => {
			if (errorKey === 'email')
				return 'Email has already been used with another account';
			else if (errorKey === 'phoneNo')
				return 'Phone number has already been used with another account';
			else
				return `${errorKey} value has already been used with another account`;
		};
		return res.status(400).json({
			[errorKey()]: errorValue(errorKey()),
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

module.exports = {
	getUserData,
	postUserData,
	putUserData,
	updateProfile,
	handleErrors,
};
