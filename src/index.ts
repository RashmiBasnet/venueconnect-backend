import { PORT } from "./config";
import { connectDatabase } from "./database/mongoose";
import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();
console.log(process.env.PORT);

import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import adminUserRouter from "./routes/admin/user.routes";

const app: Application = express();

app.use(bodyParser.json());

let corsOptions = {
    origin: [
        'http://localhost:3000', 
        'http://localhost:3003/',
        "http://192.168.101.5:3000",
        "http://192.168.101.5:3003",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

app.use(cors(corsOptions));

app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // static file serving

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/admin/users', adminUserRouter);

async function start() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Server: http:localhost:${PORT}`);
    })
}
start().catch((error) => console.log(error));