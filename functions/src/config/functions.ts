import type {
  CallableOptions,
  HttpsOptions,
} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

export const functionsRegion = "southamerica-east1";

export const paymentWebhookSecret = defineSecret("PAYMENT_WEBHOOK_SECRET");

export const allowedCorsOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  "https://guarderia-dev.web.app",
  "https://guarderia-dev.firebaseapp.com",
];

export const httpsOptions: HttpsOptions = {
  cors: allowedCorsOrigins,
};

export const paymentWebhookHttpsOptions: HttpsOptions = {
  ...httpsOptions,
  secrets: [paymentWebhookSecret],
};

export const callableOptions: CallableOptions = {
  cors: allowedCorsOrigins,
  enforceAppCheck: true,
};

/**
 * Safely read the payment webhook secret when it is available at runtime.
 *
 * @return {string | undefined} Configured payment webhook secret.
 */
export function getPaymentWebhookSecret(): string | undefined {
  try {
    return paymentWebhookSecret.value();
  } catch {
    return undefined;
  }
}
