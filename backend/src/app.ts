import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import v1Routes from './routes/v1';
import { globalErrorHandler } from './middlewares/error.handler.middleware';

const app = express();

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/v1', v1Routes);

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server initialized successfully' });
});

app.use(globalErrorHandler);

export default app;
