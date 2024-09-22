import { Types } from "mongoose";

interface ITransaction {
    _id: Types.ObjectId;
    date: Date;
    amount: number;
    type: string;
    memo?: string;
    flag_color?: string;
    deleted: boolean;
    ledger_id: Types.ObjectId;
    account_id?: Types.ObjectId;
    recipient_id?: Types.ObjectId;
    category_id?: Types.ObjectId;
}

export default ITransaction;
