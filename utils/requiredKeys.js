const requiredKeys = (req, res, requiredKeys) => {
	let unavailableKeys = [];
	requiredKeys.forEach(key => {
		if (!Object.keys(req.body).includes(key)) {
			unavailableKeys.push(key);
		}
	});
	if (unavailableKeys.length > 0) {
		return res
			.status(400)
			.json(`Please provide all required keys '${[unavailableKeys]}'`);
	}
};

module.exports = {
	requiredKeys,
};
