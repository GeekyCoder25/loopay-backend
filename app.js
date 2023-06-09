const express = require('express');
const cors = require('cors');
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
// const userDataRoutes = require('./routes/userDataRoutes');
dotEnv.config();
const PORT = 8000;
// const dbURI = 'mongodb://127.0.0.1:27017/item7';
const dbURI = '';
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
console.log('shit');
app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}!`);
});
mongoose
	.connect(dbURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// useCreateIndex: true,
		// useFindAndModify: false,
	})
	.then(mongo => {
		console.log(`mongodb running on ${mongo.connection.host}`);
	})
	.catch(err => console.log("Couldn't connect to MonogoDB", err.message));
app.get('/', () => console.log('yo'));
app.use('/api/auth', authRoutes);
// app.use('/api', userDataRoutes);
app.get('/api/network', (req, res) => res.send({network: true}));
