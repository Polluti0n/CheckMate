// src/components/AddCheckWizard.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Outlet, useOutletContext } from 'react-router-dom';
import { Check, CheckCategory, CheckStatus } from '../types';
import { extractCheckInfoFromImage } from '../services/geminiService';
import * as firestoreService from '../services/firestoreService';
import { XMarkIcon, CheckCircleIcon, ProcessingLoaderIcon, CheckPlaceholderIcon } from './icons';
import { processCheckImage, transformImageWithPoints } from '../utils/imageProcessor';
import { categoryConfig, formConfig } from '../formConfig';

// Define the shape of the context that the wizard layout provides to its step components.
type WizardContextType = {
    newCheck: Partial<Check>;
    setNewCheck: React.Dispatch<React.SetStateAction<Partial<Check>>>;
    isLoading: boolean;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    imagePreview: string | null;
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    imageToCrop: string | null;
    handleManualCrop: (image: HTMLImageElement, canvas: HTMLCanvasElement, points: { x: number; y: number }[]) => Promise<void>; // This signature is correct, the implementation will change
};

// A helper hook to easily access the typed context in child components.
const useWizardContext = () => useOutletContext<WizardContextType>();


// --- Step 1: Category Selection Component ---
export const CategoryStep = () => {
    const { setNewCheck } = useWizardContext();
    const navigate = useNavigate();

    const handleCategorySelect = (category: CheckCategory) => {
        setNewCheck({ category });
        navigate('/add-check/upload'); // Navigate to the next step
    };

    return (
        <>
            <div className="p-6 flex-shrink-0 border-b">
                <h3 className="text-xl font-semibold text-center text-gray-900">Select Check Category</h3>
                <p className="mt-1 text-sm text-center text-gray-500">Choose the category that best fits the payment type.</p>
            </div>
            <div className="p-6 flex-grow overflow-y-auto">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {Object.entries(categoryConfig).map(([category, config]) => {
                        const Icon = config.icon;
                        return (
                            <button key={category} onClick={() => handleCategorySelect(category as CheckCategory)} className={`group relative text-left p-4 border rounded-lg transition-all duration-300 transform hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${config.colors}`}>
                                <div className="flex items-start space-x-4">
                                    <div className={`flex-shrink-0 p-3 rounded-lg ${config.iconColors}`}><Icon className="h-6 w-6" /></div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{category}</p>
                                        <p className="text-sm text-slate-600">{config.description}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};


// --- Step 2: Image Upload Component ---
export const UploadStep = () => {
    const { isLoading, error, imagePreview, handleImageUpload } = useWizardContext();
    const navigate = useNavigate();

    return (
        <>
            <div className="p-6 flex-shrink-0 border-b">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Upload Check Image (Optional)</h3>
                <p className="mt-1 text-sm text-gray-500">Upload an image to automatically extract details using AI.</p>
            </div>
            <div className="flex-grow overflow-y-auto p-6">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-sky-600 hover:text-sky-500">
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-sky-400">
                        <div className="space-y-1 text-center">
                            {isLoading ? (<div className="py-4"><ProcessingLoaderIcon className="mx-auto h-12 w-12" /><p className="mt-4 text-sm font-medium text-slate-600">Processing image...</p></div>)
                            : imagePreview ? (<img src={imagePreview} alt="Check preview" className="mx-auto h-32 object-contain rounded-md shadow-sm" />)
                            : (<><CheckPlaceholderIcon className="mx-auto h-16 w-auto text-slate-400" /><div className="mt-2 flex text-sm text-gray-600"><span>Upload a file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*;capture=camera" /></div><p className="text-xs text-gray-500">PNG, JPG, or use camera</p></>)}
                        </div>
                    </div>
                </label>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <div className="p-6 flex-shrink-0 border-t flex justify-between items-center">
                <button onClick={() => navigate(-1)} type="button" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back</button>
                <button onClick={() => navigate('/add-check/details')} type="button" className="rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Skip & Enter Manually</button>
            </div>
        </>
    );
};

// --- Step 2.5: Manual Crop Component ---
export const CropStep = () => {
    const { imageToCrop, handleManualCrop, error, isLoading } = useWizardContext();
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null); // For sizing
    const magnifierCanvasRef = useRef<HTMLCanvasElement>(null); // For loupe

    const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
    const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
    const [magnifier, setMagnifier] = useState({ visible: false, x: 0, y: 0, point: { x: 0, y: 0 } });

    const POINT_SIZE = 10; // Size of the draggable handles
    const LOUPE_SIZE = 150;
    const LOUPE_ZOOM = 2;

    // Effect to draw image and initialize points
    useEffect(() => {
        if (!imageToCrop) {
            navigate('/add-check/upload', { replace: true });
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const container = containerRef.current;
        if (!canvas || !ctx || !container) return;

        const img = new Image();
        img.crossOrigin = 'anonymous'; // This is the crucial fix!
        img.src = imageToCrop;
        img.onload = () => {
            imageRef.current = img;
            
            // Scale canvas to fit container while maintaining aspect ratio
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const imageAspectRatio = img.width / img.height;
            const containerAspectRatio = containerWidth / containerHeight;

            let canvasWidth, canvasHeight;
            if (imageAspectRatio > containerAspectRatio) {
                canvasWidth = containerWidth;
                canvasHeight = containerWidth / imageAspectRatio;
            } else {
                canvasHeight = containerHeight;
                canvasWidth = containerHeight * imageAspectRatio;
            }

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // Initialize points at corners
            const initialPoints = [
                { x: canvas.width * 0.2, y: canvas.height * 0.2 },
                { x: canvas.width * 0.8, y: canvas.height * 0.2 },
                { x: canvas.width * 0.8, y: canvas.height * 0.8 },
                { x: canvas.width * 0.2, y: canvas.height * 0.8 },
            ];
            setPoints(initialPoints);
        };
    }, [imageToCrop, navigate]);

    const getCanvasCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    const getPageCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].pageX : e.pageX;
        const clientY = 'touches' in e ? e.touches[0].pageY : e.pageY;
        return { x: clientX, y: clientY };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            const distance = Math.hypot(p.x - coords.x, p.y - coords.y);
            if (distance < POINT_SIZE * 1.5) { // Increased hit area
                setDraggingPointIndex(i);
                return;
            }
        }
    }, [getCanvasCoordinates, points]);

    const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (draggingPointIndex === null) return;
        e.preventDefault();
        const coords = getCanvasCoordinates(e);
        
        // Clamp coordinates to be within the canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const clampedCoords = {
            x: Math.max(0, Math.min(canvas.width, coords.x)),
            y: Math.max(0, Math.min(canvas.height, coords.y)),
        };

        setPoints(prevPoints =>
            prevPoints.map((p, i) => (i === draggingPointIndex ? clampedCoords : p))
        );

        const pageCoords = getPageCoordinates(e);
        setMagnifier({
            visible: true,
            x: pageCoords.x - LOUPE_SIZE / 2,
            y: pageCoords.y - LOUPE_SIZE - 30, // Position above cursor
            point: clampedCoords
        });
    }, [draggingPointIndex, getCanvasCoordinates, getPageCoordinates]);

    const handleMouseUp = useCallback(() => {
        setDraggingPointIndex(null);
        setMagnifier(prev => ({ ...prev, visible: false }));
    }, []);

    // Effect to handle global mouse/touch events for dragging
    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            // We prevent default on touchmove to prevent scrolling on mobile.
            if (draggingPointIndex !== null) {
                e.preventDefault();
                handleMouseMove(e as any);
            }
        };

        const handleUp = () => {
            if (draggingPointIndex !== null) {
                handleMouseUp();
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchend', handleUp);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [draggingPointIndex, handleMouseMove, handleMouseUp]); // Dependencies ensure we have the latest handlers

    // Effect to redraw canvas when points change
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;
        if (!canvas || !ctx || !img || points.length !== 4) return;

        // Clear canvas and draw the image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // --- Start: Overlay logic that avoids tainting the canvas ---
        // Save the context state
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // A semi-transparent dark overlay

        // Create a path for the inner rectangle (the selection)
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        
        // Invert the clipping area by defining a rectangle with negative width
        // This creates a "hole" where the selection is.
        ctx.rect(canvas.width, 0, -canvas.width, canvas.height);

        // Fill the area outside the selection
        ctx.fill();

        // Restore the context to draw the border and handles normally
        ctx.restore();
        // --- End: Overlay logic ---

        // Draw the border of the quadrilateral
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw draggable handles
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, POINT_SIZE, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
            ctx.fill();
        });
    }, [points, imageToCrop]);

    // Effect to draw magnifier
    useEffect(() => {
        if (!magnifier.visible || !magnifier.point || !imageRef.current) return;

        const loupeCanvas = magnifierCanvasRef.current;
        const loupeCtx = loupeCanvas?.getContext('2d');
        const mainCanvas = canvasRef.current;

        if (!loupeCtx || !mainCanvas) return;

        const sourceSize = LOUPE_SIZE / LOUPE_ZOOM;
        const sourceX = (magnifier.point.x / mainCanvas.width) * imageRef.current.naturalWidth - sourceSize / 2;
        const sourceY = (magnifier.point.y / mainCanvas.height) * imageRef.current.naturalHeight - sourceSize / 2;

        loupeCtx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
        loupeCtx.fillStyle = 'white';
        loupeCtx.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
        loupeCtx.drawImage(
            imageRef.current,
            sourceX, sourceY, sourceSize, sourceSize,
            0, 0, LOUPE_SIZE, LOUPE_SIZE
        );

        // Draw crosshairs
        loupeCtx.beginPath();
        loupeCtx.moveTo(0, LOUPE_SIZE / 2);
        loupeCtx.lineTo(LOUPE_SIZE, LOUPE_SIZE / 2);
        loupeCtx.moveTo(LOUPE_SIZE / 2, 0);
        loupeCtx.lineTo(LOUPE_SIZE / 2, LOUPE_SIZE);
        loupeCtx.strokeStyle = 'rgba(255, 122, 0, 1)';
        loupeCtx.lineWidth = 2;
        loupeCtx.stroke();

    }, [magnifier]);

    const handleCrop = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (points.length !== 4 || !canvas || !image) {
            // This case should ideally not be reachable if the button is enabled.
            return;
        }
        // We pass the original image element, the display canvas, and the points
        handleManualCrop(image, canvas, points);
    }, [points, handleManualCrop, canvasRef, imageRef]);

    return (
        <>
            <div className="p-6 flex-shrink-0 border-b">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Manual Crop</h3>
                <p className="mt-1 text-sm text-gray-500">Automatic detection failed. Please drag the corners to align with the check.</p>
            </div>
            <div ref={containerRef} className="relative flex-grow p-4 bg-gray-100 flex justify-center h-[60dvh] items-center overflow-hidden">
                 {isLoading ? (
                    <div className="text-center">
                        <ProcessingLoaderIcon className="mx-auto h-12 w-12" />
                        <p className="mt-4 text-sm font-medium text-slate-600">Processing cropped image...</p>
                    </div>
                ) : (
                    <>
                        <canvas
                            ref={canvasRef}
                            onMouseDown={handleMouseDown} // Only mouse down is needed on the canvas
                            onTouchStart={handleMouseDown} // and touch start
                            className={`cursor-crosshair rounded-lg shadow-m max-w-[${canvasRef.current?.width}px] max-h-[${canvasRef.current?.height}px]`}
                        />
                        {magnifier.visible && (
                            <canvas
                                ref={magnifierCanvasRef}
                                width={LOUPE_SIZE}
                                height={LOUPE_SIZE}
                                style={{
                                    position: 'fixed',
                                    left: magnifier.x,
                                    top: magnifier.y,
                                    border: '3px solid #0ea5e9', // sky-500
                                    borderRadius: '50%',
                                    pointerEvents: 'none',
                                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                                    display: 'block',
                                    zIndex: 100,
                                }}
                            />
                        )}
                    </>
                )}
            </div>
             {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
            <div className="p-6 flex-shrink-0 border-t flex justify-between items-center">
                <button onClick={() => navigate(-1)} type="button" className="text-sm font-medium text-slate-600 hover:text-slate-900" disabled={isLoading}>Back</button>
                <button onClick={handleCrop} type="button" className="rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700 disabled:bg-sky-300" disabled={isLoading}>Crop and Continue</button>
            </div>
        </>
    );
};


// --- Step 3: Details Form Component ---
export const DetailsStep = () => {
    const { newCheck, error, handleSubmit } = useWizardContext();
    const navigate = useNavigate();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const detailsRef = useRef<HTMLFormElement>(null);

    // This effect ensures a user cannot land on this page without a category.
    useEffect(() => {
        if (!newCheck.category) {
            navigate('/add-check', { replace: true });
        }
    }, [newCheck.category, navigate]);
    
    // Close dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!newCheck.category) return null; // Render nothing while redirecting

    return (
        <>
            <div className="p-6 flex-shrink-0 border-b">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Enter Check Details</h3>
                <p className="text-sm text-slate-500">Category: <span className="font-semibold">{newCheck.category}</span></p>
            </div>
            <div className="flex-grow overflow-y-auto px-6 py-4">
                <DetailsForm ref={detailsRef} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
            </div>
            <div className="p-6 flex-shrink-0 border-t flex justify-between items-center">
                 <button onClick={() => navigate(-1)} type="button" className="text-sm font-medium text-slate-600 hover:text-slate-900">Back</button>
                 <button type="submit" form="addCheckForm" className="rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700">Add Check</button>
            </div>
        </>
    );
};

// Extracted form logic into its own component for better state management of dropdowns
const DetailsForm = React.forwardRef<HTMLFormElement, {openDropdown: string | null, setOpenDropdown: (name: string | null) => void}>(({ openDropdown, setOpenDropdown }, ref) => {
    const { newCheck, error, handleSubmit, setNewCheck, setError } = useWizardContext();
    
    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewCheck(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
    };

    const handleOptionClick = (fieldName: string, optionText: string) => {
        setNewCheck(prev => ({ ...prev, [fieldName]: optionText }));
        setOpenDropdown(null);
    };

    const renderField = (field: any) => {
        const value = newCheck[field.name as keyof Check] as string || '';
        const commonProps = {
            name: field.name,
            id: field.name,
            required: field.required,
            autoComplete: field.autocomplete || 'off',
            value: value,
            onChange: handleDetailsChange,
            className: "mt-1 block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 sm:text-sm",
        };

        let inputElement;
        switch (field.type) {
            case 'textarea':
                inputElement = <textarea {...commonProps} rows={2} />;
                break;
            case 'datalist':
                const currentInputValue = (newCheck[field.name as keyof Check] as string || '').toLowerCase();
                const filteredOptions = field.options?.filter((opt: { value: string, text: string }) => 
                    opt.text.toLowerCase().includes(currentInputValue) && opt.value !== ""
                );

                inputElement = (
                    <div className="relative">
                        <input 
                            {...commonProps} 
                            type="text"
                            onFocus={() => setOpenDropdown(field.name)}
                            autoComplete="off"
                        />
                        {openDropdown === field.name && filteredOptions && filteredOptions.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto focus:outline-none sm:text-sm">
                                {filteredOptions.map((opt: { value: string, text: string }) => (
                                    <li 
                                        key={opt.value} 
                                        onClick={() => handleOptionClick(field.name, opt.text)}
                                        className="text-slate-900 cursor-pointer select-none relative py-2 pl-3 pr-4 hover:bg-slate-100"
                                    >
                                        {opt.text}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
                break;
            case 'number':
                 inputElement = <input type="number" {...commonProps} step="0.01" />;
                 break;
            default:
                inputElement = <input type={field.type} {...commonProps} />;
        }

        return (
            <div key={field.name} className={field.colSpan === 2 ? 'sm:col-span-2' : 'sm:col-span-1'}>
                <label htmlFor={field.name} className="block text-sm font-medium text-slate-600">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {inputElement}
            </div>
        );
    };;
    
    const fields = newCheck.category ? [ ...formConfig.common, ...formConfig[newCheck.category] ] : formConfig.common;

    return (
        <form onSubmit={handleSubmit} id="addCheckForm" ref={ref}>
            {newCheck.imageUrl && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <p className="text-sm text-green-700">Details extracted from image. Please verify.</p>
                </div>
            )}
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                {fields.map(renderField)}
            </div>
        </form>
    );
});

// --- Custom Hook for Session State ---
const useSessionState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading sessionStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (valueToStore === undefined || valueToStore === null) {
                window.sessionStorage.removeItem(key);
            } else {
                window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting sessionStorage key “${key}”:`, error);
        }
    };

    return [storedValue, setValue];
};


// --- Main Wizard Layout Component ---
// FIX: Changed to a named export to resolve module resolution issues.
export const AddCheckWizard: React.FC<{ isOpen: boolean; onClose: () => void; onAddCheck: (check: any) => void; }> = ({ isOpen, onClose, onAddCheck }) => {
    const navigate = useNavigate();
    // FIX: Persist the main check object to survive mobile page reloads.
    const [newCheck, setNewCheck] = useSessionState<Partial<Check>>('addCheckWizard.newCheck', {});
    const [isLoading, setIsLoading] = useState(false);
    // FIX: Persist state across page reloads on mobile using sessionStorage.
    const [error, setError] = useSessionState<string | null>('addCheckWizard.error', null);
    const [imagePreview, setImagePreview] = useSessionState<string | null>('addCheckWizard.imagePreview', null);
    const [imageToCrop, setImageToCrop] = useSessionState<string | null>('addCheckWizard.imageToCrop', null);
    const [originalFileName, setOriginalFileName] = useSessionState<string>('addCheckWizard.originalFileName', 'check.jpg');

    const resetWizard = useCallback(() => {
        setNewCheck({}); 
        setIsLoading(false); 
        setError(null); 
        setImagePreview(null);
        setImageToCrop(null);
        setOriginalFileName('check.jpg');
        // FIX: Clear all session storage for this wizard, including the newCheck object.
        Object.keys(window.sessionStorage).filter(k => k.startsWith('addCheckWizard.')).forEach(k => window.sessionStorage.removeItem(k));
    }, [setNewCheck, setError, setImagePreview, setImageToCrop, setOriginalFileName]);

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const resizeImage = (dataUrl: string, maxSize: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round(height * (maxSize / width));
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round(width * (maxSize / height));
                        height = maxSize;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.9)); // Use JPEG for smaller size
            };
            img.onerror = (err) => {
                reject(err);
            };
            img.src = dataUrl;
        });
    };

    const continueWithProcessedImage = async (processedDataUrl: string, fileName: string) => {
        setImagePreview(processedDataUrl); // Update preview with enhanced image

        const base64String = processedDataUrl.includes(',') ? processedDataUrl.split(',')[1] : processedDataUrl;
        const fullDataUrl = `data:image/jpeg;base64,${base64String}`;

        const extractedDataPromise = extractCheckInfoFromImage(base64String, 'image/jpeg');
        
        const imageBlob = await (await fetch(fullDataUrl)).blob();
        const processedFileName = fileName.replace(/\.[^/.]+$/, ".jpg");
        const imageUrlPromise = firestoreService.uploadCheckImage(imageBlob, processedFileName);

        const [extractedData, imageUrl] = await Promise.all([extractedDataPromise, imageUrlPromise]);

        // Set all the new data. The useEffect hook will handle navigation.
        setNewCheck(prev => ({ ...prev, ...extractedData, imageUrl }));
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setOriginalFileName(file.name);
        setIsLoading(true);
        setError(null);
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            
            try {
                const resizedDataUrl = await resizeImage(dataUrl, 1280);
                setImagePreview(resizedDataUrl);

                const processedDataUrl = await processCheckImage(resizedDataUrl);
                
                if (processedDataUrl === null) {
                    // Automatic processing failed, move to manual crop step
                    setError(null); // Clear any previous errors
                    setImageToCrop(resizedDataUrl);
                    setIsLoading(false);
                    navigate('/add-check/crop');
                    return;
                }

                await continueWithProcessedImage(processedDataUrl, file.name);
                // State will be set, and useEffect will navigate.
            } catch (err: any) {
                console.error("Image processing or extraction failed:", err);
                setError(err.message || "Could not process image. Please try again or enter manually.");
                setImagePreview(dataUrl); // In case of error, show original uploaded image
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Failed to read the image file.");
            setIsLoading(false);
        };
    };

    const handleManualCrop = async (imageEl: HTMLImageElement, displayCanvas: HTMLCanvasElement, points: { x: number; y: number }[]) => { // This signature is correct, the implementation will change
        if (!imageToCrop || !imageEl || !displayCanvas) {
            setError("Image or canvas not available for cropping.");
            return;
        }
        setIsLoading(true);
        setError(null);

        // Scale points from the on-screen display canvas to the full-resolution clean canvas.
        const { naturalWidth, naturalHeight } = imageEl;
        const { width, height } = displayCanvas;
        const scaleX = naturalWidth / width;
        const scaleY = naturalHeight / height;

        const scaledPoints = points.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
        }));
        try {
            const processedDataUrl = await transformImageWithPoints(imageToCrop, scaledPoints);
            if (processedDataUrl === null) {
                throw new Error("Manual cropping failed to process the image.");
            }
            await continueWithProcessedImage(processedDataUrl, originalFileName);
            // State will be set, and useEffect will navigate.
        } catch (err: any) {
            console.error("Manual crop processing failed:", err);
            setError(err.message || "Could not process cropped image.");
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => { // This signature is correct, the implementation will change
        e.preventDefault();
        setError(null);
        
        const fieldsForCategory = [
            ...formConfig.common,
            ...(formConfig[newCheck.category as keyof typeof formConfig] || [])
        ];

        for (const field of fieldsForCategory) {
            if (field.required && !newCheck[field.name as keyof Check]) {
                setError(`Please fill in the required field: "${field.label}".`);
                return;
            }
        }
        
        const finalCheck = {
            status: CheckStatus.RECEIVED,
            payor: '', // Ensure default values for required fields
            payee: '',
            memo: '',
            ...newCheck
        };

        onAddCheck(finalCheck as Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt'>);
        handleClose();
    };

    // This effect will run whenever `newCheck` is updated with an `imageUrl`.
    // This is the correct place to handle navigation after image processing.
    useEffect(() => {
        // We only want to navigate if we have an image URL and a category.
        // This indicates that the image processing and data extraction is complete.
        if (newCheck.imageUrl && newCheck.category) {
            // Ensure we are on the correct path before navigating away.
            if (location.pathname.startsWith('/add-check/upload') || location.pathname.startsWith('/add-check/crop')) {
                setIsLoading(false);
                navigate('/add-check/details');
            }
        }
    }, [newCheck.imageUrl, newCheck.category, navigate, location.pathname]);

    if (!isOpen) return null;

    const context: WizardContextType = {
        newCheck, setNewCheck, isLoading, error, setError, imagePreview,
        handleImageUpload, handleSubmit, imageToCrop, handleManualCrop // This signature is correct, the implementation will change
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-30">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-lg shadow-xl sm:my-8 sm:max-w-3xl sm:w-full max-h-[80dvh] flex flex-col">
                    <button
                        onClick={handleClose}
                        className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 z-10"
                        aria-label="Close"
                        title="Close"
                    >
                        <XMarkIcon className="h-6 w-6"/>
                        <span className="sr-only">Close</span>
                    </button>
                    {/* The Outlet renders the active step component based on the URL */}
                    <Outlet context={context} />
                </div>
            </div>
        </div>
    );
};