export const __prod__ = process.env.NODE_ENV === "production";
export const __dev__ = process.env.NODE_ENV === "development";

export const REFRESH_TOKEN_COOKIE_NAME = "qid";
export const ACCESS_TOKEN_LIFESPAN = "5m";

export const FORGOT_PASSWORD_LINK_EXPIRY_HOURS = 3;
export const FORGOT_PASSWORD_LINK_EXPIRY_MS =
  1000 * 60 * 60 * 24 * FORGOT_PASSWORD_LINK_EXPIRY_HOURS;

export const AUTH_ERROR = "Auth error";
export const USER_UNVERIFIED_ERROR = "Unverified error";

export const PUBLIC_DIR = "public"; // where finished files are stored (compression etc.)
export const UPLOADS_DIR = "uploads"; // where files for processing are first uploaded

export const PROFILE_PIC_PUBLIC_DIR = `${PUBLIC_DIR}/profile-pictures`;
export const PROFILE_PIC_UPLOADS_DIR = `${UPLOADS_DIR}/profile-pictures`;

export const POSTS_PIC_PUBLIC_DIR = `${PUBLIC_DIR}/post-pictures`;
