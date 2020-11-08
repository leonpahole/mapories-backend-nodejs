import { Type } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Response } from "express";
import { inject } from "inversify";
import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody,
  requestParam,
  response,
  httpPatch,
  httpDelete,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { PostDto } from "../dto/post/post.dto";
import { isAuth, validation } from "../middlewares";
import { PostService } from "../services/post.service";
import { IRequest } from "../types/api";
import { CommentDto } from "../dto/comment.dto";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { MaporyMapItemDto } from "../dto/post/maporyMapItem.dto";

class MaporyPostRequestPart {
  @IsOptional()
  rating?: number;

  @Max(90)
  @Min(-90)
  @IsDefined()
  latitude!: number;

  @Max(180)
  @Min(-180)
  @IsDefined()
  longitude!: number;

  @IsDefined()
  placeName!: string;

  @IsDate()
  @Type(() => Date)
  @IsDefined()
  visitDate!: Date;
}

export class CreateOrUpdatePostRequest {
  @IsDefined()
  public content!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaporyPostRequestPart)
  public mapory?: MaporyPostRequestPart;
}

export class CreateOrUpdateCommentRequest {
  @IsDefined()
  public content!: string;
}

@controller("/post")
export class PostController implements interfaces.Controller {
  constructor(@inject(TYPES.PostService) private postService: PostService) {}

  @httpGet("/my", isAuth)
  public getMyPosts(
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number,
    @queryParam("type") postType?: string
  ): Promise<PaginatedResponse<PostDto>> {
    return this.postService.getPostsForUser(
      req.session.userId,
      req.session.userId,
      pageNum,
      pageSize,
      postType
    );
  }

  @httpGet("/my/:userId", isAuth)
  public getUsersPosts(
    @requestParam("userId") userId: string,
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number,
    @queryParam("type") postType?: string
  ): Promise<PaginatedResponse<PostDto>> {
    return this.postService.getPostsForUser(
      userId,
      req.session.userId,
      pageNum,
      pageSize,
      postType
    );
  }

  @httpGet("/my-mapories", isAuth)
  public getMyMapData(@request() req: IRequest): Promise<MaporyMapItemDto[]> {
    return this.postService.getMapDataForUser(req.session.userId);
  }

  @httpGet("/my-mapories/:userId", isAuth)
  public getUsersMapData(
    @requestParam("userId") userId: string
  ): Promise<MaporyMapItemDto[]> {
    return this.postService.getMapDataForUser(userId);
  }

  @httpGet("/:id", isAuth)
  public async getPost(
    @requestParam("id") id: string,
    @response() res: Response,
    @request() req: IRequest
  ): Promise<PostDto> {
    const post = await this.postService.getPost(id, req.session.userId);
    if (!post) {
      res.statusCode = 404;
      throw new Error("Not found");
    }

    return post;
  }

  @httpPost("/", isAuth, validation(CreateOrUpdatePostRequest))
  public createPost(
    @requestBody() body: CreateOrUpdatePostRequest,
    @request() req: IRequest
  ): Promise<PostDto> {
    return this.postService.createPost(req.session.userId, body);
  }

  @httpPatch("/:id", isAuth, validation(CreateOrUpdatePostRequest))
  public updatePost(
    @requestParam("id") id: string,
    @requestBody() body: CreateOrUpdatePostRequest,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.updatePost(id, req.session.userId, body);
  }

  @httpDelete("/:id", isAuth)
  public deletePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.deletePost(id, req.session.userId);
  }

  @httpPost("/like/:id", isAuth)
  public likePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.likePost(id, req.session.userId);
  }

  @httpPost("/unlike/:id", isAuth)
  public unlikePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.unlikePost(id, req.session.userId);
  }

  @httpPost("/:id/comment", isAuth, validation(CreateOrUpdateCommentRequest))
  public commentPost(
    @requestParam("id") id: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<CommentDto> {
    return this.postService.commentPost(id, body, req.session.userId);
  }

  @httpPatch(
    "/:postId/comment/:commentId",
    isAuth,
    validation(CreateOrUpdateCommentRequest)
  )
  public updateComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @requestBody() body: CreateOrUpdateCommentRequest,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.updateComment(
      postId,
      commentId,
      body,
      req.session.userId
    );
  }

  @httpDelete("/:postId/comment/:commentId", isAuth)
  public deleteComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.deleteComment(
      postId,
      commentId,
      req.session.userId
    );
  }

  @httpGet("/:id/comment", isAuth)
  public getPostComments(
    @requestParam("id") id: string,
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<PaginatedResponse<CommentDto>> {
    return this.postService.getPostComments(
      id,
      req.session.userId,
      pageNum,
      pageSize
    );
  }

  @httpPost("/:postId/comment/:commentId/like", isAuth)
  public likeComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.likeComment(postId, commentId, req.session.userId);
  }

  @httpPost("/:postId/comment/:commentId/unlike", isAuth)
  public unlikeComment(
    @requestParam("postId") postId: string,
    @requestParam("commentId") commentId: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.unlikeComment(
      postId,
      commentId,
      req.session.userId
    );
  }
}
