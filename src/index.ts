import { PORT } from "./config";
import { connectDatabase } from "./database/mongoose";
import express, { Application, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
console.log(process.env.PORT);

import authRoutes from "./routes/auth.routes";

const app: Application = express();

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

async function start() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Server: http:localhost:${PORT}`);
    })
}
start().catch((error) => console.log(error));