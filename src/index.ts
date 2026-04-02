import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectToDatabase } from './config/db';
import authRoutes from './routes/authRoutes';
import dataRoutes from './routes/dataRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI ?? '';

export const startServer = async () => {
  await connectToDatabase(mongoUri);
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

export default app;
