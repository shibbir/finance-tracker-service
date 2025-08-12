import { Schema, Model, model } from "mongoose";
import ITransaction from "../interfaces/transaction.interface";

const schema = new Schema<ITransaction, Model<ITransaction>>({
    date: { type: Date, required: true },
    amount: Number,
    type: { type: String, required: true, enum: ["credit", "debit"] },
    memo: String,
    deleted: Boolean,
    ledger_id: { type: Schema.Types.ObjectId, required: true },
    account_id: { type: Schema.Types.ObjectId, required: true },
    category_id: Schema.Types.ObjectId,
    merchant_id: Schema.Types.ObjectId
});

export default model<ITransaction>("Transaction", schema);
