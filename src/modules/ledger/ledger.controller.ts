import { Types } from "mongoose";
import currency from "currency.js";
import { format, parse } from "date-fns";
import { Request, Response } from "express";

import * as fs from 'fs';
import * as path from 'path';
import { parse as csv_parse } from "csv-parse";

import * as b1 from "../../data/ynab/654abdab6b5587745b0fb543.json";
import * as b2 from "../../data/ynab/654abdf86b5587745b0fb548.json";
import * as b3 from "../../data/ynab/654abe3d6b5587745b0fb54b.json";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";
import { ILedger, ICurrencyFormat } from "../../interfaces/ledger.interface";

interface ITransactionQueries{
    ledger_id?: string;
    account_id?: any;
    category_id?: any;
    date?: any;
    amount?: any;
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
    const docs = await Ledger.findById(req.params.id).select("accounts");
    res.json(docs);
}

async function getMerchants(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select("merchants");
    res.json(docs);
}

async function getCategories(req: Request, res: Response) {
    const docs = await Ledger.findById(req.params.id).select("categories");
    res.json(docs);
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

async function importFromYnab(req: Request, res: Response) {
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
            merchants: []
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

        for(const merchant of x.data.budget.payees) {
            ledger.merchants.push({
                _id: new Types.ObjectId(),
                ynab_id: merchant.id,
                name: merchant.name,
                deleted: merchant.deleted
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
                merchant_id: ledger.merchants.find(o => o.ynab_id === t.payee_id)?._id
            });

            await transaction.save();
        }
    }

    res.sendStatus(200);
}

async function importfromCommerzbank(req: Request, res: Response) {
    const ledger = await Ledger.findOne({ name: "Germany" }).lean();
    const account_id = ledger?.accounts.find(x => x.name === "Commerzbank Current Account")?._id;
    const commerzbank_transactions: any = [];

    const csv_parser = fs.createReadStream(path.join(process.cwd(), "src/data/banks/commerzbank.csv")).pipe(csv_parse({ bom: true, delimiter: ";", columns: true }));
    for await (const row of csv_parser) {
        commerzbank_transactions.push({
            booking_date: parse(row["Booking date"], "dd.MM.yyyy", new Date()),
            booking_text: row["Booking text"],
            amount: typeof row.Amount === "string" ? +(row.Amount.replace(",", ".")) : row.Amount
        });
    }

    for(const t of commerzbank_transactions) {
        if(t.amount === 0) continue;

        let category_id = undefined;
        let merchant_id = undefined;

        const merchants = [
            { token: "edeka", value: "Edeka" },
            { token: "lidl", value: "Lidl" },
            { token: "penny", value: "Penny" },
            { token: "rewe", value: "REWE" },
            { token: "kaufland", value: "Kaufland" },
            { token: "amritpreet singh", value: "Bollywood Shop" },
            { token: "ikea", value: "IKEA" },
            { token: "deichmann", value: "Deichmann" },
            { token: "woolworth", value: "Woolworth" },
            { token: "bs 51 gmbh", value: "Brain Station 51" },
            { token: "MCDONALDS", value: "McDonald's" },
            { token: "PEPCO", value: "Pepco" },
            { token: "EA Swiss Sarl", value: "Electronic Arts" },
            { token: "best kebap", value: "Best Kebap" },
            { token: "al arabi", value: "Arabic Halal Meat Shop" },
            { token: "Saturn", value: "Saturn" },
            { token: "AMAZON", value: "Amazon" },
            { token: "Apple", value: "Apple" },
            { token: "Trainline", value: "Trainline" },
            { token: "DM FIL", value: "DM" }
        ];

        for(const r of merchants) {
            if(t.booking_text.toLowerCase().includes(r.token.toLowerCase())) {
                merchant_id = ledger?.merchants.find(x => x.name === r.value)?._id;
            }
        }

        if (t.amount > 0) {
            category_id = ledger?.categories.find(x => x.name === "Inflow: Ready to Assign")?._id;
        } else {
            if (/edeka|lidl|penny|rewe|kaufland|amritpreet singh|seven days curry|al arabi|netto|rabih maarouf|nahkauf/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Groceries")?._id;
            }

            if (/best kebap|mcdonalds|yorma|wowfullz/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Eating Out")?._id;
            }

            if (/ea swiss sarl/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Entertainment")?._id;
            }

            if (/pfa pflanzen fuer alle gmbh/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Home Improvement")?._id;
            }

            if (/mietwasch/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Home Maintenance")?._id;
            }

            if (/1036833884626|hotel attache/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Travel/Vacation")?._id;
            }

            if (/apple/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Digital Subscriptions")?._id;
            }

            if (/vnr: 130264|studentenwerk/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Rent/Mortgage")?._id;
            }

            if (/tuc 680743/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Education")?._id;
            }
        }

        const transaction = new Transaction({
            date: t.booking_date,
            amount: t.amount,
            type: t.amount > 0 ? "credit" : "debit",
            memo: t.booking_text || undefined,
            ledger_id: ledger?._id,
            account_id,
            category_id,
            merchant_id
        });

        await transaction.save();
    }

    res.sendStatus(200);
}

async function importFromN26(req: Request, res: Response) {
    const ledger = await Ledger.findOne({ name: "Germany" }).lean();
    const account_id = ledger?.accounts.find(x => x.name === "N26 Standard")?._id;
    const transactions: any = [];

    const csv_parser = fs.createReadStream(path.join(process.cwd(), "src/data/banks/n26.csv")).pipe(csv_parse({ bom: true, columns: true }));
    for await (const row of csv_parser) {
        transactions.push({
            booking_date: parse(row["Booking Date"], "yyyy-MM-dd", new Date()),
            booking_text: row["Payment Reference"],
            amount: row["Amount (EUR)"]
        });
    }

    for(const t of transactions) {
        if(t.amount === 0) continue;

        let category_id = undefined;
        let merchant_id = undefined;

        const merchants = [
            { token: "netflix", value: "Netflix" },
            { token: "mawista", value: "MAWISTA" },
            { token: "apple", value: "Apple" },
            { token: "aldi talk", value: "Aldi Talk" }
        ];

        for(const r of merchants) {
            if(t.booking_text.toLowerCase().includes(r.token.toLowerCase())) {
                merchant_id = ledger?.merchants.find(x => x.name === r.value)?._id;
            }
        }

        if (t.amount > 0) {
            category_id = ledger?.categories.find(x => x.name === "Inflow: Ready to Assign")?._id;
        } else {
            if (/strom carl-von-ossietzky/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Electric")?._id;
            }

            if (/netflix/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Entertainment")?._id;
            }

            if (/aldi talk/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Cellphone")?._id;
            }

            if (/mawista/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Health Insurance")?._id;
            }

            if (/pyur/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Internet")?._id;
            }

            if (/apple/.test(t.booking_text.toLowerCase())) {
                category_id = ledger?.categories.find(x => x.name === "Digital Subscriptions")?._id;
            }
        }

        const transaction = new Transaction({
            date: t.booking_date,
            amount: t.amount,
            type: t.amount > 0 ? "credit" : "debit",
            memo: t.booking_text || undefined,
            ledger_id: ledger?._id,
            account_id,
            category_id,
            merchant_id
        });

        await transaction.save();
    }

    res.sendStatus(200);
}

async function getExpenses(req: Request, res: Response) {
    const transaction_where_clause:ITransactionQueries = { ledger_id: req.params.id };

    const transactions = await Transaction.find(transaction_where_clause).lean();

    const report: any = {
        income_vs_expense: {}
    };

    for(const transaction of transactions) {
        const year = transaction.date.getFullYear();
        const month = transaction.date.getMonth();

        if(!report.income_vs_expense[year]) report.income_vs_expense[year] = [];

        const index = report.income_vs_expense[year].findIndex(x => x.month === month);
        if(index >= 0) {
            report.income_vs_expense[year][index].income += transaction.amount > 0 ? transaction.amount : 0;
            report.income_vs_expense[year][index].expense += transaction.amount < 0 ? Math.abs(transaction.amount) : 0;
        } else {
            report.income_vs_expense[year].push({
                month,
                income: transaction.amount > 0 ? transaction.amount : 0,
                expense: transaction.amount < 0 ? Math.abs(transaction.amount) : 0
            });
        }
    }

    res.json(report);
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

export { getLedgers, getLedger, getAccounts, getMerchants, getCategories, getTransactions, saveTransaction, getExpenses, getCategoricalMonthlyExpenses, importFromYnab, importfromCommerzbank, importFromN26 };
