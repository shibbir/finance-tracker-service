import express from "express";
import { getLedgers, getLedger, getAccounts, getPayees, getCategories, getTransactions, saveTransaction, importdata } from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id", getLedger);
router.get("/ledgers/:id/accounts", getAccounts);
router.get("/ledgers/:id/payees", getPayees);
router.get("/ledgers/:id/categories", getCategories);
router.get("/ledgers/:id/transactions", getTransactions);
router.post("/ledgers/:id/transactions", saveTransaction);
router.post("/import", importdata);

export default router;
