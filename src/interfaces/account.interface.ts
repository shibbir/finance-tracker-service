import { Types } from "mongoose";

interface Account {
    _id: Types.ObjectId;
    id: string;
    name: string;
    balance: number;
    note?: string;
    closed: boolean;
}

export default Account;
