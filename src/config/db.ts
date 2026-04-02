import mongoose, { type ConnectOptions } from 'mongoose';

export const connectToDatabase = async (uri: string): Promise<void> => {
  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI.');
  }

  const options: ConnectOptions = {};
  if (process.env.MONGODB_DB) {
    options.dbName = process.env.MONGODB_DB;
  }

  await mongoose.connect(uri, options);
};
