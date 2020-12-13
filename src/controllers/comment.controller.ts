import { IsDefined } from "class-validator";
import { inject } from "inversify";
import {
  controller,
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody,
  requestParam,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { CommentDto } from "../dto/comment.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { isAuth, validation } from "../middlewares";
import { CommentService } from "../services/comment.service";
import { IRequest } from "../types/api";

export class CreateOrUpdateCommentRequest {
  @IsDefined()
  public content!: string;
}

@controller("/comment")
export class CommentController implements interfaces.Controller {
  constructor(
    @inject(TYPES.CommentService) private commentService: CommentService
  ) {}

  /* COMMENTS ON POSTS */

  @httpPost("/post/:id", isAuth, validation(CreateOrUpdateCommentRequest))
  public commentPost(
    @requestParam("id") id: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<CommentDto> {
    return this.commentService.commentOnPost(id, body, req.userId);
  }

  @httpPatch(
    "/post/:postId/:commentId",
    isAuth,
    validation(CreateOrUpdateCommentRequest)
  )
  public updateComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.updateCommentOnPost(
      postId,
      commentId,
      body,
      req.userId
    );
  }

  @httpDelete("/post/:postId/:commentId", isAuth)
  public deleteComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.deleteCommentOnPost(
      postId,
      commentId,
      req.userId
    );
  }

  @httpGet("/post/:id", isAuth)
  public getPostComments(
    @requestParam("id") id: string,
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<PaginatedResponse<CommentDto>> {
    return this.commentService.getPostComments(
      id,
      req.userId,
      pageNum,
      pageSize
    );
  }

  @httpPost("/post/:postId/:commentId/like", isAuth)
  public likeComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.likeCommentOnPost(postId, commentId, req.userId);
  }

  @httpPost("/post/:postId/:commentId/unlike", isAuth)
  public unlikeComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.unlikeCommentOnPost(
      postId,
      commentId,
      req.userId
    );
  }

  /* COMMENTS ON COMMENTS */

  @httpPost("/comment/:id", isAuth, validation(CreateOrUpdateCommentRequest))
  public commentOnComment(
    @requestParam("id") id: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<CommentDto> {
    return this.commentService.commentOnComment(id, body, req.userId);
  }

  @httpPatch(
    "/comment/:commentId/:commentOnCommentId",
    isAuth,
    validation(CreateOrUpdateCommentRequest)
  )
  public updateCommentOnComment(
    @requestParam("commentId") commentId: string,
    @requestParam("commentOnCommentId") commentOnCommentId: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.updateCommentOnComment(
      commentId,
      commentOnCommentId,
      body,
      req.userId
    );
  }

  @httpDelete("/comment/:commentId/:commentOnCommentId", isAuth)
  public deleteCommentOnComment(
    @requestParam("commentId") commentId: string,
    @requestParam("commentOnCommentId") commentOnCommentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.deleteCommentOnPost(
      commentId,
      commentOnCommentId,
      req.userId
    );
  }

  @httpGet("/comment/:id", isAuth)
  public getCommentsOnComment(
    @requestParam("id") id: string,
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<PaginatedResponse<CommentDto>> {
    return this.commentService.getCommentComments(
      id,
      req.userId,
      pageNum,
      pageSize
    );
  }

  @httpPost("/comment/:commentId/:commentOnCommentId/like", isAuth)
  public likeCommentOnComment(
    @requestParam("commentId") commentId: string,
    @requestParam("commentOnCommentId") commentOnCommentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.likeCommentOnComment(
      commentId,
      commentOnCommentId,
      req.userId
    );
  }

  @httpPost("/comment/:commentId/:commentOnCommentId/unlike", isAuth)
  public unlikeCommentOnComment(
    @requestParam("commentId") commentId: string,
    @requestParam("commentOnCommentId") commentOnCommentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.commentService.unlikeCommentOnComment(
      commentId,
      commentOnCommentId,
      req.userId
    );
  }
}
