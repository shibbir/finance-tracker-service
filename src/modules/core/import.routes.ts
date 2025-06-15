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
        { token: /edeka|lidl|penny|rewe|kaufland|amritpreet singh|seven days curry|7 days curry pizza|al arabi|netto|rabih maarouf|nahkauf|kabul markt|ariana-orient-house|rees frischemaerkte kg|delhi masala shop|aldi|aktiv markt sehrer|feinkostmaerkte sehrer|ariana-orient-house|darmalingam prathakaran/, value: "Groceries" },
        { token: /best kebap|mcdonalds|yorma|wowfullz|schäfers backstube|ditsch|rasoi restaurant|selecta deutschland|uber|nami wok|sofra kebap|olivia city|beckesepp baeckerei|yormas|freiburger kebap st|saechsische grossbaeckerei|fleischerei richter/, value: "Eating Out" },
        { token: /ea swiss sarl|stea mpowered.com/, value: "Entertainment" },
        // { token: /pfa pflanzen fuer alle gmbh/, value: "Home Improvement" },
        { token: /mietwasch|ccb.343.ue.pos00123816|woolworth gmbh fil. 1745|woolworth gmbh fil. 1495|woolworth gmbh fil.1318|6g5ospzc028l5mle|6mlzs4skty48w2en|6h9171kenvevc0cv|4qx8r6adug4t7rkt|dm drogeriemarkt|ccb.071.ue.pos00154086|ikea|dm fil.2306 h:65132|3eccuohof3g10xsi|oyz3q665trgysxeg|4r3vxkkn5e89r2ri|1035179163747|dm fil.0428 h:65132/, value: "Home Maintenance" },
        { token: /ft: travel|1036833884626|hotel attache|ramada encore|nextbike gmbh|trainline|louvre|hotel aladin|operator ict - aplika|villa melchiorre|azienda trasporti milanesi|milano|alice pizza negozi|erre bar villa monaste|panificio anteri|alhamdulillah minim|super 8|ryanair|venchi bergamo air|mcdonalds aeroporto be/, value: "Travel/Vacation" },
        { token: /vnr: 130264|studentenwerk|ccb.152.ue.pos00112195/, value: "Rent/Mortgage" },
        { token: /tuc 680743|udemy|u6447sdmrscm1e2h/, value: "Education" },
        { token: /getsafe/, value: "Liability Insurance" },
        { token: /strom carl-von-ossietzky/, value: "Electric" },
        { token: /netflix/, value: "Entertainment" },
        { token: /aldi talk/, value: "Cellphone" },
        { token: /mawista/, value: "Health Insurance" },
        { token: /pyur/, value: "Internet" },
        { token: /apple|openai|amazon pri/, value: "Digital Subscriptions" },
        { token: /rundfunk/, value: "Broadcasting Fee" },
        { token: /ca\/\/chemnitz|ca\/\/freiburg/, value: "Clothing" },
        { token: /taxfix|account management/, value: "Tax, Interest & Bank Fees" },
        { token: /pfa pflanzen fuer alle gmbh|karl schmitt co.kg bahnhofs|sostrene grene|siemes schuhcenter gmbh|shein|52f0akw65qgw8vv6|45ecxs6246ht0z1j/, value: "Wife" },
        { token: /6gw8h9eo8d7wk4zb|1041861078350|md mossihur rahman|b.b hotels germany gmbh gir 6920881|1041597335896/, value: "Miscellaneous" }
    ];

    const merchants = [
        { token: /edeka|rees frischemaerkte kg|aktiv markt sehrer|feinkostmaerkte sehrer/, value: "Edeka" },
        { token: /lidl/, value: "Lidl" },
        { token: /penny/, value: "Penny" },
        { token: /rewe/, value: "REWE" },
        { token: /kaufland/, value: "Kaufland" },
        { token: /amritpreet singh/, value: "Bollywood Shop" },
        { token: /ikea/, value: "IKEA" },
        { token: /deichmann/, value: "Deichmann" },
        { token: /woolworth/, value: "Woolworth GmbH" },
        { token: /bs 51 gmbh/, value: "Brain Station 51 GmbH" },
        { token: /brain station 23 gmbh/, value: "Brain Station 23 GmbH" },
        { token: /mcdonald/, value: "McDonald's" },
        { token: /pepco/, value: "Pepco" },
        { token: /ea swiss sarl/, value: "Electronic Arts" },
        { token: /best kebap/, value: "Best Kebap" },
        { token: /al arabi/, value: "Arabic Halal Meat Shop" },
        { token: /saturn|1035179163747/, value: "Saturn" },
        { token: /amazon|u6447sdmrscm1e2h/, value: "Amazon" },
        { token: /apple/, value: "Apple Inc." },
        { token: /trainline/, value: "Trainline" },
        { token: /\bdm\b/, value: "DM" },
        { token: /tedi/, value: "TEDi" },
        { token: /seven days curry|7 days curry pizza/, value: "7 Days Curry & Pizzeria"},
        { token: /ggg/, value: "GGG" },
        { token: /pyur/, value: "PŸUR" },
        { token: /taxfix/, value: "Taxfix" },
        { token: /getsafe/, value: "Getsafe" },
        { token: /cloudflare/, value: "Cloudflare" },
        { token: /stea mpowered.com/, value: "Steam" },
        { token: /netflix/, value: "Netflix" },
        { token: /mawista/, value: "MAWISTA" },
        { token: /aldi talk/, value: "Aldi Talk" },
        { token: /vkont/, value: "Eins Energie" },
        { token: /udemy/, value: "Udemy" },
        { token: /uber/, value: "Uber Eats" },
        { token: /ca\/\/chemnitz|ca\/\/freiburg/, value: "C&A" },
        { token: /euroshop/, value: "EuroShop" },
        { token: /openai/, value: "OpenAI" },
        { token: /scalable capital/, value: "Scalable Capital" },
        { token: /olivia city/, value: "Olivia City Kebap" },
        { token: /sprachunion/, value: "SprachUnion" },
        { token: /beckesepp baeckerei/, value: "Beckesepp KG" },
        { token: /yormas/, value: "Yorma's AG" },
        { token: /nextbike gmbh/, value: "nextbike GmbH" },
        { token: /hotel attache|ramada encore|hotel aladin|villa melchiorre|booking.com|super 8|b.b hotels/, value: "Booking.com" },
        { token: /ditsch/, value: "Ditsch" },
        { token: /temu.com/, value: "Temu" },
        { token: /aldi/, value: "Aldi" },
        { token: /account management/, value: "Commerzbank" },
        { token: /sostrene grene/, value: "Søstrene Grene" },
        { token: /ariana-orient-house/, value: "Ariana Orient House GmbH" },
        { token: /azienda trasporti milanesi/, value: "ATM Milano" },
        { token: /piz milano/, value: "Piz Milano" },
        { token: /ryanair/, value: "Ryanair" },
        { token: /siemes schuhcenter gmbh/, value: "SIEMES Schuhcenter GmbH" },
        { token: /shein/, value: "SHEIN" }
    ];

    const excludes_statements = [/1040431961971/, /ccb.063.ue.pos00123389/, /1041817937082/, /yyw1041949858359/, /amazon\.de\*pp9f00py5/];

    const merchantMap = new Map(ledger.merchants.map((c: { name: string; _id: string }) => [c.name, c._id]));
    const categoryMap = new Map(ledger.categories.map((c: { name: string; _id: string }) => [c.name, c._id]));

    let modified = false;

    for(const statement of statements) {
        const normalizedBookingText = statement.booking_text.toLowerCase().replace(/\s+/g, " ");

        if (typeof statement.amount !== "number" || isNaN(statement.amount) || statement.amount === 0) continue;
        if (statement.booking_text === "FT: Ignore") continue;
        if (excludes_statements.some(ex => ex.test(normalizedBookingText))) continue;

        let category_id = undefined;
        let merchant_id = undefined;

        for(const r of merchants) {
            if(r.token.test(normalizedBookingText)) {
                merchant_id = merchantMap.get(r.value);

                if(!merchant_id) {
                    merchant_id = new Types.ObjectId();
                    ledger.merchants.push({ _id: merchant_id, name: r.value });
                    merchantMap.set(r.value, merchant_id);
                    modified = true;
                }
            }
        }

        if (statement.amount > 0) {
            if (!statement.booking_text.toLowerCase().includes("bargeldauszahlung") && statement.booking_text.toLowerCase() !== "shibbir ahmed") {
                category_id = categoryMap.get("Inflow: Ready to Assign");
            }
        } else {
            for (const r of categories) {
                if (r.token.test(normalizedBookingText)) {
                    category_id = categoryMap.get(r.value);

                    if (!category_id) {
                        category_id = new Types.ObjectId();
                        ledger.categories.push({ _id: category_id, name: r.value });
                        categoryMap.set(r.value, category_id);
                        modified = true;
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

    if (modified) await ledger.save();
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
                decimal_digits: +x.data.budget.currency_format.decimal_digits
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
                balance: (typeof account.balance === "number" ? account.balance : 0) / 1000,
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

        const transactions = [];
        for(const t of x.data.budget.transactions) {
            const amount = typeof t.amount === "number" ? t.amount / 1000 : 0;

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

            transactions.push(transaction);
        }
        await Transaction.insertMany(transactions);
    }

    const category_groups = ["Bills", "Essentials", "Obligations", "Savings/Investments", "Quality of Life"];

    await CategoryGroup.insertMany(category_groups.map(x => ({ name: x })));
}

async function import_commerzbank() {
    const ledger_name = "Germany";
    const account_name = "Commerzbank Current Account";
    const directory_path = path.join(process.cwd(), "src/data/commerzbank");

    const ledger = await Ledger.findOne({ name: ledger_name });
    if(!ledger) throw new Error("Ledger not found");

    const account = ledger.accounts.find(x => x.name === account_name);
    if(!account) throw new Error("Account not found");

    const statements: any = [];

    const files = fs.readdirSync(directory_path).filter(f => f.endsWith(".csv"));

    for (const file of files) {
        const file_path = path.join(directory_path, file);
        const csv_parser = fs.createReadStream(file_path).pipe(csv_parse({ bom: true, delimiter: ";", columns: true }));

        for await (const row of csv_parser) {
            statements.push({
                booking_date: parse(row["Booking date"], "dd.MM.yyyy", new Date()),
                booking_text: row["Booking text"],
                amount: typeof row.Amount === "string" ? parseFloat(row.Amount.replace(",", ".")) : row.Amount
            });
        }
    }

    await import_statements(ledger, account, statements);
}

async function import_n26() {
    const ledger_name = "Germany";
    const account_name = "N26 Standard";
    const directory_path = path.join(process.cwd(), "src/data/n26");

    const ledger = await Ledger.findOne({ name: ledger_name });
    if (!ledger) throw new Error(`Ledger not found: ${ledger_name}`);

    const account = ledger.accounts.find(x => x.name === account_name);
    if (!account) throw new Error(`Account not found: ${account_name}`);

    const statements: any[] = [];

    const files = fs.readdirSync(directory_path).filter(f => f.endsWith(".csv"));

    for (const file of files) {
        const file_path = path.join(directory_path, file);
        const csv_parser = fs.createReadStream(file_path).pipe(csv_parse({ bom: true, columns: true }));

        for await (const row of csv_parser) {
            const amountRaw = row["Amount (EUR)"];
            const amount = typeof amountRaw === "string" ? parseFloat(amountRaw.replace(",", ".")) : amountRaw;

            if (isNaN(amount)) continue;

            const booking_date = parse(row["Booking Date"], "yyyy-MM-dd", new Date());
            if (isNaN(booking_date.getTime())) {
                throw new Error(`Invalid booking date: ${row["Booking Date"]}`);
            }

            statements.push({
                booking_date,
                booking_text: (row["Payment Reference"] || row["Partner Name"] || "").trim(),
                amount
            });
        }
    }

    await import_statements(ledger, account, statements);
}

router.post("/import-data", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        await Promise.all([
            Ledger.deleteMany({}),
            Transaction.deleteMany({}),
            CategoryGroup.deleteMany({})
        ]);

        await import_ynab();
        await import_commerzbank();
        await import_n26();

        const count = await Transaction.countDocuments();

        res.status(200).send({ message: "Import completed", transactions: count });
    } catch (err) {
        next(err);
    }
});

export default router;
