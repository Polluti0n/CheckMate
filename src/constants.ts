import { UserPreferences, CheckField, CheckStatus, Theme, UserProfile, CheckCategory,FlagColorVariant  } from './types';

export const CHECK_TYPE_COLORS: { [key in CheckCategory]: string } = {
    [CheckCategory.HOMEOWNER_LOCKBOX]: 'bg-sky-100 border-blue-500',
    [CheckCategory.MISC_HOMEOWNER_INCOME]: 'bg-green-100 border-green-500',
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: 'bg-purple-100 border-purple-500',
    [CheckCategory.COMMUNITY_ARCHIVES]: 'bg-slate-100 border-slate-500',

};

export const ALL_CHECK_FIELDS: { key: CheckField; label: string; isNumeric?: boolean }[] = [
    { key: 'payor', label: 'Payor' },
    { key: 'payee', label: 'Payee' },
    { key: 'amount', label: 'Amount', isNumeric: true },
    { key: 'date', label: 'Date Received' },
    { key: 'checkNumber', label: 'Check #' },
    { key: 'memo', label: 'Memo' },
    { key: 'category', label: 'Category' },
    { key: 'associationName', label: 'Association' },
    { key: 'bankAccountNumber', label: 'Bank Acct #' },
    { key: 'clientAccountNumber', label: 'Client Acct #' },
    { key: 'chargeType', label: 'Charge Type' },
    { key: 'department', label: 'Department' },
    { key: 'glCode', label: 'GL Code' },
    { key: 'trackingNumber', label: 'Tracking #' },
    { key: 'batchId', label: 'Batch ID' },
    { key: 'createdAt', label: 'Created At' },
];

// A curated list of fields suitable for display on a Kanban card.
export const AVAILABLE_CARD_FIELDS: { key: CheckField; label: string }[] = [
    { key: 'payor', label: 'Payor' },
    { key: 'amount', label: 'Amount' },
    { key: 'category', label: 'Category' },
    { key: 'checkNumber', label: 'Check #' },
    { key: 'memo', label: 'Memo' },
    { key: 'payee', label: 'Payee' },
    { key: 'associationName', label: 'Association' },
    { key: 'lastComment', label: 'Last Comment' },
    { key: 'date', label: 'Date' },
    { key: 'createdAt', label: 'Date Created' },
    { key: 'statusUpdatedAt', label: 'Last Modified' },
];

// FIX: Added THEMES export to resolve import error in App.tsx
export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      border: 'border-slate-500', // This will be overridden by status-specific colors
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      accent: 'bg-slate-500',
      glow: '14, 165, 233', // Default glow for selection
    },
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    colors: {
      border: 'border-sky-500',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      accent: 'bg-sky-500',
      glow: '14, 165, 233', // Custom glow class
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      border: 'border-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      accent: 'bg-amber-500',
      glow: '245, 158, 11', // Custom glow class
    },
  },
  {
    id: 'green',
    name: 'Emerald',
    colors: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-800',
      accent: 'bg-green-500',
      glow: '34, 197, 94', // Custom glow class
    },
  },
  {
    id: 'purple',
    name: 'Violet',
    colors: {
      border: 'border-purple-500',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      accent: 'bg-purple-500',
      glow: '168, 85, 247', // Custom glow class
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    colors: {
      border: 'border-rose-500',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      accent: 'bg-rose-500',
      glow: '244, 63, 94',
    },
  },
];


export const DEFAULT_PREFERENCES: UserPreferences = {
   viewMode: 'card',
   profile: {
// FIX: Added missing 'uid' and 'email' properties to conform to UserProfile type.
        uid: '',
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        branch: '',
        profilePictureUrl: '',
    },
    // New Notification Defaults
    notifications: {
        allUpdates: { inApp: true, email: false },
        newComments: { inApp: true, email: true },
        flagChanges: { inApp: true, email: false },
        newChecks: { inApp: true, email: false },
        statusChanges: { inApp: true, email: false },
        newBatches: { inApp: true, email: true },
    },
    columnThemes: {
        [CheckStatus.RECEIVED]: 'default',
        [CheckStatus.CONFIRMING_DETAILS]: 'default',
        [CheckStatus.QUEUED]: 'default',
        [CheckStatus.COMPLETE]: 'default',
        [CheckStatus.ARCHIVED]: 'default',
    },
    columnDisplayOptions: {
        [CheckStatus.RECEIVED]: { showCount: true, showTotal: false },
        [CheckStatus.CONFIRMING_DETAILS]: { showCount: true, showTotal: false },
        [CheckStatus.QUEUED]: { showCount: true, showTotal: true },
        [CheckStatus.COMPLETE]: { showCount: true, showTotal: false },
        [CheckStatus.ARCHIVED]: { showCount: true, showTotal: false },
    },
    cardLayout: {
        title: 'payor',
        topRight: 'amount',
        subtitle: 'category',
        body1: 'memo',
        footerLeft: 'checkNumber',
        footerRight: 'date',
    },
    visibleArchiveColumns: ['payor', 'amount', 'checkNumber', 'date', 'category'],
    archiveColumnWidths: {},
    archiveTheme: 'default',
    checkViewOptions: {
        showPayorAddress: true,
        showAmountInWords: true,
        showMemo: true,
        showSignature: true,
        fontTheme: 'cursive',
        background: 'classic',
        overlays: {
            overlayTopRight: 'category',
            overlayBottomLeft: 'flags',
        },
        footer: {
            footerLeft: 'date',
        }
    }
};

export const flagColorVariant: FlagColorVariant = {
         "bg-red-500": {
            hover: "hover:bg-red-500",
            default: "bg-red-500/80",
         },
         "bg-yellow-500": {
            hover: "hover:bg-yellow-500",
            default: "bg-yellow-500/80",
         },
         "bg-green-500": {
            hover: "hover:bg-green-500",
            default: "bg-green-500/80",
         },
         "bg-indigo-500": {
            hover: "hover:bg-indigo-500",
            default: "bg-indigo-500/80",
         },
         "bg-purple-500": {
            hover: "hover:bg-purple-500",
            default: "bg-purple-500/80",
         },
         "bg-pink-500": {
            hover: "hover:bg-pink-500",
            default: "bg-pink-500/80",
         },
         "bg-amber-500": {
            hover: "hover:bg-amber-500",
            default: "bg-amber-500/80",
         },
         "bg-lime-500": {
            hover: "hover:bg-lime-500",
            default: "bg-lime-500/80",
         },
         "bg-teal-500": {
            hover: "hover:bg-teal-500",
            default: "bg-teal-500/80",
         },
         "bg-sky-500": {
            hover: "hover:bg-sky-500",
            default: "bg-sky-500/80",
         }
    }
