import { injectable, inject } from "inversify";
import {
  CreatePostRequest,
  CreateCommentRequest,
} from "../controllers/post.controller";
import Post, { PostMapory } from "../db/models/post.model";
import { PostDto } from "../dto/post/post.dto";
import { logger } from "../utils/logger";
import { Types } from "mongoose";
import { CommonError } from "../errors/common.error";
import { UserService } from "./user.service";
import TYPES from "../config/types";
import CommentList, { CommentListItem } from "../db/models/commentList.model";
import { stringToObjectId } from "../utils/strToObjectId";
import { CommentDto } from "../dto/comment.dto";

@injectable()
export class PostService {
  constructor(@inject(TYPES.UserService) private userService: UserService) {}

  private likesPipeline(userId: string) {
    return {
      $addFields: {
        myLike: {
          $in: [Types.ObjectId(userId), { $ifNull: ["$likes", []] }],
        },
        likesAmount: { $size: { $ifNull: ["$likes", []] } },
      },
    };
  }

  public async getPostsForUser(
    userId: string,
    currentUserId: string,
    postType: string | null = null
  ): Promise<PostDto[]> {
    let matchType = {};
    if (postType === "post") {
      matchType = {
        mapory: null,
      };
    } else if (postType === "mapory") {
      matchType = {
        mapory: { $exists: true },
      };
    }

    const posts = await Post.aggregate([
      { $match: { "author.userId": Types.ObjectId(userId), ...matchType } },
      this.likesPipeline(currentUserId),
    ]).exec();

    return PostDto.fromModels(posts);
  }

  public async getPost(
    id: string,
    currentUserId: string
  ): Promise<PostDto | null> {
    try {
      const post = await Post.aggregate([
        { $match: { _id: Types.ObjectId(id) } },
        this.likesPipeline(currentUserId),
      ]).exec();

      return post && post.length > 0 ? PostDto.fromModel(post[0]) : null;
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  public async createPost(
    authorId: string,
    data: CreatePostRequest
  ): Promise<PostDto> {
    const author = await this.userService.getAuthUserById(authorId);

    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    let postMapory: PostMapory | undefined = undefined;
    if (data.mapory) {
      postMapory = {
        location: [[data.mapory.latitude, data.mapory.longitude]],
        placeName: data.mapory.placeName,
        visitDate: data.mapory.visitDate,
        rating: data.mapory.rating,
      };
    }

    const post = await Post.create({
      content: data.content,
      mapory: postMapory,
      author: {
        userId: author.id,
        name: author.name,
        profilePictureUrl: author.profilePictureUrl,
      },
    });

    return PostDto.fromModel({
      ...post.toObject(),
      myLike: false,
      likesAmount: 0,
    });
  }

  private async hasUserLikedPost(
    postId: string,
    userId: string
  ): Promise<boolean> {
    const post = await Post.findOne({
      _id: postId,
      likes: Types.ObjectId(userId),
    }).exec();
    return post != null;
  }

  public async likePost(postId: string, userId: string): Promise<void> {
    await Post.updateOne(
      { _id: postId },
      { $addToSet: { likes: Types.ObjectId(userId) } }
    );
  }

  public async unlikePost(postId: string, userId: string): Promise<void> {
    await Post.updateOne(
      { _id: postId },
      { $pull: { likes: Types.ObjectId(userId) } }
    );
  }

  private async postExists(postId: string): Promise<boolean> {
    const post = await Post.findOne({ _id: postId }, { _id: 1 });
    return post != null;
  }

  public async commentPost(
    postId: string,
    body: CreateCommentRequest,
    commenterId: string
  ): Promise<CommentDto> {
    const postExists = await this.postExists(postId);
    if (!postExists) {
      throw CommonError.NOT_FOUND;
    }

    const commenterRef = await this.userService.userIdToUserExtendedRef(
      commenterId
    );
    if (!commenterRef) {
      throw CommonError.NOT_FOUND;
    }

    const commentListItem: CommentListItem = {
      _id: stringToObjectId((Types.ObjectId() as unknown) as string),
      author: commenterRef,
      content: body.content,
      likes: [],
    };

    await CommentList.updateOne(
      { postId: stringToObjectId(postId) },
      { $push: { comments: commentListItem as any } },
      {
        upsert: true,
      }
    );

    return CommentDto.fromModel({
      ...commentListItem,
      likesAmount: 0,
      myLike: false,
    });
  }

  public async getPostComments(
    postId: string,
    currentUserId: string,
    pageNumber: number,
    pageSize: number
  ): Promise<CommentDto[]> {
    const commentList = await CommentList.aggregate([
      { $match: { postId: Types.ObjectId(postId) } },
      {
        $project: {
          comments: {
            $map: {
              input: "$comments",
              as: "comment",
              in: {
                $mergeObjects: [
                  "$$comment",
                  {
                    likesAmount: {
                      $size: { $ifNull: ["$$comment.likes", []] },
                    },
                    myLike: {
                      $in: [
                        Types.ObjectId(currentUserId),
                        { $ifNull: ["$$comment.likes", []] },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]).exec();

    if (!commentList || commentList.length === 0) {
      return [];
    }

    return CommentDto.fromModels(commentList[0].comments || []);
  }

  public async likeComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        postId: stringToObjectId(postId),
        "comments._id": stringToObjectId(commentId),
      },
      {
        $addToSet: {
          "comments.$.likes": stringToObjectId(userId),
        },
      }
    );
  }

  public async unlikeComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        postId: stringToObjectId(postId),
        "comments._id": stringToObjectId(commentId),
      },
      {
        $pull: {
          "comments.$.likes": stringToObjectId(userId),
        },
      }
    );
  }
}
