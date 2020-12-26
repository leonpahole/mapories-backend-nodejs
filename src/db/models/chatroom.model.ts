import { prop, getModelForClass, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";
import { UserExtendedRef } from "./user.extendedRef";
import User from "./user.model";

export class IChatroom extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, required: true, type: UserExtendedRef })
  public participants!: UserExtendedRef[];

  @prop({ ref: "IUser", default: [] })
  public read!: Ref<typeof User>[];

  @prop()
  public name?: string;
}

const Chatroom = getModelForClass(IChatroom, {
  schemaOptions: {
    versionKey: false,
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
      },
    },
  },
});

export default Chatroom;
