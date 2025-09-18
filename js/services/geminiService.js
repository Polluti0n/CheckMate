import { extractCheckInfoFn } from "./firebase";
export const extractCheckInfoFromImage = async (base64Image, mimeType) => {
    try {
        const result = await extractCheckInfoFn({ base64Image, mimeType });
        // The callable function returns a result object with a 'data' property
        return result.data;
    }
    catch (error) {
        console.error("Error calling Firebase Function 'extractCheckInfo':", error);
        // The error from a callable function has a 'message' property
        const errorMessage = error.message || "Failed to extract information from the check image via the backend service. Please enter the details manually.";
        throw new Error(errorMessage);
    }
};
