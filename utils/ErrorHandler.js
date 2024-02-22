const handleErrors = (err, res) => {
	let errors = {};
	if (err.code === 11000) {
		const errorKey = () =>
			Object.keys(err.keyPattern)[0].includes('.')
				? Object.keys(err.keyPattern)[0].split('.')[1]
				: Object.keys(err.keyPattern)[0];

		const errorValue = errorKey => {
			if (errorKey === 'email')
				return 'Email has already been used with another account';
			else if (errorKey === 'phoneNo' || errorKey === 'phoneNumber')
				return 'Phone number has already been used with another account';
			else
				return `${errorKey} value has already been used with another account`;
		};
		return res.status(400).json({
			[errorKey()]: errorValue(errorKey()),
		});
	} else if (err.message.includes('validation failed')) {
		Object.values(err.errors).forEach(({properties}) => {
			if (properties) errors[properties.path] = properties.message;
		});
		const error = Object.keys(errors)[0]
			? {[Object.keys(errors)[0]]: Object.values(errors)[0]}
			: err.message;
		return res.status(400).json(error);
	}
	res.status(400).json(err.message);
	return errors;
};

module.exports = {
	handleErrors,
};
