import { Schema, Model, model } from "mongoose";
import Transaction from "../interfaces/transaction.interface";

const schema = new Schema<Transaction, Model<Transaction>>({
    date: { type: Date, required: true },
    amount: Number,
    memo: String,
    flag_color: String,
    deleted: Boolean,
    account_id: { type: String, required: true },
    category_id: String,
    payee_id: String,
    ledger: { type: Schema.Types.ObjectId, ref: "Ledger", required: true },
    account: { type: Schema.Types.ObjectId, ref: "Ledger", required: true },
    category: { type: Schema.Types.ObjectId, ref: "Ledger" },
    payee: { type: Schema.Types.ObjectId, ref: "Ledger" }
});

export default model<Transaction>("Transaction", schema);
