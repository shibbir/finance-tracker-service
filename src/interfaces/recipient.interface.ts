import { Types } from "mongoose";

interface IRecipient {
    _id: Types.ObjectId;
    ynab_id?: string;
    name: string;
    deleted: boolean;
}

export default IRecipient;
