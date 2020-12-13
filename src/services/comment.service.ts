import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import TYPES from "../config/types";
import { CreateOrUpdateCommentRequest } from "../controllers/post.controller";
import CommentList, {
  CommentListIdPrefix,
  CommentListItem,
} from "../db/models/commentList.model";
import { CommentDto, CommentWithLikesInfo } from "../dto/comment.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { CommonError } from "../errors/common.error";
import { stringToObjectId } from "../utils/strToObjectId";
import { PostService } from "./post.service";
import { UserUtilsService } from "./userUtils.service";

const POST_COMMENTS_DEFAULT_PAGE_SIZE = 10;
const POST_COMMENTS_MAX_PAGE_SIZE = 50;
const COMMENT_COMMENTS_DEFAULT_PAGE_SIZE = 5;
const COMMENT_COMMENTS_MAX_PAGE_SIZE = 50;

@injectable()
export class CommentService {
  constructor(
    @inject(TYPES.UserUtilsService) private userUtilsService: UserUtilsService,
    @inject(TYPES.PostService) private postService: PostService
  ) {}

  private async commentExists(commentId: string): Promise<boolean> {
    const comment = await CommentList.findOne(
      { "comments._id": stringToObjectId(commentId) },
      { _id: 1 }
    );
    return comment != null;
  }

  private async createComment(
    entityId: string,
    content: string,
    commenterId: string
  ): Promise<CommentDto> {
    const commenterRef = await this.userUtilsService.userIdToUserExtendedRef(
      commenterId
    );

    if (!commenterRef) {
      throw CommonError.NOT_FOUND;
    }

    const commentListItem: CommentListItem = {
      _id: stringToObjectId((Types.ObjectId() as unknown) as string),
      author: commenterRef,
      content,
      likes: [],
    };

    await CommentList.updateOne(
      { _id: entityId },
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

  public async commentOnPost(
    postId: string,
    body: CreateOrUpdateCommentRequest,
    commenterId: string
  ): Promise<CommentDto> {
    const postExists = await this.postService.postExists(postId);
    if (!postExists) {
      throw CommonError.NOT_FOUND;
    }

    return this.createComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      body.content,
      commenterId
    );
  }

  public async commentOnComment(
    commentId: string,
    body: CreateOrUpdateCommentRequest,
    commenterId: string
  ): Promise<CommentDto> {
    const commentExists = await this.commentExists(commentId);
    if (!commentExists) {
      throw CommonError.NOT_FOUND;
    }

    return this.createComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      body.content,
      commenterId
    );
  }

  private async updateComment(
    entityId: string,
    commentId: string,
    content: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        _id: entityId,
        comments: {
          $elemMatch: {
            _id: stringToObjectId(commentId),
            "author.userId": stringToObjectId(userId),
          },
        },
      },
      {
        $set: {
          "comments.$.content": content,
        },
      }
    );
  }

  public async updateCommentOnPost(
    postId: string,
    commentId: string,
    body: CreateOrUpdateCommentRequest,
    userId: string
  ): Promise<void> {
    await this.updateComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      commentId,
      body.content,
      userId
    );
  }

  public async updateCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    body: CreateOrUpdateCommentRequest,
    userId: string
  ): Promise<void> {
    await this.updateComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      commentOnCommentId,
      body.content,
      userId
    );
  }

  private async deleteComment(
    entityId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        _id: entityId,
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

    // delete any comments on this comment
    await CommentList.deleteOne({
      entityId: `${CommentListIdPrefix.COMMENT}_${commentId}`,
    });
  }

  public async deleteCommentOnPost(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await this.deleteComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      commentId,
      userId
    );
  }

  public async deleteCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    userId: string
  ): Promise<void> {
    await this.deleteComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      commentOnCommentId,
      userId
    );
  }

  private async getComments(
    entityId: string,
    currentUserId: string,
    pageNumber: number,
    pageSize: number,
    maxPageSize: number
  ): Promise<PaginatedResponse<CommentDto>> {
    pageSize = Math.min(pageSize, maxPageSize);

    const commentList = await CommentList.aggregate([
      { $match: { _id: entityId } },
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

  public async getPostComments(
    postId: string,
    currentUserId: string,
    pageNumber: number,
    pageSize: number = POST_COMMENTS_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<CommentDto>> {
    return this.getComments(
      `${CommentListIdPrefix.POST}_${postId}`,
      currentUserId,
      pageNumber,
      pageSize,
      POST_COMMENTS_MAX_PAGE_SIZE
    );
  }

  public async getCommentComments(
    commentId: string,
    currentUserId: string,
    pageNumber: number,
    pageSize: number = COMMENT_COMMENTS_DEFAULT_PAGE_SIZE
  ): Promise<PaginatedResponse<CommentDto>> {
    return this.getComments(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      currentUserId,
      pageNumber,
      pageSize,
      COMMENT_COMMENTS_MAX_PAGE_SIZE
    );
  }

  private async likeComment(
    entityId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        _id: entityId,
        "comments._id": stringToObjectId(commentId),
      },
      {
        $addToSet: {
          "comments.$.likes": stringToObjectId(userId),
        },
      }
    );
  }

  public async likeCommentOnPost(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await this.likeComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      commentId,
      userId
    );
  }

  public async likeCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    userId: string
  ): Promise<void> {
    await this.likeComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      commentOnCommentId,
      userId
    );
  }

  private async unlikeComment(
    entityId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await CommentList.updateOne(
      {
        _id: entityId,
        "comments._id": stringToObjectId(commentId),
      },
      {
        $pull: {
          "comments.$.likes": stringToObjectId(userId),
        },
      }
    );
  }

  public async unlikeCommentOnPost(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<void> {
    await this.unlikeComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      commentId,
      userId
    );
  }

  public async unlikeCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    userId: string
  ): Promise<void> {
    await this.unlikeComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      commentOnCommentId,
      userId
    );
  }
}
