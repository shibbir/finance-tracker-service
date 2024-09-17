import { Types } from "mongoose";
import { Request, Response } from "express";
import { format } from "date-fns";

import * as b1 from "../../data/654abdab6b5587745b0fb543.json";
import * as b2 from "../../data/654abdf86b5587745b0fb548.json";
import * as b3 from "../../data/654abe3d6b5587745b0fb54b.json";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";
import { CurrencyFormat } from "../../interfaces/ledger.interface";

interface ITransactionQueries{
    ledger_id?: string;
    account_id?: string;
}

async function getLedgers(req: Request, res: Response) {
    const docs = await Ledger.find({});
    res.json(docs);
}

async function getLedger(req: Request, res: Response) {
    const doc = await Ledger.findById(req.params.id);
    res.json(doc);
}

async function getAccounts(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select('accounts');
    res.json(docs);
}

async function getPayees(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select('payees');
    res.json(docs);
}

async function getCategories(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select('categories');
    res.json(docs);
}

async function getTransactions(req: Request, res: Response) {
    const ledger = await Ledger.findById(req.params.id);

    const transaction_where_clause:ITransactionQueries = { ledger_id: req.params.id };
    if(req.query.account_id) transaction_where_clause.account_id = req.query.account_id + "";

    const transactions = await Transaction.find(transaction_where_clause).lean();

    const t_view = [];

    for(const transaction of transactions) {
        t_view.push({
            ...transaction,
            date: format(new Date(transaction.date), "dd/MM/yyyy"),
            account: {
                _id: transaction.account_id,
                name: ledger?.accounts.find(o => o._id.equals(transaction.account_id))?.name
            },
            payee: {
                _id: transaction.payee_id,
                name: ledger?.payees.find(o => o._id.equals(transaction.payee_id))?.name
            },
            category: {
                _id: transaction.category_id,
                name: ledger?.categories.find(o => o._id.equals(transaction.category_id))?.name
            }
        });
    }

    res.json(t_view);
}

async function saveTransaction(req: Request, res: Response) {
    const transaction = new Transaction({
        _id: new Types.ObjectId(),
        ledger_id: req.params.id,
        account_id: req.body.account_id,
        payee_id: req.body.payee_id,
        category_id: req.body.category_id,
        date: req.body.date,
        credit: req.body.credit,
        debit: req.body.debit,
        memo: req.body.memo
    });

    await transaction.save();

    res.sendStatus(200);
}

async function importdata(req: Request, res: Response) {
    const budgets = [b1, b2, b3];

    for(const x of budgets) {
        const ledger = new Ledger({
            _id: new Types.ObjectId(),
            ynab_id: x.data.budget.id,
            name: x.data.budget.name,
            date_format: x.data.budget.date_format.format,
            currency_format: <CurrencyFormat>{
                ...x.data.budget.currency_format,
                decimal_digits: +x.data.budget.currency_format.decimal_digits.$numberInt
            },
            last_modified_on: new Date(x.data.budget.last_modified_on),
            accounts: [],
            categories: [],
            payees: []
        });

        for(const account of x.data.budget.accounts) {
            ledger.accounts.push({
                ynab_id: account.id,
                name: account.name,
                balance: (+account.balance.$numberInt) / 1000,
                note: account.note || undefined,
                closed: account.closed
            });
        }

        for(const category of x.data.budget.categories) {
            ledger.categories.push({
                ynab_id: category.id,
                name: category.name,
                note: category.note || undefined,
                hidden: category.hidden,
                deleted: category.deleted
            });
        }

        for(const payee of x.data.budget.payees) {
            ledger.payees.push({
                ynab_id: payee.id,
                name: payee.name,
                deleted: payee.deleted
            });
        }

        await ledger.save();

        for(const t of x.data.budget.transactions) {
            const transaction = new Transaction({
                ynab_id: t.id,
                amount: +t.amount.$numberInt,
                credit: +t.amount.$numberInt > 0 ? (+t.amount.$numberInt) / 1000 : 0,
                debit: +t.amount.$numberInt < 0 ? (+t.amount.$numberInt) / 1000 : 0,
                date: new Date(t.date),
                memo: t.memo || undefined,
                flag_color: t.flag_color || undefined,
                deleted: t.deleted,
                // account_id: t.account_id,
                // payee_id: t.payee_id || undefined,
                // category_id: t.category_id || undefined,
                ledger_id: ledger._id,
                account_id: ledger.accounts.find(o => o.ynab_id === t.account_id)?._id,
                category_id: ledger.categories.find(o => o.ynab_id === t.category_id)?._id,
                payee_id: ledger.payees.find(o => o.ynab_id === t.payee_id)?._id
            });

            await transaction.save();
        }
    }

    res.sendStatus(200);
}

export { getLedgers, getLedger, getAccounts, getPayees, getCategories, getTransactions, saveTransaction, importdata };
