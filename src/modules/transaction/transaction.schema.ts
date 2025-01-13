import { Types } from "mongoose";
import { object, string, date } from "yup";

const transactionFilterSchema = object({
    account_id: string().test({
        name: "objectid",
        message: "${path} is not a valid ObjectId",
        test: value => value === undefined || Types.ObjectId.isValid(value)
    }),
    category_id: string().test({
        name: "objectid",
        message: "${path} is not a valid ObjectId",
        test: value => value === undefined || Types.ObjectId.isValid(value)
    }),
    start_date: date(),
    end_date: date()
});

export default transactionFilterSchema;
