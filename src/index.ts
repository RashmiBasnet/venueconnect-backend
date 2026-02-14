import app from "./app";
import { PORT } from "./config";
import { connectDatabase } from "./database/mongoose";

async function start() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log(`Server: http:localhost:${PORT}`);
    })
}
start().catch((error) => console.log(error));