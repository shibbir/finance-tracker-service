import { Schema, Model, model } from "mongoose";
import ICategoryGroup from "../interfaces/category-group.interface";

const schema = new Schema<ICategoryGroup, Model<ICategoryGroup>>({
    name: String,
    ynab_id: String,
});

export default model<ICategoryGroup>("CategoryGroup", schema);
