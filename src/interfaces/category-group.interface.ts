import { Types } from "mongoose";

interface ICategoryGroup {
    _id: Types.ObjectId;
    ynab_id?: string;
    name: string;
}

export default ICategoryGroup;
