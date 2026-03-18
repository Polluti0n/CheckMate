

// Enums from original file
export enum CheckCategory {
    HOMEOWNER_LOCKBOX = "Homeowner Lockbox",
    MISC_HOMEOWNER_INCOME = "Miscellaneous Homeowner/Attorney",
    MISC_NON_HOMEOWNER_INCOME = "Miscellaneous Non-homeowner/GL",
    COMMUNITY_ARCHIVES = "Community Archives",
}

export enum CheckStatus {
    RECEIVED = "Received",
    CONFIRMING_DETAILS = "Confirming Details",
    QUEUED = "Queued",
    COMPLETE = "Complete",
    ARCHIVED = "Archived",
}

export type CardStyle = 'classic' | 'ledger' | 'modern' | 'check';

export type CheckField = keyof Check | 'lastComment';
export type CardLayoutZone = 'title' | 'topRight' | 'subtitle' | 'body1' | 'body2' | 'footerLeft' | 'footerRight' | 'overlayTopRight' | 'overlayBottomLeft';


export interface Flag {
    id: string;
    name: string;
    color: string; // Tailwind bg color class e.g., 'bg-red-500'
    textColor: string; // Tailwind text color class e.g., 'text-white'
    uid?: string; // UID of the user who created the flag
}

export interface payorAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
}


export interface Comment {
    id: string;
    author: string; // Author's name
    authorUid: string; // Author's UID
    text: string;
    timestamp: string;
}

export interface AuditLog {
    id: string;
    user: string; // User's name for display
    uid: string; // User's unique ID for tracking
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: string; // ISO string
}

export interface Check {
    id: string;
    category: CheckCategory;
    status: CheckStatus;
    additionalInfo: string;

    // Core fields, renamed for clarity or from AI extraction
    payor: string; // Generic payor, used as "Homeowner Name" when applicable
    payorAddress: payorAddress; // "Homeowner Address"
    payee: string;
    amount: number;
    date: string; // "Date Received" YYYY-MM-DD
    checkNumber: string;
    memo: string; // Can be "Description for Comments Field" or generic memo
    bankName: string;
    routingNumber: string;
    bankAccountNumber: string;
    signature: boolean;

    // Common fields from user spec
    associationName?: string;

    // Category-specific fields
    clientAccountNumber?: string; // For Homeowner checks
    chargeType?: string; // For MISC_HOMEOWNER_INCOME
    department?: string; // For MISC_NON_HOMEOWNER_INCOME
    glCode?: string; // For MISC_NON_HOMEOWNER_INCOME
    glDescription?: string; // For MISC_NON_HOMEOWNER_INCOME
    depositingBank?: string; // For MISC_NON_HOMEOWNER_INCOME

    // Existing metadata
    imageUrl?: string; // URL to the processed image
    trackingNumber?: string;
    batchId?: string;
    statusUpdatedAt?: string;
    comments: Comment[];
    auditTrail: AuditLog[];
    flags: string[]; // array of flag ids
    createdAt: string;
    boardOrder?: number;
    isNew?: boolean;
    previousStatus?: CheckStatus | null;
}

export interface Batch {
    id: string;
    checkIds: string[];
    createdAt: string;
    trackingNumber: string;
}

export interface CurrentUser {
    name: string;
    uid: string;
    email: string | null; // Added email
}

export interface Theme {
    id: string;
    name: string;
    colors: {
        border: string; // Tailwind border color class e.g., 'border-red-500'
        bg: string; // Tailwind bg color class e.g., 'bg-red-50'
        text: string; // Tailwind text color class e.g., 'text-red-800'
        accent: string; // Tailwind bg color for the accent swatch e.g., 'bg-red-500'
        glow?: string; // Tailwind ring and shadow classes for selection glow e.g., 'ring-sky-500 shadow-lg shadow-sky-500/40'
        dark?: {
            border: string;
            bg: string;
            text: string;
            accent: string;
            gradientBg?: string;
        }
    };
}

export type BatchStatus = 'queued' | 'processing_image' | 'needing_crop' | 'ready_for_extraction' | 'extracting' | 'ready' | 'error' | 'missing_type';

export interface BatchItem {
    id: string; // unique temp id
    file: File;
    originalPreviewUrl: string; // for manual crop if needed
    processedPreviewUrl?: string; // result of CV
    status: BatchStatus;
    checkData?: Partial<Check>; // Extracted data
    category?: CheckCategory;
    error?: string;
    micrData?: any;
}

export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    branch: string;
    profilePictureUrl: string;
}

export interface NotificationSettings {
    allUpdates: { inApp: boolean; email: boolean };
    newComments: { inApp: boolean; email: boolean };
    flagChanges: { inApp: boolean; email: boolean };
    newChecks: { inApp: boolean; email: boolean };
    statusChanges: { inApp: boolean; email: boolean };
    newBatches: { inApp: boolean; email: boolean };
}

export interface Notification {
    id: string;
    userId: string;
    actorId?: string;
    message: string;
    link: string;
    read: boolean;
    timestamp: string;
}

export type AlertType = 'info' | 'error' | 'warning' | 'success';

export interface NotificationData {
    message: string;
}

export interface ToastData {
    id: string;
    userProfile?: UserProfile;
    notification: NotificationData;
    handleToastClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    alertType?: AlertType;
    iconSvg?: React.ReactNode;
}

export type CheckFontTheme = 'cursive' | 'block' | 'typed';
export type CheckBackground = 'classic' | 'modern' | 'secure';
export type CheckOverlayZone = 'overlayTopRight' | 'overlayBottomLeft';
export type CheckFooterZone = 'footerLeft' | 'footerRight';
export type CheckViewLayoutZone = CheckOverlayZone | CheckFooterZone;

export interface CheckViewOptions {
    showPayorAddress: boolean;
    showAmountInWords: boolean;
    showMemo: boolean;
    showSignature: boolean;
    fontTheme: CheckFontTheme;
    background: CheckBackground;
    overlays: Partial<Record<CheckOverlayZone, CheckField | 'flags' | 'category' | 'none'>>;
    footer: Partial<Record<CheckFooterZone, CheckField | 'flags' | 'category' | 'none'>>;
}

export interface UserPreferences {
    cardStyle: CardStyle;
    profile: UserProfile;
    notifications: NotificationSettings;
    columnThemes: Record<CheckStatus, string>;
    columnDisplayOptions: Record<CheckStatus, { showCount: boolean; showTotal: boolean }>;
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    visibleArchiveColumns: CheckField[];
    archiveColumnWidths: Record<string, number>;
    archiveTheme: string;
    checkViewOptions: CheckViewOptions;
    darkMode?: boolean;
    batchViewMode?: 'list' | 'calendar';
}

export interface FlagColorVariant {
    [key: string]: {
        hover: string;
        default: string;
    };
}