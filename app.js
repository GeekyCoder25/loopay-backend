const express = require('express');
const cors = require('cors');
const dotEnv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userDataRoutes = require('./routes/userDataRoutes');
const {protect} = require('./middleware/authMiddleware');
require('colors');

dotEnv.config();
// eslint-disable-next-line no-undef
const PORT = process.env.PORT;
// eslint-disable-next-line no-undef
const dbURI = process.env.MONGO_URI;
const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
mongoose
	.connect(dbURI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		// useCreateIndex: true,
		// useFindAndModify: false,
	})
	.then(mongo => {
		console.log(`mongodb running on ${mongo.connection.host.rainbow.bold}`);
		app.listen(PORT, () => {
			console.log(`App listening on port ${PORT}!`.yellow.bold);
		});
	})
	.catch(err =>
		console.log("Couldn't connect to MonogoDB,".red.bold, err.message.red)
	);

app.use('/api/auth', authRoutes);
// app.use('/api', userDataRoutes);
app.use('/api/user', protect, userDataRoutes);
app.get('/api/network', (req, res) => {
	console.log('network request');
	res.send({network: true});
});
app.get('/api', (req, res) => {
	console.log('Lopay Backend');
	res.send({app: 'Loopay'});
});
