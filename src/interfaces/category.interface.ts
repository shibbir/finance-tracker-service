import { Types } from "mongoose";

interface Category {
    _id: Types.ObjectId;
    id: string;
    name: string;
    note?: string;
    hidden: boolean;
    deleted: boolean;
}

export default Category;
