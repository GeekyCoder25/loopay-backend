const UserDataModel = require('../models/userData');
const {
	excludedFieldsInObject,
	excludedFieldsInArray,
} = require('../utils/mongodbExclude');
const {handleErrors} = require('../utils/ErrorHandler');
const PopUp = require('../models/popUp');

const getUserData = async (req, res) => {
	try {
		const {email} = req.user;
		const userData = await UserDataModel.findOne(
			{email},
			excludedFieldsInObject
		);
		if (!userData) return res.status(404).json('No user found');

		let popUps = [];

		if (req.query.popup && JSON.parse(req.query.popup)) {
			const currentDate = new Date();
			const popUpIDs = userData.popUpIDs;

			popUps = await PopUp.find({
				$or: [
					{
						createdAt: {
							$gt: userData.popUpLastQuery || new Date('2023/01/01'),
						},
					},
					{expireAt: {$lt: currentDate}},
					{popUpID: {$in: popUpIDs}},
				],
			});
			userData.popUpLastQuery = new Date();
			userData.popUpIDs = popUps.map(index => index.popUpID);
			await userData.save();
		}

		const result = Object.assign(userData, {
			sessionTime: req.sessionTime,
			pin: userData.pin ? true : false,
			popUps,
		});
		res.status(200).json(result);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
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
			return res.status(400).json("Your email can't be changed");
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

const deletePopUp = async (req, res) => {
	try {
		const userData = await UserDataModel.findOne({email: req.user.email});
		userData.popUpIDs = userData.popUpIDs.filter(
			popUpID => popUpID !== req.params.popUpID
		);
		await userData.save();
		res.status(200).json({status: 'success'});
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {
	getUserData,
	postUserData,
	putUserData,
	updateProfile,
	deletePopUp,
};
