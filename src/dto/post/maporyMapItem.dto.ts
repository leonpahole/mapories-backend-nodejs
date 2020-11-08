import { IPost } from "../../db/models/post.model";

export class MaporyMapItemDto {
  id: string;
  placeName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  visitDate: Date;
  rating?: number;

  public static fromModel(post: IPost): MaporyMapItemDto | null {
    if (post.mapory == null) {
      return null;
    }

    return {
      id: post._id!.toString(),
      placeName: post.mapory.placeName,
      location: {
        latitude: post.mapory.location[0][0],
        longitude: post.mapory.location[0][1],
      },
      visitDate: post.mapory.visitDate,
      rating: post.mapory.rating,
    };
  }

  public static fromModels(posts: IPost[]): MaporyMapItemDto[] {
    return posts
      .map((p) => this.fromModel(p))
      .filter((p) => p != null) as MaporyMapItemDto[];
  }
}
