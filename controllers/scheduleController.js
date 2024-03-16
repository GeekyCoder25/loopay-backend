const {scheduledTasks} = require('../middleware/agenda');
const ScheduleModal = require('../models/schedule');

const getSchedules = async (req, res) => {
	try {
		const schedules = await ScheduleModal.find({email: req.user.email});

		return res.status(200).json(schedules);
	} catch (error) {
		console.log(error.message);
	}
};

const updateSchedule = async (req, res) => {
	try {
		const schedules = await ScheduleModal.findByIdAndUpdate(
			req.params.id,
			req.body
		);
		return res.status(200).json(schedules);
	} catch (error) {
		console.log(error.message);
	}
};

const deleteSchedule = async (req, res) => {
	try {
		const schedules = await ScheduleModal.findByIdAndDelete(req.params.id);
		const unscheduleTask = taskId => {
			const scheduledTask = scheduledTasks[taskId];
			if (scheduledTask) {
				scheduledTask.stop();
				delete scheduledTasks[taskId];
			}
		};
		unscheduleTask(req.params.id);

		return res.status(200).json(schedules);
	} catch (error) {
		console.log(error.message);
	}
};

module.exports = {getSchedules, updateSchedule, deleteSchedule};
