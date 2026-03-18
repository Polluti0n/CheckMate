import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Check, AuditLog, Flag, CheckStatus, UserProfile, CheckCategory, UserPreferences, CurrentUser } from '../types';
import { XMarkIcon, FlagIcon, PencilIcon, TrashIcon, SendIcon, UserCircleIcon, CalendarDaysIcon, BuildingOfficeIcon, DocumentTextIcon, BanknotesIcon, HashtagIcon, LockClosedIcon, BankBuildingIcon, MapLocationIcon, ImageIcon, ExclamationTriangleIcon, ArrowDownTrayIcon, ClipboardDocumentIcon, ChevronLeftIcon, ChevronUpDownIcon, ChevronRightIcon, SignatureIcon, UsDollarIcon, CategoryIcon, EllipsisVerticalIcon } from './icons';
import { CHECK_TYPE_COLORS, flagColorVariant } from '@/constants';
import { useNotification } from '@/contexts/NotificationContext';
import './CheckDetailsModal.css'

interface CheckDetailModalProps {
    check: Check | null;
    checks: Check[];
    flags: Flag[];
    onClose: () => void;
    onUpdateCheck: (id: string, updates: Partial<Check>, log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
    onAddComment: (checkId: string, commentText: string) => void;
    onToggleFlag: (checkId: string, flagId: string) => void;
    onOpenFlagManager: () => void;
    onDeleteCheck: (checkId: string) => void;
    currentUser: CurrentUser | null;
    allUsers: UserProfile[];
    onNavigateToBatch: (batchId: string) => void;
    onSelectCheck: (check: Check, replace?: boolean) => void;
    preferences: UserPreferences;
}

const statusColors: { [key in CheckStatus]: { border: string, bg: string, text: string, dark: { border: string, bg: string, text: string } } } = {
    [CheckStatus.RECEIVED]: { border: 'border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-800', dark: { border: 'border-yellow-700', bg: 'bg-yellow-900', text: 'text-yellow-300' } },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-800', dark: { border: 'border-orange-700', bg: 'bg-orange-900', text: 'text-orange-300' } },
    [CheckStatus.QUEUED]: { border: 'border-sky-500', bg: 'bg-sky-100', text: 'text-sky-800', dark: { border: 'border-sky-700', bg: 'bg-sky-900', text: 'text-sky-300' } },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-800', dark: { border: 'border-green-700', bg: 'bg-green-900', text: 'text-green-300' } },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-100', text: 'text-slate-800', dark: { border: 'border-slate-600', bg: 'bg-slate-800', text: 'text-slate-200' } },
};

const CheckDetailModal: React.FC<CheckDetailModalProps> = ({
    check,
    checks,
    flags,
    onClose,
    onUpdateCheck,
    onAddComment,
    onToggleFlag,
    onOpenFlagManager,
    onDeleteCheck,
    currentUser,
    allUsers,
    onNavigateToBatch,
    onSelectCheck,
    preferences
}) => {
    const { addToast } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [editableCheck, setEditableCheck] = useState<Check | null>(check);
    const [editableAddress, setEditableAddress] = useState('');
    const [commentText, setCommentText] = useState('');
    const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
    const [expandedView, setExpandedView] = useState<'NONE' | 'COMMENTS' | 'AUDIT'>('NONE');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'CLOSE' | 'NAVIGATE', payload?: Check } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const tabs: ('payment' | 'accounting' | 'banking' | 'image')[] = useMemo(() => ['payment', 'accounting', 'banking', 'image'], []);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [shimmerKey, setShimmerKey] = useState(0);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const activeTab = tabs[activeTabIndex];
    const [imageError, setImageError] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    const flagDropdownRef = useRef<HTMLDivElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const auditTrailEndRef = useRef<HTMLDivElement>(null);

    const userProfilesMap = useMemo(() => new Map(allUsers.map(user => [user.uid, user])), [allUsers]);
    const formatCurrency = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const darkMode = preferences.darkMode;
    const statusColor = darkMode && editableCheck ? statusColors[editableCheck.status].dark : editableCheck ? statusColors[editableCheck.status] : undefined;

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
    }, [check, expandedView]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
            if (flagDropdownRef.current && !flagDropdownRef.current.contains(event.target as Node)) {
                setIsFlagDropdownOpen(false);
            }
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };

        if (isFlagDropdownOpen || isStatusDropdownOpen || isActionMenuOpen || isUnsavedConfirmOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFlagDropdownOpen, isStatusDropdownOpen, isActionMenuOpen, isUnsavedConfirmOpen]);

    const handleClose = () => {
        if (isEditing) {
            setPendingAction({ type: 'CLOSE' });
            setIsUnsavedConfirmOpen(true);
        } else {
            onClose();
        }
    };

    const handleNavigate = (targetCheck: Check) => {
        if (isEditing) {
            setPendingAction({ type: 'NAVIGATE', payload: targetCheck });
            setIsUnsavedConfirmOpen(true);
        } else {
            onSelectCheck(targetCheck, true);
        }
    };

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleTabChange = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < tabs.length) {
            setActiveTabIndex(newIndex);
            setShimmerKey(prev => prev + 1);
        }
    };

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => handleTabChange(activeTabIndex + 1),
        onSwipedRight: () => handleTabChange(activeTabIndex - 1),
        preventScrollOnSwipe: true,
        trackMouse: true
    });

    if (!check || !editableCheck) return null;

    const SHIMMER_COLORS: Record<CheckCategory, string> = {
        [CheckCategory.HOMEOWNER_LOCKBOX]: '14, 165, 233',
        [CheckCategory.MISC_HOMEOWNER_INCOME]: '34, 197, 94',
        [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: '168, 85, 247',
        [CheckCategory.COMMUNITY_ARCHIVES]: '100, 116, 139',
    };
    const currentShimmerColor = SHIMMER_COLORS[editableCheck.category] || '14, 165, 233';

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'signature') {
            setEditableCheck(prev => prev ? { ...prev, signature: value === 'true' } : null);
        } else {
            setEditableCheck(prev => prev ? { ...prev, [name]: name === 'amount' ? parseFloat(value) : value } : null);
        }
    };

    const handleContentEditableChange = (name: keyof Check, value: string) => {
        setEditableCheck(prev => {
            if (!prev) return null;
            let parsedValue: any = value;
            if (name === 'amount') {
                const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
                parsedValue = isNaN(num) ? 0 : num;
            }
            return { ...prev, [name]: parsedValue };
        });
    };

    const EditableField = ({ value, isEditing, onChange, className = "" }: { value: string | number | undefined, isEditing: boolean, onChange: (val: string) => void, className?: string }) => {
        return (
            <span
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => onChange(e.currentTarget.textContent || '')}
                className={`outline-none transition-all ${isEditing ? 'border-b-2 border-dashed border-sky-400 bg-sky-50 dark:bg-sky-900/40 rounded px-1' : ''} ${className}`}
            >
                {value}
            </span>
        );
    };

    const parseAddress = (addressString: string) => {
        const parts = addressString.split(',').map(p => p.trim());
        if (parts.length >= 3) {
            const street = parts[0];
            const city = parts[1];
            const stateZipPart = parts[2].split(' ');
            const state = stateZipPart[0] || '';
            const zip = stateZipPart[1] || '';
            return { street, city, state, zip };
        }
        return { street: addressString, city: '', state: '', zip: '' };
    };

    const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newCategory = e.target.value as CheckCategory;
        const oldCategory = editableCheck?.category;

        if (newCategory !== oldCategory) {
            const newCheck: Check = { ...editableCheck, category: newCategory };
            const categorySpecificFields: (keyof Check)[] = ['clientAccountNumber', 'chargeType', 'department', 'glCode', 'glDescription', 'depositingBank'];
            const categoriesWithClientAccount = [CheckCategory.HOMEOWNER_LOCKBOX, CheckCategory.MISC_HOMEOWNER_INCOME];

            categorySpecificFields.forEach(field => {
                if (field === 'clientAccountNumber' && categoriesWithClientAccount.includes(oldCategory!) && categoriesWithClientAccount.includes(newCategory)) {
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
                const oldValues: { [key: string]: any } = {};
                const newValues: { [key: string]: any } = {};
                changes.forEach(key => {
                    oldValues[key] = check[key as keyof Check];
                    newValues[key] = editableCheck[key as keyof Check];
                });

                const log = {
                    user: currentUser.name,
                    uid: currentUser.uid,
                    field: 'Check updated',
                    oldValue: JSON.stringify(oldValues),
                    newValue: JSON.stringify(newValues),
                };

                let updates: Partial<Check> = { ...editableCheck };

                // Automated transition: Received -> Confirming Details
                if (check.status === CheckStatus.RECEIVED && editableCheck.status === CheckStatus.RECEIVED) {
                    updates.status = CheckStatus.CONFIRMING_DETAILS;
                    addToast({
                        notification: { message: 'Check moved to Confirming Details' },
                        alertType: 'info',
                        handleToastClick: () => {
                            onUpdateCheck(check.id, { status: CheckStatus.RECEIVED }, {
                                user: currentUser.name,
                                uid: currentUser.uid,
                                field: 'status',
                                oldValue: CheckStatus.CONFIRMING_DETAILS,
                                newValue: CheckStatus.RECEIVED
                            });
                        }
                    });
                }
                onUpdateCheck(check.id, updates, log);
            }
        }
        setIsEditing(false);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim() && currentUser) {
            onAddComment(check.id, commentText.trim());
            setCommentText('');

            // Automated transition: Received -> Confirming Details
            if (check.status === CheckStatus.RECEIVED) {
                onUpdateCheck(check.id, { status: CheckStatus.CONFIRMING_DETAILS }, {
                    user: currentUser.name,
                    uid: currentUser.uid,
                    field: 'status',
                    oldValue: CheckStatus.RECEIVED,
                    newValue: CheckStatus.CONFIRMING_DETAILS
                });
                addToast({
                    notification: { message: 'Check moved to Confirming Details' },
                    alertType: 'info',
                    handleToastClick: () => {
                        onUpdateCheck(check.id, { status: CheckStatus.RECEIVED }, {
                            user: currentUser.name,
                            uid: currentUser.uid,
                            field: 'status',
                            oldValue: CheckStatus.CONFIRMING_DETAILS,
                            newValue: CheckStatus.RECEIVED
                        });
                    }
                });
            }
        }
    };

    const handleMoveToQueue = () => {
        if (check && currentUser) {
            onUpdateCheck(check.id, { status: CheckStatus.QUEUED }, {
                user: currentUser.name,
                uid: currentUser.uid,
                field: 'status',
                oldValue: check.status,
                newValue: CheckStatus.QUEUED
            });
            addToast({
                notification: { message: 'Check moved to Queue' },
                alertType: 'success',
                handleToastClick: () => { }
            });
        }
    };

    const batchChecks = useMemo(() => {
        if (!check.batchId) return [];
        return checks.filter(c => c.batchId === check.batchId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [check.batchId, checks]);

    const currentIndex = batchChecks.findIndex(c => c.id === check.id);
    const prevCheck = currentIndex > 0 ? batchChecks[currentIndex - 1] : null;
    const nextCheck = currentIndex < batchChecks.length - 1 ? batchChecks[currentIndex + 1] : null;

    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    const availableFlags = flags.filter(f => !check.flags.includes(f.id));

    const TabButton = ({ tabName, children, className = "" }: { tabName: 'payment' | 'accounting' | 'banking' | 'image', children: React.ReactNode, className?: string }) => {
        const tabIndex = tabs.indexOf(tabName);
        return (
            <button
                onClick={() => handleTabChange(tabIndex)}
                className={`relative flex items-center group justify-center gap-2 whitespace-nowrap py-3 px-4 font-medium text-center text-sm w-full transition-all duration-200 ${className} ${activeTabIndex === tabIndex
                    ? `text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/10` : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'}`}
            >
                {children}
                {activeTabIndex === tabIndex && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-sky-600 dark:bg-sky-400 rounded-t-lg" />
                )}
            </button>
        )
    };

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
        }
    };

    const handleCopyImage = async () => {
        if (!check.imageUrl) return;
        try {
            const response = await fetch(check.imageUrl);
            const originalBlob = await response.blob();
            const image = await createImageBitmap(originalBlob);
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0);
                const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (pngBlob) {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
                    setToast({ message: 'Image copied to clipboard!', type: 'success' });
                }
            }
        } catch (error) {
            console.error('Error copying image:', error);
        }
    };



    const renderDetailField = (label: string, value: string | number | undefined | null, icon: React.ReactNode, name?: keyof Check, isLink: boolean = false, onClick?: () => void) => (
        <div>
            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">{icon}{label}</label>
            {isEditing && name ? (
                <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">
                    <EditableField value={value || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange(name, val)} className="block w-full" />
                </p>
            ) : isLink && value ? (
                <button onClick={onClick} className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline mt-1">{value}</button>
            ) : (<p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">{value || 'N/A'}</p>)}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'payment':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4" />Date Received</label>
                            {isEditing ? <input name="date" type="date" value={new Date(editableCheck.date).toISOString().split('T')[0]} onChange={handleInputChange} className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none transition-all" /> : <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">{new Date(editableCheck.date).toLocaleDateString()}</p>}
                        </div>
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><BuildingOfficeIcon className="h-4 w-4" />Payee</label>
                            <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">
                                <EditableField value={editableCheck.payee} isEditing={isEditing} onChange={(val) => handleContentEditableChange('payee', val)} className="block w-full" />
                            </p>
                        </div>
                        <div className={`sm:col-span-2 ${isEditing ? 'editable-shimmer' : ''}`}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><MapLocationIcon className="h-4 w-4" />Payor Address</label>
                            <p className='text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700'>
                                <EditableField value={editableAddress || ''} isEditing={isEditing} onChange={(val) => {
                                    setEditableAddress(val);
                                    const parsed = parseAddress(val);
                                    setEditableCheck(prev => prev ? { ...prev, payorAddress: { ...prev.payorAddress, ...parsed } } : null);
                                }} className="block w-full min-h-[1.25rem]" />
                            </p>
                        </div>
                        <div className={`sm:col-span-2 ${isEditing ? 'editable-shimmer' : ''}`}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><DocumentTextIcon className="h-4 w-4" />Memo</label>
                            <div className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700 min-h-[5rem] overflow-y-auto">
                                <EditableField value={editableCheck.memo || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('memo', val)} className="block w-full h-full min-h-[4rem]" />
                            </div>
                        </div>
                    </div>
                );
            case 'accounting':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><CategoryIcon className="h-4 w-4" />Category</label>
                            {isEditing ? (
                                <select name="category" value={editableCheck.category} onChange={handleCategoryChange} className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none transition-all">
                                    {Object.values(CheckCategory).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">{editableCheck.category}</p>
                            )}
                        </div>
                        {editableCheck.batchId && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Batch", editableCheck.batchId, <HashtagIcon className="h-4 w-4" />, undefined, true, () => { if (editableCheck.batchId) onNavigateToBatch(editableCheck.batchId); })}</div>}
                        {editableCheck.trackingNumber && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Tracking #", editableCheck.trackingNumber, <HashtagIcon className="h-4 w-4" />, 'trackingNumber')}</div>}
                        {editableCheck.category === CheckCategory.HOMEOWNER_LOCKBOX && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Client Acct #", editableCheck.clientAccountNumber, <HashtagIcon className="h-4 w-4" />, 'clientAccountNumber')}</div>}
                        {editableCheck.category === CheckCategory.MISC_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Charge Type", editableCheck.chargeType, <DocumentTextIcon className="h-4 w-4" />, 'chargeType')}</div>}
                        {editableCheck.category === CheckCategory.MISC_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Client Acct #", editableCheck.clientAccountNumber, <HashtagIcon className="h-4 w-4" />, 'clientAccountNumber')}</div>}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Department", editableCheck.department, <BuildingOfficeIcon className="h-4 w-4" />, 'department')}</div>}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("GL Code", editableCheck.glCode, <HashtagIcon className="h-4 w-4" />, 'glCode')}</div>}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("GL Description", editableCheck.glDescription, <HashtagIcon className="h-4 w-4" />, 'glDescription')}</div>}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && <div className={isEditing ? 'editable-shimmer' : ''}>{renderDetailField("Depositing Bank", editableCheck.depositingBank, <BankBuildingIcon className="h-4 w-4" />, 'depositingBank')}</div>}
                    </div>
                );
            case 'banking':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><BankBuildingIcon className="h-4 w-4" />Bank Name</label>
                            <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">
                                <EditableField value={editableCheck.bankName || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('bankName', val)} className="block w-full min-h-[1.25rem]" />
                            </p>
                        </div>
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><SignatureIcon className="h-4 w-4" />Is Signed</label>
                            {isEditing ? (
                                <select name="signature" value={String(editableCheck.signature)} onChange={handleInputChange} className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none transition-all">
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            ) : (
                                <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">{editableCheck.signature ? 'Yes' : 'No'}</p>
                            )}
                        </div>
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><LockClosedIcon className="h-4 w-4" />Routing Number</label>
                            <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">
                                <EditableField value={editableCheck.routingNumber || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('routingNumber', val)} className="block w-full min-h-[1.25rem]" />
                            </p>
                        </div>
                        <div className={isEditing ? 'editable-shimmer' : ''}>
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2"><HashtagIcon className="h-4 w-4" />Bank Account #</label>
                            <p className="text-sm text-slate-700 dark:text-gray-300 p-2 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700">
                                <EditableField value={editableCheck.bankAccountNumber || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('bankAccountNumber', val)} className="block w-full min-h-[1.25rem]" />
                            </p>
                        </div>
                    </div>
                );
            case 'image':
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        {imageError ? (
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-700 rounded-lg">
                                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto mb-2" />
                                <p className="font-semibold text-amber-800 dark:text-amber-300">Image Expired</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400">This image is older than 90 days.</p>
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex flex-col items-center">
                                <img src={check.imageUrl} alt="Check scan" className="w-full h-full rounded-lg object-contain max-h-80 border" onError={() => setImageError(true)} />
                                <div className="absolute h-full w-full flex items-center gap-2 justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                    <button onClick={handleDownloadImage} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 border rounded-md"><ArrowDownTrayIcon className="h-4 w-4" /> Download</button>
                                    <button onClick={handleCopyImage} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 border rounded-md"><ClipboardDocumentIcon className="h-4 w-4" /> Copy</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />

            <div
                key={shimmerKey}
                className={`relative w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden`}
                style={{ '--shimmer-color': currentShimmerColor } as React.CSSProperties}
            >
                <div className="flex items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0">
                            <h3 className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white truncate leading-tight">Check Details</h3>
                            <p className="flex text-sm text-slate-500 dark:text-gray-400 truncate">
                                <span className="hidden sm:block pr-1">{check.payor} • </span>{check.checkNumber || 'No #'}<span className="hidden sm:block pl-1"> • {new Date(check.date).toLocaleDateString()}</span></p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Desktop Navigation Arrows */}
                        {batchChecks.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-gray-700 p-1 rounded-md">
                                <button
                                    onClick={() => prevCheck && handleNavigate(prevCheck)}
                                    disabled={!prevCheck}
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-medium text-slate-500 dark:text-gray-400 px-1">
                                    {currentIndex + 1} / {batchChecks.length}
                                </span>
                                <button
                                    onClick={() => nextCheck && handleNavigate(nextCheck)}
                                    disabled={!nextCheck}
                                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Desktop Action Buttons */}
                        <div className="hidden sm:flex items-center gap-2">
                            {(check.status === CheckStatus.RECEIVED || check.status === CheckStatus.CONFIRMING_DETAILS) && (
                                <button onClick={handleMoveToQueue} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-sm font-medium transition-colors">
                                    <ArrowDownTrayIcon className="h-4 w-4 rotate-180" /> <span>Add to Queue</span>
                                </button>
                            )}
                            <button onClick={() => { setIsEditing(p => !p); if (isEditing) handleSave(); else { setEditableCheck(check); setShimmerKey(k => k + 1); } }} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${isEditing ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700' : 'border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600'}`}>
                                <PencilIcon className="h-4 w-4" /> <span>{isEditing ? 'Save' : 'Edit'}</span>
                            </button>
                            {isEditing && (
                                <button onClick={() => { setIsEditing(false); setEditableCheck(check); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 text-sm font-medium transition-colors">
                                    <XMarkIcon className="h-4 w-4" /> <span>Cancel</span>
                                </button>
                            )}
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="inline-flex items-center px-2 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Mobile Navigation Arrows (Simplified) */}
                        {batchChecks.length > 0 && (
                            <div className="sm:hidden flex items-center gap-0.5 bg-slate-100 dark:bg-gray-700 p-0.5 rounded-md">
                                <button onClick={() => prevCheck && handleNavigate(prevCheck)} disabled={!prevCheck} className="p-1 rounded-md disabled:opacity-30"><ChevronLeftIcon className="h-4 w-4" /></button>
                                <button onClick={() => nextCheck && handleNavigate(nextCheck)} disabled={!nextCheck} className="p-1 rounded-md disabled:opacity-30"><ChevronRightIcon className="h-4 w-4" /></button>
                            </div>
                        )}

                        {/* Mobile Action Menu */}
                        <div className="sm:hidden relative" ref={actionMenuRef}>
                            <button onClick={() => setIsActionMenuOpen(p => !p)} className="p-2 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 ring-1 ring-slate-200 dark:ring-gray-600">
                                <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>

                            {isActionMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-700 py-1 z-[70] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => { setIsEditing(p => !p); if (isEditing) handleSave(); else { setEditableCheck(check); setShimmerKey(k => k + 1); } setIsActionMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3">
                                        <PencilIcon className="h-4 w-4" /> {isEditing ? 'Save Changes' : 'Edit Check'}
                                    </button>
                                    {isEditing && (
                                        <button onClick={() => { setIsEditing(false); setEditableCheck(check); setIsActionMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3">
                                            <XMarkIcon className="h-4 w-4" /> Cancel Edit
                                        </button>
                                    )}
                                    {(check.status === CheckStatus.RECEIVED || check.status === CheckStatus.CONFIRMING_DETAILS) && (
                                        <button onClick={() => { handleMoveToQueue(); setIsActionMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-gray-700 flex items-center gap-3 border-t border-slate-100 dark:border-gray-700">
                                            <ArrowDownTrayIcon className="h-4 w-4 rotate-180" /> Add to Queue
                                        </button>
                                    )}
                                    <button onClick={() => { setIsDeleteConfirmOpen(true); setIsActionMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-3 border-t border-slate-100 dark:border-gray-700">
                                        <TrashIcon className="h-4 w-4" /> Delete Check
                                    </button>
                                </div>
                            )}
                        </div>

                        <button onClick={handleClose} className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-50 dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 ring-1 ring-slate-200 dark:ring-gray-600 ml-1">
                            <XMarkIcon className="h-5 w-5 text-slate-700 dark:text-gray-300" />
                        </button>
                    </div>
                </div>

                <div className={`h-[80vh] flex flex-col ${expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? "p-0 overflow-hidden" : "p-4 sm:p-5 overflow-y-auto"}`}>
                    <div className={`flex flex-col lg:grid lg:grid-cols-3 gap-6 ${expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? 'h-full' : 'min-h-0'}`}>
                        <div className={expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? 'hidden' : 'relative lg:col-span-2 flex flex-col gap-6 lg:h-full lg:min-h-0'}>
                            {!isEditing && statusColor && (
                                <span className={`absolute top-0 -right-2 -translate-y-1/2 inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-full border-2 ${statusColor.border} ${statusColor.bg} ${statusColor.text}`}>
                                    {editableCheck.status}
                                </span>
                            )}
                            {isEditing && statusColor && (
                                <div ref={statusDropdownRef} className={`absolute top-0 -right-2 -translate-y-1/2 z-10 ${isEditing ? 'editable-shimmer' : ''}`}>
                                    <button type="button" onClick={() => setIsStatusDropdownOpen(p => !p)} className={`inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full border-2 ${statusColor.border} ${statusColor.bg} ${statusColor.text} outline-none transition-all`}>
                                        {editableCheck.status}
                                        <ChevronUpDownIcon className="h-4 w-4" />
                                    </button>
                                    {isStatusDropdownOpen && (
                                        <div className="absolute top-full right-0 text-right mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 p-1 flex flex-col gap-1 z-20">
                                            {Object.values(CheckStatus).filter(s => s !== editableCheck.status).map(s => {
                                                const dropdownColor = darkMode ? statusColors[s].dark : statusColors[s];
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => { setEditableCheck(prev => prev ? ({ ...prev, status: s }) : null); setIsStatusDropdownOpen(false); }}
                                                        className={`items-center text-sm font-medium px-2.5 py-1 rounded-full border-2 ${dropdownColor.border} ${dropdownColor.bg} ${dropdownColor.text} hover:opacity-80 transition-opacity`}
                                                    >{s}</button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md flex flex-col overflow-hidden details lg:min-h-0 lg:flex-1">
                                <div className={`flex flex-row justify-between items-start p-4 rounded-t-md shadow-lg ${darkMode ? "bg-gradient-to-b from-gray-900/80 " + CHECK_TYPE_COLORS[editableCheck.category].dark.gradient : CHECK_TYPE_COLORS[editableCheck.category].bg}`}>
                                    <div className={isEditing ? 'editable-shimmer' : ''}>
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-white"><EditableField value={editableCheck.payor} isEditing={isEditing} onChange={(val) => handleContentEditableChange('payor', val)} /></h2>
                                        <span className="inline-flex pt-1 items-center text-sm font-medium text-slate-600 dark:text-gray-300"><MapLocationIcon className="h-5 w-5 me-2" />
                                            <EditableField value={editableCheck.associationName || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('associationName', val)} />
                                        </span>
                                    </div>
                                    <div className={`flex flex-col text-right ${isEditing ? 'editable-shimmer' : ''}`}>
                                        <div className="flex items-center gap-1 justify-end">
                                            {isEditing ? <UsDollarIcon className="h-5 w-5 text-slate-700 dark:text-gray-300" /> : ''}
                                            {isEditing ? <EditableField value={editableCheck.amount} isEditing={isEditing} onChange={(val) => handleContentEditableChange('amount', val)} className="text-2xl text-right font-bold text-slate-900 dark:text-gray-300 min-w-16" /> : <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(editableCheck.amount)}</p>}
                                        </div>
                                        <span className="text-xs font-mono text-slate-400 dark:text-gray-500 mt-1">Check #
                                            <EditableField value={editableCheck.checkNumber || ''} isEditing={isEditing} onChange={(val) => handleContentEditableChange('checkNumber', val)} className="ml-1" />
                                        </span>
                                    </div>
                                </div>

                                <div className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800/50">
                                    {/* Desktop Tabs */}
                                    <nav className="hidden sm:flex justify-around" aria-label="Tabs">
                                        <TabButton tabName="payment"><BanknotesIcon className="h-5 w-5" />Payment</TabButton>
                                        <TabButton tabName="accounting"><PencilIcon className="h-5 w-5" />Accounting</TabButton>
                                        <TabButton tabName="banking"><BankBuildingIcon className="h-5 w-5" />Banking</TabButton>
                                        <TabButton tabName="image"><ImageIcon className="h-5 w-5" />Image</TabButton>
                                    </nav>
                                    {/* Mobile Tabs */}
                                    <nav className="sm:hidden flex items-center justify-between p-2" aria-label="Tabs">
                                        <button onClick={() => handleTabChange(activeTabIndex - 1)} disabled={activeTabIndex === 0} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                                            <ChevronLeftIcon className="h-5 w-5 text-slate-700 dark:text-gray-300" />
                                        </button>
                                        <div className="font-medium text-sm text-slate-800 dark:text-gray-200 capitalize flex items-center gap-2">
                                            {activeTab === 'payment' && <BanknotesIcon className="h-5 w-5" />}
                                            {activeTab === 'accounting' && <PencilIcon className="h-5 w-5" />}
                                            {activeTab === 'banking' && <BankBuildingIcon className="h-5 w-5" />}
                                            {activeTab === 'image' && <ImageIcon className="h-5 w-5" />}
                                            {activeTab}
                                        </div>
                                        <button onClick={() => handleTabChange(activeTabIndex + 1)} disabled={activeTabIndex === tabs.length - 1} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors">
                                            <ChevronRightIcon className="h-5 w-5 text-slate-700 dark:text-gray-300" />
                                        </button>
                                    </nav>
                                </div>

                                <div {...swipeHandlers} key={`${activeTab}-${shimmerKey}`} className="p-6 overflow-y-auto lg:h-full lg:min-h-0 relative">
                                    {renderTabContent()}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md flex-shrink-0 flags">
                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-gray-800/50 border-b border-slate-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Flags</h4>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button onClick={() => setIsFlagDropdownOpen(p => !p)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium bg-white dark:bg-gray-600 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-500 hover:bg-slate-50 dark:hover:bg-gray-500">
                                                <FlagIcon className="h-4 w-4" /> Add
                                            </button>
                                            {isFlagDropdownOpen && (
                                                <div ref={flagDropdownRef} className="absolute right-0 bottom-full mb-2 flex flex-col gap-1 p-2 w-48 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-20">
                                                    {availableFlags.length > 0 ? availableFlags.map(f => (
                                                        <button key={f.id} onClick={() => { onToggleFlag(check.id, f.id); setIsFlagDropdownOpen(false); }} className={`inline-flex py-1 px-3 rounded-full text-xs font-medium text-left ${flagColorVariant[f.color].default} ${f.textColor} hover:opacity-80`}>
                                                            {f.name}
                                                        </button>
                                                    )) : <p className="text-xs text-slate-500 dark:text-gray-400 p-2 text-center">No flags available</p>}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={onOpenFlagManager} className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300">Manage</button>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-wrap gap-2 min-h-[3rem]">
                                    {checkFlags.length > 0 ? checkFlags.map(f => (
                                        <span key={f.id} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${f.color} ${f.textColor}`}>
                                            {f.name}
                                            <button onClick={() => onToggleFlag(check.id, f.id)}><XMarkIcon className="h-3 w-3" /></button>
                                        </span>
                                    )) : <p className="text-xs text-slate-500 dark:text-gray-400">No flags applied.</p>}
                                </div>
                            </div>
                        </div>

                        <div className={expandedView === 'AUDIT' || expandedView === 'COMMENTS' ? 'lg:col-span-3 flex flex-col h-full' : 'flex flex-col gap-6 lg:h-full lg:min-h-0'}>
                            <div className={`bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md flex flex-col ${expandedView === 'AUDIT' ? 'h-full' : expandedView === "COMMENTS" ? 'hidden' : 'max-h-[16rem] lg:max-h-none lg:flex-1 lg:min-h-0'}`}>
                                <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Audit Trail</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'AUDIT' ? 'NONE' : 'AUDIT')} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">{expandedView === 'AUDIT' ? 'Collapse' : 'Expand'}</button>
                                </div>
                                <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
                                    {check.auditTrail.length > 0 ? check.auditTrail.slice().reverse().map(log => {
                                        let changes: { field: string, old: any, new: any }[] = [];
                                        if (log.field === 'Check updated') {
                                            try {
                                                const olds = JSON.parse(log.oldValue);
                                                const news = JSON.parse(log.newValue);
                                                for (const key in news) {
                                                    changes.push({ field: key, old: olds[key], new: news[key] });
                                                }
                                            } catch (e) {
                                                changes.push({ field: 'check details', old: 'previous', new: 'new' });
                                            }
                                        } else {
                                            changes.push({ field: log.field, old: log.oldValue, new: log.newValue });
                                        }

                                        return (
                                            <div key={log.id} className="mb-3">
                                                {changes.length === 1 ? (
                                                    <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
                                                        <span className="font-semibold text-slate-800 dark:text-white">{log.user.split(' ')[0]}</span> changed the {changes[0].field} from <span className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 line-through">{String(changes[0].old) || 'none'}</span> to <span className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300">{String(changes[0].new) || 'none'}</span>
                                                    </p>
                                                ) : (
                                                    <>
                                                        <p className="text-slate-600 dark:text-gray-300">
                                                            <span className="font-semibold text-slate-800 dark:text-white">{log.user.split(' ')[0]}</span> updated multiple details:
                                                        </p>
                                                        <ul className="list-disc pl-5 mt-1 space-y-1.5">
                                                            {changes.map((c, i) => (
                                                                <li key={i} className="text-slate-600 dark:text-gray-300 leading-relaxed">
                                                                    changed the {c.field} from <span className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 line-through">{String(c.old) || 'none'}</span> to <span className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300">{String(c.new) || 'none'}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                )}
                                                <p className="text-slate-400 dark:text-gray-500 mt-1.5">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        )
                                    }) : <p className="text-slate-400 dark:text-gray-500 italic">No recording history.</p>}
                                    <div ref={auditTrailEndRef} />
                                </div>
                            </div>

                            <div className={`bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-md flex flex-col ${expandedView === 'COMMENTS' ? 'h-full' : expandedView === "AUDIT" ? 'hidden' : 'max-h-[16rem] lg:max-h-none lg:flex-1 lg:min-h-0'}`}>
                                <div className="p-4 flex items-center justify-between bg-slate-100 dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Comments</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'COMMENTS' ? 'NONE' : 'COMMENTS')} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">{expandedView === 'COMMENTS' ? 'Collapse' : 'Expand'}</button>
                                </div>
                                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                    {check.comments.map(comment => {
                                        const profile = userProfilesMap.get(comment.authorUid);
                                        const isCurrentUser = comment.authorUid === currentUser?.uid;
                                        return (
                                            <div key={comment.id} className={`flex items-start gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                                {profile?.profilePictureUrl ? (
                                                    <img src={profile.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                ) : <UserCircleIcon className="w-8 h-8 text-slate-300 dark:text-gray-600" />}
                                                <div className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'items-end' : ''}`}>
                                                    <div className={`p-3 rounded-lg text-sm ${isCurrentUser ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-gray-600 dark:text-white rounded-tl-none'}`}>
                                                        {comment.text}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">{new Date(comment.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={commentsEndRef} />
                                </div>
                                <form onSubmit={handleCommentSubmit} className="p-4 border-t dark:border-gray-600 flex gap-2">
                                    <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500 dark:text-white" />
                                    <button type="submit" disabled={!commentText.trim()} className="p-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50"><SendIcon className="h-4 w-4" /></button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {isDeleteConfirmOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Check?</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">This will permanently remove this record. This action cannot be undone.</p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 transition-colors">Cancel</button>
                                <button onClick={() => { onDeleteCheck(check.id); setIsDeleteConfirmOpen(false); handleClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">Delete Permanently</button>
                            </div>
                        </div>
                    </div>
                )}
                {isUnsavedConfirmOpen && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-gray-700 animate-in zoom-in duration-200">
                            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                                <ExclamationTriangleIcon className="h-6 w-6" />
                                <h3 className="text-lg font-bold">Unsaved Changes</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
                                You are currently in edit mode. Any changes you've made will be lost if you leave without saving.
                            </p>
                            <div className="mt-8 flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setIsUnsavedConfirmOpen(false);
                                        setIsEditing(false);
                                        if (pendingAction?.type === 'CLOSE') {
                                            onClose();
                                        } else if (pendingAction?.type === 'NAVIGATE' && pendingAction.payload) {
                                            onSelectCheck(pendingAction.payload, true);
                                        }
                                        setPendingAction(null);
                                    }}
                                    className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all shadow-md active:scale-[0.98]"
                                >
                                    Discard Changes
                                </button>
                                <button
                                    onClick={() => { setIsUnsavedConfirmOpen(false); setPendingAction(null); }}
                                    className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-600 transition-all active:scale-[0.98]"
                                >
                                    Return to Editing
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckDetailModal;