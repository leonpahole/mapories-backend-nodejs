import { prop } from "@typegoose/typegoose";
import { Schema } from "mongoose";
import { IUser } from "./user.model";

export class UserExtendedRef {
  @prop({ ref: "IUser", required: true })
  public userId!: Schema.Types.ObjectId;

  @prop({ required: true })
  public name!: string;

  @prop()
  public profilePictureUrl?: string;

  static fromUser(user: IUser): UserExtendedRef {
    return {
      userId: user._id!,
      name: user.name,
      profilePictureUrl: user.profilePictureUrl,
    };
  }
}
