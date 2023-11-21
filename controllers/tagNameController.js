const UserDataModel = require('../models/userData');
const LocalWallet = require('../models/wallet');
const {handleErrors} = require('../utils/ErrorHandler');

const getTagName = async (req, res) => {
	try {
		const {senderTagName} = req.params;
		let {tagName, type} = req.body;
		if (!senderTagName) throw new Error("Please provide sender's tagName");
		if (!tagName) throw new Error("Please provide receiver's tagName");
		if (tagName.includes('#')) {
			const syntaxCheck = tagName.split('#');
			if (syntaxCheck.length > 2 || syntaxCheck[0]) {
				throw new Error('Please provide a valid tagName');
			}
			tagName = syntaxCheck[1];
		}
		tagName = tagName.toLowerCase();
		let result = await UserDataModel.findOne({
			$or: [{tagName}, {'userProfile.userName': tagName}],
		}).select([
			'email',
			'userProfile.fullName',
			'userProfile.phoneNumber',
			'photoURL',
			'tagName',
			'blockedUsers',
		]);
		if (!result) {
			const wallet = await LocalWallet.findOne({loopayAccNo: tagName}).select([
				'tagName',
			]);
			if (wallet) {
				result = await UserDataModel.findOne({
					tagName: wallet.tagName,
				}).select([
					'email',
					'userProfile.fullName',
					'userProfile.phoneNumber',
					'photoURL',
					'tagName',
					'blockedUsers',
				]);
			}
		}
		console.log(result);
		if (!result) throw new Error('No user found with this tag name');
		if (type === 'requestFund') {
			const blockedUsers = result.blockedUsers;
			if (blockedUsers.includes(req.user.email)) {
				throw new Error("You're blocked");
			}
		}
		if (senderTagName === result.tagName)
			throw new Error('No user found with this tag name');
		const response = {
			email: result.email,
			fullName: result.userProfile.fullName,
			tagName: result.tagName,
			phoneNumber: result.userProfile.phoneNumber,
			accNo: result.userProfile.phoneNumber.slice(4),
			photo: result.photoURL || '',
		};
		return res.status(200).json(response);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const createTagName = async (req, res) => {
	try {
		const {email} = req.user;
		const {tagName} = req.body;
		if (!tagName || tagName.length < 6 || tagName.length > 16)
			throw new Error('Invalid tagName');

		const userData = await UserDataModel.findOne({email});
		const wallet = await LocalWallet.findOne({email});
		userData.tagName = tagName;
		wallet.tagName = tagName;
		await userData.save();
		await wallet.save();
		res.status(200).json('tagName updated successfully');
	} catch (err) {
		handleErrors(err, res);
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
			'userProfile.userName',
			'photoURL',
			'tagName',
		]);
		if (!result) throw new Error('No user found with this phone number');
		if (senderPhoneNo === result.userProfile.phoneNumber)
			throw new Error('No user found with this phone number');

		const response = {
			email: result.email,
			fullName: result.userProfile.fullName,
			tagName: result.tagName,
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
