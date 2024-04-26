import { Types } from "mongoose";
import { Request, Response } from "express";

import * as b1 from "../../data/654abdab6b5587745b0fb543.json";
import * as b2 from "../../data/654abdf86b5587745b0fb548.json";
import * as b3 from "../../data/654abe3d6b5587745b0fb54b.json";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";
import { CurrencyFormat } from "../../interfaces/ledger.interface";

async function getLedgers(req: Request, res: Response) {
    const ledgers = await Ledger.find({});
    res.json(ledgers);
}

async function getTransactions(req: Request, res: Response) {
    const transactions = await Transaction.find({ ledger: req.params.id });
    res.json(transactions);
}

async function importdata(req: Request, res: Response) {
    const budgets = [b1, b2, b3];

    for(const x of budgets) {
        const ledger = new Ledger({
            _id: new Types.ObjectId(),
            id: x.data.budget.id,
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
                id: account.id,
                name: account.name,
                balance: +account.balance.$numberInt,
                note: account.note || undefined,
                closed: account.closed
            });
        }

        for(const category of x.data.budget.categories) {
            ledger.categories.push({
                id: category.id,
                name: category.name,
                note: category.note || undefined,
                hidden: category.hidden,
                deleted: category.deleted
            });
        }

        for(const payee of x.data.budget.payees) {
            ledger.payees.push({
                id: payee.id,
                name: payee.name,
                deleted: payee.deleted
            });
        }

        await ledger.save();

        for(const t of x.data.budget.transactions) {
            const transaction = new Transaction({
                _id: new Types.ObjectId(),
                id: t.id,
                amount: +t.amount.$numberInt,
                date: new Date(t.date),
                memo: t.memo || undefined,
                flag_color: t.flag_color || undefined,
                deleted: t.deleted,
                account_id: t.account_id,
                payee_id: t.payee_id || undefined,
                category_id: t.category_id || undefined,
                ledger: ledger._id,
                account: ledger.accounts.find(o => o.id === t.account_id)?._id,
                category: ledger.categories.find(o => o.id === t.category_id)?._id,
                payee: ledger.payees.find(o => o.id === t.payee_id)?._id
            });

            await transaction.save();
        }
    }

    res.sendStatus(200);
}

export { getLedgers, getTransactions, importdata };
