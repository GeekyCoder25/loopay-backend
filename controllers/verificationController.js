const cloudinary = require('cloudinary').v2;
const DataUriParser = require('datauri/parser');
const path = require('path');
const VerificationModel = require('../models/verification');
const userData = require('../models/userData');

const postVerificationData = async (req, res) => {
	try {
		if (!req.files) {
			return res.status(400).json({message: 'No file uploaded'});
		}
		const {front, back} = req.files;
		const {data} = req.body;
		const body = data && JSON.parse(data);
		if (!front || !back || !body) {
			return res
				.status(400)
				.json({message: 'Please provide all required data'});
		}

		const {country, idType} = body;

		// Check if the uploaded file is an image
		if (
			!front.mimetype.startsWith('image') ||
			!back.mimetype.startsWith('image')
		) {
			return res.status(400).json({message: 'File uploaded is not an image'});
		}

		front.name = `loopay_photo_${req.user.email}_${req.user._id}${
			path.parse(front.name).ext
		}`;
		back.name = `loopay_photo_${req.user.email}_${req.user._id}${
			path.parse(back.name).ext
		}`;
		// if (
		// 	front.size > process.env.MAX_FILE_UPLOAD ||
		// 	back.size > process.env.MAX_FILE_UPLOAD
		// ) {
		// 	return res.status(400).json({
		// 		message: `Please upload an image less than ${
		// 			// eslint-disable-next-line no-undef
		// 			process.env.MAX_FILE_UPLOAD / 1000000
		// 		}MB`,
		// 	});
		// }

		const dataUri = new DataUriParser();

		const formatAsDataUri = file => dataUri.format(file.name, file.data);

		const saveFrontName = `verify_${country.name}_${idType.name}_front_${req.user.email}_${req.user._id}`;
		const saveBackName = `verify_${country.name}_${idType.name}back${req.user.email}_${req.user._id}`;

		const formattedFrontFile = formatAsDataUri(front);
		const formattedBackFile = formatAsDataUri(back);
		await userData.updateOne(
			{email: req.user.email},
			{verificationStatus: 'pending'},
			{new: true, runValidators: true}
		);
		cloudinary.uploader.upload(
			formattedFrontFile.content,
			{
				public_id: saveFrontName,
				folder: `loopay/verifications/${country.name}/${idType.name}`,
			},
			async (error, frontResult) => {
				if (error) {
					console.error(error);
					return res
						.status(500)
						.json({message: 'Error uploading file to Cloudinary'});
				}

				cloudinary.uploader.upload(
					formattedBackFile.content,
					{
						public_id: saveBackName,
						folder: `loopay/verifications/${country.name}/${idType.name}`,
					},
					async (error, backResult) => {
						try {
							if (error) {
								console.error(error);
								return res
									.status(500)
									.json({message: 'Error uploading file to Cloudinary'});
							}
							await VerificationModel.create({
								email: req.user.email,
								country: country.name,
								idType: idType.name,
								front: frontResult.secure_url,
								back: backResult.secure_url,
							});
							await userData.updateOne(
								{email: req.user.email},
								{verificationStatus: true},
								{new: true, runValidators: true}
							);
							res.json({
								message: 'Files uploaded to Cloudinary successfully',
								verificationStatus: true,
							});
						} catch (err) {
							console.log(err.message);
							res.status(400).json({message: err.message});

							// throw new Error(err);
						}
					}
				);
			}
		);
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

module.exports = {
	postVerificationData,
};