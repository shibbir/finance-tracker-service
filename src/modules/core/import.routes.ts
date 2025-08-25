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
import { ILedger, ICurrencyFormat } from "../../interfaces/ledger.interface";
import ICategory from "../../interfaces/category.interface";

enum Merchant {
    BS51GmbH = "BS 51 GmbH",
    BrainStation23 = "Brain Station 23 Limited",
    TUChemnitz = "TU Chemnitz",
    FintibaGmbH = "Fintiba GmbH",
}

enum CategoryGroup {
    Inflow = "Inflow",
    Obligations = "Obligations",
    Essentials = "Essentials",
    QualityOfLife = "Quality of Life",
    SavingsAndInvestments = "Savings & Investments",
    Miscellaneous = "Miscellaneous",
    NonTransactional = "Non Transactional"
}

enum Category {
    Groceries = "Groceries",
    Transportation = "Transportation",
    HomeMaintenance = "Home Maintenance",
    Clothing = "Clothing",
    DigitalSubscriptions = "Digital Subscriptions",
    EatingOut = "Eating Out",
    Entertainment = "Entertainment",
    Gadgets = "Gadgets",
    Wife = "Wife",
    StockMarket = "Stock Market",
    RentMortgage = "Rent/Mortgage",
    HealthInsurance = "Health Insurance",
    Internet = "Internet",
    LiabilityInsurance = "Liability Insurance",
    TaxInterestBankFees = "Tax, Interest & Bank Fees",
    BroadcastingFee = "Broadcasting Fee",
    Miscellaneous = "Miscellaneous",
    Salary = "Salary",
    DepositRefund = "Deposit Refund",
    GovernmentSubsidies = "Government Subsidies",
    InternalTransfer = "Internal Transfer",
    StartingBalance = "Starting Balance",
    TaxRefund = "Tax Refund",
    SemesterFee = "Semester Fee",
    Books = "Books",
    OnlineCourses = "Online Courses",
    Electricity = "Electricity",
    BalanceReconciliation = "Balance Reconciliation",
    PhoneBill = "Phone Bill",
    Vacation = "Travel/Vacation",
    Accommodation = "Accommodation",
    SignInBonus = "Sign-In Bonus",
    Social = "Social"
}

const router = express.Router();

const isOfficeMerchant = (merchantName?: string): boolean => {
    if (!merchantName) return false;
    return Object.values(Merchant).some(officeName => merchantName.includes(officeName));
};

function getCategoryGroup(category_name: string): CategoryGroup {
    const category_groups: Record<CategoryGroup, string[]> = {
        [CategoryGroup.Inflow]: [Category.Salary, Category.DepositRefund, Category.GovernmentSubsidies, Category.TaxRefund, Category.SignInBonus],
        [CategoryGroup.Obligations]: [Category.BroadcastingFee, Category.HealthInsurance, Category.LiabilityInsurance, Category.RentMortgage, Category.TaxInterestBankFees, Category.SemesterFee],
        [CategoryGroup.Essentials]: [Category.Groceries, Category.Internet, Category.Transportation, Category.HomeMaintenance, Category.Clothing, Category.Electricity, "Electric", Category.PhoneBill, "Cellphone", Category.Accommodation],
        [CategoryGroup.QualityOfLife]: [Category.DigitalSubscriptions, Category.EatingOut, Category.Entertainment, Category.Gadgets, Category.Wife, Category.Books, Category.OnlineCourses],
        [CategoryGroup.SavingsAndInvestments]: [Category.StockMarket],
        [CategoryGroup.Miscellaneous]: ["Miscellaneous"],
        [CategoryGroup.NonTransactional]: [Category.InternalTransfer, Category.StartingBalance, Category.BalanceReconciliation]
    };

    let matchedGroup = CategoryGroup.Miscellaneous;

    for (const [groupName, categories] of Object.entries(category_groups)) {
        if (categories.some(c => c.toLowerCase() === category_name.trim().toLowerCase())) {
            matchedGroup = groupName as CategoryGroup;
            break;
        }
    }

    return matchedGroup;
}

function getCategory(category_name: string): Category {
    const categoryMap: Record<string, Category> = {
        "Cellphone": Category.PhoneBill,
        "Electric": Category.Electricity
    };

    return categoryMap[category_name] ?? (category_name as Category);
}

function ynab (ledger: ILedger, transaction: any) {
    const x = new Transaction({
        date: new Date(transaction.date),
        amount: transaction.amount,
        type: transaction.amount > 0 ? "credit" : "debit",
        memo: transaction.memo || undefined,
        deleted: transaction.deleted,
        ledger_id: ledger._id,
        account_id: ledger.accounts.find(o => o.ynab_id === transaction.account_id)?._id,
        merchant_id: ledger.merchants.find(o => o.ynab_id === transaction.payee_id)?._id,
        category_id: ledger.categories.find(o => o.ynab_id === transaction.category_id)?._id
    });

    const merchant = ledger.merchants.find(o => o.ynab_id === transaction.payee_id);

    if (transaction.amount > 0 && isOfficeMerchant(merchant?.name)) {
        x.category_id = ledger.categories.find(o => o.name === Category.Salary)?._id;
    }

    if (merchant?.name.includes("Starting Balance")) {
        x.category_id = ledger.categories.find(o => o.name === Category.StartingBalance)?._id;
    }

    if (transaction.amount < 0 && transaction.memo === "Blocked Account Initial Fee") {
        x.category_id = ledger.categories.find(o => o.name === Category.TaxInterestBankFees)?._id;
    }

    if (transaction.amount > 0 && transaction.memo === "200 Euro one-off payment for students") {
        x.category_id = ledger.categories.find(o => o.name === Category.GovernmentSubsidies)?._id;
    }

    if (merchant?.name.includes("Transfer :")) {
        x.category_id = ledger.categories.find(o => o.name === Category.InternalTransfer)?._id;
    }

    if (merchant?.name.includes("Reconciliation Balance Adjustment")) {
        x.category_id = ledger.categories.find(o => o.name === Category.BalanceReconciliation)?._id;
    }

    if (transaction.memo?.includes("TUC 680743") || transaction.memo?.includes("semester fee")) {
        x.category_id = ledger.categories.find(o => o.name === Category.SemesterFee)?._id;
        x.merchant_id = ledger.merchants.find(o => o.name === Merchant.TUChemnitz)?._id;
    }

    if (transaction.memo?.includes("Psychology of Money") || transaction.memo?.includes("DaF kompakt") || transaction.memo?.includes("Phoenix Project") || transaction.memo?.includes("language book")) {
        x.category_id = ledger.categories.find(o => o.name === Category.Books)?._id;
    }

    if (transaction.memo?.includes("Casio 991EX")) {
        x.category_id = ledger.categories.find(o => o.name === Category.Gadgets)?._id;
    }

    if (transaction.memo?.includes("Administration Fee")) {
        x.merchant_id = ledger.merchants.find(o => o.name === Merchant.FintibaGmbH)?._id;
        x.category_id = ledger.categories.find(o => o.name === Category.TaxInterestBankFees)?._id;
    }

    if (transaction.memo?.includes("N26 additional card fee")) {
        x.category_id = ledger.categories.find(o => o.name === Category.TaxInterestBankFees)?._id;
    }

    return x;
}

async function import_statements(ledger_id: Types.ObjectId, statements: any) {
    const ledger: any = await Ledger.findOne({ _id: ledger_id });

    if(!ledger || !statements) throw new Error("Ledger not found");

    const categories = [
        { token: /vnr: 130264|studentenwerk|ccb.152.ue.pos00112195|ccb.182.ue.pos00615078|ccb.213.ue.pos00517690/, value: Category.RentMortgage },
        { token: /edeka|lidl|penny|rewe|kaufland|amritpreet singh|seven days curry|7 days curry pizza|al arabi|netto|rabih maarouf|nahkauf|kabul markt|ariana-orient-house|arianaorienthouse gmbh|rees frischemaerkte kg|delhi masala shop|aldi|aktiv markt sehrer|feinkostmaerkte sehrer|ariana-orient-house|darmalingam prathakaran|c markt|63650444 dresden hbf r\/wiener platz 2025-02-25t21:21:20|dresden\/de 2025-02-25t21:40:25|cm business gmbh|denns biomarkt\/\/chemnitz\/de 2024-04-10/, value: Category.Groceries },
        { token: /best kebap|mcdonalds|yorma|wowfullz|schäfers backstube|ditsch|rasoi restaurant|selecta deutschland|uber|nami wok|sofra kebap|olivia city|beckesepp baeckerei|yormas|freiburger kebap st|saechsische grossbaeckerei|fleischerei richter|hofmans bakery|city kebab|freiburger kebap st|backwerk karlsruhe hbf|anjappar chettinad resta|maydonoz doener|long quan gastronom|willy dany restaurantbetri|le crobag gmbh & co. kg 5004 gir 69 2024-03-24t15:29:13|00210688\/markt\/chemnitz 2025-06-28t17|haus des doner freiburg|63160150 chemnitz db s\/bahnhofstras 2025-07-12t18:49:32|sumup\s*\.?sultan palast\/pfarr 11\/hof|4008-34101 karlsruhe\/\/karlsruhe\/de 2025-03-31t14:57:02|burger king|tuerkitch\/\/muenchen|mcdonald s deutschland llc\/\/muenche 2024-07-21|ar systemgastronomie gmbh\/\/muenchen 2024-07-21|690 kentucky fried chicken|de 2024-03-24t21:30:26|muehlenbaeckerei einert|1036172992831|baeck.zoettl gallierstr.\/\/muenchen|sparkasse chemnitz\/de 2024-06-19/, value: Category.EatingOut },
        { token: /ea swiss sarl|stea mpowered.com|netflix/, value: Category.Entertainment },
        { token: /mietwasch|ccb.343.ue.pos00123816|woolworth gmbh fil. 1745|woolworth gmbh fil. 1495|woolworth gmbh fil.1318|6g5ospzc028l5mle|6mlzs4skty48w2en|6h9171kenvevc0cv|4qx8r6adug4t7rkt|dm drogeriemarkt|ccb.071.ue.pos00154086|ikea|dm fil.2306 h:65132|3eccuohof3g10xsi|oyz3q665trgysxeg|4r3vxkkn5e89r2ri|1035179163747|dm fil.0428 h:65132|ccb.149.ue.pos00013276|3687 chemnitz-sonnenbe\/philippstrae|pepco germany gmbh\/strasse der nati 2025-04-19t14:38:01|ic-18431534864|tedi\/\/freiburg\/de 2025-05-06t18:55:41|57sjsf9ztlm8my1c|2r9318bywp1grswx|ykzymxg2jfpzjlx2|68vegp6fi0j5ljdr|07111503004746226120000118065021043|u20jz51o7wjilatf|woolworth gmbh fil. 1281/, value: Category.HomeMaintenance },
        { token: /ft: travel|1036833884626|hotel attache|ramada encore|trainline|louvre|hotel aladin|operator ict - aplika|villa melchiorre|azienda trasporti milanesi|milano|alice pizza negozi|erre bar villa monaste|panificio anteri|alhamdulillah minim|super 8|ryanair|venchi bergamo air|mcdonalds aeroporto be|ft_vacation|mcdonald.s\/94 rue saint lazare\/pari/, value: "Travel/Vacation" },
        { token: /u6447sdmrscm1e2h/, value: Category.Books },
        { token: /getsafe/, value: Category.LiabilityInsurance },
        { token: /strom carl-von-ossietzky/, value: Category.Electricity },
        { token: /aldi talk/, value: Category.PhoneBill },
        { token: /mawista/, value: Category.HealthInsurance },
        { token: /pyur/, value: Category.Internet },
        { token: /apple|openai|amazon pri|1039105000402\/. cloudflare inc|60scukvdsxaaeeyh|amznprime/, value: Category.DigitalSubscriptions },
        { token: /rundfunk/, value: Category.BroadcastingFee },
        { token: /ca\/\/chemnitz|ca\/\/freiburg|1035210812290|1035210832763/, value: Category.Clothing },
        { token: /taxfix|account management/, value: Category.TaxInterestBankFees },
        { token: /pfa pflanzen fuer alle gmbh|karl schmitt co.kg bahnhofs\/\/freibu 2025-05-15t17:47:33|sostrene grene|siemes schuhcenter gmbh|shein|52f0akw65qgw8vv6|45ecxs6246ht0z1j|flac\/\/freiburg|amazon\.de\*a98j84ax5|temu.com|deichmann - schuhe\/\/chemnitz\/de 2025-02-22t13:57:32|ccb.190.ue.pos00001847|tedi\/\/freiburg\/de 2025-07-19t17:18:36 kfn 0 vj 2612 kartenzahlung|sent from n26|f.a.i.r.e. warenhandels eg\/radeburg 2025-04-30t14:28:36|deichmann - schuhe\/\/chemnitz\/de 2024-09-10t13:17:22|woolworth gmbh fil. 1745\/\/freiburg\/ 2025-07-26t16:24:01 kfn 0 vj 2612 kartenzahlung|ccb.215.ue.pos00000663|ccb.218.ue.pos00000704|ccb.212.ue.484438|ccb.205.ue.pos00057176|ccb.201.ue.pos00048799|ccb.197.ue.pos00068902|ccb.193.ue.pos00016541|ccb.330.ue.165332|ccb.327.ue.5586|euroshop-43310 muenchen|parfuemerie douglas|pepco germany gmbh|bargeldauszahlung commerzbank 00202169\/markt\/chemnitz 2024-10-25|euroshop-43388 chemnitz\/\/chemnitz\/d 2024-05-29|euroshop-43388 chemnitz\/\/chemnitz\/d 2024-06-03/, value: Category.Wife },
        { token: /6gw8h9eo8d7wk4zb|md mossihur rahman|1041597335896|ccb.076.ue.pos00123642|ccb.072.ue.pos00002748|1040696021474|1043114345411|short pitch cricket|1043409233927|2353dxo8dr8nf186|r04dq9vh4/, value: "Miscellaneous" },
        { token: /nextbike gmbh|1041094016282/, value: Category.Transportation },
        { token: /interactive brokers|scalable capital/, value: Category.StockMarket },
        { token: /nsct2508080019000000000000000000001|1-552291 customer reference: nsct2408200024620000000000000000006/, value: Category.DepositRefund },
        { token: /214\/300\/04384 est-g1112202402780056/, value: Category.TaxRefund },
        { token: /bs 51 gmbh|brain station 23 gmbh/, value: Category.Salary },
        { token: /de85100110012672394553|shibbir ahmed/, value: Category.InternalTransfer },
        { token: /s315-saturn electro\/\/chemnitz\/de 2024-08-08t13:11:16|de\*hj6l028o4/, value: Category.Gadgets },
        { token: /tuc 680743/, value: Category.SemesterFee },
        { token: /udemy/, value: Category.OnlineCourses },
        { token: /1036461870596|1035785811328/, value: Category.DigitalSubscriptions },
        { token: /6920881 2025-03-23t16:40:22|1041861078350|1043190752959|1044282374526|1044260008069|1044202755243/, value: Category.Accommodation },
        { token: /1036415972174|1035326785474|1035239853156|ccb.193.ue.110767/, value: Category.Social }
    ];

    const merchants = [
        { token: /edeka|rees frischemaerkte kg|aktiv markt sehrer|feinkostmaerkte sehrer/, value: "Edeka" },
        { token: /lidl/, value: "Lidl" },
        { token: /penny/, value: "Penny" },
        { token: /rewe/, value: "REWE" },
        { token: /kaufland/, value: "Kaufland" },
        { token: /amritpreet singh/, value: "Bollywood Shop" },
        { token: /ikea|07111503004746226120000118065021043/, value: "IKEA" },
        { token: /deichmann/, value: "Deichmann" },
        { token: /woolworth/, value: "Woolworth GmbH" },
        { token: /bs 51 gmbh/, value: "BS 51 GmbH" },
        { token: /brain station 23 gmbh/, value: "Brain Station 23 GmbH" },
        { token: /mcdonald|willy dany restaurantbetri/, value: "McDonald's" },
        { token: /pepco/, value: "Pepco" },
        { token: /ea swiss sarl/, value: "Electronic Arts" },
        { token: /best kebap/, value: "Best Kebap" },
        { token: /al arabi/, value: "Arabic Halal Meat Shop" },
        { token: /saturn|1035179163747/, value: "Saturn" },
        { token: /amazon|u6447sdmrscm1e2h|ccb.190.ue.pos00001847/, value: "Amazon" },
        { token: /apple/, value: "Apple Inc." },
        { token: /trainline/, value: "Trainline" },
        { token: /\bdm\b/, value: "DM" },
        { token: /tedi/, value: "TEDi" },
        { token: /seven days curry|7 days curry pizza/, value: "7 Days Curry & Pizzeria"},
        { token: /ggg|grundstücks- und gebäudewirtschafts - gesellschaft/, value: "GGG" },
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
        { token: /ariana-orient-house|arianaorienthouse gmbh/, value: "Ariana Orient House GmbH" },
        { token: /azienda trasporti milanesi/, value: "ATM Milano" },
        { token: /piz milano/, value: "Piz Milano" },
        { token: /ryanair/, value: "Ryanair" },
        { token: /siemes schuhcenter gmbh/, value: "SIEMES Schuhcenter GmbH" },
        { token: /shein/, value: "SHEIN" },
        { token: /3687 chemnitz-sonnenbe\/philippstrae/, value: "Action Deutschland GmbH" },
        { token: /1041094016282/, value: "Deutsche Bahn AG" },
        { token: /le crobag/, value: "Le Crobag" },
        { token: /haus des doner freiburg/, value: "Haus des Döners" },
        { token: /studentenwerk chemnitz-zwickau/, value: "Studentenwerk Chemnitz-Zwickau" },
        { token: /interactive brokers/, value: "Interactive Brokers" },
        { token: /burger king/, value: "Burger King" },
        { token: /tuc 680743/, value: "TU Chemnitz" },
        { token: /1036461870596/, value: "Namecheap" },
        { token: /kentucky fried chicken/, value: "KFC" },
    ];

    const excludes_statements = [
        /1040431961971/, /ccb.063.ue.pos00123389/, /1041817937082/, /yyw1041949858359/, /amazon\.de\*pp9f00py5/, /iphone 16: part 1/, /iphone 16: part 2/, /iphone 16: part 3/, /ccb.358.ue.pos00039622/, /ccb.301.ue.pos00110079/,
        /ccb.270.ue.pos00055906/, /ccb.332.ue.pos00203270/, /dispoid:000178601462269/, /dispoid:000178580255411/, /dispoid:000178572347615/, /dispoid:000056924668600/,
        /bargeldeinzahlung karte 0 einzahlautomat 214174 einzahlung 16.06.2025 18:06 freiburg kaiser-joseph-str./, /bargeldauszahlung commerzbank 00202269\/kaiser-joseph- 2025-05-31t18:42:59/,
        /bargeldauszahlung commerzbank 00210688\/markt\/chemnitz 2024-09-10t13:54:57/, /bargeldauszahlung commerzbank 00202644\/markt\/chemnitz 2024-07-16t14:07:12/,
        /bargeldeinzahlung karte 0 einzahlautomat 214135 einzahlung 21.03.2025 20:37 frankfurt am main roßmarkt/, /ry5f84g64/, /r79jy9bb4/, /24021522006456726120000118665138492/,
        /nsct2503110030960000000000000000007/, /ccb.56.ue.5648/, /amazon\.de\*rm28t5cj4/, /ccb.138.ue.pos00210498/, /db25d04152b64dbdba74f0d6af3d19c7/, /amazon\.de\*rm1cv6da4/
    ];

    const merchantMap = new Map(ledger.merchants.map((c: { name: string; _id: string }) => [c.name, c._id]));
    const categoryMap = new Map(ledger.categories.map((c: { name: string; _id: string }) => [c.name, c._id]));

    let modified = false;

    for(const statement of statements) {
        const normalizedBookingText = statement.booking_text?.toLowerCase().replace(/\s+/g, " ");

        if (typeof statement.amount !== "number" || isNaN(statement.amount) || statement.amount === 0) continue;
        if (excludes_statements.some(ex => ex.test(normalizedBookingText))) continue;

        let merchant_id = undefined;
        let category_id = statement.category_id;

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

        if (!category_id) {
            let matchedCategory = null;
            for (const r of categories) {
                if (r.token.test(normalizedBookingText)) {
                    const match = normalizedBookingText.match(r.token);
                    if (match) {
                        if (!matchedCategory || match[0].length > matchedCategory.match[0].length) {
                            matchedCategory = { ...r, match };
                        }
                    }
                }
            }

            if (matchedCategory) {
                category_id = categoryMap.get(matchedCategory.value);
                if (!category_id) {
                    category_id = new Types.ObjectId();
                    ledger.categories.push({
                        _id: category_id,
                        name: matchedCategory.value,
                        parent_id: ledger.category_groups.find((cg: ICategory) => cg.name === getCategoryGroup(matchedCategory.value))?._id
                    });
                    categoryMap.set(matchedCategory.value, category_id);
                    modified = true;
                }
            }
        }

        const transaction = new Transaction({
            date: statement.booking_date,
            amount: statement.amount,
            type: statement.amount > 0 ? "credit" : "debit",
            memo: statement.booking_text || undefined,
            ledger_id: ledger._id,
            account_id: statement.account_id,
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
            category_groups: [],
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

        [
            CategoryGroup.Inflow,
            CategoryGroup.Obligations,
            CategoryGroup.Essentials,
            CategoryGroup.QualityOfLife,
            CategoryGroup.SavingsAndInvestments,
            CategoryGroup.Miscellaneous,
            CategoryGroup.NonTransactional
        ].forEach(groupName => {
            ledger.category_groups.push({
                _id: new Types.ObjectId(),
                name: groupName,
                note: undefined
            });
        });

        [
            Category.Salary,
            Category.DepositRefund,
            Category.GovernmentSubsidies,
            Category.InternalTransfer,
            Category.StartingBalance,
            Category.TaxInterestBankFees,
            Category.SemesterFee,
            Category.Books,
            Category.BalanceReconciliation,
            Category.SignInBonus
        ].forEach(categoryName => {
            ledger.categories.push({
                _id: new Types.ObjectId(),
                name: categoryName,
                parent_id: ledger.category_groups.find(group => group.name === getCategoryGroup(categoryName))?._id
            });
        });

        const excludedCategories = [
            "Uncategorized", "Auto Maintenance", "Fun Money", "Software Subscriptions", "Hobbies", "Stuff I Forgot to Budget For",
            "Auto Loan", "Renter's/Home Insurance", "Student Loan", "Plain Fare", "Music"
        ];

        for(const category of x.data.budget.categories) {
            if (excludedCategories.includes(category.name)) continue;

            ledger.categories.push({
                _id: new Types.ObjectId(),
                ynab_id: category.id,
                name: getCategory(category.name),
                parent_id: ledger.category_groups.find(o => o.name === getCategoryGroup(category.name))?._id
            });
        }

        [
            Merchant.TUChemnitz
        ].forEach(name => {
            ledger.merchants.push({
                _id: new Types.ObjectId(),
                name
            });
        });

        for(const merchant of x.data.budget.payees) {
            ledger.merchants.push({
                _id: new Types.ObjectId(),
                ynab_id: merchant.id,
                name: merchant.name === "Brain Station 51" ?  Merchant.BS51GmbH : merchant.name
            });
        }

        await Ledger.create(ledger);

        const transactions = [];
        for(const transaction of x.data.budget.transactions) {
            const amount = typeof transaction.amount === "number" ? transaction.amount / 1000 : 0;
            transaction.amount = amount;

            if(amount === 0) continue;

            transactions.push(ynab(ledger, transaction));
        }
        await Transaction.insertMany(transactions);
    }
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
            let category_id = null;
            let amount = typeof row.Amount === "string" ? parseFloat(row.Amount.replace(",", ".")) : row.Amount;

            const internalTransferDates = [
                "15.11.2023",
                "18.12.2023",
                "15.01.2024",
                "12.03.2024",
                "25.04.2024",
                "12.08.2024",
                "10.09.2024"
            ];

            if (row["Transaction type"] === "Cash deposit/withdrawal" && internalTransferDates.includes(row["Booking date"])) {
                category_id = ledger.categories.find(c => c.name === Category.InternalTransfer)?._id;
            }

            if(row["Booking date"] === "11.04.2024" && row["Transaction type"] === "Cash deposit/withdrawal") {
                category_id = ledger.categories.find(c => c.name === Category.Wife)?._id;
            }

            if(row["Booking date"] === "27.12.2023" && row["Transaction type"] === "Cash deposit/withdrawal") {
                amount = -200;
            }

            if(row["Booking date"] === "08.01.2024" && row["Transaction type"] === "Cash deposit/withdrawal") {
                continue
            }

            statements.push({
                amount,
                account_id: account._id,
                category_id,
                booking_date: parse(row["Booking date"], "dd.MM.yyyy", new Date()),
                booking_text: row["Booking text"]
            });
        }
    }

    await import_statements(ledger._id, statements);
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
            let category_id = null;
            const booking_date = parse(row["Booking Date"], "yyyy-MM-dd", new Date());
            const amount = typeof row["Amount (EUR)"] === "string" ? parseFloat(row["Amount (EUR)"].replace(",", ".")) : row["Amount (EUR)"];

            if (isNaN(amount) || row["Payment Reference"] === "iPad: Part 2" || row["Payment Reference"] === "iPad: Part 3") continue;
            if(row["Booking Date"] === "2025-05-02" && row["Payment Reference"] === "MAWISTA Versicherungsschein MAW76647472") continue;
            if(row["Booking Date"] === "2025-06-02" && row["Payment Reference"] === "MAWISTA Versicherungsschein MAW76647472") continue;
            if(row["Booking Date"] === "2025-06-04" && row["Payment Reference"] === "MAWISTA Versicherungsschein MAW76647472") continue;
            if((row["Booking Date"] === "2025-05-19" || row["Booking Date"] === "2025-05-27") && row["Partner Name"] === "Shibbir Ahmed") continue;
            if(row["Booking Date"] === "2025-06-01" && row["Partner Name"] === "Tasnim Mafiz") continue;
            if(row["Booking Date"] === "2024-03-12" && row["Payment Reference"] === "-") continue;

            if (isNaN(booking_date.getTime())) {
                throw new Error(`Invalid booking date: ${row["Booking Date"]}`);
            }

            if(row["Booking Date"] === "2024-08-12" && row["Partner Name"].includes("eins energie in sachsen")) {
                category_id = ledger.categories.find(c => c.name === Category.SignInBonus)?._id;
            }

            if(row["Booking Date"] === "2024-06-24" && row["Partner Name"].includes("Partners on Booking BV")) {
                category_id = ledger.categories.find(c => c.name === Category.Accommodation)?._id;
            }

            if(row["Booking Date"] === "2025-05-21" && row["Payment Reference"].includes("STROM Carl-von-Ossietzky-Str") && amount > 0) {
                category_id = ledger.categories.find(c => c.name === Category.DepositRefund)?._id;
            }

            if(row["Booking Date"] === "2024-05-24" && row["Payment Reference"].includes("Apple Services") && amount > 0) {
                category_id = ledger.categories.find(c => c.name === Category.DepositRefund)?._id;
            }

            if((row["Booking Date"] === "2023-12-03" || row["Booking Date"] === "2024-01-08") && row["Partner Name"].includes("Mietwasch")) {
                category_id = ledger.categories.find(c => c.name === Category.HomeMaintenance)?._id;
            }

            statements.push({
                amount,
                account_id: account._id,
                category_id,
                booking_date,
                booking_text: (row["Payment Reference"] || row["Partner Name"] || "").trim()
            });
        }
    }

    await import_statements(ledger._id, statements);
}

async function import_cash() {
    const ledger_name = "Germany";
    const account_name = "Cash";

    const ledger = await Ledger.findOne({ name: ledger_name });
    if (!ledger) throw new Error(`Ledger not found: ${ledger_name}`);

    const account = ledger.accounts.find(x => x.name === account_name);
    if (!account) throw new Error(`Account not found: ${account_name}`);

    const statements: any[] = [
        {
            amount: -10,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("06.01.2024", "dd.MM.yyyy", new Date())
        },
        {
            amount: -9,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Miscellaneous)?._id,
            booking_date: parse("25.01.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Printout"
        },
        {
            amount: -30,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("18.01.2024", "dd.MM.yyyy", new Date()),
            merchant_id: ledger.merchants.find(m => m.name === "Arabic Halal Meat Shop")?._id
        },
        {
            amount: -32,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("11.03.2024", "dd.MM.yyyy", new Date()),
            merchant_id: ledger.merchants.find(m => m.name === "Arabic Halal Meat Shop")?._id
        },
        {
            amount: -30,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("07.05.2024", "dd.MM.yyyy", new Date()),
            merchant_id: ledger.merchants.find(m => m.name === "Edeka")?._id
        },
        {
            amount: -11,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("07.05.2024", "dd.MM.yyyy", new Date()),
            merchant_id: ledger.merchants.find(m => m.name === "Bolywood Shop")?._id
        },
        {
            amount: 50,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("12.03.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: 100,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("25.04.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: 40,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("12.08.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: 50,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("10.09.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: 100,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("15.01.2024", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: 50,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("18.12.2023", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: -22,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("18.12.2023", "dd.MM.yyyy", new Date()),
            merchant_id: ledger.merchants.find(m => m.name === "Arabic Halal Meat Shop")?._id
        },
        {
            amount: 50,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.InternalTransfer)?._id,
            booking_date: parse("15.11.2023", "dd.MM.yyyy", new Date()),
            booking_text: "Transfer from Commerzbank Current Account"
        },
        {
            amount: -33,
            account_id: account._id,
            category_id: ledger.categories.find(c => c.name === Category.Groceries)?._id,
            booking_date: parse("15.11.2023", "dd.MM.yyyy", new Date())
        }
    ];

    await import_statements(ledger._id, statements);
}

router.post("/import-data", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        await Promise.all([
            Ledger.deleteMany({}),
            Transaction.deleteMany({})
        ]);

        await import_ynab();
        await import_commerzbank();
        await import_n26();
        await import_cash();

        const count = await Transaction.countDocuments();

        res.status(200).send({ message: "Import completed", transactions: count });
    } catch (err) {
        next(err);
    }
});

export default router;
