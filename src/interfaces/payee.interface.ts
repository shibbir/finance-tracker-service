import { Types } from "mongoose";

interface Payee {
    _id: Types.ObjectId;
    ynab_id: string;
    name: string;
    deleted: boolean;
}

export default Payee;
