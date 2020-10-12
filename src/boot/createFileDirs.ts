import fs from "fs";
import { logger } from "../utils/logger";
import { PROFILE_PIC_UPLOADS_DIR, PROFILE_PIC_PUBLIC_DIR } from "../constants";

export function createFileDirs() {
  createDir(PROFILE_PIC_UPLOADS_DIR);
  createDir(PROFILE_PIC_PUBLIC_DIR);
}

function createDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`${dir} created!`);
  } catch (e) {
    logger.error(e);
  }
}
