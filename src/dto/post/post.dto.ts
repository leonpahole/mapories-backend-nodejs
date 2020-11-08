import { PostExcerptDto, PostWithLikesInfo } from "./postExcerpt.dto";
import { UserExcerptDto } from "../user/authUser.dto";
import { Schema } from "mongoose";

export class PostDto {
  post: PostExcerptDto;
  author: UserExcerptDto;

  public static fromModel(post: PostWithLikesInfo): PostDto {
    return {
      post: PostExcerptDto.fromModel(post),
      author: {
        id: (post.author.userId as Schema.Types.ObjectId).toString(),
        name: post.author.name,
        profilePictureUrl: post.author.profilePictureUrl,
      },
    };
  }

  public static fromModels(posts: PostWithLikesInfo[]): PostDto[] {
    return posts.map((p) => this.fromModel(p));
  }
}
