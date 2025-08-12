import { Types } from "mongoose";
import IAccount from "./account.interface";
import ICategory from "./category.interface";
import IMerchant from "./merchant.interface";

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
    accounts: IAccount[];
    categories: ICategory[];
    category_groups: ICategory[];
    merchants: IMerchant[];
}

export { ILedger, ICurrencyFormat };
