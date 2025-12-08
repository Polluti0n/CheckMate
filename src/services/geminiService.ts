import { extractCheckInfoFn } from "./firebase";
import { Check } from "../types";

export const extractCheckInfoFromImage = async (base64Image: string, mimeType: string): Promise<Partial<Check>> => {
    try {
        const result = await extractCheckInfoFn({ base64Image, mimeType });
        // The callable function returns a result object with a 'data' property
        return result.data as Partial<Check>;
    } catch (error: any) {
        console.error("Error calling Firebase Function 'extractCheckInfo':", error);
        // The error from a callable function has a 'message' property
        const errorMessage = error.message || "Failed to extract information from the check image via the backend service. Please enter the details manually.";
        throw new Error(errorMessage);
    }
};
