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
} from "inversify-express-utils";
import TYPES from "../config/types";
import { PostDto } from "../dto/post/post.dto";
import { isAuth, validation } from "../middlewares";
import { PostService } from "../services/post.service";
import { IRequest } from "../types/api";
import { CommentDto } from "../dto/comment.dto";

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

export class CreatePostRequest {
  @IsDefined()
  public content!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MaporyPostRequestPart)
  public mapory?: MaporyPostRequestPart;
}

export class CreateCommentRequest {
  @IsDefined()
  public content!: string;
}

@controller("/post")
export class PostController implements interfaces.Controller {
  constructor(@inject(TYPES.PostService) private postService: PostService) {}

  @httpGet("/my", isAuth)
  public getMyPosts(
    @request() req: IRequest,
    @queryParam("type") postType?: string
  ): Promise<PostDto[]> {
    return this.postService.getPostsForUser(
      req.session.userId,
      req.session.userId,
      postType
    );
  }

  @httpGet("/my/:userId", isAuth)
  public getUsersPosts(
    @requestParam("userId") userId: string,
    @request() req: IRequest,
    @queryParam("type") postType?: string
  ): Promise<PostDto[]> {
    return this.postService.getPostsForUser(
      userId,
      req.session.userId,
      postType
    );
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

  @httpPost("/", isAuth, validation(CreatePostRequest))
  public createPost(
    @requestBody() body: CreatePostRequest,
    @request() req: IRequest
  ): Promise<PostDto> {
    return this.postService.createPost(req.session.userId, body);
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

  @httpPost("/:id/comment", isAuth, validation(CreateCommentRequest))
  public commentMapory(
    @requestParam("id") id: string,
    @requestBody() body: CreateCommentRequest,
    @request() req: IRequest
  ): Promise<CommentDto> {
    console.log("heyy");
    return this.postService.commentPost(id, body, req.session.userId);
  }

  @httpGet("/:id/comment", isAuth)
  public getMaporyComments(
    @requestParam("id") id: string,
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize: number
  ): Promise<CommentDto[]> {
    return this.postService.getPostComments(
      id,
      req.session.userId,
      pageNum || 1,
      Math.min(pageSize || 10, 10)
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
