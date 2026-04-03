import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { 
    Check, 
    AuditLog, 
    Flag, 
    CheckStatus, 
    UserProfile, 
    CheckCategory, 
    UserPreferences, 
    CurrentUser 
} from '../types';
import { 
    CalendarDaysIcon, 
    BuildingOfficeIcon, 
    MapLocationIcon, 
    DocumentTextIcon, 
    BanknotesIcon, 
    ImageIcon, 
    BankBuildingIcon, 
    SignatureIcon, 
    LockClosedIcon, 
    HashtagIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    ChevronUpDownIcon, 
    EllipsisVerticalIcon, 
    PencilIcon, 
    XMarkIcon, 
    TrashIcon, 
    ArrowDownTrayIcon, 
    ClipboardDocumentIcon, 
    ExclamationTriangleIcon,
    ChatIcon
} from './icons';
import { useNotification } from '@/contexts/NotificationContext';
import './CheckDetailView.css';
import MembersDropdown from './common/MembersDropdown';
import ChatComponent from './ChatComponent';
import { CHECK_TYPE_COLORS } from '../constants';

const USDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

const formatCurrency = (amount: number) => USDollar.format(amount);

interface CheckDetailViewProps {
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

const statusColors: Record<CheckStatus, { border: string, bg: string, text: string, dark: { border: string, bg: string, text: string } }> = {
    [CheckStatus.RECEIVED]: { border: 'border-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-800', dark: { border: 'border-yellow-700', bg: 'bg-yellow-900', text: 'text-yellow-300' } },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-orange-500', bg: 'bg-orange-100', text: 'text-orange-800', dark: { border: 'border-orange-700', bg: 'bg-orange-900', text: 'text-orange-300' } },
    [CheckStatus.QUEUED]: { border: 'border-sky-500', bg: 'bg-sky-100', text: 'text-sky-800', dark: { border: 'border-sky-700', bg: 'bg-sky-900', text: 'text-sky-300' } },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-100', text: 'text-green-800', dark: { border: 'border-green-700', bg: 'bg-green-900', text: 'text-green-300' } },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-100', text: 'text-slate-800', dark: { border: 'border-slate-600', bg: 'bg-slate-800', text: 'text-slate-200' } },
    [CheckStatus.IN_TRANSIT]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800', dark: { border: 'border-sky-700', bg: 'bg-sky-900', text: 'text-sky-300' } },
};

const CheckDetailView: React.FC<CheckDetailViewProps> = ({
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
    const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'CLOSE' | 'NAVIGATE', payload?: Check } | null>(null);
    const [imageError, setImageError] = useState(false);

    const tabs: ('payment' | 'accounting' | 'banking' | 'image')[] = useMemo(() => ['payment', 'accounting', 'banking', 'image'], []);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const activeTab = tabs[activeTabIndex];
    
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const flagDropdownRef = useRef<HTMLDivElement>(null);

    const darkMode = preferences.darkMode || false;

    useEffect(() => {
        setEditableCheck(check);
        setIsEditing(false);
        setIsFlagDropdownOpen(false);
        setActiveTabIndex(0);
        setImageError(false);
    }, [check]);

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

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleTabChange = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < tabs.length) {
            setActiveTabIndex(newIndex);
        }
    };

    const TabButton = ({ tabName, children }: { tabName: typeof tabs[number], children: React.ReactNode }) => {
        const isActive = activeTab === tabName;
        const index = tabs.indexOf(tabName);
        return (
            <button
                onClick={() => handleTabChange(index)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                    isActive 
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400' 
                        : 'border-transparent text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-gray-700'
                }`}
            >
                {children}
            </button>
        );
    };

    if (!check || !editableCheck) return null;

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableCheck(prev => {
            if (!prev) return null;
            if (name === 'signature') {
                return { ...prev, signature: value === 'true' };
            }
            if (name === 'amount') {
                return { ...prev, amount: parseFloat(value) || 0 };
            }
            return { ...prev, [name]: value };
        });
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

    const handleSave = () => {
        if (!editableCheck || !currentUser) return;
        
        const updates: Partial<Check> = {};
        const logEntries: string[] = [];

        Object.keys(editableCheck).forEach(key => {
            const k = key as keyof Check;
            if (JSON.stringify(editableCheck[k]) !== JSON.stringify(check[k])) {
                (updates as any)[k] = editableCheck[k];
                logEntries.push(k);
            }
        });

        if (Object.keys(updates).length > 0) {
            onUpdateCheck(check.id, updates, {
                field: logEntries.join(', '),
                oldValue: 'Multiple changes',
                newValue: 'Multiple changes',
                user: currentUser.name,
                uid: currentUser.uid
            } as any);
            addToast({
                notification: { message: 'Changes saved successfully' },
                alertType: 'success',
                handleToastClick: () => {}
            });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableCheck(check);
        setIsEditing(false);
    };

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

    const batchChecks = useMemo(() => {
        if (!check.batchId) return [];
        return checks
            .filter(c => c.batchId === check.batchId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [check.batchId, checks]);

    const currentIndex = batchChecks.findIndex(c => c.id === check.id);
    const prevCheck = currentIndex > 0 ? batchChecks[currentIndex - 1] : null;
    const nextCheck = currentIndex < batchChecks.length - 1 ? batchChecks[currentIndex + 1] : null;

    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    const availableFlags = flags.filter(f => !check.flags.includes(f.id));

    const availableUsersForBranch = useMemo(() => {
        const uCurrent = currentUser as any;
        if (uCurrent?.assignedBranches?.length) {
            return allUsers.filter(u => u.assignedBranches?.some(b => uCurrent.assignedBranches?.includes(b)));
        }
        return allUsers;
    }, [allUsers, currentUser]);

    const handleAddMember = (uidOrEmail: string) => {
        if (!check || !currentUser) return;
        const currentMembers = check.members || [];
        if (!currentMembers.includes(uidOrEmail)) {
            const newMembers = [...currentMembers, uidOrEmail];
            onUpdateCheck(check.id, { members: newMembers }, {
                field: 'members',
                oldValue: currentMembers,
                newValue: newMembers,
                user: currentUser.name,
                uid: currentUser.uid
            } as any);
        }
    };

    const handleRemoveMember = (uidOrEmail: string) => {
        if (!check || !currentUser) return;
        const currentMembers = check.members || [];
        const newMembers = currentMembers.filter(m => m !== uidOrEmail);
        onUpdateCheck(check.id, { members: newMembers }, {
            field: 'members',
            oldValue: currentMembers,
            newValue: newMembers,
            user: currentUser.name,
            uid: currentUser.uid
        } as any);
    };

    const handleMoveToQueue = () => {
        if (!check || !currentUser) return;
        onUpdateCheck(check.id, { status: CheckStatus.QUEUED }, {
            field: 'status',
            oldValue: check.status,
            newValue: CheckStatus.QUEUED,
            user: currentUser.name,
            uid: currentUser.uid
        } as any);
        addToast({
            notification: { message: 'Check moved to processing queue' },
            alertType: 'success',
            handleToastClick: () => {}
        });
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
            addToast({ 
                notification: { message: 'Failed to download image' }, 
                alertType: 'error',
                handleToastClick: () => {}
            });
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
                    addToast({ 
                        notification: { message: 'Image copied to clipboard' }, 
                        alertType: 'success',
                        handleToastClick: () => {}
                    });
                }
            }
        } catch (error) {
            console.error('Error copying image:', error);
            addToast({ 
                notification: { message: 'Failed to copy image' }, 
                alertType: 'error',
                handleToastClick: () => {}
            });
        }
    };

    const EditableField = ({ 
        value, 
        isEditing, 
        onChange, 
        className = "" 
    }: { 
        value: string | number | undefined, 
        isEditing: boolean, 
        onChange: (val: string) => void, 
        className?: string 
    }) => (
        <span
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => onChange(e.currentTarget.textContent || '')}
            className={`outline-none transition-all ${isEditing ? 'border-b-2 border-dashed border-sky-400 bg-sky-50 dark:bg-sky-900/40 rounded px-1' : ''} ${className}`}
        >
            {value}
        </span>
    );

    const renderDetailField = (
        label: string, 
        value: string | number | undefined | null, 
        icon: React.ReactNode, 
        name?: keyof Check, 
        isLink: boolean = false, 
        onClick?: () => void
    ) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                {icon}{label}
            </label>
            <div className={`text-sm p-2 rounded-md border ${isEditing && name ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-300' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}>
                {isEditing && name ? (
                    <EditableField 
                        value={value || ''} 
                        isEditing={true} 
                        onChange={(val) => handleContentEditableChange(name, val)} 
                        className="block w-full" 
                    />
                ) : isLink && value ? (
                    <button 
                        onClick={onClick} 
                        className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                        {value}
                    </button>
                ) : (
                    <span className="text-slate-700 dark:text-gray-300">{value || 'N/A'}</span>
                )}
            </div>
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'payment':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                <CalendarDaysIcon className="h-4 w-4" />Date Received
                            </label>
                            {isEditing ? (
                                <input 
                                    name="date" 
                                    type="date" 
                                    value={editableCheck.date ? new Date(editableCheck.date).toISOString().split('T')[0] : ''} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none" 
                                />
                            ) : (
                                <div className="text-sm p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md text-slate-700 dark:text-gray-300">
                                    {new Date(editableCheck.date).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                        {renderDetailField("Payee", editableCheck.payee, <BuildingOfficeIcon className="h-4 w-4" />, 'payee')}
                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                <MapLocationIcon className="h-4 w-4" />Payor Address
                            </label>
                            <div className={`text-sm p-2 rounded-md border ${isEditing ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-300' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}>
                                <EditableField 
                                    value={editableCheck.payorAddress ? `${editableCheck.payorAddress.street}, ${editableCheck.payorAddress.city}, ${editableCheck.payorAddress.state} ${editableCheck.payorAddress.zip}` : ''} 
                                    isEditing={isEditing} 
                                    onChange={(val) => {
                                        // Simple address parsing if needed, but for now just store what we can
                                        console.log("Address edit:", val);
                                    }} 
                                    className="block w-full min-h-[1.25rem]" 
                                />
                            </div>
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                <DocumentTextIcon className="h-4 w-4" />Memo
                            </label>
                            <div className={`text-sm p-2 rounded-md border min-h-[5rem] overflow-y-auto ${isEditing ? 'bg-sky-50 dark:bg-sky-900/40 border-sky-300' : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700'}`}>
                                <EditableField 
                                    value={editableCheck.memo || ''} 
                                    isEditing={isEditing} 
                                    onChange={(val) => handleContentEditableChange('memo', val)} 
                                    className="block w-full h-full min-h-[4rem]" 
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'accounting':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                <ChatIcon className="h-4 w-4" />Category
                            </label>
                            {isEditing ? (
                                <select 
                                    name="category" 
                                    value={editableCheck.category} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none"
                                >
                                    {Object.values(CheckCategory).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md text-slate-700 dark:text-gray-300">
                                    {editableCheck.category}
                                </div>
                            )}
                        </div>
                        {editableCheck.batchId && renderDetailField("Batch", editableCheck.batchId, <HashtagIcon className="h-4 w-4" />, undefined, true, () => onNavigateToBatch(check.batchId!))}
                        {editableCheck.trackingNumber && renderDetailField("Tracking #", editableCheck.trackingNumber, <HashtagIcon className="h-4 w-4" />, 'trackingNumber')}
                        {editableCheck.category === CheckCategory.HOMEOWNER_LOCKBOX && renderDetailField("Client Acct #", editableCheck.clientAccountNumber, <HashtagIcon className="h-4 w-4" />, 'clientAccountNumber')}
                        {editableCheck.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME && renderDetailField("GL Code", editableCheck.glCode, <HashtagIcon className="h-4 w-4" />, 'glCode')}
                        <div className="sm:col-span-2 pt-4">
                            <button 
                                onClick={handleMoveToQueue}
                                disabled={editableCheck.status === CheckStatus.QUEUED}
                                className="inline-flex items-center gap-2 text-xs font-bold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 px-4 py-2 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <LockClosedIcon className="h-4 w-4" /> RE-QUEUE FOR PROCESSING
                            </button>
                        </div>
                    </div>
                );
            case 'banking':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {renderDetailField("Bank Name", editableCheck.bankName, <BankBuildingIcon className="h-4 w-4" />, 'bankName')}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-gray-400 flex items-center gap-2">
                                <SignatureIcon className="h-4 w-4" />Is Signed
                            </label>
                            {isEditing ? (
                                <select 
                                    name="signature" 
                                    value={String(editableCheck.signature)} 
                                    onChange={handleInputChange} 
                                    className="w-full p-2 bg-sky-50 dark:bg-gray-800 border border-sky-400 dark:border-sky-700 rounded-md shadow-sm text-sm text-slate-700 dark:text-gray-300 outline-none"
                                >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            ) : (
                                <div className="text-sm p-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md text-slate-700 dark:text-gray-300">
                                    {editableCheck.signature ? 'Yes' : 'No'}
                                </div>
                            )}
                        </div>
                        {renderDetailField("Routing Number", editableCheck.routingNumber, <LockClosedIcon className="h-4 w-4" />, 'routingNumber')}
                        {renderDetailField("Bank Account #", editableCheck.bankAccountNumber, <HashtagIcon className="h-4 w-4" />, 'bankAccountNumber')}
                    </div>
                );
            case 'image':
                return (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                        {imageError ? (
                            <div className="text-center p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-amber-800 dark:text-amber-300">Image Preview Unavailable</h4>
                                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">The source image could not be loaded or has been archived.</p>
                            </div>
                        ) : (
                            <div className="group relative w-full max-w-2xl overflow-hidden rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 bg-black/5">
                                <img 
                                    src={check.imageUrl} 
                                    alt="Check scan" 
                                    className="w-full h-auto object-contain max-h-[60vh] transition-transform duration-500 group-hover:scale-[1.02]" 
                                    onError={() => setImageError(true)} 
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                                    <button 
                                        onClick={handleDownloadImage}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-transform"
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Download
                                    </button>
                                    <button 
                                        onClick={handleCopyImage}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-transform"
                                    >
                                        <ClipboardDocumentIcon className="h-4 w-4" /> Copy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    const statusColor = statusColors[editableCheck.status] || statusColors[CheckStatus.RECEIVED];
    
    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 overflow-hidden">
            {/* Main Header */}
            <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-6 py-4 shadow-sm z-10 transition-colors">
                <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4 min-w-0">
                        <button 
                            onClick={handleClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0"
                        >
                            <ChevronLeftIcon className="h-6 w-6 text-slate-600 dark:text-gray-400" />
                        </button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                                    {isEditing ? (
                                        <EditableField 
                                            value={editableCheck.payor} 
                                            isEditing={true} 
                                            onChange={(val) => handleContentEditableChange('payor', val)} 
                                        />
                                    ) : check.payor}
                                </h1>
                                {!isEditing && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${darkMode ? statusColor.dark.border + ' ' + statusColor.dark.bg + ' ' + statusColor.dark.text : statusColor.border + ' ' + statusColor.bg + ' ' + statusColor.text}`}>
                                        {check.status}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5 font-medium truncate">
                                {check.checkNumber || 'No Check #'} • {new Date(check.date).toLocaleDateString()} • {check.category}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={handleSave} 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-sky-700 active:scale-95 transition-all"
                                    >
                                        <PencilIcon className="h-4 w-4" /> Save Changes
                                    </button>
                                    <button 
                                        onClick={handleCancel} 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
                                    >
                                        <XMarkIcon className="h-4 w-4" /> Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setIsEditing(true)} 
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-lg font-bold text-sm hover:bg-slate-50 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                                    >
                                        <PencilIcon className="h-4 w-4" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => setIsDeleteConfirmOpen(true)} 
                                        className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Mobile Action Menu Toggle */}
                        <div className="sm:hidden relative" ref={actionMenuRef}>
                            <button 
                                onClick={() => setIsActionMenuOpen(p => !p)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <EllipsisVerticalIcon className="h-6 w-6 text-slate-600 dark:text-gray-400" />
                            </button>
                            {isActionMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-slate-200 dark:border-gray-700 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button 
                                        onClick={() => { setIsEditing(true); setIsActionMenuOpen(false); }}
                                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 dark:text-gray-300 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-700"
                                    >
                                        <PencilIcon className="h-4 w-4 text-sky-500" /> Edit Record
                                    </button>
                                    <button 
                                        onClick={() => { setIsDeleteConfirmOpen(true); setIsActionMenuOpen(false); }}
                                        className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-700 border-t border-slate-100 dark:border-gray-700"
                                    >
                                        <TrashIcon className="h-4 w-4" /> Delete Permanently
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Bar / Batch Context */}
            {batchChecks.length > 0 && (
                <div className="flex-shrink-0 bg-slate-100 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-6 py-2 transition-colors">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Batch Processing</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => prevCheck && handleNavigate(prevCheck)} 
                                disabled={!prevCheck}
                                className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-md disabled:opacity-30 flex items-center gap-1 group transition-all"
                            >
                                <ChevronLeftIcon className="h-4 w-4 text-slate-500 group-hover:text-sky-500" />
                                <span className="text-xs font-bold text-slate-500 hidden sm:inline group-hover:text-sky-500">Previous</span>
                            </button>
                            <div className="text-xs font-bold text-slate-600 dark:text-gray-400 px-3 py-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-slate-200 dark:border-gray-700">
                                {currentIndex + 1} <span className="text-slate-400">/</span> {batchChecks.length}
                            </div>
                            <button 
                                onClick={() => nextCheck && handleNavigate(nextCheck)}
                                disabled={!nextCheck}
                                className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-md disabled:opacity-30 flex items-center gap-1 group transition-all"
                            >
                                <span className="text-xs font-bold text-slate-500 hidden sm:inline group-hover:text-sky-500">Next</span>
                                <ChevronRightIcon className="h-4 w-4 text-slate-500 group-hover:text-sky-500" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Layout Area */}
            <main className="flex-grow overflow-hidden flex flex-col sm:flex-row max-w-[1920px] mx-auto w-full">
                {/* Left: Check Data & Image */}
                <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
                        
                        {/* Summary Card */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden transition-colors">
                            <div 
                                className={`p-6 sm:p-10 flex flex-col sm:flex-row justify-between items-start gap-8 ${darkMode ? "bg-gradient-to-br from-gray-800/50 to-gray-900/50" : CHECK_TYPE_COLORS[editableCheck.category]?.bg || 'bg-slate-50'}`}
                            >
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Entity / Payor</label>
                                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                            {check.payor}
                                        </h2>
                                        {check.associationName && (
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400 mt-2 font-medium">
                                                <BuildingOfficeIcon className="h-4 w-4" />
                                                <span>{check.associationName}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Members Section */}
                                    <div className="pt-4 border-t border-black/5 dark:border-white/5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Collaboration Team</label>
                                        <MembersDropdown
                                            users={availableUsersForBranch}
                                            selectedMemberIds={check.members || []}
                                            onAddMember={handleAddMember}
                                            onRemoveMember={handleRemoveMember}
                                            canRemoveMember={() => true}
                                            compact={true}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 h-full sm:justify-start">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validated Amount</label>
                                    <div className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-white tracking-tight flex items-baseline">
                                        <span className="text-2xl text-slate-400 mr-1 font-bold font-mono">$</span>
                                        {isEditing ? (
                                            <EditableField 
                                                value={editableCheck.amount} 
                                                isEditing={true} 
                                                onChange={(val) => handleContentEditableChange('amount', val)} 
                                                className="min-w-[120px] text-right"
                                            />
                                        ) : formatCurrency(check.amount).replace('$', '')}
                                    </div>
                                    <div className="mt-4 flex flex-col items-end">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verification Status</label>
                                        <div ref={statusDropdownRef} className="relative">
                                            <button 
                                                onClick={() => isEditing && setIsStatusDropdownOpen(p => !p)}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-bold shadow-sm transition-all ${
                                                    isEditing ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : 'cursor-default'
                                                } ${darkMode ? statusColor.dark.border + ' ' + statusColor.dark.bg + ' ' + statusColor.dark.text : statusColor.border + ' ' + statusColor.bg + ' ' + statusColor.text}`}
                                            >
                                                <span className={`h-2 w-2 rounded-full animate-pulse ${darkMode ? 'bg-current' : 'bg-current'}`}></span>
                                                {editableCheck.status}
                                                {isEditing && <ChevronUpDownIcon className="h-4 w-4 opacity-50" />}
                                            </button>
                                            
                                            {isStatusDropdownOpen && (
                                                <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 p-2 z-20 flex flex-col gap-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    {Object.values(CheckStatus).map(s => {
                                                        const sClr = darkMode ? statusColors[s].dark : statusColors[s];
                                                        const isActive = s === editableCheck.status;
                                                        return (
                                                            <button 
                                                                key={s}
                                                                onClick={() => { setEditableCheck(p => p ? {...p, status: s} : null); setIsStatusDropdownOpen(false); }}
                                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                                    isActive 
                                                                        ? 'bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-white' 
                                                                        : 'hover:bg-slate-50 dark:hover:bg-gray-700/50 text-slate-600 dark:text-gray-400'
                                                                }`}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span className={`h-2 w-2 rounded-full ${sClr.bg.split(' ')[0]} border ${sClr.border}`}></span>
                                                                    {s}
                                                                </span>
                                                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-sky-500"></div>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section Navigation Tabs */}
                            <div className="bg-slate-50 dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 px-4">
                                <div className="flex overflow-x-auto no-scrollbar gap-2 py-0.5 justify-around sm:justify-start">
                                    <TabButton tabName="payment"><BanknotesIcon className="h-5 w-5" /> Payment</TabButton>
                                    <TabButton tabName="accounting"><DocumentTextIcon className="h-5 w-5" /> Accounting</TabButton>
                                    <TabButton tabName="banking"><BankBuildingIcon className="h-5 w-5" /> Banking</TabButton>
                                    <TabButton tabName="image"><ImageIcon className="h-5 w-5" /> Image Scan</TabButton>
                                </div>
                            </div>
                        </section>

                        {/* Content Pane */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 p-6 sm:p-10 transition-colors">
                            {renderTabContent()}
                        </section>

                        {/* Quick Flag Section */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 transition-colors">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Exception Tracking</h4>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsFlagDropdownOpen(p => !p)}
                                            className="inline-flex items-center gap-2 text-xs font-bold bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-all font-mono"
                                        >
                                            <HashtagIcon className="h-4 w-4" /> ADD FLAG
                                        </button>
                                        
                                        {isFlagDropdownOpen && (
                                            <div 
                                                ref={flagDropdownRef}
                                                className="absolute right-0 bottom-full mb-3 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 p-2 z-20 flex flex-col gap-1 overflow-hidden animate-in zoom-in-95 duration-200"
                                            >
                                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-gray-700 mb-1">Available Indicators</div>
                                                <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                                                    {availableFlags.length > 0 ? availableFlags.map(f => (
                                                        <button 
                                                            key={f.id} 
                                                            onClick={() => { onToggleFlag(check.id, f.id); setIsFlagDropdownOpen(false); }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-left transition-all hover:scale-[0.98] ${f.color} ${f.textColor} mb-1 shadow-sm`}
                                                        >
                                                            <div className="h-2 w-2 rounded-full bg-white/40 ring-1 ring-black/5"></div>
                                                            {f.name}
                                                        </button>
                                                    )) : (
                                                        <div className="px-3 py-4 text-center">
                                                            <p className="text-[10px] font-bold text-slate-400">All flags applied</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => { onOpenFlagManager(); setIsFlagDropdownOpen(false); }}
                                                    className="w-full mt-1 px-3 py-2 rounded-lg text-[10px] font-bold text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 text-center uppercase tracking-widest transition-colors"
                                                >
                                                    Open System Config
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 flex flex-wrap gap-2.5 min-h-[4rem]">
                                {checkFlags.length > 0 ? checkFlags.map(f => (
                                    <div 
                                        key={f.id} 
                                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm group transition-transform hover:-translate-y-0.5 ${f.color} ${f.textColor}`}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-white/50"></span>
                                        {f.name}
                                        <button 
                                            onClick={() => onToggleFlag(check.id, f.id)}
                                            className="ml-1 opacity-40 hover:opacity-100 transition-opacity p-0.5 hover:bg-black/5 rounded-full"
                                        >
                                            <XMarkIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="w-full flex flex-col items-center justify-center py-4 text-slate-400/50">
                                        <DocumentTextIcon className="h-8 w-8 mb-2 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No active flags</p>
                                    </div>
                                )}
                            </div>
                        </section>
                        
                        <div className="h-20" /> {/* Spacer */}
                    </div>
                </div>

                {/* Right: Communication & Audit Sidebar */}
                <aside className="w-full sm:w-[380px] lg:w-[440px] flex-shrink-0 bg-white dark:bg-gray-900 border-l border-slate-200 dark:border-gray-800 flex flex-col shadow-2xl z-10 transition-colors">
                    <ChatComponent 
                        check={check}
                        currentUser={currentUser as any}
                        onAddComment={(text) => onAddComment(check.id, text)}
                    />
                </aside>
            </main>

            {/* Overlays / Modals */}
            
            {/* Delete Confirmation */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-gray-700 transform animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <TrashIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center leading-tight">Destroy Record?</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-3 text-center font-medium leading-relaxed">
                                You are about to permanently delete this check entry. This operation removes all associated metadata and cannot be undone.
                            </p>
                            <div className="mt-10 flex flex-col gap-3">
                                <button 
                                    onClick={() => { onDeleteCheck(check.id); setIsDeleteConfirmOpen(false); onClose(); }}
                                    className="w-full px-6 py-3.5 text-sm font-black text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/25 active:scale-[0.98]"
                                >
                                    PERMANENTLY DELETE
                                </button>
                                <button 
                                    onClick={() => setIsDeleteConfirmOpen(false)} 
                                    className="w-full px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-all active:scale-[0.98]"
                                >
                                    ABORT OPERATION
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unsaved Changes Confirmation */}
            {isUnsavedConfirmOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/30 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-gray-700 transform animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <ExclamationTriangleIcon className="h-10 w-10 text-amber-500 dark:text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white text-center leading-tight">Unsaved Edits</h3>
                            <p className="text-sm text-slate-500 dark:text-gray-400 mt-3 text-center font-medium leading-relaxed">
                                System detected unsaved modifications. Leaving this screen now will discard all pending changes to this check record.
                            </p>
                            <div className="mt-10 flex flex-col gap-3">
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
                                    className="w-full px-6 py-3.5 text-sm font-black text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98]"
                                >
                                    DISCARD CHANGES
                                </button>
                                <button 
                                    onClick={() => { setIsUnsavedConfirmOpen(false); setPendingAction(null); }}
                                    className="w-full px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-600 transition-all active:scale-[0.98]"
                                >
                                    CONTINUE EDITING
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckDetailView;