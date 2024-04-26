import express, { Express } from "express";

const app: Express = express();

app.set("port", process.env.PORT);

import ledger_routes from "../modules/ledger/ledger.routes";

app.use("/", ledger_routes);

export default app;
