import React, { useState, useEffect } from 'react';
import { UserPreferences, CheckField, CardLayoutZone, UserProfile, Check, CheckStatus, CheckCategory, CardStyle, Flag } from '../types';
import { XMarkIcon, UserCircleIcon, PencilIcon, ProcessingLoaderIcon } from './icons';
import { AVAILABLE_CARD_FIELDS, DEFAULT_PREFERENCES } from '../constants';
import * as firestoreService from '../services/firestoreService';
import ImageCropperModal from './ImageCropperModal';
import { ClassicCard, LedgerCard, ModernCard, CardZoneProps, CheckStyleCard } from './CardStyles';

interface PreferencesViewProps {
    onClose: () => void;
    currentPreferences: UserPreferences;
    onSave: (newPreferences: Partial<UserPreferences>) => void;
    userEmail: string | null;
    currentUser: UserProfile | null;
}

type Tab = 'Profile' | 'Appearance' | 'Notifications';

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

// Mock Data for Previews
const PREVIEW_CHECK: Check = {
    id: 'preview-check',
    payor: 'Legacy Properties LLC',
    payee: 'Acme Landscaping Inc.',
    amount: 1234.56,
    checkNumber: '4092',
    date: new Date().toISOString(),
    memo: 'October Grounds Maintenance',
    category: CheckCategory.MISC_NON_HOMEOWNER_INCOME,
    status: CheckStatus.RECEIVED,
    flags: ['flag-1', 'flag-2'],
    comments: [],
    auditTrail: [],
    createdAt: new Date().toISOString(),
    payorAddress: { street: '123 Main St', city: 'Dallas', state: 'TX', zip: '75201' },
    bankName: 'Chase Bank',
    routingNumber: '123456789',
    bankAccountNumber: '987654321',
    signature: true,
    additionalInfo: ''
};

const PREVIEW_FLAGS: Flag[] = [
    { id: 'flag-1', name: 'Urgent', color: 'bg-red-500', textColor: 'text-white' },
    { id: 'flag-2', name: 'Approved', color: 'bg-green-500', textColor: 'text-white' },
];

const PreferencesView: React.FC<PreferencesViewProps> = ({ onClose, currentPreferences, onSave, userEmail, currentUser }) => {
    const [prefs, setPrefs] = useState<UserPreferences>(currentPreferences);
    const [activeTab, setActiveTab] = useState<Tab>('Appearance');
    const [isUploading, setIsUploading] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    useEffect(() => setPrefs(currentPreferences), [currentPreferences]);

    // Removed isOpen check as this is now a dedicated route

    const handleSave = () => {
        onSave(prefs);
        onClose();
    };

    //Keep all profile information but change all other user preferences to defaults 
    const handleReset = () => {
        setPrefs(p => ({
            ...p,
            darkMode: DEFAULT_PREFERENCES.darkMode,
            cardStyle: DEFAULT_PREFERENCES.cardStyle,
            cardLayout: DEFAULT_PREFERENCES.cardLayout,
            checkViewOptions: DEFAULT_PREFERENCES.checkViewOptions,
        }));
    };


    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            const formattedPhone = formatPhoneNumber(value);
            setPrefs(p => ({ ...p, profile: { ...p.profile, phone: formattedPhone } }));
        } else {
            setPrefs(p => ({ ...p, profile: { ...p.profile, [name]: value } }));
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
        e.target.value = '';
    };

    const handleConfirmCrop = async (croppedBlob: Blob) => {
        if (!currentUser) return;
        setImageToCrop(null);
        setIsUploading(true);
        try {
            const uid = currentUser.uid || '';
            const downloadURL = await firestoreService.uploadProfilePicture(croppedBlob, uid);
            const newProfile = { ...prefs.profile, profilePictureUrl: downloadURL };
            const newPrefs = { ...prefs, profile: newProfile };
            await firestoreService.updateUserProfile(uid, newPrefs);
            setPrefs(newPrefs);
            onSave(newPrefs);
        } catch (error) {
            console.error("Failed to upload cropped profile picture:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCardLayoutChange = (targetZone: CardLayoutZone, newFieldKey: CheckField | 'none') => {
        setPrefs(prev => {
            const newLayout = { ...prev.cardLayout };

            // If the selected field is not 'none', find if it's used elsewhere
            if (newFieldKey !== 'none') {
                const currentZoneOfNewField = (Object.keys(newLayout) as CardLayoutZone[]).find(
                    zone => newLayout[zone] === newFieldKey
                );
                // If it is used elsewhere, and not in the zone we are currently editing, empty the old zone.
                if (currentZoneOfNewField && currentZoneOfNewField !== targetZone) {
                    delete newLayout[currentZoneOfNewField];
                }
            }

            // Now, set the new field for the target zone.
            if (newFieldKey === 'none') {
                delete newLayout[targetZone];
            } else {
                newLayout[targetZone] = newFieldKey;
            }

            return { ...prev, cardLayout: newLayout };
        });
    };


    const PreferencesZoneWrapper: React.FC<CardZoneProps> = ({ zone, fieldKey, label, className }) => {

        const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newField = e.target.value as CheckField | 'none';
            handleCardLayoutChange(zone, newField);
        };

        const selectId = `zone-select-${zone}`;

        return (
            <div className={`${className} relative`}>
                <label htmlFor={selectId} className="absolute -top-1.5 left-1.5 text-[9px] font-bold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-1 rounded-full">
                    {label || zone}
                </label>
                <select
                    id={selectId}
                    value={fieldKey || 'none'}
                    onChange={handleSelectChange}
                    className="w-full h-full p-2 border-2 border-dashed rounded transition-colors text-xs font-medium text-slate-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-500"
                >
                    <option value="none">-- Empty --</option>
                    {AVAILABLE_CARD_FIELDS.map(field => (
                        <option
                            key={field.key}
                            value={field.key}
                        >
                            {field.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Appearance':
                return (
                    <>
                        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700 mb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Appearance</h3>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Customize check display.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden">
                            <div className="md:col-span-1 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">

                                <div>
                                    <h4 className="font-semibold text-slate-700 dark:text-gray-300 text-sm mb-2">Theme</h4>
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="dark-mode-toggle" className="text-xs text-slate-700 dark:text-gray-300">Dark Mode</label>
                                        <button
                                            id="dark-mode-toggle"
                                            onClick={() => setPrefs(p => ({ ...p, darkMode: !p.darkMode }))}
                                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${prefs.darkMode ? 'bg-sky-600' : 'bg-slate-200 dark:bg-gray-600'}`}
                                        >
                                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${prefs.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="border-t dark:border-gray-700 pt-3 mt-3">
                                    <h4 className="font-semibold text-slate-700 dark:text-gray-300 text-sm mb-2">Style</h4>
                                    <div className="flex flex-col space-y-2">
                                        {(['classic', 'ledger', 'modern', 'check'] as CardStyle[]).map(style => (
                                            <button
                                                key={style}
                                                onClick={() => setPrefs(p => ({ ...p, cardStyle: style }))}
                                                className={`w-full text-xs font-semibold py-1.5 px-3 rounded-md border-2 transition-colors text-left flex items-center justify-between ${prefs.cardStyle === style ? 'border-slate-700 dark:border-sky-400 bg-slate-50 dark:bg-sky-900 text-slate-800 dark:text-white' : 'border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 text-slate-500 dark:text-gray-400'}`}>
                                                <span>{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                                                {prefs.cardStyle === style && <div className="h-2 w-2 rounded-full bg-slate-700 dark:bg-white"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>
                            <div className="md:col-span-2 flex flex-col">
                                <h4 className="font-semibold text-slate-700 dark:text-gray-300 text-sm mb-1">Preview</h4>
                                <div className={`bg-slate-100 dark:bg-gray-700 p-4 rounded-lg flex justify-center items-center flex-grow min-h-[220px] ${prefs.darkMode ? 'dark' : ''}`}>
                                    <div className="w-full max-w-sm">
                                        {prefs.cardStyle === 'classic' && (
                                            <ClassicCard check={PREVIEW_CHECK} allFlags={PREVIEW_FLAGS} cardLayout={prefs.cardLayout} ZoneComponent={PreferencesZoneWrapper} preferences={prefs} />
                                        )}
                                        {prefs.cardStyle === 'ledger' && (
                                            <LedgerCard check={PREVIEW_CHECK} allFlags={PREVIEW_FLAGS} cardLayout={prefs.cardLayout} ZoneComponent={PreferencesZoneWrapper} preferences={prefs} />
                                        )}
                                        {prefs.cardStyle === 'modern' && (
                                            <ModernCard check={PREVIEW_CHECK} allFlags={PREVIEW_FLAGS} cardLayout={prefs.cardLayout} ZoneComponent={PreferencesZoneWrapper} preferences={prefs} />
                                        )}
                                        {prefs.cardStyle === 'check' && (
                                            <CheckStyleCard check={PREVIEW_CHECK} allFlags={PREVIEW_FLAGS} cardLayout={prefs.cardLayout} ZoneComponent={PreferencesZoneWrapper} preferences={prefs} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'Profile':
                return (
                    <div className="pt-2">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Left Column: Image & Basic Info */}
                            <div className="flex-shrink-0 flex flex-col items-center md:items-start space-y-3">
                                <div className="relative group">
                                    {isUploading ? (
                                        <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center"><ProcessingLoaderIcon /></div>
                                    ) : prefs.profile.profilePictureUrl ? (
                                        <img src={prefs.profile.profilePictureUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100 dark:ring-gray-700" />
                                    ) : (
                                        <UserCircleIcon className="h-20 w-20 text-slate-300 dark:text-gray-500" />
                                    )}
                                    <label htmlFor="profile-picture-upload" className="absolute -bottom-1 -right-1 cursor-pointer bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-sm border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600 text-slate-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                                        <PencilIcon className="h-3 w-3" />
                                        <input id="profile-picture-upload" name="profile-picture-upload" type="file" className="sr-only" accept="image/*" onChange={handleProfilePictureSelect} disabled={isUploading} />
                                    </label>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-xs font-medium text-slate-500 dark:text-gray-400">Profile Picture</p>
                                    <p className="text-[10px] text-slate-400 dark:text-gray-500">Used for batch reports</p>
                                </div>
                            </div>

                            {/* Right Column: Form Inputs */}
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Personal Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                    <div>
                                        <label htmlFor="firstName" className="block text-xs font-medium text-slate-700 dark:text-gray-300">First Name</label>
                                        <input type="text" name="firstName" id="firstName" value={prefs.profile.firstName} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 dark:border-gray-600 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="lastName" className="block text-xs font-medium text-slate-700 dark:text-gray-300">Last Name</label>
                                        <input type="text" name="lastName" id="lastName" value={prefs.profile.lastName} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 dark:border-gray-600 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className="block text-xs font-medium text-slate-700 dark:text-gray-300">Phone</label>
                                        <input type="tel" name="phone" id="phone" value={prefs.profile.phone} onChange={handleProfileChange} maxLength={14} placeholder="(xxx) xxx-xxxx" className="mt-1 p-2 block w-full rounded-md border border-slate-300 dark:border-gray-600 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div>
                                        <label htmlFor="branch" className="block text-xs font-medium text-slate-700 dark:text-gray-300">Branch</label>
                                        <input type="text" name="branch" id="branch" value={prefs.profile.branch} onChange={handleProfileChange} className="mt-1 p-2 block w-full rounded-md border border-slate-300 dark:border-gray-600 shadow-sm focus:border-sky-500 focus:ring-sky-500 text-sm dark:bg-gray-700 dark:text-white" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="email" className="block text-xs font-medium text-slate-700 dark:text-gray-300">Email</label>
                                        <input type="email" name="email" id="email" value={userEmail || ''} disabled className="mt-1 p-2 block w-full rounded-md border border-slate-300 dark:border-gray-600 shadow-sm text-sm bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Notifications':
                const notificationTypes: { key: keyof UserPreferences['notifications']; label: string }[] = [
                    { key: 'allUpdates', label: 'All Updates' },
                    { key: 'newComments', label: 'New Comments' },
                    { key: 'flagChanges', label: 'Flag Changes' },
                    { key: 'newChecks', label: 'New Checks' },
                    { key: 'statusChanges', label: 'Status Changes' },
                    { key: 'newBatches', label: 'Batch Processed' },
                ];
                return (
                    <div>
                        <div className="pb-3 border-b dark:border-gray-700">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400">Alert preferences.</p>
                        </div>
                        <div className="mt-3">
                            <table className="min-w-full">
                                <thead className="border-b dark:border-gray-700">
                                    <tr>
                                        <th className="py-2 text-left text-xs font-semibold text-slate-600 dark:text-gray-300">Action</th>
                                        <th className="py-2 text-center text-xs font-semibold text-slate-600 dark:text-gray-300">In-App</th>
                                        <th className="py-2 text-center text-xs font-semibold text-slate-600 dark:text-gray-300">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {notificationTypes.map(({ key, label }) => (
                                        <tr key={key} className="border-b border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700">
                                            <td className="py-2 text-sm font-medium text-slate-800 dark:text-white">{label}</td>
                                            <td className="py-2 text-center">
                                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500" checked={prefs.notifications[key].inApp} onChange={() => handleNotificationChange(key, 'inApp')} />
                                            </td>
                                            <td className="py-2 text-center">
                                                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500" checked={prefs.notifications[key].email} onChange={() => handleNotificationChange(key, 'email')} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-gray-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
            {/* Enterprise Header */}
            <header className="h-16 px-8 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-20 transition-colors">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 bg-slate-900 dark:bg-sky-600 rounded-xl flex items-center justify-center shadow-lg">
                            <UserCircleIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white uppercase leading-none">System Settings</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise Configuration</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button 
                        onClick={handleReset}
                        className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-all px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                    >
                        Reset Defaults
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-gray-800"></div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            <div className="flex-grow flex overflow-hidden">
                {/* Navigation Sidebar */}
                <aside className="w-72 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hidden md:flex flex-col p-6 transition-colors">
                    <nav className="flex-grow space-y-2">
                        {(['Appearance', 'Profile', 'Notifications'] as Tab[]).map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)} 
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    activeTab === tab 
                                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 ring-1 ring-sky-400/30' 
                                        : 'text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <span>{tab}</span>
                                {activeTab === tab && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>}
                            </button>
                        ))}
                    </nav>

                    <div className="pt-6 border-t border-slate-100 dark:border-gray-800">
                        <div className="bg-slate-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-slate-100 dark:border-gray-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate">{userEmail}</p>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-grow flex flex-col bg-slate-50 dark:bg-gray-950 overflow-hidden relative">
                    <div className="flex-grow overflow-y-auto px-8 py-10 custom-scrollbar">
                        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {renderContent()}
                        </div>
                    </div>

                    <footer className="h-20 px-8 border-t border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between transition-colors">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Configuration changes affect all active sessions</p>
                        <div className="flex gap-4 ml-auto">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="rounded-xl border border-slate-200 dark:border-gray-700 px-6 py-2.5 bg-white dark:bg-gray-800 text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm"
                            >
                                Cancel Changes
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSave} 
                                className="rounded-xl px-10 py-2.5 bg-sky-600 text-sm font-bold text-white hover:bg-sky-700 shadow-xl shadow-sky-600/30 transition-all active:scale-95 ring-1 ring-sky-400/30"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </footer>
                </main>
            </div>

            <ImageCropperModal
                isOpen={!!imageToCrop}
                imageSrc={imageToCrop}
                onClose={() => setImageToCrop(null)}
                onConfirmCrop={handleConfirmCrop}
            />
        </div>
    );

};

export default PreferencesView;