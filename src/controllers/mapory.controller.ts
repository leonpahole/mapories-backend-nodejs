import {
  controller,
  httpGet,
  httpPost,
  interfaces,
  requestParam,
  requestBody,
  response,
  request,
} from "inversify-express-utils";
import { inject } from "inversify";
import TYPES from "../config/types";
import { IsDate, Min, Max, IsOptional, IsDefined } from "class-validator";
import { validation, isAuth } from "../middlewares";
import { Type } from "class-transformer";
import { Response } from "express";
import { MaporyService } from "../services/mapory.service";
import { IRequest } from "../types/api";
import { MaporyExcerptDto } from "../dto/mapory/maporyExcerpt.dto";
import { MaporyDto } from "../dto/mapory/mapory.dto";

export class CreateMaporyRequest {
  @IsDefined()
  public name!: string;

  @IsOptional()
  public description?: string;

  @IsOptional()
  public rating?: number;

  @Max(90)
  @Min(-90)
  @IsDefined()
  public latitude!: number;

  @Max(180)
  @Min(-180)
  @IsDefined()
  public longitude!: number;

  @IsDefined()
  public placeName!: string;

  @IsDate()
  @Type(() => Date)
  @IsDefined()
  public visitDate!: Date;
}

@controller("/mapory")
export class MaporyController implements interfaces.Controller {
  constructor(
    @inject(TYPES.MaporyService) private maporyService: MaporyService
  ) {}

  @httpGet("/my", isAuth)
  public getMyMapories(@request() req: IRequest): Promise<MaporyExcerptDto[]> {
    return this.maporyService.getMaporiesForUser(req.session.userId);
  }

  @httpGet("/my/:userId", isAuth)
  public getUsersMapories(
    @requestParam("userId") userId: string
  ): Promise<MaporyExcerptDto[]> {
    return this.maporyService.getMaporiesForUser(userId);
  }

  @httpGet("/:id", isAuth)
  public async getLog(
    @requestParam("id") id: string,
    @response() res: Response
  ): Promise<MaporyDto> {
    const mapory = await this.maporyService.getMapory(id);
    if (!mapory) {
      res.statusCode = 404;
      throw new Error("Not found");
    }

    return mapory;
  }

  @httpPost("/", validation(CreateMaporyRequest))
  public newLog(
    @requestBody() body: CreateMaporyRequest,
    @request() req: IRequest
  ): Promise<MaporyExcerptDto> {
    return this.maporyService.createMapory(req.session.userId, body);
  }
}
