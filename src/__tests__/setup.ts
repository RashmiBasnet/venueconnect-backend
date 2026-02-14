import { connectDatabase } from '../database/mongoose';
import mongoose from 'mongoose';

beforeAll(async () => {
    await connectDatabase();
});

afterAll(async () => {
    await mongoose.connection.close();
});

