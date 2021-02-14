import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import TYPES from "../config/types";
import { CreateOrUpdatePostRequest } from "../controllers/post.controller";
import CommentList, {
  CommentListIdPrefix,
} from "../db/models/commentList.model";
import Post, { PostMapory } from "../db/models/post.model";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { MaporyMapItemDto } from "../dto/post/maporyMapItem.dto";
import { PostDto } from "../dto/post/post.dto";
import { CommonError } from "../errors/common.error";
import { PostError } from "../errors/post.error";
import { logger } from "../utils/logger";
import { stringToObjectId } from "../utils/strToObjectId";
import { FriendService } from "./friend.service";
import { UserService } from "./user.service";
import { ImageService } from "./image.service";
import { NotificationService } from "./notification.service";
import { UserExtendedRef } from "../db/models/user.extendedRef";

const POSTS_DEFAULT_PAGE_SIZE = 10;
const POSTS_MAX_PAGE_SIZE = 50;

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
    @inject(TYPES.FriendService) private friendService: FriendService,
    @inject(TYPES.ImageService) private imageService: ImageService,
    @inject(TYPES.NotificationService)
    private notificationService: NotificationService
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

    if (userId !== currentUserId) {
      const areFriends = await this.friendService.areUsersFriends(
        userId,
        currentUserId
      );

      if (!areFriends) {
        throw PostError.NOT_FRIENDS_WITH_USER;
      }
    }

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

  public async getFeedMapData(
    currentUserId: string
  ): Promise<MaporyMapItemDto[]> {
    const friends = await this.friendService.getFriendIds(currentUserId);
    friends.push(Types.ObjectId(currentUserId));

    const posts = await Post.find({
      "author.userId": { $in: friends },
      mapory: { $exists: true },
    });

    return MaporyMapItemDto.fromModels(posts);
  }

  public async getMapDataForUser(
    userId: string,
    currentUserId: string
  ): Promise<MaporyMapItemDto[]> {
    if (userId !== currentUserId) {
      const areFriends = await this.friendService.areUsersFriends(
        userId,
        currentUserId
      );

      if (!areFriends) {
        throw PostError.NOT_FRIENDS_WITH_USER;
      }
    }

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
      picturesUris: [],
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

  public async updatePostPictures(
    postId: string,
    files: Express.Multer.File[],
    deletedPictures: string[] = []
  ): Promise<string[]> {
    if (files.length > 0) {
      const picturePaths = await this.imageService.uploadPostImages(files);
      await Post.updateOne(
        { _id: postId },
        {
          $push: { picturesUris: { $each: picturePaths } },
        }
      );
    }

    if (deletedPictures.length > 0) {
      await Post.updateOne(
        { _id: postId },
        {
          $pullAll: { picturesUris: deletedPictures },
        }
      );
    }

    const post = await Post.findById(postId);
    return post?.picturesUris
      ? post.picturesUris.map((p) => `${process.env.PICTURES_BASE_URL}/${p}`)
      : [];
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
    await CommentList.deleteOne({
      entityId: `${CommentListIdPrefix.POST}_${stringToObjectId(postId)}`,
    });
  }

  public async getPostAuthor(postId: string): Promise<UserExtendedRef | null> {
    const post = await Post.findById(postId);
    if (!post) {
      return null;
    }

    return post.author;
  }

  public async likePost(postId: string, userId: string): Promise<void> {
    const author = await this.getPostAuthor(postId);
    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    await Post.updateOne(
      { _id: postId },
      { $addToSet: { likes: Types.ObjectId(userId) } }
    );

    const receiverId = author.userId.toString();
    if (receiverId !== userId) {
      await this.notificationService.createLikedPostNotification(
        receiverId,
        userId,
        postId
      );
    }
  }

  public async unlikePost(postId: string, userId: string): Promise<void> {
    await Post.updateOne(
      { _id: postId },
      { $pull: { likes: Types.ObjectId(userId) } }
    );
  }

  public async postExists(postId: string): Promise<boolean> {
    const post = await Post.findOne({ _id: postId }, { _id: 1 });
    return post != null;
  }
}
