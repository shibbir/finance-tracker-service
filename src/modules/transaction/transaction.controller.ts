import { Request, Response, NextFunction } from "express";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";

const getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const ledger = await Ledger.findById(req.params.id);

        if (!ledger) {
            return res.status(404).json({ error: `Ledger not found: ${req.params.id}` });
        }

        const { account_id, category_id, merchant_id, start_date, end_date } = req.query;
        const filter: any = { ledger_id: req.params.id };

        if (account_id) filter.account_id = account_id;
        if (category_id) filter.category_id = category_id;
        if (merchant_id) filter.merchant_id = merchant_id;
        if (start_date || end_date) {
            filter.date = {};
            if (start_date) {
                filter.date.$gte = new Date(new Date(start_date as string).setHours(0, 0, 0));
            }
            if (end_date) {
                filter.date.$lte = new Date(new Date(end_date as string).setHours(23, 59, 59, 999));
            }
        }

        const transactions = await Transaction.find(filter).sort({ date: -1 }).lean();

        const response = transactions.map(tx => ({
            ...tx,
            account: { _id: tx.account_id,  name: ledger.accounts.find(a => a._id.equals(tx.account_id))?.name },
            merchant: { _id: tx.merchant_id, name: ledger.merchants.find(m => m._id.equals(tx.merchant_id))?.name },
            category: { _id: tx.category_id, name: ledger.categories.find(c => c._id.equals(tx.category_id))?.name }
        }));

        res.json(response);
    } catch (error) {
        next(error);
    }
}

export { getTransactions };
