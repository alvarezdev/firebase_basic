import type {
  CallableOptions,
  HttpsOptions,
} from "firebase-functions/v2/https";

export const allowedCorsOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  "https://guarderia-dev.web.app",
  "https://guarderia-dev.firebaseapp.com",
];

export const httpsOptions: HttpsOptions = {
  cors: allowedCorsOrigins,
};

export const callableOptions: CallableOptions = {
  cors: allowedCorsOrigins,
  enforceAppCheck: true,
};
