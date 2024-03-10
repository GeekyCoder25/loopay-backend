const schedulePayment = async (req, res, next) => {
	console.log(req.body);
	if (req.body?.scheduleData) {
		const {scheduleData} = req.body;
	}

	next();
};

module.exports = {schedulePayment};
