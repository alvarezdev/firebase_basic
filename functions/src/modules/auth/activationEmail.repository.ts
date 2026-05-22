import {FieldValue} from "firebase-admin/firestore";
import {db} from "../../config/firebase";

export type ActivationEmailData = {
  email: string;
  activationCode: string;
  expiresAt: string;
};

const mailCollection = db.collection("mail");

/**
 * Queue an activation email using the Firebase Trigger Email extension format.
 *
 * @param {ActivationEmailData} data Activation email payload.
 * @return {Promise<string>} Queued email document ID.
 */
export async function queueActivationEmail(
  data: ActivationEmailData
): Promise<string> {
  const activationUrl =
    `https://guarderia-dev.web.app/register-admin?activationCode=${
      encodeURIComponent(data.activationCode)
    }`;
  const docRef = await mailCollection.add({
    to: [data.email],
    message: {
      subject: "Codigo de activacion de Guarderia",
      text: [
        "Hola.",
        "",
        "Gracias por activar tu suscripcion.",
        `Tu codigo de activacion es: ${data.activationCode}`,
        `Vence en: ${data.expiresAt}`,
        "",
        `Tambien puedes registrarte desde este enlace: ${activationUrl}`,
      ].join("\n"),
      html: [
        "<p>Hola.</p>",
        "<p>Gracias por activar tu suscripcion.</p>",
        `<p>Tu codigo de activacion es: <strong>${
          data.activationCode
        }</strong></p>`,
        `<p>Vence en: ${data.expiresAt}</p>`,
        `<p><a href="${activationUrl}">Registrar admin</a></p>`,
      ].join(""),
    },
    createdAt: FieldValue.serverTimestamp(),
    type: "activation_code",
  });

  return docRef.id;
}
