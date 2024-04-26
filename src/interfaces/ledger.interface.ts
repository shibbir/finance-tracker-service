import { Types } from "mongoose";
import Account from "./account.interface";
import Category from "./category.interface";
import Payee from "./payee.interface";

interface CurrencyFormat {
    iso_code: string;
    decimal_digits: number;
    decimal_separator: string;
    group_separator: string;
    currency_symbol: string;
}

interface Ledger {
    _id: Types.ObjectId;
    id: string;
    name: string;
    last_modified_on: Date;
    date_format: string;
    currency_format: CurrencyFormat;
    accounts: Account[];
    categories: Category[];
    payees: Payee[];
}

export { Ledger, CurrencyFormat };
