import express from "express";
import { getLedgers, getTransactions, importdata } from "./ledger.controller";

const router = express.Router();

router.get("/ledgers", getLedgers);
router.get("/ledgers/:id/transactions", getTransactions);
router.post("/import", importdata);

export default router;
