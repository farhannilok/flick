import dotenv from 'dotenv';
import dns from 'node:dns';
import { connectDB } from './db/index.ts';
import { app } from './app.ts';
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

app.get('/', (req, res) => {
	res.send('Hello World');
});

// (async () => {
// 	try {
//     await mongoose.connect(process.env.MONGODB_URI);
// 		console.log('Database connected');
// 	} catch (err) {
// 		console.log('Error occured ==> ', err);
// 	}
// })();
connectDB()
	.then(() => {
		app.listen(3000, () => {
			console.log('⚙️ Server is running on port 3000');
		});
	})
	.catch((err) => {
		console.log('MongoDB connection failed!', err);
		process.exit(1);
	});
