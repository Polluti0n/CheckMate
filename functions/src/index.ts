import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {GoogleGenAI, GenerateContentResponse, Type} from "@google/genai";
import * as functions from "firebase-functions";

admin.initializeApp();

const checkDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    payor: {
      type: Type.STRING,
      description: "The name of the person or entity who wrote the check.",
    },
    payee: {
      type: Type.STRING,
      description: "The name of the person or entity the check is written to.",
    },
    amount: {
      type: Type.NUMBER,
      description: "The numerical amount of the check, without currency symbols.",
    },
    date: {
      type: Type.STRING,
      description: "The date on the check in YYYY-MM-DD format.",
    },
    checkNumber: {
      type: Type.STRING,
      description: "The check number, usually in the top right corner.",
    },
    memo: {
      type: Type.STRING,
      description: "The text on the memo line of the check.",
    },
  },
  required: ["payor", "payee", "amount", "date", "checkNumber"],
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
      text: "Extract check details: payor, payee, amount, date, " +
            "check number, and memo. Provide output in JSON format.",
    };

    const response: GenerateContentResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {parts: [imagePart, textPart]},
      config: {
        responseMimeType: "application/json",
        responseSchema: checkDetailsSchema,
      },
    });

    const jsonString = response.text;

    if (!jsonString) {
      throw new functions.https.HttpsError(
          "internal",
          "The AI model returned an empty response. Please try again.",
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
