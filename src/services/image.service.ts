import { injectable } from "inversify";
import axios from "axios";
import fs from "fs";
import { ImageUploadError } from "../errors/imageUpload.error";
import { logger } from "../utils/logger";
import { v4 } from "uuid";
import path from "path";
import {
  PROFILE_PIC_UPLOADS_DIR,
  PROFILE_PIC_PUBLIC_DIR,
  POSTS_PIC_PUBLIC_DIR,
} from "../config/constants";
import "multer";

@injectable()
export class ImageService {
  public async downloadAndCompressProfileImage(url: string): Promise<string> {
    const fileName = `${v4()}_${path.basename(url)}`;
    const uploadPath = path.join(PROFILE_PIC_UPLOADS_DIR, fileName);
    const publicDir = PROFILE_PIC_PUBLIC_DIR;
    await this.downloadAndCompressImage(url, uploadPath, publicDir);
    return path.join(PROFILE_PIC_PUBLIC_DIR, fileName);
  }

  private async downloadAndCompressImage(
    url: string,
    uploadPath: string,
    _: string
  ) {
    await this.downloadImageFromUrl(url, uploadPath);
    // await this.compressImage(uploadPath, publicDir);
  }

  private async downloadImageFromUrl(
    url: string,
    uploadPath: string
  ): Promise<void> {
    const writer = fs.createWriteStream(uploadPath);

    let response: any = null;

    try {
      response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });
    } catch (e) {
      logger.error("Image download error");
      logger.error(e);
      throw ImageUploadError.DOWNLOAD_ERROR;
    }

    try {
      await new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    } catch (e) {
      logger.error("Image write error");
      logger.error(e);
      throw ImageUploadError.WRITE_ERROR;
    }
  }

  // private async compressImage(sourcePath: string, destDir: string) {
  //   const result = await compress({
  //     source: sourcePath,
  //     destination: destDir + "/",
  //     enginesSetup: {
  //       jpg: { engine: "mozjpeg", command: ["-quality", "60"] },
  //       png: { engine: "pngquant", command: ["--quality=20-50", "-o"] },
  //     },
  //   });

  //   const { statistics, errors } = result;

  //   logger.info("Upload statistics");
  //   logger.info(statistics);

  //   if (errors.length > 0) {
  //     logger.error("Image compress error");
  //     logger.error(result.errors);
  //     throw ImageUploadError.COMPRESS_ERROR;
  //   }
  // }

  public async uploadAndCompressProfileImage(
    pictureData: Express.Multer.File
  ): Promise<string> {
    const fileName = `${v4()}_${pictureData.originalname}`;
    const uploadPath = path.join(PROFILE_PIC_UPLOADS_DIR, fileName);
    const publicDir = PROFILE_PIC_PUBLIC_DIR;
    await this.uploadAndCompressImage(pictureData, uploadPath, publicDir);
    return path.join(PROFILE_PIC_PUBLIC_DIR, fileName);
  }

  private async uploadAndCompressImage(
    pictureData: Express.Multer.File,
    uploadPath: string,
    _: string
  ) {
    this.uploadImage(pictureData, uploadPath);
    // await this.compressImage(uploadPath, publicDir);
  }

  private uploadImage(pictureData: Express.Multer.File, uploadPath: string) {
    try {
      fs.writeFileSync(path.join(uploadPath), pictureData.buffer);
    } catch (e) {
      logger.error("Image write error");
      logger.error(e);
      throw ImageUploadError.WRITE_ERROR;
    }
  }

  public async uploadPostImages(
    pictures: Express.Multer.File[]
  ): Promise<string[]> {
    const paths: string[] = [];
    for (let p of pictures) {
      const path = await this.uploadPostImage(p);
      paths.push(path);
    }

    return paths;
  }

  private async uploadPostImage(
    pictureData: Express.Multer.File
  ): Promise<string> {
    const fileName = `${v4()}_${pictureData.originalname}`;
    const uploadPath = path.join(POSTS_PIC_PUBLIC_DIR, fileName);
    await this.uploadImage(pictureData, uploadPath);
    return uploadPath;
  }
}
