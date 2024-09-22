import express from "express";
import { getLedgers, getLedger, getAccounts, getRecipients, getCategories, getTransactions, saveTransaction, importFromYnabExport, importfromCommerzbankExport } from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id", getLedger);
router.get("/ledgers/:id/accounts", getAccounts);
router.get("/ledgers/:id/recipients", getRecipients);
router.get("/ledgers/:id/categories", getCategories);
router.get("/ledgers/:id/transactions", getTransactions);
router.post("/ledgers/:id/transactions", saveTransaction);
router.post("/import-ynab", importFromYnabExport);
router.post("/import-commerzbank", importfromCommerzbankExport);

export default router;
