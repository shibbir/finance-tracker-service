import currency from "currency.js";
import { NextFunction, Request, Response } from "express";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";

interface ITransactionQueries{
    ledger_id?: string;
    account_id?: any;
    category_id?: any;
    date?: any;
    amount?: any;
}

async function getLedgers(req: Request, res: Response) {
    const docs = await Ledger.find({}).select("name");
    res.json(docs);
}

async function getLedger(req: Request, res: Response, next: NextFunction) {
    try {
        const ledger = await Ledger.findById(req.params.id);

        for(const account of ledger?.accounts) {
            const transactions = await Transaction.find({ ledger_id: req.params.id, account_id: account._id }).lean();
            const balance = transactions.reduce((acc, cur) => acc + cur.amount, 0);
            account.balance = balance;
        }

        res.json(ledger);
    } catch (err) {
        next(err);
    }
}

async function getAccounts(req: Request, res: Response) {
    const ledger = await Ledger.findById(req.params.id).select("accounts");
    res.json(ledger);
}

async function getMerchants(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select("merchants");
    res.json(docs);
}

async function getCategories(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select("categories");
    res.json(docs);
}

async function saveTransaction(req: Request, res: Response) {
    const { date, account_id, merchant_id, category_id, amount, type, memo } = req.body;

    const transaction = new Transaction({
        ledger_id: req.params.id,
        account_id,
        merchant_id,
        category_id,
        date,
        amount,
        memo,
        type
    });

    // await transaction.save();

    res.json(transaction);
}

async function getCategoricalMonthlyExpenses(req: Request, res: Response) {
    const year: number = req.query.year ?  +req.query.year : new Date().getFullYear();
    const ledger = await Ledger.findById(req.params.id).select("categories").lean();
    const transactions = await Transaction.find({
        ledger_id: req.params.id,
        date: {
            $gte: new Date(new Date(year, 0, 1).setHours(0, 0, 0)),
            $lt: new Date(new Date(year, 11, 31).setHours(23, 59, 59))
        },
        category_id: { $ne: null },
        amount: { $lt: 0 }
    }).lean();
    const results: any = [];
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    for(const transaction of transactions) {
        const month = months[transaction.date.getMonth()].toLowerCase();
        const category_name = ledger.categories.find(x => x._id.equals(transaction.category_id)).name;

        const e = results.find(x => x.category_id.equals(transaction.category_id));

        if(e) {
            e[month] = e[month] ? currency(e[month]).add(Math.abs(transaction.amount)) : currency(Math.abs(transaction.amount));
        } else {
            results.push({
                year,
                category_id: transaction.category_id,
                category_name: category_name,
                [month]: currency(Math.abs(transaction.amount))
            });
        }
    }

    res.json(results);
}

export { getLedgers, getLedger, getAccounts, getMerchants, getCategories, saveTransaction, getCategoricalMonthlyExpenses };
