import { Types } from "mongoose";

interface ICategory {
    _id: Types.ObjectId;
    ynab_id?: string;
    name: string;
    note?: string;
    hidden?: boolean;
    deleted?: boolean;
    parent_id?: Types.ObjectId;
}

export default ICategory;
