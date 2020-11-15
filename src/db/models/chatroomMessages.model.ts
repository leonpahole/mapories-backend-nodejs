import { prop, getModelForClass } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema, Types } from "mongoose";
import { UserExtendedRef } from "./user.extendedRef";

export class IChatroomMessage extends TimeStamps {
  _id?: Types.ObjectId | undefined;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, type: UserExtendedRef })
  author!: UserExtendedRef;

  @prop({ required: true })
  content!: string;
}

export class IChatroomMessages extends TimeStamps {
  @prop()
  public _id: string;

  createdAt?: Date;
  updatedAt?: Date;

  @prop()
  chatroomId!: Schema.Types.ObjectId;

  @prop({ required: true, type: IChatroomMessage, default: [], _id: true })
  public messages: IChatroomMessage[];
}

const ChatroomMessages = getModelForClass(IChatroomMessages, {
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

export default ChatroomMessages;
