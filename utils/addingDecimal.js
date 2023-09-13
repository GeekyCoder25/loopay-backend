const addingDecimal = value => {
	if (!value.includes('.')) {
		return value + '.00';
	} else if (value.split('.')[1].length === 0) {
		return value + '00';
	} else if (value.split('.')[1].length === 1) {
		return value + '0';
	}
	return value;
};

module.exports = {
	addingDecimal,
};
