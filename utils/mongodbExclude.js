const excludedFieldsInArray = ['-__v', '-updatedAt', '-createdAt'];

const excludedFieldsInObject = {
	updatedAt: 0,
	createdAt: 0,
	__v: 0,
};

module.exports = {
	excludedFieldsInArray,
	excludedFieldsInObject,
};
