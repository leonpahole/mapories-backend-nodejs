import { prop, getModelForClass } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";

export class IUser extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ required: true, unique: true })
  public email!: string;

  @prop()
  public name!: string;

  @prop()
  public password!: string;

  @prop({ required: true, default: false })
  public isVerified!: boolean;
}

const User = getModelForClass(IUser, {
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

export default User;
