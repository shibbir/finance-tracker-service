import { Types } from "mongoose";
import { format, parse } from "date-fns";
import { Request, Response } from "express";

import * as b1 from "../../data/ynab/654abdab6b5587745b0fb543.json";
import * as b2 from "../../data/ynab/654abdf86b5587745b0fb548.json";
import * as b3 from "../../data/ynab/654abe3d6b5587745b0fb54b.json";

import b4 from "../../data/commerzbank/11NOV2023-20SEPT2024";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";
import { ILedger, ICurrencyFormat } from "../../interfaces/ledger.interface";

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

async function getRecipients(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select('recipients');
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
            recipient: {
                _id: transaction.recipient_id,
                name: ledger?.recipients.find(o => o._id.equals(transaction.recipient_id))?.name
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
    const { date, account_id, recipient_id, category_id, amount, memo } = req.body;

    const transaction = new Transaction({
        ledger_id: req.params.id,
        account_id,
        recipient_id,
        category_id,
        date,
        amount,
        memo,
        type: +amount > 0 ? "credit" : "debit"
    });

    // await transaction.save();

    // res.sendStatus(200);
    res.json(transaction);
}

async function importFromYnabExport(req: Request, res: Response) {
    const budgets = [b1, b2, b3];

    for(const x of budgets) {
        const ledger: ILedger = {
            _id: new Types.ObjectId(),
            name: x.data.budget.name,
            date_format: x.data.budget.date_format.format,
            currency_format: <ICurrencyFormat>{
                ...x.data.budget.currency_format,
                decimal_digits: +x.data.budget.currency_format.decimal_digits.$numberInt
            },
            last_modified_on: new Date(x.data.budget.last_modified_on),
            accounts: [],
            categories: [],
            recipients: []
        };

        for(const account of x.data.budget.accounts) {
            ledger.accounts.push({
                _id: new Types.ObjectId(),
                ynab_id: account.id,
                name: account.name,
                balance: (+account.balance.$numberInt) / 1000,
                note: account.note || undefined,
                closed: account.closed
            });
        }

        for(const category of x.data.budget.categories) {
            ledger.categories.push({
                _id: new Types.ObjectId(),
                ynab_id: category.id,
                name: category.name,
                note: category.note || undefined,
                hidden: category.hidden,
                deleted: category.deleted
            });
        }

        for(const recipient of x.data.budget.payees) {
            ledger.recipients.push({
                _id: new Types.ObjectId(),
                ynab_id: recipient.id,
                name: recipient.name,
                deleted: recipient.deleted
            });
        }

        await Ledger.create(ledger);

        for(const t of x.data.budget.transactions) {
            const amount = +t.amount.$numberInt / 1000;

            if(amount === 0) continue;

            const transaction = new Transaction({
                date: new Date(t.date),
                amount: amount,
                type: amount > 0 ? "credit" : "debit",
                memo: t.memo || undefined,
                flag_color: t.flag_color || undefined,
                deleted: t.deleted,
                ledger_id: ledger._id,
                account_id: ledger.accounts.find(o => o.ynab_id === t.account_id)?._id,
                category_id: ledger.categories.find(o => o.ynab_id === t.category_id)?._id,
                recipient_id: ledger.recipients.find(o => o.ynab_id === t.payee_id)?._id
            });

            await transaction.save();
        }
    }

    res.sendStatus(200);
}

async function importfromCommerzbankExport(req: Request, res: Response) {
    for(const t of b4) {
        const amount = typeof t.Amount === "string" ? +(t.Amount.replace(",", ".")) : t.Amount;

        if(amount === 0) continue;

        const transaction = new Transaction({
            date: parse(t["Booking date"], "dd.MM.yyyy", new Date()),
            amount: amount,
            type: amount > 0 ? "credit" : "debit",
            memo: t["Booking text"] || undefined,
            ledger_id: "66f07b67ef331cbd72daaaa8",
            account_id: "66f07b67ef331cbd72daaaaa"
        });

        await transaction.save();
    }

    res.sendStatus(200);
}

export { getLedgers, getLedger, getAccounts, getRecipients, getCategories, getTransactions, saveTransaction, importFromYnabExport, importfromCommerzbankExport };
