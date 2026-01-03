import dotenv from 'dotenv';

dotenv.config();

export const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 5050;
export const MONGO_URI: string = process.env.MONGO_URI || 'mongodb://localhost:27017/venueconnect_database';
export const JWT_SECRET: string = process.env.JWT_SECRET || 'mero_secret';