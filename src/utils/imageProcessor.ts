// @ts-nocheck

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

const orderPoints = (points: {x: number, y: number}[]) => {
    // order: [tl, tr, br, bl]
    points.sort((a, b) => a.y - b.y);
    const top = [points[0], points[1]].sort((a,b) => a.x - b.x);
    const bottom = [points[2], points[3]].sort((a,b) => a.x - b.x);
    return [...top, ...bottom.reverse()];
};


const scanConfigs = [
  // 1. Strict & fast, based on user example. Good for clear images.
  { name: 'Strict', blur: 5, blockSize: 21, C: 10, morph: 5, aspectRatio: [1.8, 2.8], minArea: 0.15 },
  // 2. Relaxed aspect ratio for skewed checks.
  { name: 'Relaxed Aspect', blur: 5, blockSize: 21, C: 10, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.15 },
  // 3. More aggressive thresholding for low-contrast images.
  { name: 'Low Contrast', blur: 5, blockSize: 31, C: 15, morph: 5, aspectRatio: [1.5, 3.5], minArea: 0.10 },
  // 4. More blur to handle noisy images.
  { name: 'Noisy Image', blur: 7, blockSize: 21, C: 10, morph: 7, aspectRatio: [1.5, 3.5], minArea: 0.10 },
  // 5. Last resort, very loose criteria.
  { name: 'Very Relaxed', blur: 3, blockSize: 41, C: 5, morph: 3, aspectRatio: [1.2, 4.0], minArea: 0.08 },
];

const MIN_IMAGE_SIZE_BYTES = 2048; // 2KB

/**
 * Tries to find the largest rectangular contour matching check-like properties
 * using a series of progressively relaxed configurations.
 * @param {cv.Mat} src - The source image Mat.
 * @param {object} config - The configuration object for this attempt.
 * @returns {cv.Mat|null} - The transformed Mat of the found check, or null.
 */
function findAndTransformContour(src, config) {
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

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, new cv.Size(config.blur, config.blur), 0);
        cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, config.blockSize, config.C);

        const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(config.morph, config.morph));
        cv.morphologyEx(thresh, closed, cv.MORPH_CLOSE, kernel);
        kernel.delete();

        cv.findContours(closed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        const minContourArea = (src.rows * src.cols) * config.minArea;

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
                points.push({ x: bestContourApprox.data32S[i * 2], y: bestContourApprox.data32S[i * 2 + 1] });
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
            cv.warpPerspective(src, resultMat, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
            
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

export const processCheckImage = async (imageUrl: string): Promise<string | null> => {
    await onOpenCvReady();
    const cv = window.cv;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let src;
            try {
                src = cv.imread(img);
                if (src.empty()) {
                    console.error("Failed to load image into OpenCV Mat.");
                    resolve(null);
                    return;
                }

                for (const config of scanConfigs) {
                    console.log(`Attempting contour detection with config: ${config.name}`);
                    const resultMat = findAndTransformContour(src, config);

                    if (resultMat) {
                        const resultCanvas = document.createElement('canvas');
                        cv.imshow(resultCanvas, resultMat);
                        resultMat.delete();

                        const dataUrl = resultCanvas.toDataURL('image/jpeg', 0.92);
                        
                        const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
                        const bytes = base64Length * 0.75;
                        
                        if (bytes > MIN_IMAGE_SIZE_BYTES) {
                            console.log(`Success with config "${config.name}". Image size: ${Math.round(bytes / 1024)}KB`);
                            src.delete();
                            resolve(dataUrl);
                            return;
                        } else {
                            console.log(`Config "${config.name}" found a contour, but result was too small (${Math.round(bytes)} bytes). Trying next config.`);
                        }
                    }
                }

                console.warn("All contour detection attempts failed.");
                src.delete();
                resolve(null);

            } catch (e) {
                console.error("OpenCV processing failed:", e);
                if (src) src.delete();
                resolve(null);
            }
        };
        img.onerror = () => {
            console.error("Image could not be loaded for processing.");
            resolve(null);
        };
        img.src = imageUrl;
    });
};
