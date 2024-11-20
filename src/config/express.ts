import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.set("port", process.env.PORT);

import ledger_routes from "../modules/ledger/ledger.routes";

app.use("/", ledger_routes);

export default app;
