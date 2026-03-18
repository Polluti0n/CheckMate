// @ts-nocheck
import Tesseract from 'tesseract.js';
import MICRScanner from './MICRScanner.js';

const onOpenCvReady = (): Promise<void> => {
    return new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                clearInterval(intervalId);
                resolve();
            }
        }, 100);
    });
};

const orderPoints = (pts: { x: number, y: number }[]) => {
    // This function orders points in [tl, tr, br, bl] order.
    // It's more robust than simple x/y sorting.
    const rect = new Array(4).fill(null);

    // The top-left point has the smallest sum (x+y)
    // The bottom-right point has the largest sum (x+y)
    const sum = pts.map(p => p.x + p.y);
    rect[0] = pts[sum.indexOf(Math.min(...sum))];
    rect[2] = pts[sum.indexOf(Math.max(...sum))];

    // The top-right point has the smallest difference (y-x)
    // The bottom-left point has the largest difference (y-x)
    const diff = pts.map(p => p.y - p.x);
    rect[1] = pts[diff.indexOf(Math.min(...diff))];
    rect[3] = pts[diff.indexOf(Math.max(...diff))];

    return rect;
};

const scanConfigs = [
    // 1. Strict & fast, based on user example. Good for clear images.
    { name: 'Strict', blur: 5, blockSize: 21, C: 10, morph: 5, aspectRatio: [1.8, 2.8], minArea: 0.15 },
    // 2. Handles hard shadows by using a smaller, more local threshold area.
    { name: 'Hard Shadow', blur: 5, blockSize: 11, C: 10, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.15 },
    // 3. More tolerant of skewed checks that might not have a standard aspect ratio.
    { name: 'Relaxed Aspect', blur: 5, blockSize: 21, C: 10, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.15 },
    // 4. For "washed out" or over-exposed images where edges are faint.
    { name: 'Washed Out', blur: 5, blockSize: 31, C: 5, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.10 },
    { name: 'Low Contrast', blur: 5, blockSize: 31, C: 15, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.10 },
    // 4. More blur to handle noisy images.
    { name: 'Noisy Image', blur: 7, blockSize: 21, C: 10, morph: 7, aspectRatio: [1.5, 3.5], minArea: 0.10 },
    // 5. Last resort, very loose criteria.
    { name: 'Very Relaxed', blur: 5, blockSize: 31, C: 2, morph: 5, aspectRatio: [1.0, 4.0], minArea: 0.08 },
];

const PROCESSING_WIDTH = 1200; // Use a 1200px image for finding contours
const FINAL_WIDTH = 800;

/**
 * Parses the output from the MICRScanner to find routing and account numbers.
 * @param {string[]} micrStrings - An array of strings detected from the MICR line.
 * @returns {{ routingNumber?: string, bankAccountNumber?: string }}
 */
const parseMICRStrings = (micrStrings: string[]) => {
    const micrData = {
        routingNumber: undefined, // Initialize as undefined
        bankAccountNumber: undefined, // Initialize as undefined
    };

    if (!micrStrings || micrStrings.length === 0) {
        return micrData;
    }

    const transitSymbol = 'T';
    const onUsSymbol = 'U';
    const amountSymbol = 'A';
    const dashSymbol = 'D';

    // Routing number is typically enclosed by 'T' symbols.
    const strings = micrStrings.map(s => s.replace(/\s+/g, '').toUpperCase()); // Remove all whitespace and convert to uppercase for easier parsing
    const routingString = strings.find(s => s.startsWith(transitSymbol) && s.endsWith(transitSymbol));

    if (routingString) {
        micrData.routingNumber = routingString.slice(1, -1).trim();
        // Remove 'T' symbols from the routing number if found
        micrData.routingNumber = micrData.routingNumber.replace(new RegExp(transitSymbol, 'g'), '');
    } else { micrData.routingNumber = undefined; }
    const accountString = strings.find(s => s.includes('U'));
    if (accountString) {
        micrData.bankAccountNumber = accountString.trim();
        // Remove 'U' and 'T' symbols from the account number if found 
        micrData.bankAccountNumber = micrData.bankAccountNumber.replace(new RegExp(onUsSymbol, 'g'), '').replace(new RegExp(transitSymbol, 'g'), '');
    } else { micrData.bankAccountNumber = undefined; }
    return micrData;
};

/**
 * Standardizes a cropped image Mat to a fixed width, landscape, grayscale format using OCR for orientation.
 * @param {cv.Mat} src - The source image Mat.
 * @returns {Promise<cv.Mat>} - A promise that resolves to the standardized Mat.
 */
async function standardizeOutputImage(src) {
    const cv = window.cv;
    let standardized = src.clone();
    let rotated = null;
    let resized = new cv.Mat();

    try {
        // --- Pre-resize for Orientation Detection ---
        // Tesseract works more reliably and faster on a standardized image size.
        // We create a temporary resized version for Tesseract to analyze.
        const preliminaryAspectRatio = src.rows / src.cols;
        const preliminaryHeight = Math.round(FINAL_WIDTH * preliminaryAspectRatio);
        const dsizePreliminary = new cv.Size(FINAL_WIDTH, preliminaryHeight);
        cv.resize(src, resized, dsizePreliminary, 0, 0, cv.INTER_AREA);

        let rotationAngle = null;
        try {
            const tempCanvas = document.createElement('canvas');
            cv.imshow(tempCanvas, resized);
            const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);

            const worker = await Tesseract.createWorker(
                'eng',
                Tesseract.OEM.TESSERACT_ONLY
            );

            const { data: { orientation_degrees, orientation_confidence } } = await worker.detect(dataUrl);
            await worker.terminate();

            // We only trust Tesseract if confidence is reasonably high
            if (orientation_confidence > 1) {
                switch (orientation_degrees) {
                    case 90:
                        rotationAngle = 2; // cv.ROTATE_90_COUNTER_CLOCKWISE
                        break;
                    case 180:
                        rotationAngle = 1; // cv.ROTATE_180
                        break;
                    case 270:
                        rotationAngle = 0; // cv.ROTATE_90_CLOCKWISE
                        break;
                    default:
                        rotationAngle = null; // No rotation needed
                }
            }
        } catch (err) {
            console.error("Tesseract orientation detection failed, falling back to dimension check.", err);
            if (!resized.isDeleted()) resized.delete(); // Ensure cleanup on error
        }

        // --- Apply rotation ---
        if (rotationAngle !== null) {
            rotated = new cv.Mat();
            cv.rotate(src, rotated, rotationAngle); // Rotate the original high-res `src`
            standardized = rotated; // `standardized` now points to the high-res rotated image
        } else if (src.rows > src.cols) {
            // Fallback to simple dimension check
            rotated = new cv.Mat();
            cv.rotate(src, rotated, 2); // cv.ROTATE_90_COUNTER_CLOCKWISE on the original `src`
            standardized = rotated;
        } else {
            // No rotation needed, just use the original src
            standardized = src.clone();
        }

        // --- Final Resize to fixed width ---
        // Now that orientation is correct, we resize the high-quality (and potentially rotated)
        // image to its final dimensions for the API.
        const finalAspectRatio = standardized.rows / standardized.cols; // standardized can be deleted here if not cloned
        const finalHeight = Math.round(FINAL_WIDTH * finalAspectRatio);
        const finalDsize = new cv.Size(FINAL_WIDTH, finalHeight);
        cv.resize(standardized, resized, finalDsize, 0, 0, cv.INTER_AREA);
        const standardizedMat = resized.clone();

        // --- MICR Scanning ---
        const scanner = new MICRScanner(cv);
        const micrStrings = scanner.scanImage(standardizedMat);
        const micrData = parseMICRStrings(micrStrings);

        return { standardizedMat, micrData };

    } catch (e) {
        // Clean up in case of error
        if (standardized) standardized.delete();
        if (rotated) rotated.delete();
        if (resized) resized.delete();
        throw e;
    } finally {
        if (resized && !resized.isDeleted()) resized.delete();
    }
}


/**
 * Tries to find the largest rectangular contour and transforms it.
 * @param {cv.Mat} processingSrc - The ~1200px image Mat for finding contours.
 * @param {cv.Mat} originalSrc - The full-resolution image Mat for the final crop.
 * @param {object} config - The configuration object for this attempt.
 * @returns {cv.Mat|null} - The transformed Mat, or null.
 */
function findAndTransformContour(processingSrc, config, originalSrc) {
    const cv = window.cv;
    let gray, blurred, thresh, closed, contours, hierarchy;
    let bestContourApprox = null;
    let maxArea = 0;

    try {
        gray = new cv.Mat();
        blurred = new cv.Mat();
        thresh = new cv.Mat();
        closed = new cv.Mat();
        contours = new cv.MatVector();
        hierarchy = new cv.Mat();

        cv.cvtColor(processingSrc, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, new cv.Size(config.blur, config.blur), 0);
        cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, config.blockSize, config.C);

        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(config.morph, config.morph));
        cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel);
        kernel.delete();

        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const minContourArea = (processingSrc.rows * processingSrc.cols) * config.minArea;

        for (let i = 0; i < contours.size(); ++i) {
            const cnt = contours.get(i);
            const area = cv.contourArea(cnt);
            if (area < minContourArea) {
                cnt.delete();
                continue;
            }

            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

            if (approx.rows === 4) {
                const rect = cv.boundingRect(cnt);
                const aspectRatio = Math.max(rect.width, rect.height) / Math.min(rect.width, rect.height);
                if (aspectRatio >= config.aspectRatio[0] && aspectRatio <= config.aspectRatio[1]) {
                    if (area > maxArea) {
                        if (bestContourApprox) bestContourApprox.delete();
                        maxArea = area;
                        bestContourApprox = approx.clone();
                    }
                }
            }
            approx.delete();
            cnt.delete();
        }

        if (bestContourApprox) {
            const points = [];
            for (let i = 0; i < bestContourApprox.rows; i++) {
                // Scale points from the processing image to the original full-res image
                const scaleX = originalSrc.cols / processingSrc.cols;
                const scaleY = originalSrc.rows / processingSrc.rows;
                points.push({
                    x: bestContourApprox.data32S[i * 2] * scaleX,
                    y: bestContourApprox.data32S[i * 2 + 1] * scaleY
                });
            }
            const orderedPoints = orderPoints(points);
            const [tl, tr, br, bl] = orderedPoints;

            const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
            const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
            const maxWidth = Math.max(widthA, widthB);

            const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
            const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
            const maxHeight = Math.max(heightA, heightB);

            const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
            const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);

            const M = cv.getPerspectiveTransform(srcTri, dstTri);
            const resultMat = new cv.Mat();
            cv.warpPerspective(originalSrc, resultMat, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

            srcTri.delete();
            dstTri.delete();
            M.delete();

            return resultMat;
        }
        return null;
    } finally {
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (thresh) thresh.delete();
        if (closed) closed.delete();
        if (contours) contours.delete();
        if (hierarchy) hierarchy.delete();
        if (bestContourApprox) bestContourApprox.delete();
    }
}

export const processCheckImage = async (originalDataUrl: string, resizedDataUrl: string): Promise<{ dataUrl: string, micrData: any } | null> => {
    await onOpenCvReady();
    const cv = window.cv;

    const [originalImg, resizedImg] = await Promise.all([
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Original image could not be loaded."));
            image.src = originalDataUrl;
        }),
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Resized image could not be loaded."));
            image.src = resizedDataUrl;
        }),
    ]);

    let originalSrc, resizedSrc, resultMat, standardizedMat, micrData;
    try {
        originalSrc = cv.imread(originalImg);
        resizedSrc = cv.imread(resizedImg);
        if (originalSrc.empty() || resizedSrc.empty()) {
            throw new Error("Failed to load image into OpenCV Mat.");
        }

        for (const config of scanConfigs) {
            resultMat = findAndTransformContour(resizedSrc, config, originalSrc);

            if (resultMat) {
                const { standardizedMat: finalMat, micrData: finalMicrData } = await standardizeOutputImage(resultMat);
                standardizedMat = finalMat;
                micrData = finalMicrData;

                const resultCanvas = document.createElement('canvas');
                cv.imshow(resultCanvas, standardizedMat);

                const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
                const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
                const bytes = base64Length * 0.75;
                return { dataUrl, micrData };
            }
        }

        console.warn("All contour detection attempts failed.");
        return null;

    } catch (e) {
        console.error("OpenCV processing failed:", e);
        return null;
    } finally {
        if (originalSrc) originalSrc.delete();
        if (resizedSrc) resizedSrc.delete();
        if (resultMat && !resultMat.isDeleted()) resultMat.delete();
        if (standardizedMat) standardizedMat.delete();
    }
};

export const transformImageWithPoints = async (imageUrl: string, points: { x: number, y: number }[]): Promise<{ dataUrl: string; micrData: any } | null> => {
    await onOpenCvReady();
    const cv = window.cv;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image could not be loaded for processing."));
        image.src = imageUrl;
    });

    let src, resultMat, standardizedMat, micrData;
    try {
        src = cv.imread(img);
        if (src.empty()) {
            throw new Error("Failed to load image into OpenCV Mat.");
        }

        const orderedPoints = orderPoints(points);
        const [tl, tr, br, bl] = orderedPoints;

        const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
        const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const maxWidth = Math.max(widthA, widthB);

        const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
        const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
        const maxHeight = Math.max(heightA, heightB);

        const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
        const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, maxWidth, 0, maxWidth, maxHeight, 0, maxHeight]);

        const M = cv.getPerspectiveTransform(srcTri, dstTri);
        resultMat = new cv.Mat();
        cv.warpPerspective(src, resultMat, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        srcTri.delete();
        dstTri.delete();
        M.delete();

        // Clone resultMat before passing to prevent premature deletion in the finally block
        const { standardizedMat: finalMat, micrData: finalMicrData } = await standardizeOutputImage(resultMat.clone());
        standardizedMat = finalMat;

        const resultCanvas = document.createElement('canvas');
        cv.imshow(resultCanvas, standardizedMat);
        const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
        return { dataUrl, micrData: finalMicrData };

    } catch (e) {
        console.error("Manual crop processing failed:", e);
        throw e; // Re-throw to be caught by the caller in AddCheckWizard.tsx
    } finally {
        if (src) src.delete();
        if (resultMat) resultMat.delete();
        if (standardizedMat) standardizedMat.delete();
    }
};

export const cropImageToSquare = (
    imageSrc: string,
    crop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
    const FINAL_DIMENSION = 256;
    const IMAGE_QUALITY = 0.90;

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = FINAL_DIMENSION;
            canvas.height = FINAL_DIMENSION;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            ctx.drawImage(
                image,
                crop.x,
                crop.y,
                crop.width,
                crop.height,
                0,
                0,
                FINAL_DIMENSION,
                FINAL_DIMENSION
            );

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas to Blob conversion failed'));
                    }
                    resolve(blob);
                },
                'image/jpeg',
                IMAGE_QUALITY
            );
        };
        image.onerror = (error) => reject(error);
    });
};
