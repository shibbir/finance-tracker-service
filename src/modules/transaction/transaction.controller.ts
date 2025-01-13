import { format } from "date-fns";
import { Request, Response } from "express";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";

interface ITransactionQueries{
    ledger_id?: string;
    account_id?: any;
    category_id?: any;
    date?: any;
    amount?: any;
}

async function getTransactions(req: Request, res: Response) {
    const ledger = await Ledger.findById(req.params.id);

    const transaction_where_clause:ITransactionQueries = { ledger_id: req.params.id };
    if(req.query.account_id) transaction_where_clause.account_id = req.query.account_id;
    if(req.query.category_id) transaction_where_clause.category_id = req.query.category_id;
    if(req.query.start_date && req.query.end_date) {
        transaction_where_clause.date = {
            $gte: new Date(new Date(req.query.start_date).setHours(0, 0, 0)),
            $lt: new Date(new Date(req.query.end_date).setHours(23, 59, 59))
        };
    }

    const transactions = await Transaction.find(transaction_where_clause).sort({ date: "descending" }).lean();

    const t_view = [];

    for(const transaction of transactions) {
        t_view.push({
            ...transaction,
            date: format(new Date(transaction.date), "dd/MM/yyyy"),
            account: {
                _id: transaction.account_id,
                name: ledger?.accounts.find(o => o._id.equals(transaction.account_id))?.name
            },
            merchant: {
                _id: transaction.merchant_id,
                name: ledger?.merchants.find(o => o._id.equals(transaction.merchant_id))?.name
            },
            category: {
                _id: transaction.category_id,
                name: ledger?.categories.find(o => o._id.equals(transaction.category_id))?.name
            }
        });
    }

    res.json(t_view);
}

export { getTransactions };
