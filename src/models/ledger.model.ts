import { Schema, Model, model, Types } from "mongoose";
import { CurrencyFormat, Ledger } from "../interfaces/ledger.interface";
import Account from "../interfaces/account.interface";
import Category from "../interfaces/category.interface";
import Payee from "../interfaces/payee.interface";

type DocumentProps = {
    currency_format: Types.Subdocument<Types.ObjectId> & CurrencyFormat;
    accounts: Types.DocumentArray<Account>;
    categories: Types.DocumentArray<Category>;
    payees: Types.DocumentArray<Payee>;
};
type ModelType = Model<Ledger, {}, DocumentProps>;

const schema = new Schema<Ledger, ModelType>({
    ynab_id: String,
    name: { type: String, required: true },
    last_modified_on: Date,
    date_format: String,
    currency_format: new Schema<CurrencyFormat>({ iso_code: String, decimal_digits: String, decimal_separator: String, group_separator: String, currency_symbol: String }),
    accounts: [new Schema<Account>({ ynab_id: String, name: String, balance: Number, note: String, closed: Boolean })],
    categories: [new Schema<Category>({ ynab_id: String, name: String, note: String, hidden: Boolean, deleted: Boolean })],
    payees: [new Schema<Payee>({ ynab_id: String, name: String, deleted: Boolean })]
});

export default model<Ledger, ModelType>("Ledger", schema);
