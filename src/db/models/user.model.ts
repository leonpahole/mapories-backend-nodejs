import { prop, getModelForClass, post } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";

@post<IUser>("init", function (doc) {
  if (doc.profilePictureUrl) {
    doc.profilePictureUrl = `${process.env.PICTURES_BASE_URL}/${doc.profilePictureUrl}`;
  }
})
export class IUser extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ required: true, unique: true })
  public email!: string;

  @prop({ required: true })
  public name!: string;

  @prop()
  public password?: string;

  @prop()
  public profilePictureUrl?: string;

  @prop({ required: true, default: false })
  public isVerified!: boolean;
}

const User = getModelForClass(IUser, {
  schemaOptions: {
    timestamps: true,
  },
});

export default User;
