// @ts-nocheck
const onOpenCvReady = () => {
    return new Promise((resolve) => {
        const intervalId = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                clearInterval(intervalId);
                resolve();
            }
        }, 100);
    });
};
const orderPoints = (points) => {
    // order: [tl, tr, br, bl]
    points.sort((a, b) => a.y - b.y);
    const top = [points[0], points[1]].sort((a, b) => a.x - b.x);
    const bottom = [points[2], points[3]].sort((a, b) => a.x - b.x);
    return [...top, ...bottom.reverse()];
};
export const processCheckImage = async (imageUrl) => {
    await onOpenCvReady();
    const cv = window.cv;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const src = cv.imread(img);
                const gray = new cv.Mat();
                cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
                // Enhance contrast
                const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
                clahe.apply(gray, gray);
                const blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
                const edged = new cv.Mat();
                cv.Canny(blurred, edged, 75, 200);
                const contours = new cv.MatVector();
                const hierarchy = new cv.Mat();
                cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
                let bestContour = null;
                let maxArea = 0;
                for (let i = 0; i < contours.size(); ++i) {
                    const cnt = contours.get(i);
                    const area = cv.contourArea(cnt);
                    const peri = cv.arcLength(cnt, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
                    if (approx.rows === 4 && area > maxArea) {
                        const rect = cv.boundingRect(cnt);
                        const aspectRatio = rect.width / rect.height;
                        if (aspectRatio > 1.8 && aspectRatio < 2.8) { // Typical check aspect ratio
                            maxArea = area;
                            bestContour = approx.clone();
                        }
                    }
                    approx.delete();
                    cnt.delete();
                }
                let resultMat = new cv.Mat();
                if (bestContour) {
                    const points = [];
                    for (let i = 0; i < bestContour.rows; i++) {
                        points.push({ x: bestContour.data32S[i * 2], y: bestContour.data32S[i * 2 + 1] });
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
                    const dsize = new cv.Size(maxWidth, maxHeight);
                    cv.warpPerspective(src, resultMat, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
                    srcTri.delete();
                    dstTri.delete();
                    M.delete();
                    bestContour.delete();
                }
                else {
                    // Fallback to using the original image if no contour found
                    src.copyTo(resultMat);
                }
                // Resize to max width 800px
                const MAX_WIDTH = 800;
                const w = resultMat.cols;
                const h = resultMat.rows;
                if (w > MAX_WIDTH) {
                    const ratio = MAX_WIDTH / w;
                    const newSize = new cv.Size(MAX_WIDTH, Math.round(h * ratio));
                    cv.resize(resultMat, resultMat, newSize, 0, 0, cv.INTER_AREA);
                }
                const resultCanvas = document.createElement('canvas');
                cv.imshow(resultCanvas, resultMat);
                // Cleanup
                src.delete();
                gray.delete();
                clahe.delete();
                blurred.delete();
                edged.delete();
                contours.delete();
                hierarchy.delete();
                resultMat.delete();
                resolve(resultCanvas.toDataURL('image/jpeg', 0.9));
            }
            catch (e) {
                console.error("OpenCV processing failed:", e);
                reject(e);
            }
        };
        img.onerror = (e) => {
            console.error("Image failed to load for processing:", e);
            reject(new Error("Image could not be loaded."));
        };
        img.src = imageUrl;
    });
};
