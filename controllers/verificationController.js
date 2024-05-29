const cloudinary = require('cloudinary').v2;
const DataUriParser = require('datauri/parser');
const path = require('path');
const VerificationModel = require('../models/verification');
const userData = require('../models/userData');

const postVerificationData = async (req, res) => {
	try {
		const verification = await VerificationModel.findOne({
			email: req.user.email,
		});

		if (verification)
			await VerificationModel.deleteOne({
				email: req.user.email,
			});

		if (Object.keys(req.query)[0] === 'image') {
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
			const dataUri2 = new DataUriParser();

			const saveFrontName = `${req.user.email}/front`;
			const saveBackName = `${req.user.email}/back`;

			const formattedFrontFile = dataUri.format(front.name, front.data);
			const formattedBackFile = dataUri2.format(back.name, back.data);

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
									status: 'pending',
								});
								res.status(200).json({
									message: 'Files uploaded to Cloudinary successfully',
									verificationStatus: true,
								});
							} catch (err) {
								res.status(400).json({message: err.message});
							}
						}
					);
				}
			);
		} else {
			const {country, idType} = req.body;
			if (!country || !idType || !idType.value)
				throw new Error('Please provide all required data');
			await VerificationModel.create({
				email: req.user.email,
				country: country.name,
				idType: idType.name,
				idValue: idType.value,
				status: 'pending',
			});
			if (
				idType.name.toLowerCase() === 'bvn' ||
				idType.name.toLowerCase() === 'bank verification number'
			) {
				await userData.updateOne(
					{email: req.user.email},
					{bvn: idType.value},
					{new: true, runValidators: true}
				);
			}
			res.status(200).json({
				message: 'Verification submitted successfully',
				verificationStatus: true,
			});
		}
	} catch (err) {
		const error = err.response?.data || err.message;
		console.log(error);
		res.status(400).json({message: error});
	}
};

const postFaceVerification = async (req, res) => {
	try {
		if (!req.files) {
			return res.status(400).json({message: 'No file uploaded'});
		}
		const {video} = req.files;

		// Check if the uploaded file is an image
		if (!video.mimetype.startsWith('video')) {
			return res.status(400).json({message: 'File uploaded is not a video'});
		}

		const saveName = `${req.user.email}`;
		const dataUri = new DataUriParser();

		const formattedFile = dataUri.format(video.name, video.data);

		cloudinary.uploader.upload(
			formattedFile.content,
			{
				public_id: saveName,
				folder: `loopay/verifications/face/${req.user.email}`,
				resource_type: 'video',
			},
			async (error, result) => {
				try {
					if (error) {
						console.error('error,', error);
						return res
							.status(500)
							.json({message: 'Error uploading file to Cloudinary'});
					}
					await VerificationModel.findOneAndUpdate(
						{email: req.user.email},
						{faceVideo: result.secure_url, verificationStatus: 'pending'}
					);

					await userData.updateOne(
						{email: req.user.email},
						{verificationStatus: 'pending'},
						{new: true, runValidators: true}
					);

					res.status(200).json({
						message: 'Files uploaded to Cloudinary successfully',
						verificationStatus: true,
					});
				} catch (err) {
					res.status(400).json({message: err.message});
				}
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
	postFaceVerification,
};
