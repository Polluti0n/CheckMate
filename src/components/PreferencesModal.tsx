import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserPreferences, CheckField, CardLayoutZone, CurrentUser, Check, CheckStatus, CheckCategory, CheckViewOptions, CheckFontTheme, CheckBackground, CheckOverlayZone, CheckFooterZone, CheckViewLayoutZone } from '../types';
import { XMarkIcon, UserCircleIcon, PencilIcon, ProcessingLoaderIcon, DocumentTextIcon, CheckBadgeIcon, EyeIcon, EyeSlashIcon } from './icons'; 
import { AVAILABLE_CARD_FIELDS, DEFAULT_PREFERENCES } from '../constants';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
// FIX: Corrected typo in import statement from 'a' to 'as'.
import * as firestoreService from '../services/firestoreService';
import { CheckCardAsCheck } from './CheckDashboard';
import ImageCropperModal from './ImageCropperModal';

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPreferences: UserPreferences;
    onSave: (newPreferences: UserPreferences) => void;
    userEmail: string | null;
    currentUser: CurrentUser | null;
}

type DragState = { type: 'idle' } | { type: 'dragging', fieldKey: CheckField | 'flags' | 'category', sourceZone?: CardLayoutZone | CheckViewLayoutZone };
type FieldDef = { key: CheckField | 'flags' | 'category', label: string };
type Tab = 'Profile' | 'Appearance' | 'Notifications';

const DraggableField = ({ field, isDragging, sourceZone }: { field: FieldDef, isDragging: boolean, sourceZone?: CardLayoutZone | CheckViewLayoutZone }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return draggable({
            element: el,
            getInitialData: () => ({ type: 'field', fieldKey: field.key, sourceZone }),
             onGenerateDragPreview: ({ nativeSetDragImage }) => {
                setCustomNativeDragPreview({
                    nativeSetDragImage,
                    render: ({ container }) => {
                        const previewEl = document.createElement('div');
                        previewEl.className = "px-3 py-2 bg-white rounded-md shadow-lg ring-1 ring-slate-300 font-medium text-sm text-slate-800";
                        previewEl.textContent = field.label;
                        container.appendChild(previewEl);
                        pointerOutsideOfPreview({ x: '16px', y: '16px' });
                        return () => container.removeChild(previewEl);
                    },
                });
            },
        });
    }, [field.key, sourceZone]);

    return (
        <div ref={ref} className={`px-3 py-2 border rounded-md bg-white hover:bg-slate-50 cursor-grab ${isDragging ? 'opacity-40' : ''}`}>
           <span className="text-sm text-slate-700">{field.label}</span>
        </div>
    );
};

const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  if (match) {
    const [, area, middle, last] = match;
    let formatted = '';
    if (area) formatted += `(${area}`;
    if (middle) formatted += `) ${middle}`;
    if (last) formatted += `-${last}`;
    return formatted;
  }
  return value;
};

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, currentPreferences, onSave, userEmail, currentUser }) => {
    const [prefs, setPrefs] = useState<UserPreferences>(currentPreferences);
    const [dragState, setDragState] = useState<DragState>({ type: 'idle' });
    const [activeTab, setActiveTab] = useState<Tab>('Profile');
    const [isUploading, setIsUploading] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    useEffect(() => setPrefs(currentPreferences), [currentPreferences, isOpen]);

    useEffect(() => {
        return monitorForElements({
            onDragStart: ({ source }) => {
                if (source.data.type === 'field') { 
                    setDragState({ type: 'dragging', fieldKey: source.data.fieldKey as CheckField | 'flags' | 'category', sourceZone: source.data.sourceZone as CardLayoutZone | CheckViewLayoutZone | undefined });
                } 
            },
            onDrop: () => setDragState({ type: 'idle' }),
            onDragEnd: () => setDragState({ type: 'idle' }),
        });
    }, []);

    const handleSave = () => { 
        if(currentUser) {
            firestoreService.updateUserProfile(currentUser.uid, prefs.profile);
        }
        onSave(prefs); 
        onClose(); 
    };
    const handleReset = () => setPrefs(DEFAULT_PREFERENCES);
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            const formattedPhone = formatPhoneNumber(value);
            setPrefs(p => ({...p, profile: {...p.profile, phone: formattedPhone }}));
        } else {
            setPrefs(p => ({...p, profile: {...p.profile, [name]: value }}));
     }
    };
    
    const handleNotificationChange = (key: keyof UserPreferences['notifications'], type: 'inApp' | 'email') => {
        setPrefs(p => {
            const newNotifications = { ...p.notifications };
            newNotifications[key][type] = !newNotifications[key][type];
            return { ...p, notifications: newNotifications };
        });
    };

    const handleProfilePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageToCrop(reader.result as string);
        });
        reader.readAsDataURL(file);
        
        // Clear the input value so the same file can be selected again
        e.target.value = '';
    };
    
    const handleConfirmCrop = async (croppedBlob: Blob) => {
        if (!currentUser) return;
        
        setImageToCrop(null); // Close cropper modal
        setIsUploading(true);
        try {
            const downloadURL = await firestoreService.uploadProfilePicture(croppedBlob, currentUser.uid);
            const newProfile = { ...prefs.profile, profilePictureUrl: downloadURL };
            await firestoreService.updateUserProfile(currentUser.uid, newProfile);
            
            const newPrefs = { ...prefs, profile: newProfile };
            setPrefs(newPrefs);
            onSave(newPrefs);
        } catch (error) {
            console.error("Failed to upload cropped profile picture:", error);
        } finally {
            setIsUploading(false);
        }
    };


    // --- KANBAN CARD LAYOUT LOGIC (Appearance Tab) ---
    const currentCardLayout = prefs.cardLayout || {};
    const placedFieldKeys = Object.values(currentCardLayout);
    const availableCardFields = useMemo(() => AVAILABLE_CARD_FIELDS.filter(field => !placedFieldKeys.includes(field.key)), [placedFieldKeys]);
    
    const handleDropOnCardZone = (targetZone: CardLayoutZone) => {
        if (dragState.type !== 'dragging') return;
        const { fieldKey, sourceZone } = dragState;
        setPrefs(prev => {
            const newLayout = { ...prev.cardLayout };
            const fieldInTargetZone = newLayout[targetZone];
            if (sourceZone) {
                newLayout[targetZone] = fieldKey;
                if (fieldInTargetZone) newLayout[sourceZone] = fieldInTargetZone;
                else delete newLayout[sourceZone];
            } else {
                const keyOfFieldInTarget = Object.entries(newLayout).find(([_, f]) => f === fieldKey)?.[0];
                if(keyOfFieldInTarget) delete newLayout[keyOfFieldInTarget as CardLayoutZone];
                newLayout[targetZone] = fieldKey;
            }
            return { ...prev, cardLayout: newLayout };
        });
    };

    const handleViewModeChange = (mode: 'card' | 'check') => {
        setPrefs(p => ({ ...p, viewMode: mode }));
    };

    const handleCheckViewVisibilityChange = (option: keyof CheckViewOptions) => {
        setPrefs(p => ({
            ...p,
            checkViewOptions: { ...p.checkViewOptions, [option]: !p.checkViewOptions[option as keyof typeof p.checkViewOptions] }
        }));
    };

    const handleCheckViewChange = (key: keyof CheckViewOptions, value: any) => {
        setPrefs(p => ({ ...p, checkViewOptions: { ...p.checkViewOptions, [key]: value } }));
    };

    const handleCheckOverlayChange = (zone: CheckOverlayZone, field: string) => {
        setPrefs(p => ({ ...p, checkViewOptions: { ...p.checkViewOptions, overlays: { ...p.checkViewOptions.overlays, [zone]: field } } }));
    };

    const handleCheckFooterChange = (zone: CheckFooterZone, field: string) => {
        setPrefs(p => ({ ...p, checkViewOptions: { ...p.checkViewOptions, footer: { ...p.checkViewOptions.footer, [zone]: field } } }));
    };

    const handleDropOnCheckZone = (targetZone: CheckViewLayoutZone) => {
        if (dragState.type !== 'dragging') return;
        const { fieldKey, sourceZone } = dragState;

        setPrefs(prev => {
            const newOverlays = { ...prev.checkViewOptions.overlays };
            const newFooter = { ...prev.checkViewOptions.footer };
            const newLayout = { ...newOverlays, ...newFooter };

            // Remove from old position if it exists
            if (sourceZone && (sourceZone in newOverlays || sourceZone in newFooter)) {
                delete newLayout[sourceZone as CheckViewLayoutZone];
            }

            // Place in new position
            newLayout[targetZone] = fieldKey;

            // Separate them back out
            const finalOverlays = { overlayTopRight: newLayout.overlayTopRight, overlayBottomLeft: newLayout.overlayBottomLeft };
            const finalFooter = { footerLeft: newLayout.footerLeft, footerRight: newLayout.footerRight };

            return { ...prev, checkViewOptions: { ...prev.checkViewOptions, overlays: finalOverlays, footer: finalFooter } };
        });
    };

    const handleDropOnAvailable = () => {
        if (dragState.type === 'dragging' && dragState.sourceZone) {
             setPrefs(prev => {
                const newLayout = { ...prev.cardLayout };
                delete newLayout[dragState.sourceZone!];
                return { ...prev, cardLayout: newLayout };
            });
        }
    };

    const handleDropOnCheckAvailable = () => {
        if (dragState.type === 'dragging' && dragState.sourceZone && (Object.keys(prefs.checkViewOptions.overlays).includes(dragState.sourceZone) || Object.keys(prefs.checkViewOptions.footer).includes(dragState.sourceZone))) {
            setPrefs(prev => {
                const newOverlays = { ...prev.checkViewOptions.overlays };
                const newFooter = { ...prev.checkViewOptions.footer };
                if (dragState.sourceZone! in newOverlays) delete newOverlays[dragState.sourceZone as CheckOverlayZone];
                if (dragState.sourceZone! in newFooter) delete newFooter[dragState.sourceZone as CheckFooterZone];
                return { ...prev, checkViewOptions: { ...prev.checkViewOptions, overlays: newOverlays, footer: newFooter } };
            });
        }
    };

    const DropZone = ({ fields, onDrop, title, className }: { fields: FieldDef[], onDrop: () => void, title: string, className?: string }) => {
        const ref = useRef<HTMLDivElement>(null);
        const [isDraggedOver, setIsDraggedOver] = useState(false);
        useEffect(() => {
            const el = ref.current;
            if (!el) return;
            return dropTargetForElements({
                element: el, getIsSticky: () => true,
                onDragEnter: () => setIsDraggedOver(true), onDragLeave: () => setIsDraggedOver(false),
                onDrop: () => { onDrop(); setIsDraggedOver(false); }
            });
        }, [onDrop]);
        return (
            <div className={className}>
                <h4 className="font-semibold text-slate-700">{title}</h4>
                <div ref={ref} className={`mt-2 p-3 border-2 border-dashed rounded-lg min-h-[150px] transition-colors ${isDraggedOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}`}>
                    <div className="flex flex-col gap-2">
                        {fields.map(field => <DraggableField key={field.key} field={field} isDragging={dragState.type === 'dragging' && dragState.fieldKey === field.key} />)}
                        {fields.length === 0 && <span className="text-sm text-slate-400 self-center mt-12">Drop fields here</span>}
                    </div>
                </div>
            </div>
        );
    };

    const CardDropZone = ({ zone, onDrop }: { zone: CardLayoutZone, onDrop: (zone: CardLayoutZone) => void }) => {
        const ref = useRef<HTMLDivElement>(null);
        const [isDraggedOver, setIsDraggedOver] = useState(false);
        const fieldKey = currentCardLayout[zone];
        const field = fieldKey ? AVAILABLE_CARD_FIELDS.find(f => f.key === fieldKey) : null;
        
        useEffect(() => {
            const el = ref.current; if (!el) return;
            return dropTargetForElements({ element: el, getIsSticky: () => true,
                onDragEnter: () => setIsDraggedOver(true), onDragLeave: () => setIsDraggedOver(false),
                onDrop: () => { onDrop(zone); setIsDraggedOver(false); }
            });
        }, [zone, onDrop]);

        const sampleText: Record<CardLayoutZone, string> = { title: "Payor Name", topRight: "$123.45", subtitle: "Category Name", body1: "Longer text for memo that might wrap...", body2: "Another line of body text", footerLeft: "Check #1234", footerRight: "10/26/2023" };

        return (
            <div ref={ref} className={`p-1 border border-dashed rounded-md transition-colors min-h-[2.5rem] flex items-center ${isDraggedOver ? 'border-sky-500 bg-sky-50' : 'border-slate-300'}`}>
                {field ? ( <DraggableField field={field} isDragging={dragState.type === 'dragging' && dragState.fieldKey === field.key} sourceZone={zone} /> ) : ( <span className="text-xs text-slate-400 px-2">{sampleText[zone]}</span> )}
            </div>
        );
    };
    
    const baseCheckFields: CheckField[] = ['payor', 'payee', 'amount', 'checkNumber', 'date', 'memo'];
    const availableFieldsForExtras = useMemo(() => {
        return AVAILABLE_CARD_FIELDS.filter(field => !baseCheckFields.includes(field.key));
    }, []);

    const dataFieldOptions: { key: CheckField | 'flags' | 'category' | 'none', label: string }[] = [
        { key: 'none', label: 'None' },
        { key: 'category', label: 'Category' },
        { key: 'flags', label: 'Flags' },
        ...availableFieldsForExtras,
    ];

    const CheckViewCustomizer = () => {
        const mockCheck: Check = {
            id: 'preview-check',
            payor: 'Legacy Properties',
            payee: 'Branch Office.',
            amount: 1234.56,
            checkNumber: '101', // Note: statusUpdatedAt will be undefined for mock, handled in CheckCardAsCheck
            date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
            memo: 'Q4 Management Fees',
            category: CheckCategory.MISC_NON_HOMEOWNER_INCOME,
            status: CheckStatus.RECEIVED,
            flags: ['flag-1', 'flag-2', 'flag-3'],
            comments: [],
            auditTrail: [],
            lastComment: 'Awaiting Manager Approval.',
            createdAt: new Date().toISOString(),
        };
        const mockFlags = [
            { id: 'flag-1', name: 'Urgent', color: 'bg-red-500', textColor: 'text-white' },
            { id: 'flag-2', name: 'Needs Approval', color: 'bg-pink-500', textColor: 'text-white' },
            { id: 'flag-3', name: 'Board Member', color: 'bg-sky-500', textColor: 'text-white' }

         ];

        const CheckDropZone = ({ zone, onDrop, children, className }: { zone: CheckViewLayoutZone, onDrop: (zone: CheckViewLayoutZone) => void, children: React.ReactNode, className?: string }) => {
            const ref = useRef<HTMLDivElement>(null);
            const [isDraggedOver, setIsDraggedOver] = useState(false);
            const isDragging = dragState.type === 'dragging';
    
            useEffect(() => {
                const el = ref.current; if (!el) return;
                return dropTargetForElements({
                    element: el, getIsSticky: () => true,
                    canDrop: ({ source }) => source.data.type === 'field',
                    onDragEnter: () => setIsDraggedOver(true), onDragLeave: () => setIsDraggedOver(false),
                    onDrop: () => { onDrop(zone); setIsDraggedOver(false); }
                });
            }, [zone, onDrop]);
    
            if (!children && !isDragging) {
                return null;
            }
    
            return (
                <div ref={ref} className={`${className} ${isDraggedOver ? 'bg-sky-100/50 ring-2 ring-sky-400' : ''} ${isDragging && !children ? 'border-2 border-dashed border-slate-300' : ''}`}>
                    {children}
                </div>
            );
        };

        const fontThemeOptions: { key: CheckFontTheme, label: string }[] = [
            { key: 'cursive', label: 'Cursive' },
            { key: 'block', label: 'Block' },
            { key: 'typed', label: 'Typed' },
        ];

        const backgroundOptions: { key: CheckBackground, label: string }[] = [
            { key: 'classic', label: 'Classic' },
            { key: 'modern', label: 'Modern' },
            { key: 'secure', label: 'Secure' },
        ];

        const placedFieldKeys = Object.values({ ...prefs.checkViewOptions.overlays, ...prefs.checkViewOptions.footer });
        const availableCheckFields = useMemo(() => dataFieldOptions.filter(field => field.key !== 'none' && !placedFieldKeys.includes(field.key)), [placedFieldKeys]);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 max-h-[70vh] overflow-y-auto pr-2">
                    <h4 className="font-semibold text-slate-700">Customization</h4>
                    <p className="text-xs text-slate-500 mb-3">Adjust the look and feel of the check-style cards.</p>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="check-font-theme" className="block text-xs font-medium text-slate-600">Font Theme</label>
                                <select id="check-font-theme" value={prefs.checkViewOptions.fontTheme} onChange={(e) => handleCheckViewChange('fontTheme', e.target.value)} className="mt-1 block w-full p-2 text-sm border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500">
                                    {fontThemeOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="check-background" className="block text-xs font-medium text-slate-600">Background</label>
                                <select id="check-background" value={prefs.checkViewOptions.background} onChange={(e) => handleCheckViewChange('background', e.target.value)} className="mt-1 block w-full p-2 text-sm border-slate-300 rounded-md shadow-sm focus:border-sky-500 focus:ring-sky-500">
                                    {backgroundOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <DropZone fields={availableCheckFields} onDrop={handleDropOnCheckAvailable} title="Available Fields" className="border-t pt-3" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <h4 className="font-semibold text-slate-700">Check Style Preview</h4>
                    <p className="text-xs text-slate-500 mb-3">Drag fields onto the check preview to place them.</p>
                    <div className="mt-2 bg-slate-100 p-4 rounded-lg">
                        <CheckCardAsCheck 
                            check={mockCheck} 
                            isSelected={false} 
                            flags={mockFlags} 
                            options={prefs.checkViewOptions}
                            isPreview={true}
                            onVisibilityChange={handleCheckViewVisibilityChange}
                            draggableFieldComponent={DraggableField}
                            dropZoneComponent={CheckDropZone}
                            onDropOnZone={handleDropOnCheckZone}
                            dragState={dragState}
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'Appearance':
                return (
                    <>
                        <div className="flex items-center justify-between pb-4 border-b">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Appearance</h3>
                                <p className="text-sm text-slate-500">Customize how checks are displayed on the board.</p>
                            </div>
                            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                                <button onClick={() => handleViewModeChange('card')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${prefs.viewMode === 'card' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <DocumentTextIcon className="h-5 w-5" />
                                    <span>Data Cards</span>
                                </button>
                                <button onClick={() => handleViewModeChange('check')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 ${prefs.viewMode === 'check' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <CheckBadgeIcon className="h-5 w-5" />
                                    <span>Check Style</span>
                                </button>
                            </div>
                        </div>
                        <div className="mt-6">
                            {prefs.viewMode === 'card' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <DropZone fields={availableCardFields} onDrop={handleDropOnAvailable} title="Available Fields" className="max-h-[60vh] overflow-y-auto pr-2" />
                                    <div>
                                        <h4 className="font-semibold text-slate-700">Card Layout Preview</h4>
                                        <div className="mt-2 bg-slate-100 p-4 rounded-lg">
                                            <div className="bg-white p-3 rounded-md shadow-lg border border-slate-200 flex flex-col space-y-2">
                                                <div className="flex justify-between items-start space-x-2">
                                                    <div className="flex-grow"><CardDropZone zone="title" onDrop={handleDropOnCardZone} /></div>
                                                    <div className="flex-shrink-0"><CardDropZone zone="topRight" onDrop={handleDropOnCardZone} /></div>
                                                </div>
                                                <CardDropZone zone="subtitle" onDrop={handleDropOnCardZone} />
                                                <CardDropZone zone="body1" onDrop={handleDropOnCardZone} />
                                                <CardDropZone zone="body2" onDrop={handleDropOnCardZone} />
                                                <div className="flex justify-between items-end space-x-2 pt-2 border-t">
                                                    <div className="flex-grow"><CardDropZone zone="footerLeft" onDrop={handleDropOnCardZone} /></div>
                                                    <div className="flex-shrink-0"><CardDropZone zone="footerRight" onDrop={handleDropOnCardZone} /></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <CheckViewCustomizer />
                            )}
                        </div>
                        </>
                );
            case 'Profile':
                return (
                     <div>
                        <div className="flex items-center space-x-6 pb-6 border-b">
                            <div className="relative">
                                {isUploading ? (
                                    <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center"><ProcessingLoaderIcon /></div>
                                ) : prefs.profile.profilePictureUrl ? (
                                    <img src={prefs.profile.profilePictureUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="h-24 w-24 text-slate-300" />
                                )}
                                <label htmlFor="profile-picture-upload" className="absolute bottom-0 right-0 cursor-pointer bg-white p-1 rounded-full shadow-md border border-slate-200 hover:bg-slate-100">
                                    <PencilIcon className="h-4 w-4 text-slate-600" />
                                    <input id="profile-picture-upload" name="profile-picture-upload" type="file" className="sr-only" accept="image/*" onChange={handleProfilePictureSelect} disabled={isUploading} />
                                </label>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Your Profile</h3>
                                <p className="text-sm text-slate-500">This info will be used for batch processing reports.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                             <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">First Name</label>
                                <input type="text" name="firstName" id="firstName" value={prefs.profile.firstName} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">Last Name</label>
                                <input type="text" name="lastName" id="lastName" value={prefs.profile.lastName} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone</label>
                                <input type="tel" name="phone" id="phone" value={prefs.profile.phone} onChange={handleProfileChange} maxLength={14} placeholder="(xxx) xxx-xxxx" className="mt-1 p-2 block w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="branch" className="block text-sm font-medium text-slate-700">Branch</label>
                                <input type="text" name="branch" id="branch" value={prefs.profile.branch} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
                                <input type="email" name="email" id="email" value={userEmail || ''} disabled className="mt-1 p-2 block w-full rounded-md border border-slate-300 shadow-sm sm:text-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                            </div>
                        </div>
                    </div>
                );
            case 'Notifications':
                const notificationTypes: { key: keyof UserPreferences['notifications']; label: string }[] = [
                    { key: 'allUpdates', label: 'All Updates' },
                    { key: 'newComments', label: 'New Comments' },
                    { key: 'flagChanges', label: 'Flag Changes' },
                    { key: 'newChecks', label: 'New Checks Added' },
                    { key: 'statusChanges', label: 'Check Status Changes' },
                    { key: 'newBatches', label: 'New Batches Processed' },
                ];
                return (
                     <div>
                        <div className="pb-4 border-b">
                             <h3 className="text-xl font-bold text-slate-800">Notifications</h3>
                             <p className="text-sm text-slate-500">Choose how you want to be notified about activity.</p>
                        </div>
                        <div className="mt-6">
                            <table className="min-w-full">
                                <thead className="border-b">
                                    <tr>
                                        <th className="py-2 text-left text-sm font-semibold text-slate-600">Action</th>
                                        <th className="py-2 text-center text-sm font-semibold text-slate-600">In-App</th>
                                        <th className="py-2 text-center text-sm font-semibold text-slate-600">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notificationTypes.map(({ key, label }) => (
                                        <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 text-sm font-medium text-slate-800">{label}</td>
                                            <td className="py-3 text-center">
                                                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500" checked={prefs.notifications[key].inApp} onChange={() => handleNotificationChange(key, 'inApp')} />
                                            </td>
                                            <td className="py-3 text-center">
                                                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500" checked={prefs.notifications[key].email} onChange={() => handleNotificationChange(key, 'email')} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
                <div className="flex items-start justify-center min-h-screen p-4">
                    <div className="relative w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90dvh]">
                        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 flex-shrink-0">
                            <div><h3 className="text-2xl font-bold text-slate-800">User Preferences</h3></div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"><XMarkIcon className="h-6 w-6" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-3">
                            <div className="border-b border-slate-200">
                                <nav className="-mb-px flex space-x-6">
                                    {([ 'Profile', 'Appearance', 'Notifications'] as Tab[]).map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                            {tab}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            <div className="mt-6">
                               {renderContent()}
                            </div>
                        </div>
                         <div className="bg-gray-50 px-6 py-4 flex flex-shrink-0 justify-between items-center">
                            <button type="button" onClick={handleReset} className="text-sm font-medium text-slate-600 hover:text-red-600">Reset to Default</button>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="button" onClick={handleSave} className="rounded-md border border-transparent shadow-sm px-4 py-2 bg-sky-600 text-base font-medium text-white hover:bg-sky-700">Save Preferences</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ImageCropperModal
                isOpen={!!imageToCrop}
                imageSrc={imageToCrop}
                onClose={() => setImageToCrop(null)}
                onConfirmCrop={handleConfirmCrop}
            />
        </>
    );
};

export default PreferencesModal;