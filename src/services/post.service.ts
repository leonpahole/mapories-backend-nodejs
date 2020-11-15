import { injectable, inject } from "inversify";
import {
  CreateOrUpdatePostRequest,
  CreateOrUpdateCommentRequest,
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
import { CommentDto, CommentWithLikesInfo } from "../dto/comment.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { MaporyMapItemDto } from "../dto/post/maporyMapItem.dto";
import { PostError } from "../errors/post.error";
import { UserUtilsService } from "./userUtils.service";
import { FriendService } from "./friend.service";

const POSTS_DEFAULT_PAGE_SIZE = 10;
const POSTS_MAX_PAGE_SIZE = 50;

const COMMENTS_DEFAULT_PAGE_SIZE = 10;
const COMMENTS_MAX_PAGE_SIZE = 50;

const FEED_DEFAULT_PAGE_SIZE = 10;
const FEED_MAX_PAGE_SIZE = 50;

interface GetPostsCriteria {
  type?: string;
  userIds?: Types.ObjectId[];
}

@injectable()
export class PostService {
  constructor(
    @inject(TYPES.UserService) private userService: UserService,
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService,
    @inject(TYPES.FriendService) private friendService: FriendService
  ) {}

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
    pageNumber: number,
    pageSize: number = POSTS_DEFAULT_PAGE_SIZE,
    postType: string | undefined = undefined
  ): Promise<PaginatedResponse<PostDto>> {
    pageSize = Math.min(pageSize, POSTS_MAX_PAGE_SIZE);

    return await this.getPostsByCriteria(currentUserId, pageNumber, pageSize, {
      type: postType,
      userIds: [Types.ObjectId(userId)],
    });
  }

  public async getFeedForUser(
    currentUserId: string,
    pageNumber: number,
    pageSize: number = FEED_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<PostDto>> {
    pageSize = Math.min(pageSize, FEED_MAX_PAGE_SIZE);

    const friends = await this.friendService.getFriendIds(currentUserId);
    friends.push(Types.ObjectId(currentUserId));

    return await this.getPostsByCriteria(currentUserId, pageNumber, pageSize, {
      userIds: friends,
    });
  }

  private async getPostsByCriteria(
    currentUserId: string,
    pageNumber: number,
    pageSize: number,
    criteria: GetPostsCriteria
  ) {
    // user ids criteria
    let matchUserIds = {};
    if (criteria.userIds) {
      matchUserIds = { "author.userId": { $in: criteria.userIds } };
    }

    // type criteria
    let matchPostType = {};
    if (criteria.type) {
      if (criteria.type === "post") {
        matchPostType = {
          mapory: null,
        };
      } else if (criteria.type === "mapory") {
        matchPostType = {
          mapory: { $exists: true },
        };
      }
    }

    const posts = await Post.aggregate([
      { $match: { ...matchUserIds, ...matchPostType } },
      { $sort: { createdAt: -1 } },
      { $skip: pageNumber * pageSize },
      { $limit: pageSize + 1 },
      this.likesPipeline(currentUserId),
    ]).exec();

    const moreAvailable = posts.length > pageSize;
    if (moreAvailable) {
      posts.pop();
    }

    const postDtos = PostDto.fromModels(posts);
    return new PaginatedResponse<PostDto>(postDtos, moreAvailable);
  }

  public async getMapDataForUser(userId: string): Promise<MaporyMapItemDto[]> {
    const posts = await Post.find({
      "author.userId": Types.ObjectId(userId),
      mapory: { $exists: true },
    });

    return MaporyMapItemDto.fromModels(posts);
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
    data: CreateOrUpdatePostRequest
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

  private async hasUserAuthoredPost(
    postId: string,
    userId: string
  ): Promise<boolean> {
    const post = await Post.findOne(
      {
        _id: stringToObjectId(postId),
        "author.userId": stringToObjectId(userId),
      },
      { _id: 1 }
    );

    return post != null;
  }

  public async updatePost(
    postId: string,
    currentUserId: string,
    data: CreateOrUpdatePostRequest
  ): Promise<void> {
    const userAuthoredPost = await this.hasUserAuthoredPost(
      postId,
      currentUserId
    );

    if (!userAuthoredPost) {
      throw PostError.NOT_MY_POST;
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

    await Post.updateOne(
      { _id: postId, "author.userId": currentUserId },
      {
        content: data.content,
        mapory: postMapory,
      }
    );
  }

  public async deletePost(postId: string, userId: string): Promise<void> {
    const userAuthoredPost = await this.hasUserAuthoredPost(postId, userId);

    if (!userAuthoredPost) {
      throw PostError.NOT_MY_POST;
    }

    await Post.deleteOne({ _id: postId, "author.userId": userId });
    await CommentList.deleteOne({ postId: stringToObjectId(postId) });
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
    body: CreateOrUpdateCommentRequest,
    commenterId: string
  ): Promise<CommentDto> {
    const postExists = await this.postExists(postId);
    if (!postExists) {
      throw CommonError.NOT_FOUND;
    }

    const commenterRef = await this.userUtilsService.userIdToUserExtendedRef(
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

  public async updateComment(
    postId: string,
    commentId: string,
    body: CreateOrUpdateCommentRequest,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        postId: stringToObjectId(postId),
        comments: {
          $elemMatch: {
            _id: stringToObjectId(commentId),
            "author.userId": stringToObjectId(userId),
          },
        },
      },
      {
        $set: {
          "comments.$.content": body.content,
        },
      }
    );
  }

  public async deleteComment(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        postId: stringToObjectId(postId),
      },
      {
        $pull: {
          comments: {
            _id: stringToObjectId(commentId),
            "author.userId": stringToObjectId(userId),
          },
        },
      }
    );
  }

  public async getPostComments(
    postId: string,
    currentUserId: string,
    pageNumber: number,
    pageSize: number = COMMENTS_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<CommentDto>> {
    pageSize = Math.min(pageSize, COMMENTS_MAX_PAGE_SIZE);

    const commentList = await CommentList.aggregate([
      { $match: { postId: Types.ObjectId(postId) } },
      { $unwind: "$comments" },
      { $sort: { "comments.createdAt": -1 } },
      { $skip: pageNumber * pageSize },
      { $limit: pageSize + 1 },
      {
        $addFields: {
          "comments.myLike": {
            $in: [
              Types.ObjectId(currentUserId),
              { $ifNull: ["$comments.likes", []] },
            ],
          },
          "comments.likesAmount": {
            $size: { $ifNull: ["$comments.likes", []] },
          },
        },
      },
    ]).exec();

    const comments: CommentWithLikesInfo[] = commentList.map(
      (cl: any) => cl.comments
    );

    const moreAvailable = comments.length > pageSize;
    if (moreAvailable) {
      comments.pop();
    }

    const commentDtos = CommentDto.fromModels(comments);
    return new PaginatedResponse<CommentDto>(commentDtos, moreAvailable);
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
