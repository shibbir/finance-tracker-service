import { Types } from "mongoose";

interface Transaction {
    _id: Types.ObjectId;
    ynab_id: string;
    date: Date;
    amount: number;
    credit: number;
    debit: number;
    memo?: string;
    flag_color?: string;
    deleted: boolean;
    // account_id: string;
    // payee_id?: string;
    // category_id?: string;
    ledger_id: Types.ObjectId;
    account_id?: Types.ObjectId;
    payee_id?: Types.ObjectId;
    category_id?: Types.ObjectId;
}

export default Transaction;
