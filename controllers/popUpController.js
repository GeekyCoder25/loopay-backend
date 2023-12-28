const PopUp = require('../models/popUp');
const {handleErrors} = require('../utils/ErrorHandler');

const getPopUp = async (req, res) => {
	try {
		const popUp = await PopUp.find();
		res.status(200).json(popUp);
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

const postPopUp = async (req, res) => {
	try {
		let {title, message, image, video, popUpID} = req.body;
		if (!title) throw new Error('Announcement title not provided');
		else if (!message && !image && !video)
			throw new Error('Announcement content not provided');

		if (image && !image.startsWith('https://')) {
			image = 'https://' + image;
		}
		if (video && !video.startsWith('https://')) {
			video = 'https://' + video;
		}
		const popUp = await PopUp.create({
			title,
			message,
			image,
			video,
			popUpID: popUpID || new Date(),
		});
		res.status(200).json(popUp);
	} catch (err) {
		handleErrors(err, res);
	}
};

const updatePopUp = async (req, res) => {
	try {
		let {title, message, image, video, popUpID} = req.body;
		if (!title) throw new Error('Announcement title not provided');
		else if (!message && !image && !video)
			throw new Error('Announcement content not provided');

		if (image && !image.startsWith('https://')) {
			image = 'https://' + image;
		}
		if (video && !video.startsWith('https://')) {
			video = 'https://' + video;
		}
		const popUp = await PopUp.findOneAndUpdate(
			{popUpID},
			{
				title,
				message,
				image,
				video,
				popUpID: popUpID || new Date(),
			},
			{new: true, runValidators: true}
		);
		if (!popUp) throw new Error('No announcement found with the provided ID');
		res.status(200).json(popUp);
	} catch (err) {
		handleErrors(err, res);
	}
};

const deletePopUp = async (req, res) => {
	try {
		const {popUpID} = req.params;
		await PopUp.findOneAndRemove({popUpID});
		res.status(200).json('Deleted successfully');
	} catch (err) {
		console.log(err.message);
		res.status(400).json(err.message);
	}
};

module.exports = {getPopUp, postPopUp, updatePopUp, deletePopUp};
