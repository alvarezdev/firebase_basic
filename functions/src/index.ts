import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";

// lógica compartida
async function doSomething() {
  return { message: "Hola 🚀" };
}

// onCall
export const fnCall = onCall(async (req) => {
  return await doSomething();
});

// onRequest
export const fnHttp = onRequest(async (req, res) => {
  const result = await doSomething();
  res.json(result);
});