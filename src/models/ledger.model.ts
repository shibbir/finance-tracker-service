import { Schema, Model, model, Types } from "mongoose";
import { ILedger, ICurrencyFormat } from "../interfaces/ledger.interface";
import IAccount from "../interfaces/account.interface";
import ICategory from "../interfaces/category.interface";
import IMerchant from "../interfaces/merchant.interface";

type DocumentProps = {
    currency_format: Types.Subdocument<Types.ObjectId> & ICurrencyFormat;
    accounts: Types.DocumentArray<IAccount>;
    categories: Types.DocumentArray<ICategory>;
    merchants: Types.DocumentArray<IMerchant>;
};

type ModelType = Model<ILedger, {}, DocumentProps>;

const schema = new Schema<ILedger, ModelType>({
    name: { type: String, required: true },
    last_modified_on: Date,
    date_format: String,
    currency_format: new Schema<ICurrencyFormat>({ iso_code: String, decimal_digits: String, decimal_separator: String, group_separator: String, currency_symbol: String }),
    accounts: [new Schema<IAccount>({ name: String, balance: Number, note: String, closed: Boolean })],
    categories: [new Schema<ICategory>({ name: String, note: String, hidden: Boolean, deleted: Boolean })],
    merchants: [new Schema<IMerchant>({ name: String, deleted: Boolean })]
});

export default model<ILedger, ModelType>("Ledger", schema);
