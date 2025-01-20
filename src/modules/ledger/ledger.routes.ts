import express from "express";
import { getLedgers, getLedger,getAccounts, getMerchants, getCategories, getCategoricalMonthlyExpenses, saveTransaction } from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id", getLedger);
router.get("/ledgers/:id/accounts", getAccounts);
router.get("/ledgers/:id/merchants", getMerchants);
router.get("/ledgers/:id/categories", getCategories);
router.post("/ledgers/:id/transactions", saveTransaction);
router.get("/ledgers/:id/categorical-monthly-expenses", getCategoricalMonthlyExpenses);

export default router;
