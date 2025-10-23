import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Check, Comment, AuditLog, Flag, CheckStatus, UserProfile, CurrentUser, CheckCategory, CheckField } from '../types';
import { XMarkIcon, FlagIcon, PencilIcon, TrashIcon, SendIcon, UserCircleIcon, CalendarDaysIcon, BuildingOfficeIcon, DocumentTextIcon, BanknotesIcon, HashtagIcon, LockClosedIcon, BankBuildingIcon, MapLocationIcon, ImageIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ClipboardDocumentIcon, ChevronLeftIcon, ChevronRightIcon, SignatureIcon, UsDollarIcon, CategoryIcon } from './icons'; // Added Chevron icons
import { stringify } from 'querystring';
import { flagColorVariant } from '@/constants';
import { formConfig } from '@/formConfig';
import './CheckDetailsModal.css'

interface CheckDetailModalProps {
    check: Check | null;
    flags: Flag[];
    onClose: () => void;
    onUpdateCheck: (updatedCheck: Check, log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    onAddComment: (checkId: string, commentText: string) => void;
    onToggleFlag: (checkId: string, flagId: string) => void;
    onOpenFlagManager: () => void;
    onDeleteCheck: (checkId: string) => void;
    currentUser: CurrentUser | null;
    allUsers: UserProfile[];
    onNavigateToBatch: (batchId: string) => void;
}

const statusColors: { [key in CheckStatus]: string } = {
    [CheckStatus.RECEIVED]: 'bg-yellow-100 text-yellow-800 border-yellow-500',
    [CheckStatus.CONFIRMING_DETAILS]: 'bg-orange-100 text-orange-800 border-orange-500',
    [CheckStatus.QUEUED]: 'bg-sky-100 text-sky-800 border-sky-500',
    [CheckStatus.COMPLETE]: 'bg-green-100 text-green-800 border-green-500',
    [CheckStatus.ARCHIVED]: 'bg-slate-100 text-slate-800 border-slate-500',
};

const typeColors: { [key in CheckCategory]: string } = {
    [CheckCategory.HOMEOWNER_LOCKBOX]: 'bg-sky-100 border-blue-500',
    [CheckCategory.MISC_HOMEOWNER_INCOME]: 'bg-green-100 border-green-500',
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: 'bg-purple-100 border-purple-500',
    [CheckCategory.COMMUNITY_ARCHIVES]: 'bg-slate-100 border-slate-500',

};

const CheckDetailModal: React.FC<CheckDetailModalProps> = ({ check, flags, onClose, onUpdateCheck, onAddComment, onToggleFlag, onOpenFlagManager, onDeleteCheck, currentUser, allUsers, onNavigateToBatch }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCheck, setEditableCheck] = useState<Check | null>(check);
    const [editableAddress, setEditableAddress] = useState('');
    const [commentText, setCommentText] = useState('');
    const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
    const [expandedView, setExpandedView] = useState<'NONE' | 'COMMENTS' | 'AUDIT'>('NONE');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const tabs: ('payment' | 'accounting' | 'banking' | 'image')[] = useMemo(() => ['payment', 'accounting', 'banking', 'image'], []);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const activeTab = tabs[activeTabIndex];
    const [imageError, setImageError] = useState(false);

    const flagDropdownRef = useRef<HTMLDivElement>(null);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const auditTrailEndRef = useRef<HTMLDivElement>(null);

    const userProfilesMap = useMemo(() => new Map(allUsers.map(user => [user.uid, user])), [allUsers]);
    const formatAsCurrancy = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });


    useEffect(() => {
        setEditableCheck(check);
        if (check?.payorAddress) {
            const { street, city, state, zip } = check.payorAddress;
            setEditableAddress([street, city, `${state || ''} ${zip || ''}`.trim()].filter(Boolean).join(', '));
        }
        setIsEditing(false);
        setIsFlagDropdownOpen(false);
        setIsDeleteConfirmOpen(false);
        setImageError(false);
        setToast(null);
        setActiveTabIndex(0);
        if (expandedView !== 'COMMENTS' && expandedView !== 'AUDIT') {
            setExpandedView('NONE');
        }
        commentsEndRef.current?.parentElement?.scrollTo(0, commentsEndRef.current.parentElement.scrollHeight || 0);
        auditTrailEndRef.current?.parentElement?.scrollTo(0, auditTrailEndRef.current.parentElement.scrollHeight || 0);
    }, [check, expandedView]);

    useEffect(() => {
        if (expandedView === 'COMMENTS' || !isEditing) {
            commentsEndRef.current?.parentElement?.scrollTo(0, commentsEndRef.current.parentElement.scrollHeight || 0);
        } else if (expandedView === 'AUDIT') {
            auditTrailEndRef.current?.parentElement?.scrollTo(0, auditTrailEndRef.current.parentElement.scrollHeight || 0);
        } else {
                commentsEndRef.current?.parentElement?.scrollTo(0, commentsEndRef.current.parentElement.scrollHeight || 0);
                auditTrailEndRef.current?.parentElement?.scrollTo(0, auditTrailEndRef.current.parentElement.scrollHeight || 0);
        }
    }, [expandedView, check?.comments.length, isEditing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (flagDropdownRef.current && !flagDropdownRef.current.contains(event.target as Node)) {
                setIsFlagDropdownOpen(false);
            }
        };

        if (isFlagDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFlagDropdownOpen]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000); // Hide after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleTabChange = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < tabs.length) {
            setActiveTabIndex(newIndex);
        }
    };

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleTabChange(activeTabIndex + 1),
        onSwipedRight: () => handleTabChange(activeTabIndex - 1),
        preventScrollOnSwipe: true,
        trackMouse: true
    });

    if (!check || !editableCheck) return null;

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'signature') {
            setEditableCheck(prev => prev ? { ...prev, signature: value === 'true' } : null);
        } else {
            setEditableCheck(prev => prev ? { ...prev, [name]: name === 'amount' ? parseFloat(value) : value } : null);
        }
    };

    const parseAddress = (addressString: string) => {
        // This is a simplified parser. A production app should use a robust
        // geocoding service like Google Places API for accuracy.
        const parts = addressString.split(',').map(p => p.trim());
        if (parts.length >= 3) {
            const street = parts[0];
            const city = parts[1];
            const stateZipPart = parts[2].split(' ');
            const state = stateZipPart[0] || '';
            const zip = stateZipPart[1] || '';
            return { street, city, state, zip };
        }
        // Fallback for simpler addresses
        return { street: addressString, city: '', state: '', zip: '' };
    };

    const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEditableAddress(e.target.value);
        // In a real implementation, you would trigger an autocomplete lookup here.
        // For now, we just update the local state.
        const parsed = parseAddress(e.target.value);
        setEditableCheck(prev => prev ? { ...prev, payorAddress: { ...prev.payorAddress, ...parsed } } : null);
    };

        const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value as CheckCategory;
        const oldCategory = editableCheck?.category;

        if (newCategory !== oldCategory) {
            // Create a new check object, preserving common fields
            const newCheck: Check = {
                ...editableCheck,
                category: newCategory,
            };

            // Define which fields are category-specific to nullify them on change
            const categorySpecificFields: (keyof Check)[] = ['clientAccountNumber', 'chargeType', 'department', 'glCode', 'glDescription', 'depositingBank'];
            const categoriesWithClientAccount = [CheckCategory.HOMEOWNER_LOCKBOX, CheckCategory.MISC_HOMEOWNER_INCOME];
            
            // Set old category-specific fields to undefined
            categorySpecificFields.forEach(field => {
                // Preserve clientAccountNumber if both old and new categories use it.
                if (
                    field === 'clientAccountNumber' &&
                    categoriesWithClientAccount.includes(oldCategory!) &&
                    categoriesWithClientAccount.includes(newCategory)
                ) {
                    return;
                }
                delete (newCheck as Partial<Check>)[field];
            });
            setEditableCheck(newCheck);
        }
    };


    const handleSave = () => {
        if (editableCheck && currentUser) {
            const changes = Object.keys(editableCheck).filter(key => editableCheck[key as keyof Check] !== check[key as keyof Check]);
            if (changes.length > 0) {
                 const log = {
                    user: currentUser.name,
                    uid: currentUser.uid,
                    field: changes.join(', '),
                    oldValue: changes.map(key => check[key as keyof Check]).join(', '),
                    newValue: changes.map(key => editableCheck[key as keyof Check]).join(', '),
                 };
                onUpdateCheck(editableCheck, log);
            }
        }
        setIsEditing(false);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            onAddComment(check.id, commentText.trim());
            setCommentText('');
        }
    };
    
    
    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    const availableFlags = flags.filter(f => !check.flags.includes(f.id));

    const TabButton = ({ tabName, children }: { tabName: 'payment' | 'accounting' | 'banking' | 'image', children: React.ReactNode }) => {
        const tabIndex = tabs.indexOf(tabName);
        return (
            <button
                onClick={() => handleTabChange(tabIndex)}
                className={`flex items-center justify-center whitespace-nowrap py-3 px-4 font-medium text-center text-sm w-full transition-colors duration-200 bg-slate-200 ${
                    activeTabIndex === tabIndex 
                        ? `rounded-tab bg-white ${tabIndex === 0 ? 'left' : tabIndex === tabs.length - 1 ? 'right' : ''}` : ''}`}>
                {children}
            </button>
        )};

    const handleDownloadImage = async () => {
        if (!check.imageUrl) return;
        try {
            const response = await fetch(check.imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `check_${check.checkNumber || check.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading image:', error);
            alert('Failed to download image.');
        }
    };

    const handleCopyImage = async () => {
        if (!check.imageUrl) return;
        try {
            // Fetch the image and convert it to a PNG blob which is widely supported by the Clipboard API.
            const response = await fetch(check.imageUrl);
            const originalBlob = await response.blob();

            const image = await createImageBitmap(originalBlob);
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');
            ctx.drawImage(image, 0, 0);

            const pngBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });

            if (!pngBlob) throw new Error('Failed to convert image to PNG');

            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
            setToast({ message: 'Image copied to clipboard!', type: 'success' });
        } catch (error) {
            console.error('Error copying image:', error);
            setToast({ message: 'Failed to copy image.', type: 'error' });
        }
    };

    const getAutocompleteValue = (fieldName: keyof Check) => {
        const categoryFields = formConfig[editableCheck.category] || [];
        const allFields = [...formConfig.common, ...categoryFields];
        const fieldConfig = allFields.find(f => f.name === fieldName);
        return fieldConfig?.autocomplete;
    };

    const renderDetailField = (label: string, value: string | number | undefined | null, icon: React.ReactNode, name?: keyof Check, isLink: boolean = false, onClick?: () => void) => (
        <div>
            <label className="text-xs font-medium text-slate-500 flex items-center gap-2">{icon}{label}</label>
            {isEditing && name ? (
                <input
                    name={name} value={String(value || '')} onChange={handleInputChange}
                    autoComplete={getAutocompleteValue(name)}
                    className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" />
            ) : isLink && value ? (
                <button onClick={onClick} className="text-sm font-semibold text-sky-600 hover:underline mt-1">{value}</button>
            ) : (<p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{value || 'N/A'}</p>)}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'payment':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4"/>Date Received</label>
                            {isEditing ? <input name="date" type="date" value={new Date(editableCheck.date).toISOString().split('T')[0]} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{new Date(editableCheck.date).toLocaleDateString()}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><BuildingOfficeIcon className="h-4 w-4"/>Payee</label>
                            {isEditing ? <input name="payee" value={editableCheck.payee} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{editableCheck.payee}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><MapLocationIcon className="h-4 w-4"/>Payor Address</label>
                            {isEditing ? 
                                <input name="payorAddress" value={editableAddress} onChange={handleAddressChange} placeholder="e.g. 123 Main St, Anytown, ST 12345" className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" />
                             :
                                <> 
                                    <p className='text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200'>{editableAddress || 'N/A'}</p>
                                </>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><DocumentTextIcon className="h-4 w-4"/>Memo</label>
                            {isEditing ? <textarea name="memo" value={editableCheck.memo || ''} onChange={handleInputChange} rows={3} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm h-[5rem]" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200 h-[5rem]">{editableCheck.memo || 'N/A'}</p>}
                        </div>
                    </div>
                );
            case 'accounting':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isEditing && (
                            <div>
                                <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><FlagIcon className="h-4 w-4" />Status</label>
                                <select aria-label="Status" name="status" value={editableCheck.status} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm">
                                {Object.values(CheckStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><CategoryIcon className="h-4 w-4"/>Category</label>
                            {isEditing ? (
                                <select name="category" value={editableCheck.category} onChange={handleCategoryChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm">
                                    {Object.values(CheckCategory).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{editableCheck.category}</p>
                            )}
                        </div>
                        {editableCheck.batchId && renderDetailField("Batch", editableCheck.batchId, <HashtagIcon className="h-4 w-4" />, undefined, true, () => { if (editableCheck.batchId) onNavigateToBatch(editableCheck.batchId); })}
                        {editableCheck.trackingNumber && renderDetailField("Tracking #", editableCheck.trackingNumber, <HashtagIcon className="h-4 w-4" />)}
                        
                        {/* Category Specific Fields */}
                        {editableCheck.category === CheckCategory.HOMEOWNER_LOCKBOX && renderDetailField("Client Acct #", editableCheck.clientAccountNumber, <HashtagIcon className="h-4 w-4" />, 'clientAccountNumber')}
               
                        {editableCheck.category === CheckCategory.MISC_HOMEOWNER_INCOME && renderDetailField("Charge Type", editableCheck.chargeType, <DocumentTextIcon className="h-4 w-4" />, 'chargeType')}
                        {editableCheck.category === CheckCategory.MISC_HOMEOWNER_INCOME && renderDetailField("Client Acct #", editableCheck.clientAccountNumber, <HashtagIcon className="h-4 w-4" />, 'clientAccountNumber')}
                        
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && renderDetailField("Department", editableCheck.department, <BuildingOfficeIcon className="h-4 w-4" />, 'department')}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && renderDetailField("GL Code", editableCheck.glCode, <HashtagIcon className="h-4 w-4" />, 'glCode')}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && renderDetailField("GL Description", editableCheck.glDescription, <HashtagIcon className="h-4 w-4" />, 'glDescription')}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && renderDetailField("Depositing Bank", editableCheck.depositingBank, <BankBuildingIcon className="h-4 w-4" />, 'depositingBank')}
                    </div>
                );
            case 'banking':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><BankBuildingIcon className="h-4 w-4"/>Bank Name</label>
                            {isEditing ? <input name="bankName" value={editableCheck.bankName || ''} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{editableCheck.bankName || 'N/A'}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><SignatureIcon className="h-4 w-4"/>Is Signed</label>
                            {isEditing ? <select id="signature" name="signature" value={String(editableCheck.signature)} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm">
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select> : 
                                <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">
                                    {editableCheck.signature === true ? 'Yes' : 
                                     editableCheck.signature === false ? 'No' : 'N/A'}
                                </p>
                            }
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><LockClosedIcon className="h-4 w-4"/>Routing Number</label>
                            {isEditing ? <input name="routingNumber" value={editableCheck.routingNumber || ''} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{editableCheck.routingNumber || 'N/A'}</p>}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 flex items-center gap-2"><HashtagIcon className="h-4 w-4"/>Bank Account #</label>
                            {isEditing ? <input name="bankAccountNumber" value={editableCheck.bankAccountNumber} onChange={handleInputChange} className="w-full p-2 bg-sky-50 border border-sky-400 rounded-md shadow-sm text-sm" /> : <p className="text-sm text-slate-700 p-2 bg-slate-50 rounded-md border border-slate-200">{editableCheck.bankAccountNumber}</p>}
                        </div>
                </div>
                );
            case 'image':
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        {imageError ? (
                            <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                <p className="font-semibold text-amber-800">Image Expired</p>
                                <p className="text-xs text-amber-600">This image is older than 90 days and has been removed.</p>
                            </div>
                        ) : (
                            <>
                                <img src={check.imageUrl} alt="Check scan" className="w-full h-full rounded-lg object-contain max-h-80 border" onError={() => setImageError(true)} />
                                <div className="absolute h-full w-full flex absolute top-0 bottom-0 left-0 right-0 flex items-center gap-2 justify-center bg-black/30 transition-all duration-300 opacity-0 hover:opacity-100">
                                    <button onClick={handleDownloadImage} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border rounded-md"><ArrowDownTrayIcon className="h-4 w-4" /> Download</button>
                                    <button onClick={handleCopyImage} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border rounded-md"><ClipboardDocumentIcon className="h-4 w-4" /> Copy</button>
                                </div>
                            </>
                        )}
                </div>
                );
            default:
                return null;
        }
    }


    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

            <div className="relative w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Toast Notification */}
                {toast && (
                    <div
                        className={`absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all duration-300 z-50 ${
                            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        role="alert"
                    >
                        {toast.message}
                    </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">Check Details</h3>
                        <p className="text-sm text-slate-500 truncate">{check.payor} • {check.checkNumber || 'No #'} • {new Date(check.date).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIsEditing(p => !p); if (isEditing) handleSave(); else setEditableCheck(check); }} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${isEditing ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                            <PencilIcon className="h-4 w-4" /> {isEditing ? 'Save' : 'Edit'}
                        </button>
                        <button onClick={() => setIsDeleteConfirmOpen(true)} aria-label="Delete" className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                        <button onClick={onClose} aria-label="Close" className="ml-2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-50 hover:bg-slate-100">
                            <XMarkIcon className="h-5 w-5 text-slate-700" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={`h-[80vh] lg:overflow-y-hidden ${expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? "p-0 overflow-y-hidden": "p-5 overflow-y-auto"}`}>
                    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? "h-full min-h-0": "lg:h-full lg:min-h-0"}`}>
                        {/* Left: Details + Flags */}
                        <div className={expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? 'hidden' : 'relative lg:col-span-2 flex flex-col gap-4 min-h-0'}>

                            {/* --- NEW CHECK DETAILS CARD --- */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-md flex flex-col overflow-hidden details">
                                {/* Card Header */}
                                <div className={`flex flex-row justify-between items-start p-4 rounded-t-md ${typeColors[editableCheck.category] || 'bg-slate-100 border-slate-500'} border-b-2`}>
                                    <div>
                                        <div className="flex items-center">
                                           {isEditing ? <input name="payor" value={editableCheck.payor} onChange={handleInputChange} className="text-xl font-bold text-slate-800 border border-sky-400 rounded-md min-w-0" /> : <h2 className="text-xl font-bold text-slate-800">{editableCheck.payor}</h2>}
                                            {!isEditing && (
                                                <span className={`absolute top-0 -right-2 -translate-y-1/2 inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full border-2 ${["border", statusColors[editableCheck.status].split('-')[1], "500"].join('-')} ${statusColors[editableCheck.status]}`}>
                                                    {editableCheck.status}
                                                </span>
                                        )}
                                    </div>
                                        <span className="inline-flex pt-1 items-center text-sm text-slate-500 font-medium text-slate-600"><MapLocationIcon className="h-5 w-5 me-2"/>
                                        {isEditing ? <input name="associationName" value={editableCheck.associationName || ''} onChange={handleInputChange} className="border border-sky-400 rounded-md min-w-0" /> : editableCheck.associationName}
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-left sm:text-right mt-3 sm:pl-6 sm:mt-0 sm:ml-auto min-w-0 max-w-full">
                                        <div className="flex items-center gap-1 flex-shrink-1">
                                            {isEditing ? <UsDollarIcon className="h-5 w-5" /> : ''}
                                            {isEditing ? <input name="amount" value={editableCheck.amount.toFixed(2) || ''} onChange={handleInputChange} className="text-2xl sm:text-right font-bold text-slate-900 border border-sky-400 rounded-md min-w-0" /> : <p className="text-2xl font-bold text-slate-900">{formatAsCurrancy(editableCheck.amount)}</p>}
                                            </div>
                                        <div className="flex items-center gap-2 flex-shrink-1 sm:justify-end">
                                            <span className="inline-flex text-xs font-mono text-slate-400 mt-1">Check #
                                        {isEditing ? <input name="checkNumber" value={editableCheck.checkNumber || ''} onChange={handleInputChange} className='border border-sky-400 rounded-md min-w-0' /> : editableCheck.checkNumber}
                                            </span>
                                            </div>
                                    </div>
                                </div>

                                {/* Tab Navigation */}
                                <div className={``}>
                                    {/* Desktop Tabs */}
                                    <nav className="hidden sm:flex justify-around bg-slate-200 border-slate-200 border-t-4" aria-label="Tabs">
                                        <TabButton className="" tabName="payment"><BanknotesIcon className="h-5 w-5"/>Payment</TabButton>
                                        <TabButton tabName="accounting"><PencilIcon className="h-5 w-5"/>Accounting</TabButton>
                                        <TabButton tabName="banking"><BankBuildingIcon className="h-5 w-5"/>Banking</TabButton>
                                        <TabButton tabName="image"><ImageIcon className="h-5 w-5"/>Image</TabButton>
                                    </nav>
                                    {/* Mobile Tabs */}
                                    <nav className="sm:hidden flex items-center justify-between p-2 bg-slate-200" aria-label="Tabs">
                                        <button onClick={() => handleTabChange(activeTabIndex - 1)} disabled={activeTabIndex === 0} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50">
                                            <ChevronLeftIcon className="h-5 w-5" />
                                        </button>
                                        <div className="font-medium text-sm slate-sky-600 capitalize flex items-center gap-2">
                                            {activeTab === 'payment' && <BanknotesIcon className="h-5 w-5"/>}
                                            {activeTab === 'accounting' && <PencilIcon className="h-5 w-5"/>}
                                            {activeTab === 'banking' && <BankBuildingIcon className="h-5 w-5"/>}
                                            {activeTab === 'image' && <ImageIcon className="h-5 w-5"/>}
                                            {activeTab}
                                        </div>
                                        <button onClick={() => handleTabChange(activeTabIndex + 1)} disabled={activeTabIndex === tabs.length - 1} className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50">
                                            <ChevronRightIcon className="h-5 w-5" />
                                        </button>
                                    </nav>
                                </div>
                                
                                {/* Tab Content */}
                                <div {...swipeHandlers} className={`p-6 flex-1 overflow-y-auto min-h-0 ${activeTab === "image" ? 'relative': ''}`}>
                                    {renderTabContent()}
                                </div>
                            </div>
                            {/* --- END NEW CHECK DETAILS CARD --- */}

                            <div className="bg-white border border-slate-200 rounded-md max-h-full flex-shrink-0 flags">
                                <div className="flex items-center justify-between p-4 bg-slate-100 border-b border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-800">Flags</h4>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button onClick={() => setIsFlagDropdownOpen(p => !p)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50">
                                                <FlagIcon className="h-4 w-4" /> Add
                                            </button>

                                        </div>
                                        <button onClick={onOpenFlagManager} className="text-sm text-slate-500 hover:text-slate-700">Manage</button>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className='flex flex-wrap gap-2'>
                                    {checkFlags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {checkFlags.map(flag => (
                                                <span key={flag.id} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${flag.color} ${flag.textColor}`}>
                                                    {flag.name}
                                                    <button aria-label={`Remove flag ${flag.name}`} onClick={() => onToggleFlag(check.id, flag.id)}><XMarkIcon className="h-3 w-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No flags applied.</p>
                                    )}
                                    {isFlagDropdownOpen && (
                                        <div className="relative">
                                                <div ref={flagDropdownRef} className="absolute left-0 -top-4 lg:top-6 lg:-translate-y-full mt-2 flex flex-col gap-1 p-2 w-48 bg-slate-200 border-2 border-slate-400 rounded-md shadow-lg z-10">
                                                    {availableFlags.length > 0 ? availableFlags.map(flag => (
                                                        <div className="flex">
                                                            <button key={flag.id} onClick={() => { onToggleFlag(check.id, flag.id); setIsFlagDropdownOpen(false); }} className={`inline-flex py-1 px-3 rounded-full text-xs font-medium text-left text-slate-700 truncate ${flagColorVariant[flag.color].default} ${flagColorVariant[flag.color].hover} ${flag.textColor} hover:scale-105 hover:ring-2 hover:ring-slate-500`}>
                                                                {flag.name}
                                                            </button>
                                                        </div>
                                                        )) : <p className="text-sm text-slate-500 p-4">No flags to add.</p>}
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Comments & Audit */}
                        <div className={expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? 'lg:col-span-3 flex flex-col h-full min-h-0' : 'flex flex-col gap-4 min-h-0 max-h-[67vh] lg:max-h-full lg:h-full'}>
                            <div className={`bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col audit ${expandedView === 'AUDIT' ? 'h-full' : expandedView === "COMMENTS" ? 'hidden' : 'max-h-[40%]'}`}>
                                <div className="flex items-center justify-between p-4 bg-slate-100 border-b border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-800">Audit Trail</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'AUDIT' ? 'NONE' : 'AUDIT')} className="text-sm text-slate-500 hover:text-slate-700">{expandedView === 'AUDIT' ? 'Collapse' : 'Expand'}</button>
                                </div>

                                <div className={`p-4 space-y-3 flex-1 ${expandedView === 'AUDIT' ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
                                    {check.auditTrail.length > 0 ? check.auditTrail.slice().map(log => {
                                        const userDisplay = log.user.indexOf(' ') !== -1 ? log.user.slice(0, log.user.indexOf(' ')) : log.user;
                                        let actionText: React.ReactNode = '';
                                        switch (log.field) {
                                            case 'Check Created':
                                                actionText = 'created a new check';
                                                break;
                                            case 'Check Updated':
                                                actionText = 'updated a check';
                                                break;
                                            case 'Flag Added':
                                                actionText = `flagged check as "${log.newValue}"`;
                                                break;
                                            case 'Flag Removed':
                                                actionText = `removed flag for "${log.oldValue}"`;
                                                break;
                                            case 'Status':
                                                actionText = `changed status to "${log.newValue}"`;
                                                break;
                                            case 'Comment':
                                                actionText = 'added a comment';
                                                break;
                                            case 'Batch Processed':
                                                actionText = <>processed check with batch <button type="button" className="text-sky-600 hover:underline cursor-pointer" onClick={() => { if (editableCheck.batchId) onNavigateToBatch(editableCheck.batchId); }}>{editableCheck.batchId}</button></>;
                                                break;
                                            default:
                                                actionText = `changed ${log.field} from "${log.oldValue}" to "${log.newValue}"`;
                                        }
                                        return (
                                            <div key={log.id} className="text-xs">
                                                <p className="text-slate-600">
                                                    <span className="font-medium text-slate-800">{userDisplay}</span> {actionText}.
                                                </p>
                                                <p className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        )
                                        })
                                     : <p className="text-sm text-slate-400">No changes recorded.</p> }
                                    <div ref={auditTrailEndRef} />
                                </div>
                            </div>

                            <div className={`bg-white border border-slate-200 rounded-md flex flex-1 flex-col overflow-hidden comments ${expandedView === 'COMMENTS' ? 'min-h-0 h-full' : expandedView === "AUDIT" ? 'hidden' : ''}`}>
                                <div className="p-4 flex items-center justify-between bg-slate-100 border-b border-slate-200">
                                    <h4 className="text-sm font-semibold text-slate-800">Comments</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'COMMENTS' ? 'NONE' : 'COMMENTS')} className="text-sm text-slate-500 hover:text-slate-700">{expandedView === 'COMMENTS' ? 'Collapse' : 'Expand'}</button>
                                </div>
                                <div className={`flex-1 p-4 space-y-4 min-h-0 ${expandedView === 'COMMENTS' ? 'h-full overflow-y-auto' : 'overflow-y-hidden'}`}>
                                    {check.comments.length > 0 ? check.comments.map(comment => {
                                        const isCurrentUser = comment.authorUid === currentUser?.uid;
                                        const authorProfile = userProfilesMap.get(comment.authorUid);
                                        
                                        return (
                                            <div key={comment.id} className={`flex items-start gap-2.5 ${isCurrentUser ? 'justify-end' : ''}`}>
                                                {!isCurrentUser && (
                                                    authorProfile?.profilePictureUrl
                                                        ? <img className="w-8 h-8 rounded-full object-cover" src={authorProfile.profilePictureUrl} alt={comment.author} />
                                                        : <UserCircleIcon className="w-8 h-8 text-slate-300 flex-shrink-0" />
                                                )}
                                                <div className={`flex flex-col gap-1 w-full max-w-xs ${isCurrentUser ? 'items-end' : ''}`}>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-semibold text-gray-900">{isCurrentUser ? 'You' : comment.author}</span>
                                                        <span className="text-xs font-normal text-gray-500">{new Date(comment.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                                    </div>
                                                    <div className={`leading-1.5 p-3 rounded-xl ${isCurrentUser ? 'bg-sky-100 rounded-br-none' : 'bg-gray-100 rounded-bl-none'}`}>
                                                        <p className="text-sm font-normal text-gray-900 break-words">{comment.text}</p>
                                                    </div>
                                                </div>
                                                {isCurrentUser && (
                                                     userProfilesMap.get(currentUser.uid)?.profilePictureUrl
                                                        ? <img className="w-8 h-8 rounded-full object-cover" src={userProfilesMap.get(currentUser.uid)?.profilePictureUrl} alt="You" />
                                                        : <UserCircleIcon className="w-8 h-8 text-slate-300 flex-shrink-0" />
                                                )}
                                            </div>
                                        );
                                    }) : <p className="text-sm text-center text-slate-400 pt-8">No comments yet.</p>}
                                    <div ref={commentsEndRef} />
                                </div>
                                
                                <form onSubmit={handleCommentSubmit} className="p-4 border-t flex gap-2">
                                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                                    <button type="submit" className="inline-flex items-center justify-center px-3 py-2 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed" disabled={!commentText.trim()}>
                                        <SendIcon className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                {isDeleteConfirmOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm">
                            <h3 className="text-lg font-semibold text-slate-900">Delete Check</h3>
                            <p className="text-sm text-slate-500 mt-2">Are you sure? This action cannot be undone.</p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-3 py-1 rounded-md border border-slate-200">Cancel</button>
                                <button onClick={() => {onDeleteCheck(check.id); setIsDeleteConfirmOpen(false);}} className="px-3 py-1 rounded-md bg-red-600 text-white">Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
           
                
            </div>
    );
};

export default CheckDetailModal;