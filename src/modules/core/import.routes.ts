import * as fs from "fs";
import * as path from "path";
import { Types } from "mongoose";
import { parse } from "date-fns";
import { parse as csv_parse } from "csv-parse";
import express, { NextFunction, Request, Response } from "express";

import * as b1 from "../../data/ynab/654abdab6b5587745b0fb543.json";
import * as b2 from "../../data/ynab/654abdf86b5587745b0fb548.json";
import * as b3 from "../../data/ynab/654abe3d6b5587745b0fb54b.json";

import Ledger from "../../models/ledger.model";
import Transaction from "../../models/transaction.model";
import CategoryGroup from "../../models/category-group.model";
import { ILedger, ICurrencyFormat } from "../../interfaces/ledger.interface";

const router = express.Router();

async function import_statements(ledger: any, account: any, statements: any) {
    if(!ledger || !account || !statements) throw new Error("Nothing to import!");

    const categories = [
        { token: /edeka|lidl|penny|rewe|kaufland|amritpreet singh|seven days curry|al arabi|netto|rabih maarouf|nahkauf|kabul markt/, value: "Groceries" },
        { token: /best kebap|mcdonalds|yorma|wowfullz|schäfers backstube|ditsch|rasoi restaurant|selecta deutschland|uber/, value: "Eating Out"},
        { token: /ea swiss sarl|stea mpowered.com/, value: "Entertainment"},
        { token: /pfa pflanzen fuer alle gmbh/, value: "Home Improvement"},
        { token: /mietwasch|ccb.343.ue.pos00123816/, value: "Home Maintenance"},
        { token: /1036833884626|hotel attache|ramada encore/, value: "Travel/Vacation"},
        { token: /apple/, value: "Digital Subscriptions"},
        { token: /vnr: 130264|studentenwerk/, value: "Rent/Mortgage"},
        { token: /tuc 680743|udemy/, value: "Education"},
        { token: /getsafe/, value: "Liability Insurance" },
        { token: /strom carl-von-ossietzky/, value: "Electric" },
        { token: /netflix/, value: "Entertainment" },
        { token: /aldi talk/, value: "Cellphone" },
        { token: /mawista/, value: "Health Insurance" },
        { token: /pyur/, value: "Internet" },
        { token: /apple/, value: "Digital Subscriptions" },
        { token: /rundfunk/, value: "Broadcasting Fee" },
        { token: /ca\/\/chemnitz/, value: "Clothing" },
    ];

    const merchants = [
        { token: /edeka/, value: "Edeka" },
        { token: /lidl/, value: "Lidl" },
        { token: /penny/, value: "Penny" },
        { token: /rewe/, value: "REWE" },
        { token: /kaufland/, value: "Kaufland" },
        { token: /amritpreet singh/, value: "Bollywood Shop" },
        { token: /ikea/, value: "IKEA" },
        { token: /deichmann/, value: "Deichmann" },
        { token: /woolworth/, value: "Woolworth" },
        { token: /bs 51 gmbh/, value: "Brain Station 51" },
        { token: /mcdonald/, value: "McDonald's" },
        { token: /pepco/, value: "Pepco" },
        { token: /ea swiss sarl/, value: "Electronic Arts" },
        { token: /best kebap/, value: "Best Kebap" },
        { token: /al arabi/, value: "Arabic Halal Meat Shop" },
        { token: /saturn/, value: "Saturn" },
        { token: /amazon/, value: "Amazon" },
        { token: /apple/, value: "Apple" },
        { token: /trainline/, value: "Trainline" },
        { token: /dm/, value: "DM" },
        { token: /tedi/, value: "TEDi" },
        { token: /seven days curry/, value: "7 Days Curry"},
        { token: /ggg/, value: "GGG" },
        { token: /pyur/, value: "PŸUR" },
        { token: /taxfix/, value: "Taxfix" },
        { token: /getsafe/, value: "Getsafe" },
        { token: /cloudflare/, value: "Cloudflare" },
        { token: /stea mpowered.com/, value: "Steam" },
        { token: /netflix/, value: "Netflix" },
        { token: /mawista/, value: "MAWISTA" },
        { token: /apple/, value: "Apple" },
        { token: /aldi talk/, value: "Aldi Talk" },
        { token: /vkont/, value: "Eins Energie" },
        { token: /udemy/, value: "Udemy" },
        { token: /uber/, value: "Uber Eats" },
        { token: /ca\/\/chemnitz/, varlue: "C&A" },
        { token: /euroshop/, value: "EuroShop" },
    ];

    for(const statement of statements) {
        if(statement.amount === 0) continue;

        let category_id = undefined;
        let merchant_id = undefined;

        for(const r of merchants) {
            if(r.token.test(statement.booking_text.toLowerCase())) {
                merchant_id = ledger.merchants.find(x => x.name === r.value)?._id;

                if(!merchant_id) {
                    merchant_id = new Types.ObjectId();
                    ledger.merchants.push({ _id: merchant_id, name: r.value });
                    await ledger.save();
                }
            }
        }

        if (statement.amount > 0) {
            category_id = ledger.categories.find(x => x.name === "Inflow: Ready to Assign")?._id;
        } else {
            for(const r of categories) {
                if(r.token.test(statement.booking_text.toLowerCase())) {
                    category_id = ledger.categories.find(x => x.name === r.value)?._id;

                    if(!category_id) {
                        category_id = new Types.ObjectId();
                        ledger.categories.push({ _id: category_id, name: r.value });
                        await ledger.save();
                    }
                }
            }
        }

        const transaction = new Transaction({
            date: statement.booking_date,
            amount: statement.amount,
            type: statement.amount > 0 ? "credit" : "debit",
            memo: statement.booking_text || undefined,
            ledger_id: ledger._id,
            account_id: account._id,
            category_id,
            merchant_id
        });

        await transaction.save();
    }
}

async function import_ynab() {
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
                name: merchant.name
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

    const category_groups = ["Bills", "Essentials", "Obligations", "Savings/Investments", "Quality of Life"];

    await CategoryGroup.insertMany(category_groups.map(x => ({ name: x })));
};

async function import_commerzbank() {
    const ledger_name = "Germany";
    const account_name = "Commerzbank Current Account";
    const statement_file = path.join(process.cwd(), "src/data/banks/commerzbank.csv");

    const ledger = await Ledger.findOne({ name: ledger_name });
    if(!ledger) throw new Error("Ledger not found");

    const account = ledger.accounts.find(x => x.name === account_name);
    if(!account) throw new Error("Account not found");

    const statements: any = [];

    const csv_parser = fs.createReadStream(statement_file).pipe(csv_parse({ bom: true, delimiter: ";", columns: true }));
    for await (const row of csv_parser) {
        statements.push({
            booking_date: parse(row["Booking date"], "dd.MM.yyyy", new Date()),
            booking_text: row["Booking text"],
            amount: typeof row.Amount === "string" ? +(row.Amount.replace(",", ".")) : row.Amount
        });
    }

    await import_statements(ledger, account, statements);
};

async function import_n26() {
    const ledger_name = "Germany";
    const account_name = "N26 Standard";
    const statement_file = path.join(process.cwd(), "src/data/banks/n26.csv");

    const ledger = await Ledger.findOne({ name: ledger_name });
    if(!ledger) throw new Error("Ledger not found");

    const account = ledger.accounts.find(x => x.name === account_name);
    if(!account) throw new Error("Account not found");

    const statements: any = [];

    const csv_parser = fs.createReadStream(statement_file).pipe(csv_parse({ bom: true, columns: true }));
    for await (const row of csv_parser) {
        statements.push({
            booking_date: parse(row["Booking Date"], "yyyy-MM-dd", new Date()),
            booking_text: row["Payment Reference"] || row["Partner Name"],
            amount: row["Amount (EUR)"]
        });
    }

    await import_statements(ledger, account, statements);
};

router.post("/import-data", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        await import_ynab();
        await import_commerzbank();
        await import_n26();

        res.sendStatus(200);
    } catch (err) {
        next(err);
    }
});

export default router;
