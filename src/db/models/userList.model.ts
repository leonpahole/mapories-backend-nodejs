import { prop, getModelForClass } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserExtendedRef } from "./user.extendedRef";

export const UserListIdPrefix = {
  FRIEND: "fr",
  SENT_REQUESTS: "sreq",
  RECEIVED_REQUESTS: "rreq",
};

export class IUserList extends TimeStamps {
  @prop()
  public _id: string;

  createdAt?: Date;
  updatedAt?: Date;

  @prop({ _id: false, type: UserExtendedRef })
  public users: UserExtendedRef[];
}

const UserList = getModelForClass(IUserList, {
  schemaOptions: {
    timestamps: true,
  },
});

export default UserList;
