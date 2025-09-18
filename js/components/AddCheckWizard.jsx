import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CheckCategory, CheckStatus } from '../types';
import { extractCheckInfoFromImage } from '../services/geminiService';
import * as firestoreService from '../services/firestoreService';
import { XMarkIcon, CheckCircleIcon, HomeIcon, UsersIcon, BuildingOfficeIcon, ArchiveBoxIcon, ProcessingLoaderIcon, CheckPlaceholderIcon } from './icons';
import { processCheckImage } from '../utils/imageProcessor';
export const categoryConfig = {
    [CheckCategory.HOMEOWNER_LOCKBOX]: {
        icon: HomeIcon,
        colors: "bg-sky-50 border-sky-200 hover:border-sky-400 hover:bg-sky-100",
        iconColors: "bg-sky-100 text-sky-700",
        description: "Homeowner dues payments.",
        cardBorder: "border-sky-400",
    },
    [CheckCategory.MISC_HOMEOWNER_INCOME]: {
        icon: UsersIcon,
        colors: "bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100",
        iconColors: "bg-green-100 text-green-700",
        description: "Clubhouse rentals, pool fees, key fobs, etc.",
        cardBorder: "border-green-400",
    },
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: {
        icon: BuildingOfficeIcon,
        colors: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100",
        iconColors: "bg-purple-100 text-purple-700",
        description: "Transition fees, utility payments, insurance.",
        cardBorder: "border-purple-400",
    },
    [CheckCategory.COMMUNITY_ARCHIVES]: {
        icon: ArchiveBoxIcon,
        colors: "bg-slate-100 border-slate-200 hover:border-slate-400 hover:bg-slate-200",
        iconColors: "bg-slate-200 text-slate-700",
        description: "Resale documents, new account fees.",
        cardBorder: "border-slate-400",
    },
};
// Field options from user JSON
const chargeTypeOptions = [{ "value": "", "text": "Select..." }, { "value": "ACCDEP", "text": "Architectural Review Deposit" }, { "value": "ACCEL", "text": "Accellerated Assessments" }, { "value": "ADMIN", "text": "Administrative Fee" }, { "value": "APP", "text": "Application Fee" }, { "value": "ASNOWNCR", "text": "Association Owned Unit Credit" }, { "value": "BADDEBT", "text": "Bad Debt/Write Off" }, { "value": "BALFWD", "text": "Balance Forward" }, { "value": "BANK", "text": "Bank Fee" }, { "value": "BANKRUPTCY", "text": "Bankruptcy" }, { "value": "BOARD", "text": "Board Compensation" }, { "value": "CABLE", "text": "Cable Assessment or Fee" }, { "value": "CERTLTR", "text": "Certified Letter Charge" }, { "value": "COLLECT", "text": "Collection Fee" }, { "value": "COMPFEE", "text": "Compliance Fee" }, { "value": "COUPON", "text": "Coupon Fee" }, { "value": "CRBUREAU", "text": "Credit Bureau" }, { "value": "DAMAGE", "text": "Damage Fee" }, { "value": "DELQASN", "text": "Delinquency Processing Fee - Association" }, { "value": "DELQMGT", "text": "Delinquency Processing Fee - Management" }, { "value": "DEMAND", "text": "Demand Letter" }, { "value": "DEPOSIT", "text": "Deposit" }, { "value": "DEVELOP", "text": "Developer Assessment" }, { "value": "DISCOUNT", "text": "Association Fee Discount" }, { "value": "ELECTRIC", "text": "Electric Assessment or Chargeback" }, { "value": "FBBANQGR", "text": "Food & Bev Banquet/Event Gratuity" }, { "value": "FBDISC", "text": "Food & Beverage Discount" }, { "value": "FBEQRENT", "text": "Food & Bev Equip Rental Fee" }, { "value": "FBGRAT", "text": "Food & Beverage Gratuity" }, { "value": "FBMISC", "text": "Food & Beverage Misc Charge" }, { "value": "FBOTHER", "text": "Food & Beverage Other Charge" }, { "value": "FBRMRENT", "text": "Food & Bev Room Rental Fee" }, { "value": "FBSERV", "text": "Food & Beverage Service Fee" }, { "value": "FINE", "text": "Compliance Fine" }, { "value": "FIRERSC", "text": "Fire and Rescue Assessment" }, { "value": "FOOD01-10", "text": "Food Revenue 1" }, { "value": "GAS", "text": "Gas Assessment" }, { "value": "GATEACCESS", "text": "Gate/Access" }, { "value": "GCADNON", "text": "Golf Course Annual Fee-Non-Res" }, { "value": "GCADOTH", "text": "Golf Course Annual Fee-Other" }, { "value": "GCADRES", "text": "Golf Course Annual Fee - Res" }, { "value": "GCCART", "text": "Golf Cart Rental" }, { "value": "GCCLUB", "text": "Golf Club Rental" }, { "value": "GCEXPGC", "text": "Golf - Expired Gift Certificate" }, { "value": "GCGFGST", "text": "Golf Course Green Fee - Guest" }, { "value": "GCGFNON", "text": "Golf Course Green Fee-Non Res" }, { "value": "GCGFOTH", "text": "Golf Course Green Fee - Other" }, { "value": "GCGFOUT", "text": "Golf Course Green Fee - Outing" }, { "value": "GCGFRES", "text": "Golf Course Green Fee - Res" }, { "value": "GCHAND", "text": "Golf Course Handicap Svc Fee" }, { "value": "GCPRO", "text": "Golf Pro Shop Charge" }, { "value": "GCRANGE", "text": "Golf Driving Range Fee" }, { "value": "HC", "text": "Handling Charge" }, { "value": "HCSFEE", "text": "HCS Collection Fee" }, { "value": "HVAC", "text": "HVAC Assessment" }, { "value": "INSURANCE", "text": "Insurance Assessment" }, { "value": "IRRIGATION", "text": "Irrigation (Water) Assessment" }, { "value": "KEY", "text": "Key Fee" }, { "value": "KEYDEP", "text": "Key Deposit" }, { "value": "LANDSCAPE", "text": "Landscape Assessment or Chargeback" }, { "value": "LEGAL", "text": "Legal Fee" }, { "value": "LF", "text": "Late Fee" }, { "value": "LI", "text": "Late Interest" }, { "value": "LIEN", "text": "Lien Charge" }, { "value": "LIENFILE", "text": "Lien Filing Fee" }, { "value": "LOAN", "text": "Loan Assessment" }, { "value": "MAINT", "text": "General Maintenance" }, { "value": "MARINA", "text": "Marina Assessment" }, { "value": "MISC", "text": "Miscellaneous" }, { "value": "MOVE", "text": "Move In/Move Out Fee" }, { "value": "MOW", "text": "Force Mow" }, { "value": "MP", "text": "Misapplied Payment" }, { "value": "NSFASN", "text": "NSF Processing Fee - Association" }, { "value": "NSFMGT", "text": "NSF Processing Fee - Management" }, { "value": "OTHER", "text": "Other" }, { "value": "PARKING", "text": "Parking Space Maintenance" }, { "value": "PARTYROOM", "text": "Party Room Assessment" }];
const departmentOptions = [{ "value": "", "text": "Select..." }, { "value": "GL", "text": "GL" }, { "value": "Homeowner", "text": "Homeowner" }, { "value": "Misc", "text": "Misc" }, { "value": "Settlements", "text": "Settlements" }];
const formConfig = {
    common: [
        { name: "checkNumber", label: "Check Number", type: "text", required: true },
        { name: "date", label: "Date Received", type: "date", required: true },
        { name: "associationName", label: "Association Name", type: "text", required: true, colSpan: 2 },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "payee", label: "Payee", type: "text", required: true },
    ],
    [CheckCategory.HOMEOWNER_LOCKBOX]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true },
        { name: "accountNumber", label: "Account Number", type: "text", required: true },
        { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
    ],
    [CheckCategory.MISC_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true },
        { name: "accountNumber", label: "Account Number", type: "text", required: true },
        { name: "chargeType", label: "Charge Type for Homeowner's Account", type: "datalist", required: true, options: chargeTypeOptions, colSpan: 2 },
        { name: "memo", label: "Description for Comments Field", type: "textarea", required: false, colSpan: 2 },
    ],
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Payor", type: "text", required: true },
        { name: "department", label: "Department", type: "datalist", required: true, options: departmentOptions },
        { name: "glCode", label: "GL Code", type: "text", required: true },
        { name: "glDescription", label: "GL Description", type: "text", required: false },
        { name: "depositingBank", label: "Depositing Bank", type: "text", required: false, colSpan: 2 },
    ],
    [CheckCategory.COMMUNITY_ARCHIVES]: [
        { name: "payor", label: "Payor", type: "text", required: true, colSpan: 2 },
        { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
    ]
};
const AddCheckWizard = ({ isOpen, onClose, onAddCheck }) => {
    const [step, setStep] = useState('CATEGORY');
    const [newCheck, setNewCheck] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);
    const wizardRef = useRef(null);
    const resetWizard = useCallback(() => {
        setStep('CATEGORY');
        setNewCheck({});
        setIsLoading(false);
        setError(null);
        setImagePreview(null);
        setOpenDropdown(null);
    }, []);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wizardRef.current && !wizardRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.classList.add('no-doc-scroll');
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.classList.remove('no-doc-scroll');
        };
    }, [isOpen]);
    const handleClose = () => {
        resetWizard();
        onClose();
    };
    const handleCategorySelect = (category) => {
        setNewCheck({ category });
        setStep('UPLOAD');
    };
    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setIsLoading(true);
        setError(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const dataUrl = reader.result;
            setImagePreview(dataUrl); // Show original for a moment
            try {
                // New Preprocessing Step
                const processedDataUrl = await processCheckImage(dataUrl);
                setImagePreview(processedDataUrl); // Update preview with enhanced image
                const base64String = processedDataUrl.split(',')[1];
                const extractedDataPromise = extractCheckInfoFromImage(base64String, 'image/jpeg');
                const imageBlob = await (await fetch(processedDataUrl)).blob();
                // Give the processed file a consistent extension
                const processedFileName = file.name.replace(/\.[^/.]+$/, ".jpg");
                const imageUrlPromise = firestoreService.uploadCheckImage(imageBlob, processedFileName);
                const [extractedData, imageUrl] = await Promise.all([extractedDataPromise, imageUrlPromise]);
                setNewCheck(prev => ({ ...prev, ...extractedData, imageUrl }));
                setStep('DETAILS');
            }
            catch (err) {
                console.error("Image processing or extraction failed:", err);
                setError(err.message || "Could not process image. Please try again or enter manually.");
                setStep('DETAILS'); // Still go to details so user isn't stuck
            }
            finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Failed to read the image file.");
            setIsLoading(false);
        };
    };
    const handleManualEntry = () => {
        setStep('DETAILS');
        setError(null);
    };
    const handleDetailsChange = (e) => {
        const { name, value } = e.target;
        setNewCheck(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
    };
    const handleOptionClick = (fieldName, optionText) => {
        setNewCheck(prev => ({ ...prev, [fieldName]: optionText }));
        setOpenDropdown(null);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        const fieldsForCategory = [
            ...formConfig.common,
            ...(formConfig[newCheck.category] || [])
        ];
        for (const field of fieldsForCategory) {
            if (field.required && !newCheck[field.name]) {
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
        onAddCheck(finalCheck);
        handleClose();
    };
    const renderField = (field) => {
        const value = newCheck[field.name] || '';
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
                inputElement = <textarea {...commonProps} rows={2}/>;
                break;
            case 'datalist':
                const currentInputValue = (newCheck[field.name] || '').toLowerCase();
                const filteredOptions = field.options?.filter((opt) => opt.text.toLowerCase().includes(currentInputValue) && opt.value !== "");
                inputElement = (<div className="relative">
                        <input {...commonProps} type="text" onFocus={() => setOpenDropdown(field.name)} autoComplete="off"/>
                        {openDropdown === field.name && filteredOptions && filteredOptions.length > 0 && (<ul className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto focus:outline-none sm:text-sm">
                                {filteredOptions.map((opt) => (<li key={opt.value} onClick={() => handleOptionClick(field.name, opt.text)} className="text-slate-900 cursor-pointer select-none relative py-2 pl-3 pr-4 hover:bg-slate-100">
                                        {opt.text}
                                    </li>))}
                            </ul>)}
                    </div>);
                break;
            case 'number':
                inputElement = <input type="number" {...commonProps} step="0.01"/>;
                break;
            default:
                inputElement = <input type={field.type} {...commonProps}/>;
        }
        return (<div key={field.name} className={field.colSpan === 2 ? 'sm:col-span-2' : 'sm:col-span-1'}>
                <label htmlFor={field.name} className="block text-sm font-medium text-slate-600">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {inputElement}
            </div>);
    };
    const renderDetailsForm = () => {
        if (!newCheck.category)
            return null;
        const categorySpecificFields = formConfig[newCheck.category] || [];
        return (<div className="mt-4 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                {formConfig.common.map(renderField)}
                <hr className="sm:col-span-2 my-2 border-slate-200"/>
                {categorySpecificFields.map(renderField)}
            </div>);
    };
    if (!isOpen)
        return null;
    const renderStep = () => {
        switch (step) {
            case 'CATEGORY':
                return (<>
                        <div className="p-6 flex-shrink-0 border-b">
                        <h3 className="text-xl font-semibold leading-6 text-gray-900 text-center">Select Check Category</h3>
                        <p className="mt-1 text-sm text-gray-500 text-center">Choose the category that best fits the payment type.</p>
                        </div>
                        <div className="p-6 flex-grow overflow-y-auto">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {Object.entries(categoryConfig).map(([category, config]) => {
                        const Icon = config.icon;
                        return (<button key={category} onClick={() => handleCategorySelect(category)} className={`group relative text-left p-4 border rounded-lg transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${config.colors}`}>
                                        <div className="flex items-start space-x-4">
                                                <div className={`flex-shrink-0 p-3 rounded-lg ${config.iconColors}`}><Icon className="h-6 w-6"/></div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{category}</p>
                                                <p className="text-sm text-slate-600">{config.description}</p>
                                            </div>
                                        </div>
                                    </button>);
                    })}
                        </div>
                    </div>
                    </>);
            case 'UPLOAD':
                return (<>
                        <div className="p-6 flex-shrink-0 border-b">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Upload Check Image (Optional)</h3>
                            <p className="mt-1 text-sm text-gray-500">Upload an image to automatically extract details using AI.</p>
                        </div>
                        {/* Modal body scrollable area */}
                        <div className="flex-grow overflow-y-auto">
                            <div className="p-6">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-sky-600 hover:text-sky-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-sky-500">
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-sky-400">
                                        <div className="space-y-1 text-center">
                                            {isLoading ? (<div className="py-4"><ProcessingLoaderIcon className="mx-auto h-12 w-12"/><p className="mt-4 text-sm font-medium text-slate-600">Processing image...</p></div>) : imagePreview ? (<img src={imagePreview} alt="Check preview" className="mx-auto h-32 object-contain rounded-md shadow-sm"/>) : (<><CheckPlaceholderIcon className="mx-auto h-16 w-auto text-slate-400"/><div className="mt-2 flex text-sm text-gray-600"><span>Upload a file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" capture/></div><p className="text-xs text-gray-500">PNG, JPG, or use camera</p></>)}
                                        </div>
                                    </div>
                                </label>
                                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                            </div>
                        </div>
                        <div className="p-6 flex-shrink-0 border-t flex justify-end space-x-4">
                            <button onClick={handleManualEntry} type="button" className="inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Skip & Enter Manually</button>
                        </div>
                    </>);
            case 'DETAILS':
                return (<>
                        <div className="p-6 flex-shrink-0 border-b">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Enter Check Details</h3>
                        <p className="text-sm text-slate-500">Category: <span className="font-semibold">{newCheck.category}</span></p>
                        </div>
                        {/* Modal body scrollable area */}
                        <div className="flex-grow overflow-y-auto px-6">
                            <form onSubmit={handleSubmit} id="addCheckForm" className="flex flex-col h-full">
                            {newCheck.imageUrl && (<div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
                                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2"/>
                                        <p className="text-sm text-green-700">Details extracted from image. Please verify and complete the form.</p>
                                </div>)}
                                {error && !isLoading && <p className="mb-4 text-sm text-red-600">{error}</p>}
                            {renderDetailsForm()}

                            </form>
                        </div>
                        <div className="p-6 flex-shrink-0 border-t flex justify-end space-x-4">
                             <button type="button" onClick={handleClose} className="inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                             <button type="submit" form="addCheckForm" className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700">Add Check</button>
                        </div>
                        </>);
        }
    };
    return (<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-30" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-4 text-center">
                <div ref={wizardRef} className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-3xl sm:w-full max-h-[80vh] flex flex-col">
                    <button onClick={handleClose} className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10">
                           <XMarkIcon className="h-6 w-6"/>
                        </button>
                        {renderStep()}
                </div>
            </div>
        </div>);
};
export default AddCheckWizard;
