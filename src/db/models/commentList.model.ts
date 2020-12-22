import { prop, getModelForClass, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserExtendedRef } from "./user.extendedRef";
import { Schema } from "mongoose";
import User from "./user.model";

export class CommentListItem extends TimeStamps {
  _id?: Schema.Types.ObjectId;

  @prop({ required: true })
  content!: string;

  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, type: UserExtendedRef })
  author!: UserExtendedRef;

  @prop({ default: false })
  deleted: boolean;

  @prop({ ref: "IUser" })
  public likes?: Ref<typeof User>[];
}

export const CommentListIdPrefix = {
  POST: "post",
  COMMENT: "comm",
};

export class ICommentList extends TimeStamps {
  @prop()
  public _id: string; // prefix + id of whatever we comment on

  @prop({ type: CommentListItem })
  public comments: CommentListItem[];
}

const CommentList = getModelForClass(ICommentList, {
  schemaOptions: {
    timestamps: true,
  },
});

export default CommentList;
