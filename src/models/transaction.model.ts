import { Schema, Model, model } from "mongoose";
import Transaction from "../interfaces/transaction.interface";

const schema = new Schema<Transaction, Model<Transaction>>({
    ynab_id: String,
    date: { type: Date, required: true },
    amount: Number,
    credit: Number,
    debit: Number,
    memo: String,
    flag_color: String,
    deleted: Boolean,
    // account_id: { type: String, required: true },
    // category_id: String,
    // payee_id: String,
    ledger_id: { type: Schema.Types.ObjectId, required: true },
    account_id: { type: Schema.Types.ObjectId, required: true },
    category_id: Schema.Types.ObjectId,
    payee_id: Schema.Types.ObjectId
});

export default model<Transaction>("Transaction", schema);
