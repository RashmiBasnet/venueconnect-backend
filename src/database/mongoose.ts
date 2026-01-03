import mongoose from "mongoose";
import { MONGO_URI } from "../config";

export async function connectDatabase() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to database successfully");
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}