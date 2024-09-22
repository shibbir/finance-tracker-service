import { Types } from "mongoose";

interface ICategory {
    _id: Types.ObjectId;
    ynab_id?: string;
    name: string;
    note?: string;
    hidden: boolean;
    deleted: boolean;
}

export default ICategory;
