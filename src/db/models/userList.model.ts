import { prop, getModelForClass, arrayProp } from "@typegoose/typegoose";
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

  @arrayProp({ _id: false, items: UserExtendedRef })
  public users: UserExtendedRef[];
}

const UserList = getModelForClass(IUserList, {
  schemaOptions: {
    timestamps: true,
  },
});

export default UserList;
