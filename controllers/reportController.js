const ReportModel = require('../models/report');

const postReport = async (req, res) => {
	try {
		const report = {
			email: req.user.email,
			title: req.body.title,
			message: req.body.message,
			id: req.body.id,
			metadata: req.body,
		};
		await ReportModel.create(report);

		res
			.status(200)
			.json('Submitted successfully, kindly wait while our team work on it');
	} catch (error) {
		console.log(error.message);
		if (error.code === 11000) {
			const errorKey = Object.keys(error.keyPattern)[0].includes('.')
				? Object.keys(error.keyPattern)[0].split('.')[1]
				: Object.keys(error.keyPattern)[0];

			if (errorKey === 'id') {
				return res
					.status(400)
					.json('Already submitted, your report will be attended to soon');
			}
		}
		res.status(400).json("Error, couldn't submit");
	}
};

const getReports = async (req, res) => {
	try {
		const reports = await ReportModel.find();
		res.status(200).json(reports);
	} catch (error) {
		console.log(error.message);
		res.status(400).json("Couldn't fetch reports");
	}
};

module.exports = {
	postReport,
	getReports,
};
