import { prop, getModelForClass, Ref } from "@typegoose/typegoose";
import { UserExtendedRef } from "./user.extendedRef";
import { Schema } from "mongoose";
import User from "./user.model";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

export enum NotificationType {
  SENT_FRIEND_REQUEST = "SENT_FRIEND_REQUEST",
  ACCEPTED_FRIEND_REQUEST = "ACCEPTED_FRIEND_REQUEST",
  LIKED_YOUR_POST = "LIKED_YOUR_POST",
  COMMENTED_ON_YOUR_POST = "COMMENTED_ON_YOUR_POST",
  LIKED_YOUR_COMMENT = "LIKED_YOUR_COMMENT",
  REPLIED_TO_YOUR_COMMENT = "REPLIED_TO_YOUR_COMMENT",
  REPLIED_TO_A_COMMENT_YOU_REPLIED_TO = "REPLIED_TO_A_COMMENT_YOU_REPLIED_TO",
}

export class INotification extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ ref: "IUser", required: true })
  public receiver!: Ref<typeof User>;

  @prop({ _id: false, required: true })
  public sender!: UserExtendedRef;

  @prop({ enum: NotificationType, required: true })
  public type!: NotificationType;

  @prop({ required: false })
  public entityId?: Schema.Types.ObjectId;

  @prop({ required: true, default: false })
  public read!: boolean;
}

const Notification = getModelForClass(INotification, {
  schemaOptions: {
    timestamps: true,
  },
});

export default Notification;
