import "dotenv/config";
import app from "./config/express";
import { connect } from "mongoose";

app.listen(app.get("port"), async () => {
    await connect(process.env.MONGODB_URI || "");
    console.info(`Server running on port ${app.get("port")} in ${app.settings.env} mode...`);
});
