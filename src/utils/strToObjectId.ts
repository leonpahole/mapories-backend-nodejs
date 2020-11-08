import { Schema } from "mongoose";

export const stringToObjectId = (id: string): Schema.Types.ObjectId => {
  return (id as unknown) as Schema.Types.ObjectId;
};
