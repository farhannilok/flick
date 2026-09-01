import express, { type Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { LIMIT } from './constants/constants.ts';

const app: Express = express();

// 1. use cors middleware
// 2. use middleware for body and url parsing
// 3. include nested object in urlencoded and limit for both body parsing and url
// 4. add cookie parser
// 5. add a middleware to serve static files
app.use(
	cors({
		origin: process.env.CORS_ORIGIN,
		credentials: true,
	}),
);

app.use(
	express.json({
		limit: LIMIT,
	}),
);

app.use(
	express.urlencoded({
		limit: LIMIT,
	}),
);

app.use(express.static('public'));

app.use(cookieParser());

export { app };
