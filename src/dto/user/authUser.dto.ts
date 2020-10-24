import { IUser } from "../../db/models/user.model";

export class AuthUserDto {
  id: string;
  name: string;

  public static fromModel(user: IUser): AuthUserDto {
    return {
      id: user._id!.toString(),
      name: user.name,
    };
  }
}
