import { prop, getModelForClass, arrayProp, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";
import User from "./user.model";

export class IMapory extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ ref: "IUser", required: true })
  public user!: Ref<typeof User>;

  @prop({ required: true })
  public name!: string;

  @prop()
  public description?: string;

  @prop()
  public rating?: number;

  @arrayProp({ items: Array, required: true })
  location!: [[number, number]];

  @prop({ required: true })
  public placeName!: string;

  @prop({ required: true })
  public visitDate!: Date;
}

const Mapory = getModelForClass(IMapory, {
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

export default Mapory;
