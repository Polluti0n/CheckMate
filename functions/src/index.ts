import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {GoogleGenAI, GenerateContentResponse, Type} from "@google/genai";
import * as functions from "firebase-functions";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

const checkDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    payor: {
      type: Type.STRING,
      description: "The name of the person or entity who wrote the check. This is typically found in the upper-left corner.",
    },
    payorAddress: {
      description: "The address of the payor, often located below the payor's name.",
      type: Type.OBJECT,
      properties: {
        street: {
          type: Type.STRING,
          description: "The street address of the payor.",
        },
        city: {
          type: Type.STRING,
          description: "The city where the payor is located.",
        },
        state: {
          type: Type.STRING,
          description: "The state where the payor is located.",
        },
        zip: {
          type: Type.STRING,
          description: "The zip code where the payor is located.",
        },
      },
      required: ["street", "city", "state", "zip"],
    },
    payee: {
      type: Type.STRING,
      description: "The name of the person or entity the check is written to, found on the 'Pay to the Order of' line.",
    },
    amount: {
      type: Type.NUMBER,
      description: "The numerical amount of the check, usually in the box on the right side.",
    },
    amountInWords: {
      type: Type.STRING,
      description: "The legal line of the check, where the amount is written out in words.",
    },
    date: {
      type: Type.STRING,
      description: "The date the check was written, in YYYY-MM-DD format.",
    },
    checkNumber: {
      type: Type.STRING,
      description: "The unique number for the check, usually found in the top-right corner and in the MICR line at the bottom.",
    },
    memo: {
      type: Type.STRING,
      description: "The text on the memo or 'For' line of the check.",
    },
    bankName: {
      type: Type.STRING,
      description: "The name of the bank on which the check is drawn.",
    },
    routingNumber: {
      type: Type.STRING,
      description: "The bank's ABA routing number, found at the bottom of the check in the MICR line.",
    },
    bankAccountNumber: {
      type: Type.STRING,
      description: "The payor's bank account number, also located in the MICR line at the bottom of the check.",
    },
    signature: {
      type: Type.BOOLEAN,
      description: "Indicates whether a signature is present on the signature line.",
    },
    fractionalRoutingNumber: {
        type: Type.STRING,
        description: "The bank's ABA routing number in a fractional format, sometimes located in the upper right of the check.",
    }
  },
  required: ["payor", "payorAddress", "payee", "amount", "amountInWords", "date", "checkNumber", "bankName", "routingNumber", "bankAccountNumber", "signature"],
};

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


export const extractCheckInfo = onCall({secrets: ["GEMINI_KEY"]}, async (request) => {
  // 1. Authentication Check
  console.log(request.data)
  if (!request.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const genAI = initializeAiClient();

  const {base64Image, mimeType} = request.data;

  if (!base64Image || !mimeType) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'base64Image' and 'mimeType'.",
    );
  }

  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: "Extract check details: payor, payor address, payee, amount, date, " +
            "check number,  amount in words, bank name, routing " +
            "number,  bank account number, signature, and memo. Always provide output in JSON format.",
    };

    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{parts: [imagePart, textPart]}],
      config: {
        responseMimeType: "application/json",
        responseSchema: checkDetailsSchema
      },
    });
    console.log("Gemini response:", JSON.stringify(response, null, 2));

    // Correctly access the JSON string from the Gemini response
    const jsonString = response?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(response?.candidates?.[0]?.content?.parts?.[0]?.functionCall?.args || {});

    if (!jsonString) {
      throw new functions.https.HttpsError(
          "internal",
          "The AI model returned an empty or invalid response. Please try again.",
          `The response contained: ${response?.toString() || "nothing"}. Full response: ${JSON.stringify(response, null, 2)}`,
      );
    }

    const parsedJson = JSON.parse(jsonString);
    return parsedJson;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Failed to extract information from the check image.",
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
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
        return [];
    }
    return usersSnapshot.docs
        .map((doc) => doc.id)
        .filter((uid) => uid !== actorUid);
};


const getActor = (docData: admin.firestore.DocumentData | undefined): { uid: string, name: string } | null => {
    if (!docData || !Array.isArray(docData.auditTrail) || docData.auditTrail.length === 0) {
        console.log("No actor UID found in audit trail. Cannot send notifications.");
        return null;
    }
    const lastLog = docData.auditTrail[docData.auditTrail.length - 1];
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

  const newCheck = snap.data();
  const userIds = await getUsersToNotify(actor.uid);
  const batch = db.batch();
  const message = `${actor.name} added a new check for ${newCheck.payor}.`;

  userIds.forEach((userId: string) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
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

  const userIds = await getUsersToNotify(actor.uid);
  let message = "";

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

  if (!message) {
    return null; // No relevant change detected for notification
  }

  const batch = db.batch();
  userIds.forEach((userId) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
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

  const userIds = await getUsersToNotify(actorUid);
  const batch = db.batch();
  const message = `${actorName} processed a new batch with tracking #: ${batchData.trackingNumber}.`;

  userIds.forEach((userId) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId,
      message,
      link: "/batch-history",
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return batch.commit();
});