import express from "express";
import { validateRequestQuery } from "../core/validation.middleware";
import transactionFilterSchema from "../transaction/transaction.schema";
import { getTransactions } from "./transaction.controller";

const router = express.Router();

router.get("/ledgers/:id/transactions", validateRequestQuery(transactionFilterSchema), getTransactions);

export default router;
