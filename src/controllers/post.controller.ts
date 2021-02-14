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
  httpDelete,
  httpGet,
  httpPatch,
  httpPost,
  interfaces,
  queryParam,
  request,
  requestBody,
  requestParam,
  response,
} from "inversify-express-utils";
import TYPES from "../config/types";
import { PaginatedResponse } from "../dto/PaginatedResponse";
import { MaporyMapItemDto } from "../dto/post/maporyMapItem.dto";
import { PostDto } from "../dto/post/post.dto";
import { isAuth, validation } from "../middlewares";
import { PostService } from "../services/post.service";
import { IRequest } from "../types/api";
import multer from "multer";

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

const upload = multer({ storage: multer.memoryStorage() });

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
      req.userId,
      req.userId,
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
      req.userId,
      pageNum,
      pageSize,
      postType
    );
  }

  @httpGet("/feed", isAuth)
  public getFeed(
    @request() req: IRequest,
    @queryParam("pageNum") pageNum: number,
    @queryParam("pageSize") pageSize?: number
  ): Promise<PaginatedResponse<PostDto>> {
    return this.postService.getFeedForUser(req.userId, pageNum, pageSize);
  }

  @httpGet("/my-mapories-feed", isAuth)
  public getFeedMapData(@request() req: IRequest): Promise<MaporyMapItemDto[]> {
    return this.postService.getFeedMapData(req.userId);
  }

  @httpGet("/my-mapories", isAuth)
  public getMyMapData(@request() req: IRequest): Promise<MaporyMapItemDto[]> {
    return this.postService.getMapDataForUser(req.userId, req.userId);
  }

  @httpGet("/my-mapories/:userId", isAuth)
  public getUsersMapData(
    @request() req: IRequest,
    @requestParam("userId") userId: string
  ): Promise<MaporyMapItemDto[]> {
    return this.postService.getMapDataForUser(userId, req.userId);
  }

  @httpGet("/:id", isAuth)
  public async getPost(
    @requestParam("id") id: string,
    @response() res: Response,
    @request() req: IRequest
  ): Promise<PostDto> {
    const post = await this.postService.getPost(id, req.userId);
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
    return this.postService.createPost(req.userId, body);
  }

  @httpPatch("/update-pictures/:id", isAuth, upload.array("pictures"))
  public async updatePicturesForPost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<{ images: string[] }> {
    let deletedPictures: string[] = [];
    if (req.body?.deletedPictures) {
      const parsedDeletedPictures = JSON.parse(req.body.deletedPictures);
      if (parsedDeletedPictures) {
        deletedPictures = parsedDeletedPictures as string[];
        deletedPictures = deletedPictures.map((p) =>
          p.replace(process.env.PICTURES_BASE_URL + "/", "")
        );
      }
    }

    const images = await this.postService.updatePostPictures(
      id,
      req.files as Express.Multer.File[],
      deletedPictures
    );

    return { images };
  }

  @httpPatch("/:id", isAuth, validation(CreateOrUpdatePostRequest))
  public async updatePost(
    @requestParam("id") id: string,
    @requestBody() body: CreateOrUpdatePostRequest,
    @request() req: IRequest
  ): Promise<PostDto | null> {
    await this.postService.updatePost(id, req.userId, body);
    return this.postService.getPost(id, req.userId);
  }

  @httpDelete("/:id", isAuth)
  public deletePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<void> {
    return this.postService.deletePost(id, req.userId);
  }

  @httpPost("/like/:id", isAuth)
  public async likePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<{ success: boolean }> {
    await this.postService.likePost(id, req.userId);
    return { success: true };
  }

  @httpPost("/unlike/:id", isAuth)
  public async unlikePost(
    @requestParam("id") id: string,
    @request() req: IRequest
  ): Promise<{ success: boolean }> {
    await this.postService.unlikePost(id, req.userId);
    return { success: true };
  }
}
