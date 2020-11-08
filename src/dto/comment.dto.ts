import { UserExcerptDto } from "./user/authUser.dto";
import { CommentListItem } from "../db/models/commentList.model";
import { Schema } from "mongoose";

export type CommentWithLikesInfo = CommentListItem & {
  likesAmount: number;
  myLike: boolean;
};

export class CommentDto {
  id: string;
  content: string;
  postedAt: Date;
  author: UserExcerptDto;
  likes: {
    likesAmount: number;
    myLike: boolean;
  };

  public static fromModel(comment: CommentWithLikesInfo): CommentDto {
    return {
      id: comment._id!.toString(),
      content: comment.content,
      postedAt: comment.createdAt!,
      author: {
        id: (comment.author.userId as Schema.Types.ObjectId).toString(),
        name: comment.author.name,
        profilePictureUrl: comment.author.profilePictureUrl,
      },
      likes: {
        likesAmount: comment.likesAmount,
        myLike: comment.myLike,
      },
    };
  }

  public static fromModels(comments: CommentWithLikesInfo[]): CommentDto[] {
    return comments.map((p) => this.fromModel(p));
  }
}
