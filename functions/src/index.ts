import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {GoogleGenAI, HarmBlockThreshold, HarmCategory, Type} from "@google/genai";
import * as functions from "firebase-functions";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";


admin.initializeApp();
const db = admin.firestore();

// Lazily initialized client to prevent cold starts on subsequent invocations.
let ai: GoogleGenAI | undefined;

const initializeAiClient = () => {
    // This function is only called within the onCall handler,
    // where process.env is populated with secrets.
    if (!ai) {
        const API_KEY = process.env.GEMINI_KEY;
        if (!API_KEY) {
            console.error("GEMINI_KEY secret not found in environment variables.");
            throw new functions.https.HttpsError(
                "failed-precondition",
                "The Gemini API key is not configured for this project."
            );
        }
        ai = new GoogleGenAI({apiKey: API_KEY});
    }
    return ai;
};

const checkDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    payor: { type: Type.STRING },
    payorAddress: {
      type: Type.OBJECT,
      properties: {
        street: { type: Type.STRING },
        city: { type: Type.STRING },
        state: { type: Type.STRING },
        zip: { type: Type.STRING },
      },
      required: ["street", "city", "state", "zip"],
    },
    payee: { type: Type.STRING },
    amount: { type: Type.NUMBER },
    amountInWords: { type: Type.STRING },
    date: { type: Type.STRING },
    checkNumber: { type: Type.STRING },
    memo: { type: Type.STRING },
    bankName: { type: Type.STRING },
    routingNumber: { type: Type.STRING },
    bankAccountNumber: { type: Type.STRING },
    signature: { type: Type.BOOLEAN },
    additionalInfo: { type: Type.STRING },
  },
  required: [
    "payor",
    "payorAddress",
    "payee",
    "amount",
    "amountInWords",
    "date",
    "checkNumber",
    "bankName",
    "routingNumber",
    "bankAccountNumber",
    "signature",
  ],
};

export const extractCheckInfo = onCall({ secrets: ["GEMINI_KEY"] }, async (request) => {
  // Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { base64Image, mimeType } = request.data;

  if (!base64Image || !mimeType) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing 'base64Image' or 'mimeType'."
    );
  }

  const genAI = initializeAiClient();

  try {
    const cleanedBase64 = base64Image.replace(/^data:[^;]+;base64,/, "");
    const model = "gemini-2.5-flash";

    const contents = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: cleanedBase64,
              mimeType,
            },
          },
          {
            text: "Extract all available details from this financial check image and provide the data as a JSON object that strictly adheres to the provided schema. Ensure the date is in YYYY-MM-DD format and the amount is a number. If you encounter any errors, are not confident about the data for any field, or encounter any issues, very briefly describe them in the 'additionalInfo' field, otherwise leave the field empty. Respond only with the JSON object and no additional text.",
          },
        ],
      },
    ];

    const response = await genAI.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: checkDetailsSchema,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    const part = response?.candidates?.[0]?.content?.parts?.[0];
    const finishReason = response?.candidates?.[0]?.finishReason;
    let extractedData: any = null;

    // Handle retry for "OTHER" finish reason
    if (finishReason && finishReason !== "STOP") {
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.warn(`Retry attempt ${attempt} due to finishReason: ${finishReason}`);
        const retryResponse = await genAI.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: checkDetailsSchema,
          },
        });
        const retryPart = retryResponse?.candidates?.[0]?.content?.parts?.[0];
        const retryFinishReason = retryResponse?.candidates?.[0]?.finishReason;

        if (retryFinishReason === "STOP") {
          if (retryPart?.functionCall?.args) extractedData = retryPart.functionCall.args;
          else if (retryPart?.text)
            try {
              extractedData = JSON.parse(retryPart.text);
            } catch (e) {
              console.error("Failed to parse JSON from Gemini retry:", retryPart.text, e);
            }
          break;
        }

        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }

    // Parse main response if not already handled
    if (!extractedData) {
      if (part?.functionCall?.args) {
        extractedData = part.functionCall.args;
      } else if (part?.text) {
        try {
          extractedData = JSON.parse(part.text);
        } catch (e) {
          console.error("Failed to parse JSON from Gemini text response:", part.text, e);
        }
      }
    }

    if (!extractedData || Object.keys(extractedData).length === 0) {
      console.error("Gemini response missing structured data:", JSON.stringify(response, null, 2));
      throw new functions.https.HttpsError(
        "internal",
        "Gemini returned an empty or invalid structured response."
      );
    }

    return extractedData;
  } catch (error: any) {
    console.error("Gemini extraction failed:", error?.message, error?.stack);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to extract information from the check image: ${error?.message}`
    );
  }
});


// =================================================================================================
// NOTIFICATION CLOUD FUNCTIONS
// =================================================================================================

/**
 * Fetches all user UIDs from the 'users' collection except for the actor's UID.
 * @param {string} actorUid The UID of the user who initiated the action.
 * @return {Promise<string[]>} A list of user UIDs to be notified.
 */
const getUsersToNotify = async (actorUid: string): Promise<string[]> => {
    console.log(`[Cloud Function] getUsersToNotify called with actorUid: ${actorUid}`);
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
        return [];
    }
    return usersSnapshot.docs
        .map((doc) => doc.id)
        .filter((uid) => uid !== actorUid);
};


const getActor = (docData: admin.firestore.DocumentData | undefined): { uid: string, name: string } | null => {
    console.log("[Cloud Function] getActor called.");
    if (!docData || !Array.isArray(docData.auditTrail) || docData.auditTrail.length === 0) {
        console.log("No actor UID found in audit trail. Cannot send notifications.");
        return null;
    }
    const lastLog = docData.auditTrail[docData.auditTrail.length - 1];
    console.log("Last audit log entry:", lastLog);
    if (!lastLog.uid) {
        console.log("Audit log found, but is missing 'uid' field.", lastLog);
        return null;
    }
    return {uid: lastLog.uid, name: lastLog.user || "A user"};
};


export const onCheckCreate = onDocumentCreated("checks/{checkId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;

  const actor = getActor(snap.data());
  if (!actor) return null;

  // If the actor is the system-auto-archive, skip all notification logic.
  if (actor.uid === "system-auto-archive") {
    console.log(`[Cloud Function] System auto-archive action on check ${event.params.checkId}. Skipping notifications.`);
    return null;
  }

  const newCheck = snap.data();
  const userIds = await getUsersToNotify(actor.uid);
  const batch = db.batch();
  const message = `${actor.name} added a new check for ${newCheck.payor}.`;

  userIds.forEach((userId: string) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
      actorId: actor.uid,
      message,
      link: `/check/${event.params.checkId}`,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return batch.commit();
});


export const onCheckUpdate = onDocumentUpdated("checks/{checkId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return null;

  const actor = getActor(after);
  if (!actor) return null;

  // If the actor is the system-auto-archive, skip all notification logic.
  if (actor.uid === "system-auto-archive") {
    console.log(`[Cloud Function] System auto-archive action on check ${event.params.checkId}. Skipping notifications.`);
    return null;
  }

  // Check if the last audit log entry was a system action.
  const lastLog = after.auditTrail[after.auditTrail.length - 1];
  if (lastLog?.isSystemAction) {
    console.log(`System action on check ${event.params.checkId}. Skipping notifications.`);
    return null;
  }

  const userIds = await getUsersToNotify(actor.uid);
  let message = lastLog?.message || '';

  if (!message) {

  // 1. Check for status change
  if (before.status !== after.status) {
    message = `${actor.name} changed the status of check #${after.checkNumber || 'N/A'} from "${before.status}" to "${after.status}".`;
  }
  // 2. Check for new comment
  else if ((before.comments?.length ?? 0) < (after.comments?.length ?? 0)) {
    const newComment = after.comments[after.comments.length-1];
    message = `${actor.name} commented on check #${after.checkNumber || 'N/A'}: "${newComment.text.substring(0, 50)}..."`;
  }
  // 3. Check for flag changes
  else if ((before.flags?.length ?? 0) !== (after.flags?.length ?? 0)) {
    const added = (after.flags ?? []).filter((f: string) => !(before.flags ?? []).includes(f));
    const removed = (before.flags ?? []).filter((f: string) => !(after.flags ?? []).includes(f));
    if (added.length > 0) {
      message = `${actor.name} added a flag to check #${after.checkNumber || 'N/A'}.`;
    } else if (removed.length > 0) {
      message = `${actor.name} removed a flag from check #${after.checkNumber || 'N/A'}.`;
    }
  }
}

  if (!message) {
    return null; // No relevant change detected for notification
  }

  const batch = db.batch();
  userIds.forEach((userId) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
      actorId: actor.uid,
      message,
      link: `/check/${event.params.checkId}`,
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return batch.commit();
});


export const onBatchCreate = onDocumentCreated("batches/{batchId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;
  const batchData = snap.data();
  const actorUid = batchData.processedByUid;
  const actorName = batchData.processedByName || "A user";

  if (!actorUid) {
    console.log("No actor UID found in batch document. Cannot send notifications.");
    return null;
  }

  // If the actor is the system-auto-archive, skip all notification logic.
  if (actorUid === "system-auto-archive") {
    console.log(`[Cloud Function] System auto-archive action on batch ${event.params.batchId}. Skipping notifications.`);
    return null;
  }

  const userIds = await getUsersToNotify(actorUid);
  const batch = db.batch();
  const message = `${actorName} processed a new batch with tracking #: ${batchData.trackingNumber}.`;

  userIds.forEach((userId) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
      actorId: actorUid,
      message,
      link: "/batch-history",
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return batch.commit();
});