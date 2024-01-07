const DataUriParser = require('datauri/parser');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const PaymentProofModel = require('../models/paymentproof');
const {sendMail} = require('../utils/sendEmail');
const {addingDecimal} = require('../utils/addingDecimal');

const dataUri = new DataUriParser();

const formatAsDataUri = file => dataUri.format(file.name, file.data);

const postPaymentProof = async (req, res) => {
	try {
		if (req.body.data && JSON.parse(req.body.data).type === 'transfer') {
			if (!req.files) throw new Error('No file uploaded');
			const {file} = req.files;
			// Check if the uploaded file is an image
			if (!file.mimetype.startsWith('image'))
				throw new Error('File uploaded is not an image');

			if (!req.body.data) throw new Error('amount upload not found');
			const body = JSON.parse(req.body.data);
			if (!body.amount) throw new Error('amount upload not found');
			else if (isNaN(Number(body.amount))) throw new Error('Invalid amount');
			// eslint-disable-next-line no-undef
			if (file.size > process.env.MAX_FILE_UPLOAD)
				throw new Error({
					message: `Please upload an image less than ${
						// eslint-disable-next-line no-undef
						process.env.MAX_FILE_UPLOAD / 1000000
					}MB`,
				});

			file.name = `loopay_proof_${req.user.email}_${req.user._id}${
				path.parse(file.name).ext
			}`;
			const saveFileName = `${req.user.email}_${req.user._id}`;

			const formattedFile = formatAsDataUri(file);

			cloudinary.uploader.upload(
				formattedFile.content,
				{public_id: saveFileName, folder: 'loopay/payment-proofs'},
				async (error, result) => {
					if (error) {
						console.error(error.message);
						return res.status(500).json('Error uploading file to Server');
					}

					const html = String.raw`<div
					style="line-height: 30px; font-family: Arial, Helvetica, sans-serif"
				>
					<div style="text-align: center">
						<img
							src="${process.env.CLOUDINARY_APP_ICON}"
							style="width: 200px; margin: 50px auto"
						/>
					</div>
					<p>
						User ${req.user.email} just submitted a payment proof of
						${body.currency}${addingDecimal(Number(body.amount).toLocaleString())},
						<a href=${result.secure_url}>click here</a> to view image proof
						<br />
					</p>
                    <p>Additional Message: ${body.message || ''}</p>
					<p>
						You are receiving this mail because your email has been registered
						as am admin email on Loopay.<br />
						Best regards.
					</p>
				</div>`;
					const mailOptions = {
						from: process.env.EMAIL,
						to: process.env.ADMIN_EMAIL,
						subject: 'Payment proof',
						html,
					};
					if (!body.tagName || !body.accNo)
						throw new Error('Please provide all required fields');
					const responseData = async () => {
						await PaymentProofModel.create({
							email: req.user.email,
							...body,
							image: result.secure_url,
						});
						res.status(200).json({
							message: 'Proof submitted successfully',
							imageUrl: result.secure_url,
						});
					};
					const errorFunc = () => res.status(400).json('Server error');
					sendMail(mailOptions, '', '', responseData, errorFunc);
				}
			);
		} else if (req.body.type === 'card') {
			await PaymentProofModel.create({
				email: req.user.email,
				...req.body,
			});
			res.status(200).json({
				message: 'Proof submitted successfully',
			});
		}
		throw new Error('transaction type not provided');
	} catch (err) {
		res.status(400).json(err.message);
	}
};

module.exports = {
	postPaymentProof,
};
