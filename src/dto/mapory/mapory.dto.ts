import { MaporyExcerptDto } from "./maporyExcerpt.dto";
import { UserProfileDto } from "../user/userProfile.dto";
import { IMapory } from "../../db/models/mapory.model";
import { IUser } from "../../db/models/user.model";

export class MaporyDto {
  mapory: MaporyExcerptDto;
  author: UserProfileDto;

  public static fromModel(mapory: IMapory): MaporyDto {
    return {
      mapory: MaporyExcerptDto.fromModel(mapory),
      author: UserProfileDto.fromModel((mapory.user as unknown) as IUser),
    };
  }

  public static fromModels(mapories: IMapory[]): MaporyDto[] {
    return mapories.map((m) => this.fromModel(m));
  }
}
