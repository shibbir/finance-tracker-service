import { Types } from "mongoose";
import Account from "./account.interface";
import Category from "./category.interface";
import Merchant from "./merchant.interface";

interface ICurrencyFormat {
    iso_code: string;
    decimal_digits: number;
    decimal_separator: string;
    group_separator: string;
    currency_symbol: string;
}

interface ILedger {
    _id: Types.ObjectId;
    name: string;
    last_modified_on: Date;
    date_format: string;
    currency_format: ICurrencyFormat;
    accounts: Account[];
    categories: Category[];
    merchants: Merchant[];
}

export { ILedger, ICurrencyFormat };
