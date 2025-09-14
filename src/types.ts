export enum CheckCategory {
  HOMEOWNER_LOCKBOX = "Homeowner Lockbox",
  MISC_HOMEOWNER_INCOME = "Miscellaneous Homeowner Income",
  MISC_NON_HOMEOWNER_INCOME = "Miscellaneous Non-homeowner Income",
  COMMUNITY_ARCHIVES = "Community Archives",
}

export enum CheckStatus {
  RECEIVED = "Received",
  CONFIRMING_DETAILS = "Confirming Details",
  QUEUED = "Queued",
  COMPLETE = "Complete",
  ARCHIVED = "Archived",
}

export interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    photoURL?: string;
}

export interface Flag {
  id: string;
  name: string;
  color: string; // Tailwind bg color class e.g., 'bg-red-500'
  textColor: string; // Tailwind text color class e.g., 'text-white'
}

export interface Comment {
  id: string;
  authorUid: string;
  authorName: string; // Denormalized for easy display
  authorPhotoURL?: string; // Denormalized for easy display
  text: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userUid: string;
  userName: string; // Denormalized for easy display
  userPhotoURL?: string; // Denormalized for easy display
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface Check {
  id: string;
  category: CheckCategory;
  status: CheckStatus;
  
  // Core fields, renamed for clarity or from AI extraction
  payor: string; // Generic payor, used as "Homeowner Name" when applicable
  payee: string; 
  amount: number;
  date: string; // "Date Received" YYYY-MM-DD
  checkNumber: string;
  memo: string; // Can be "Description for Comments Field" or generic memo
  
  // Common fields from user spec
  associationName?: string;

  // Category-specific fields
  accountNumber?: string; // For Homeowner checks
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
  statusBeforeArchive?: CheckStatus; // For unarchiving
  comments: Comment[];
  auditTrail: AuditLog[];
  flags: string[]; // array of flag ids
  createdAt: string;
}

export interface Batch {
    id: string;
    checkIds: string[];
    createdAt: string;
    trackingNumber: string;
}

// FIX: Add missing type definitions to resolve errors in multiple components.
export type CheckField = keyof Check | 'lastComment';

export type CardLayoutZone = 'title' | 'topRight' | 'subtitle' | 'body1' | 'body2' | 'footerLeft' | 'footerRight';

export interface Theme {
    id: string;
    name: string;
    colors: {
        border: string;
        bg: string;
        text: string;
        accent: string;
        glow: string;
    };
}

export interface UserPreferences {
    columnThemes: Record<CheckStatus, string>;
    columnDisplayOptions: Record<CheckStatus, { showCount: boolean; showTotal: boolean }>;
    cardLayout: Partial<Record<CardLayoutZone, CheckField>>;
    visibleArchiveColumns: CheckField[];
    archiveColumnWidths: Record<string, number>;
    archiveTheme: string;
}
