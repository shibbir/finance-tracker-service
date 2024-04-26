import { Types } from "mongoose";

interface Payee {
    _id: Types.ObjectId;
    id: string;
    name: string;
    deleted: boolean;
}

export default Payee;
