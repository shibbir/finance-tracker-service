import cors from "cors";
import helmet from "helmet";
import express, { Express } from "express";

const app: Express = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.set("port", process.env.PORT);

import importRoutes from "../modules/core/import.routes";
import ledgerRoutes from "../modules/ledger/ledger.routes";
import transactionRoutes from "../modules/transaction/transaction.routes";

app.use("/", importRoutes);
app.use("/", ledgerRoutes);
app.use("/", transactionRoutes);

export default app;
