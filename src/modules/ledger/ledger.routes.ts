import express from "express";
import { getLedgers, getLedger, getCategoricalMonthlyExpenses, saveTransaction } from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id", getLedger);
router.post("/ledgers/:id/transactions", saveTransaction);
router.get("/ledgers/:id/categorical-monthly-expenses", getCategoricalMonthlyExpenses);

export default router;
