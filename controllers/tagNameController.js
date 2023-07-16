const UserDataModel = require('../models/userData');

const getTagName = async (req, res) => {
	const {tagName} = req.params;
	const {senderTagName} = req.body;

	if (!senderTagName)
		return res.status(400).json('Please provide sender tagName');
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
		photo: result.photoURL || '',
	};
	return res.status(200).json(response);
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
};
