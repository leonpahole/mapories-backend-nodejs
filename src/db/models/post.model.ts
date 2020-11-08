import { prop, getModelForClass, arrayProp, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";
import User from "./user.model";
import { UserExtendedRef } from "./user.extendedRef";

export class PostMapory {
  @prop({ required: true })
  public placeName!: string;

  @arrayProp({ items: Array, required: true })
  location!: [[number, number]];

  @prop({ required: true })
  public visitDate!: Date;

  @prop()
  public rating?: number;
}

export class IPost extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, required: true })
  public author!: UserExtendedRef;

  @prop({ required: true })
  public content!: string;

  @prop({ _id: false })
  public mapory?: PostMapory;

  @prop({ ref: "IUser" })
  public likes?: Ref<typeof User>[];
}

const Post = getModelForClass(IPost, {
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

export default Post;
