const cron = require('node-cron');
const ScheduleModal = require('../models/schedule');
const {generateCronExpression} = require('./agenda');

const schedulePayment = async (req, res, next) => {
	if (req.body?.scheduleData) {
		req.schedule = handleSchedule;
	}
	next();
};

const handleSchedule = async req => {
	try {
		const {scheduleData} = req.body;
		const {
			id,
			transactionType,
			currency,
			frequency,
			period: periodObject,
			title,
			start,
			end,
			description = 'Sent from loopay',
		} = scheduleData;

		const {period} = periodObject;
		const transactionData = {...req.body};
		delete transactionData.scheduleData;

		let second;
		let minute;
		let hour;
		let dayOfWeek;
		let dateOfMonth;
		let month;

		switch (frequency.id) {
			case 'hourly':
				second = new Date(period).getSeconds();
				minute = new Date(period).getMinutes();
				break;
			case 'daily':
				second = new Date(period).getSeconds();
				minute = new Date(period).getMinutes();
				hour = new Date(period).getHours();
				break;
			case 'weekly':
				dayOfWeek = period;
				break;
			case 'monthly':
				dateOfMonth = new Date(period).getDate();
				break;
			case 'annually':
				month = period;
				break;
			default:
				break;
		}

		const task = await ScheduleModal.create({
			email: req.user.email,
			phoneNumber: req.user.phoneNumber,
			id,
			title,
			frequency,
			description,
			transactionType,
			transactionData,
			currency,
			period: periodObject,
			second,
			minute,
			hour,
			dayOfWeek,
			dateOfMonth,
			month,
			startDate: start,
			endDate: end,
			user: req.user,
			query: req.query,
		});

		const expression = generateCronExpression(task);

		if (expression) {
			cron.schedule(expression, () => handleSchedule(task));
		}
	} catch (error) {
		throw new Error(error.message);
	}
};

module.exports = {schedulePayment};
