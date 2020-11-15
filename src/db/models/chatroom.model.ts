import { prop, getModelForClass } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";
import { UserExtendedRef } from "./user.extendedRef";

export class IChatroom extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, required: true, type: UserExtendedRef })
  public participants!: UserExtendedRef[];

  @prop()
  public name?: string;

  @prop({ default: null })
  lastMessagedAt?: Date;
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
