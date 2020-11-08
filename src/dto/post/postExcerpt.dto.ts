import { IPost } from "../../db/models/post.model";

export type PostWithLikesInfo = IPost & {
  likesAmount: number;
  myLike: boolean;
};

export class PostExcerptDto {
  id: string;
  createdAt: Date;
  content: string;

  mapory?: {
    placeName: string;
    location: {
      latitude: number;
      longitude: number;
    };
    visitDate: Date;
    rating?: number;
  };

  likes: {
    likesAmount: number;
    myLike: boolean;
  };

  public static fromModel(post: PostWithLikesInfo): PostExcerptDto {
    let convertedPost: PostExcerptDto = {
      id: post._id!.toString(),
      createdAt: post.createdAt!,
      content: post.content,
      mapory: undefined,
      likes: {
        likesAmount: post.likesAmount,
        myLike: post.myLike,
      },
    };

    if (post.mapory) {
      convertedPost.mapory = {
        placeName: post.mapory.placeName,
        location: {
          latitude: post.mapory.location[0][0],
          longitude: post.mapory.location[0][1],
        },
        visitDate: post.mapory.visitDate,
        rating: post.mapory.rating,
      };
    }

    return convertedPost;
  }

  public static fromModels(posts: PostWithLikesInfo[]): PostExcerptDto[] {
    return posts.map((p) => this.fromModel(p));
  }
}
