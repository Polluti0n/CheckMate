// src/components/AddCheckWizard.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Outlet, useOutletContext } from 'react-router-dom';
import { Check, CheckCategory, CheckStatus } from '../types';
import { extractCheckInfoFromImage } from '../services/geminiService';
import * as firestoreService from '../services/firestoreService';
import { XMarkIcon, CheckCircleIcon, ProcessingLoaderIcon, CheckPlaceholderIcon } from './icons';
import { processCheckImage } from '../utils/imageProcessor';
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
    handleSubmit: (e: React.FormEvent) => void;
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
                            : (<><CheckPlaceholderIcon className="mx-auto h-16 w-auto text-slate-400" /><div className="mt-2 flex text-sm text-gray-600"><span>Upload a file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" capture /></div><p className="text-xs text-gray-500">PNG, JPG, or use camera</p></>)}
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


// --- Main Wizard Layout Component ---
// FIX: Changed to a named export to resolve module resolution issues.
export const AddCheckWizard: React.FC<{ isOpen: boolean; onClose: () => void; onAddCheck: (check: any) => void; }> = ({ isOpen, onClose, onAddCheck }) => {
    const navigate = useNavigate();
    const [newCheck, setNewCheck] = useState<Partial<Check>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const resetWizard = useCallback(() => {
        setNewCheck({}); setIsLoading(false); setError(null); setImagePreview(null);
    }, []);

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setImagePreview(dataUrl); // Show original for a moment

            try {
                // New Preprocessing Step
                const processedDataUrl = await processCheckImage(dataUrl);
                
                if (processedDataUrl === null) {
                    setError("Could not automatically detect the check. Please enter details manually.");
                    setImagePreview(dataUrl); // Show the original image so user knows what they uploaded
                    setIsLoading(false);
                    navigate('/add-check/details');
                    return; // Stop execution here
                }

                setImagePreview(processedDataUrl); // Update preview with enhanced image

                const base64String = processedDataUrl.split(',')[1];
                
                const extractedDataPromise = extractCheckInfoFromImage(base64String, 'image/jpeg');
                
                const imageBlob = await (await fetch(processedDataUrl)).blob();
                // Give the processed file a consistent extension
                const processedFileName = file.name.replace(/\.[^/.]+$/, ".jpg");
                const imageUrlPromise = firestoreService.uploadCheckImage(imageBlob, processedFileName);

                const [extractedData, imageUrl] = await Promise.all([extractedDataPromise, imageUrlPromise]);

                setNewCheck(prev => ({ ...prev, ...extractedData, imageUrl }));
                
            } catch (err: any) {
                console.error("Image processing or extraction failed:", err);
                setError(err.message || "Could not process image. Please try again or enter manually.");
            } finally {
                setIsLoading(false);
                navigate('/add-check/details');
            }
        };
        reader.onerror = () => {
            setError("Failed to read the image file.");
            setIsLoading(false);
            navigate('/add-check/details');
        };
    };

    const handleSubmit = (e: React.FormEvent) => {
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

    if (!isOpen) return null;

    const context: WizardContextType = {
        newCheck, setNewCheck, isLoading, error, setError, imagePreview,
        handleImageUpload, handleSubmit
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-30">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="relative bg-white rounded-lg shadow-xl sm:my-8 sm:max-w-3xl sm:w-full max-h-[80dvh] flex flex-col">
                    <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 z-10">
                        <XMarkIcon className="h-6 w-6"/>
                    </button>
                    {/* The Outlet renders the active step component based on the URL */}
                    <Outlet context={context} />
                </div>
            </div>
        </div>
    );
};
