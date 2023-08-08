const UserModel = require('../models/user');
const UserDataModel = require('../models/userData');
const WalletModel = require('../models/wallet');

const getTagName = async (req, res) => {
	const {senderTagName} = req.params;
	let {tagName} = req.body;

	if (!senderTagName)
		return res.status(400).json("Please provide sender's tagName");
	if (!tagName)
		return res.status(400).json("Please provide receiver's tagName");

	if (tagName.includes('#')) {
		const syntaxCheck = tagName.split('#');
		if (syntaxCheck.length > 2 || syntaxCheck[0]) {
			return res.status(400).json('Please provide a valid tagName');
		}
		tagName = syntaxCheck[1];
	}

	const result = await UserDataModel.findOne({tagName}).select([
		'email',
		'userProfile.fullName',
		'userProfile.phoneNumber',
		'photoURL',
		'tagName',
	]);
	if (!result) return res.status(400).json('No user found with this tag name');
	if (senderTagName === result.tagName)
		return res.status(400).json('No user found with this tag name');
	const response = {
		email: result.email,
		fullName: result.userProfile.fullName,
		tagName: result.tagName,
		phoneNumber: result.userProfile.phoneNumber,
		accNo: result.userProfile.phoneNumber.slice(4),
		photo: result.photoURL || '',
	};
	return res.status(200).json(response);
};

const createTagName = async (req, res) => {
	try {
		const {email} = req.user;
		const {tagName} = req.body;
		if (!tagName || tagName.length < 6 || tagName.length > 16)
			throw new Error('Invalid tagName');

		const userData = await UserDataModel.findOne({email});
		const wallet = await WalletModel.findOne({email});
		userData.tagName = tagName;
		wallet.tagName = tagName;
		await userData.save();
		await wallet.save();
		res.status(200).json('tagName updated successfully');
	} catch (err) {
		return res.status(400).json(err.message);
	}
};

const getPhone = async (req, res) => {
	try {
		const {phoneNumber: senderPhoneNo} = req.user;
		let {phoneNumber: sendeePhoneNo} = req.body;

		if (!senderPhoneNo)
			return res.status(400).json("Please provide sender's phone number");
		if (!sendeePhoneNo)
			return res.status(400).json("Please provide receiver's phone number");

		if (sendeePhoneNo.length < 13)
			throw new Error('Please provide a valid phone number');

		const result = await UserDataModel.findOne({
			'userProfile.phoneNumber': sendeePhoneNo,
		}).select([
			'email',
			'userProfile.fullName',
			'userProfile.phoneNumber',
			'photoURL',
			'tagName',
		]);
		if (!result) throw new Error('No user found with this phone number');
		if (senderPhoneNo === result.userProfile.phoneNumber)
			throw new Error('No user found with this phone number');
		let userName;
		if (!result.tagName)
			userName = await UserModel.findOne({phoneNumber: sendeePhoneNo}).select(
				'userName'
			);
		const response = {
			email: result.email,
			fullName: result.userProfile.fullName,
			tagName: result.tagName || result.userName,
			userName: userName.userName,
			phoneNumber: result.userProfile.phoneNumber,
			accNo: result.userProfile.phoneNumber.slice(4),
			photo: result.photoURL || '',
		};
		return res.status(200).json(response);
	} catch (err) {
		res.status(400).json(err.message);
	}
};
// const updateTagName = async (req, res) => {
// 	const {email} = req.user;
// 	if (req.body.email) {
// 		return res.status(400).json("Your email is unique and can't be changed");
// 	}
// 	const updateData = await UserDataModel.findOneAndUpdate(
// 		{email},
// 		{},
// 		{
// 			new: true,
// 			runValidators: true,
// 		}
// 	).select([...excludedFieldsInArray, '-pin']);
// };
module.exports = {
	getTagName,
	createTagName,
	getPhone,
};
