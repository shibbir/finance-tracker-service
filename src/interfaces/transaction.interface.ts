import { Types } from "mongoose";

interface Transaction {
    _id: Types.ObjectId;
    id: string;
    date: Date;
    amount: number;
    memo?: string;
    flag_color?: string;
    deleted: boolean;
    account_id: string;
    payee_id?: string;
    category_id?: string;
    ledger: Types.ObjectId;
    account?: Types.ObjectId;
    payee?: Types.ObjectId;
    category?: Types.ObjectId;
}

export default Transaction;
