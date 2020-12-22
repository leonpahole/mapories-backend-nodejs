import { inject, injectable } from "inversify";
import { Types } from "mongoose";
import TYPES from "../config/types";
import { CreateOrUpdateCommentRequest } from "../controllers/post.controller";
import CommentList, {
  CommentListIdPrefix,
  CommentListItem,
} from "../db/models/commentList.model";
import { UserExtendedRef } from "../db/models/user.extendedRef";
import { CommentDto, CommentWithLikesInfo } from "../dto/comment.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { CommonError } from "../errors/common.error";
import { uniqueArray } from "../utils/arrayUtils";
import { stringToObjectId } from "../utils/strToObjectId";
import { NotificationService } from "./notification.service";
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
    @inject(TYPES.PostService) private postService: PostService,
    @inject(TYPES.NotificationService)
    private notificationService: NotificationService
  ) {}

  // private async commentExists(commentId: string): Promise<boolean> {
  //   const comment = await CommentList.findOne(
  //     { "comments._id": stringToObjectId(commentId) },
  //     { _id: 1 }
  //   );
  //   return comment != null;
  // }

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
      deleted: false,
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
    const author = await this.postService.getPostAuthor(postId);
    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    const comment = await this.createComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      body.content,
      commenterId
    );

    const receiverId = author.userId.toString();
    if (receiverId !== commenterId) {
      await this.notificationService.createCommentedPostNotification(
        receiverId,
        commenterId,
        postId
      );
    }

    return comment;
  }

  public async getCommentAuthor(
    commentId: string
  ): Promise<UserExtendedRef | null> {
    const comment = await CommentList.aggregate([
      {
        $match: {
          comments: {
            $elemMatch: {
              _id: stringToObjectId(commentId),
            },
          },
        },
      },
      {
        $unwind: "$comments",
      },
      {
        $match: {
          "$comments._id": stringToObjectId(commentId),
        },
      },
      {
        $limit: 1,
      },
    ]);

    if (!comment || comment.length === 0) {
      return null;
    }

    return comment[0].comments.author;
  }

  private async getCommentPostId(commentId: string): Promise<string | null> {
    const comment = await CommentList.findOne(
      { "comments._id": stringToObjectId(commentId) },
      { _id: 1 }
    );

    if (!comment) {
      return null;
    }

    return comment._id.replace(`${CommentListIdPrefix.POST}_`, "");
  }

  public async getCommentRepliersUserIds(commentId: string): Promise<string[]> {
    const commentList = await CommentList.findById(
      `${CommentListIdPrefix.COMMENT}_${commentId}`
    );

    if (!commentList) {
      return [];
    }

    return uniqueArray(
      commentList.comments.map((c) => c.author.userId.toString())
    );
  }

  public async commentOnComment(
    commentId: string,
    body: CreateOrUpdateCommentRequest,
    commenterId: string
  ): Promise<CommentDto> {
    const author = await this.getCommentAuthor(commentId);
    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    const postId = await this.getCommentPostId(commentId);
    if (!postId) {
      throw CommonError.NOT_FOUND;
    }

    const repliers = await this.getCommentRepliersUserIds(commentId);

    const comment = await this.createComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      body.content,
      commenterId
    );

    const receiverId = author.userId.toString();
    if (receiverId !== commenterId) {
      await this.notificationService.createRepliedToCommentNotification(
        receiverId,
        commenterId,
        postId
      );
    }

    await Promise.all(
      repliers
        .filter((r) => r !== commenterId && r !== receiverId)
        .map((r) =>
          this.notificationService.createRepliedToCommentYouRepliedToNotification(
            r,
            commenterId,
            postId
          )
        )
    );

    return comment;
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

  private async markCommentDeleted(
    entityId: string,
    commentId: string,
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
          "comments.$.content": "",
          "comments.$.deleted": true,
        },
      }
    );
  }

  public async deleteCommentOnPost(
    postId: string,
    commentId: string,
    userId: string
  ): Promise<{ markedDeleted: boolean }> {
    const numberOfChildrenComments = await this.getNumberOfChildrenComments(
      `${CommentListIdPrefix.COMMENT}_${commentId}`
    );

    const commentListId = `${CommentListIdPrefix.POST}_${postId}`;

    if (numberOfChildrenComments > 0) {
      await this.markCommentDeleted(commentListId, commentId, userId);
      return { markedDeleted: true };
    } else {
      await this.deleteComment(commentListId, commentId, userId);
      return { markedDeleted: false };
    }
  }

  public async deleteCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    userId: string
  ): Promise<{ parentDeleted: boolean }> {
    // delete comment on comment
    const commentListId = `${CommentListIdPrefix.COMMENT}_${commentId}`;
    await this.deleteComment(commentListId, commentOnCommentId, userId);

    // comment marked deleted and has no more children?
    const parentCommentChildrenCount = await this.getNumberOfChildrenComments(
      commentId
    );

    if (parentCommentChildrenCount > 0) {
      return { parentDeleted: false };
    }

    const res = await CommentList.updateOne(
      {
        comments: {
          $elemMatch: {
            _id: stringToObjectId(commentId),
            deleted: true,
          },
        },
      },
      {
        $pull: {
          comments: {
            _id: stringToObjectId(commentId),
            deleted: true,
          },
        },
      }
    );

    return { parentDeleted: res.nModified > 0 };
  }

  private async getNumberOfChildrenComments(
    commentListId: string
  ): Promise<number> {
    const commentList = await CommentList.aggregate([
      { $match: { _id: commentListId } },
      { $project: { numberOfComments: { $size: "$comments" } } },
      { $limit: 1 },
    ]).exec();

    if (
      commentList &&
      commentList.length > 0 &&
      commentList[0].numberOfComments > 0
    ) {
      return commentList[0].numberOfComments;
    }

    return 0;
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
    const author = await this.getCommentAuthor(commentId);
    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    await this.likeComment(
      `${CommentListIdPrefix.POST}_${postId}`,
      commentId,
      userId
    );

    const receiverId = author.userId.toString();
    if (receiverId !== userId) {
      await this.notificationService.createLikedCommentNotification(
        receiverId,
        userId,
        postId
      );
    }
  }

  public async likeCommentOnComment(
    commentId: string,
    commentOnCommentId: string,
    userId: string
  ): Promise<void> {
    const author = await this.getCommentAuthor(commentId);
    if (!author) {
      throw CommonError.NOT_FOUND;
    }

    const postId = await this.getCommentPostId(commentId);
    if (!postId) {
      throw CommonError.NOT_FOUND;
    }

    await this.likeComment(
      `${CommentListIdPrefix.COMMENT}_${commentId}`,
      commentOnCommentId,
      userId
    );

    const receiverId = author.userId.toString();
    if (receiverId !== userId) {
      await this.notificationService.createLikedCommentNotification(
        receiverId,
        userId,
        postId
      );
    }
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
