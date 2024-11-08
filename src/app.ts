import express from 'express';
import transactionRoutes from './routes/transactionRoutes';

const app = express();

app.use(express.json());
app.use('/api', transactionRoutes);

export default app;