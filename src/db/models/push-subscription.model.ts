import { prop, getModelForClass, post, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";
import User from "./user.model";
import { PushSubscription } from "web-push";

class Keys {
  @prop({ required: true })
  public p256dh!: string;

  @prop({ required: true })
  public auth!: string;
}

export class IWebPushSubscription extends TimeStamps {
  _id?: Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;

  @prop({ ref: "IUser", required: true })
  public user!: Ref<typeof User>;

  @prop({ required: true })
  public endpoint!: string;

  @prop({ required: true })
  public keys!: Keys;
}

const WebPushSubscription = getModelForClass(IWebPushSubscription, {
  schemaOptions: {
    timestamps: true,
  },
});

export default WebPushSubscription;

export const toSubscription = (s: IWebPushSubscription): PushSubscription => {
  return {
    endpoint: s.endpoint,
    keys: {
      p256dh: s.keys.p256dh,
      auth: s.keys.auth,
    },
  };
};
