import express from "express";
import {
    getLedgers, getLedger,getAccounts, getRecipients, getCategories, getTransactions, getCategoricalMonthlyExpenses, saveTransaction,
    importFromYnab, importfromCommerzbank, importFromN26, getExpenses
} from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id", getLedger);
router.get("/ledgers/:id/accounts", getAccounts);
router.get("/ledgers/:id/recipients", getRecipients);
router.get("/ledgers/:id/categories", getCategories);
router.get("/ledgers/:id/transactions", getTransactions);
router.post("/ledgers/:id/transactions", saveTransaction);
router.get("/ledgers/:id/expenses", getExpenses);
router.get("/ledgers/:id/categorical-monthly-expenses", getCategoricalMonthlyExpenses);
router.post("/import-ynab", importFromYnab);
router.post("/import-commerzbank", importfromCommerzbank);
router.post("/import-n26", importFromN26);

export default router;
