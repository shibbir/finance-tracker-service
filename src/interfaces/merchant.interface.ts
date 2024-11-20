import { Types } from "mongoose";

interface IMerchant {
    _id: Types.ObjectId;
    ynab_id?: string;
    name: string;
    deleted: boolean;
}

export default IMerchant;
