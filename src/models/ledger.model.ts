import { Schema, Model, model, Types } from "mongoose";
import { Ledger } from "../interfaces/ledger.interface";
import Account from "../interfaces/account.interface";
import Category from "../interfaces/category.interface";
import Payee from "../interfaces/payee.interface";

type DocumentProps = {
    accounts: Types.DocumentArray<Account>;
    categories: Types.DocumentArray<Category>;
    payees: Types.DocumentArray<Payee>;
};
type ModelType = Model<Ledger, {}, DocumentProps>;

const schema = new Schema<Ledger, ModelType>({
    name: { type: String, required: true },
    last_modified_on: Date,
    date_format: String,
    accounts: [new Schema<Account>({ id: String, name: String, balance: Number, note: String, closed: Boolean })],
    categories: [new Schema<Category>({ id: String, name: String, note: String, hidden: Boolean, deleted: Boolean })],
    payees: [new Schema<Payee>({ id: String, name: String, deleted: Boolean })]
});

export default model<Ledger, ModelType>("Ledger", schema);
