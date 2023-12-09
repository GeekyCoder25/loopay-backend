/* eslint-disable no-undef */
const cloudinary = require('cloudinary').v2;
const path = require('path');

const UserDataModel = require('../models/userData');
const DataUriParser = require('datauri/parser');

const datauri = new DataUriParser();

const formatAsDataUri = file => datauri.format(file.name, file.data);

const uploadPhoto = (req, res) => {
	if (!req.files) {
		return res.status(400).json({message: 'No file uploaded'});
	}
	const file = req.files.file;

	// Check if the uploaded file is an image
	if (!file.mimetype.startsWith('image')) {
		return res.status(400).json({message: 'File uploaded is not an image'});
	}

	// eslint-disable-next-line no-undef
	if (file.size > process.env.MAX_FILE_UPLOAD) {
		return res.status(400).json({
			message: `Please upload an image less than ${
				// eslint-disable-next-line no-undef
				process.env.MAX_FILE_UPLOAD / 1000000
			}MB`,
		});
	}
	file.name = `loopay_photo_${req.user.email}_${req.user._id}${
		path.parse(file.name).ext
	}`;
	const saveFileName = `loopay_photo_${req.user.email}_${req.user._id}`;

	const formattedFile = formatAsDataUri(file);

	cloudinary.uploader.upload(
		formattedFile.content,
		{public_id: saveFileName, folder: 'loopay/usersIcon'},
		async (error, result) => {
			if (error) {
				console.error(error);
				return res
					.status(500)
					.json({message: 'Error uploading file to Cloudinary'});
			}
			await UserDataModel.updateOne(
				{email: req.user.email},
				{photo: file.name, photoURL: result.secure_url}
			);
			res.json({
				message: 'File uploaded to Cloudinary successfully',
				photo: file.name,
				photoURL: result.secure_url,
			});
		}
	);
};

module.exports = {
	uploadPhoto,
};
