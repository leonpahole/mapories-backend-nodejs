import * as admin from "firebase-admin";
import { logger } from "../utils/logger";

const firebaseJsonFileName = "mapories-firebase.json";
const serviceAccount = require(`../../firebase/${firebaseJsonFileName}`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

logger.info("Initialized Firebase");

export { admin };
