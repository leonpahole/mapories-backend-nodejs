import { injectable } from "inversify";
import Mapory from "../db/models/mapory.model";
import { logger } from "../utils/logger";
import { MaporyExcerptDto } from "../dto/mapory/maporyExcerpt.dto";
import { CreateMaporyRequest } from "../controllers/mapory.controller";
import { MaporyDto } from "../dto/mapory/mapory.dto";

@injectable()
export class MaporyService {
  public async getMaporiesForUser(userId: string): Promise<MaporyExcerptDto[]> {
    const mapories = await Mapory.find({ user: userId }).exec();
    return MaporyExcerptDto.fromModels(mapories);
  }

  public async getMapory(id: string): Promise<MaporyDto | null> {
    try {
      const mapory = await Mapory.findOne({ _id: id }).populate("user").exec();
      return mapory ? MaporyDto.fromModel(mapory) : null;
    } catch (e) {
      logger.error(e);
      return null;
    }
  }

  public async createMapory(
    userId: string,
    data: CreateMaporyRequest
  ): Promise<MaporyExcerptDto> {
    const mapory = await Mapory.create({
      name: data.name,
      description: data.description,
      rating: data.rating,
      location: [[data.latitude, data.longitude]],
      visitDate: data.visitDate,
      placeName: data.placeName,
      user: userId,
    });

    return MaporyExcerptDto.fromModel(mapory);
  }
}
