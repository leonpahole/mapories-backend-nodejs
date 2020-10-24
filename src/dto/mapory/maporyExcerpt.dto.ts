import { IMapory } from "../../db/models/mapory.model";

export class MaporyExcerptDto {
  id: string;
  name: string;
  description?: string;
  visitDate: Date;
  placeName: string;
  latitude: number;
  longitude: number;

  public static fromModel(mapory: IMapory): MaporyExcerptDto {
    return {
      id: mapory._id!.toString(),
      latitude: mapory.location[0][0],
      longitude: mapory.location[0][1],
      name: mapory.name,
      description: mapory.description,
      visitDate: mapory.visitDate,
      placeName: mapory.placeName,
    };
  }

  public static fromModels(mapories: IMapory[]): MaporyExcerptDto[] {
    return mapories.map((m) => this.fromModel(m));
  }
}
