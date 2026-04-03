import { UserPreferences, CheckField, CheckStatus, Theme, CheckCategory, FlagColorVariant } from './types';
import { PayorIcon, BanknotesIcon, CategoryIcon, HashtagIcon, MemoIcon, PayeeIcon, MapLocationIcon, CommentIcon, CalendarDaysIcon, DateCreatedIcon, LastModifiedIcon } from './components/icons'

export const CHECK_TYPE_COLORS: { [key in CheckCategory]: { bg: string, border: string, dark: { bg: string, border: string, gradient: string } } } = {
  [CheckCategory.HOMEOWNER_LOCKBOX]: { bg: 'bg-sky-100', border: 'border-blue-500', dark: { bg: 'bg-sky-900', border: 'border-blue-700', gradient: 'to-sky-900' } },
  [CheckCategory.MISC_HOMEOWNER_INCOME]: { bg: 'bg-green-100', border: 'border-green-500', dark: { bg: 'bg-green-900', border: 'border-green-700', gradient: 'to-green-900' } },
  [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: { bg: 'bg-purple-100', border: 'border-purple-500', dark: { bg: 'bg-purple-900', border: 'border-purple-700', gradient: 'to-purple-900' } },
  [CheckCategory.COMMUNITY_ARCHIVES]: { bg: 'bg-slate-100', border: 'border-slate-500', dark: { bg: 'bg-slate-800', border: 'border-slate-600', gradient: 'to-slate-900' } },
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
export const AVAILABLE_CARD_FIELDS: { key: CheckField | 'flags'; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'payor', label: 'Payor', icon: PayorIcon },
  { key: 'amount', label: 'Amount', icon: BanknotesIcon },
  { key: 'category', label: 'Category', icon: CategoryIcon },
  { key: 'checkNumber', label: 'Check #', icon: HashtagIcon },
  { key: 'memo', label: 'Memo', icon: MemoIcon },
  { key: 'payee', label: 'Payee', icon: PayeeIcon },
  { key: 'associationName', label: 'Association', icon: MapLocationIcon },
  { key: 'lastComment', label: 'Last Comment', icon: CommentIcon },
  { key: 'date', label: 'Date', icon: CalendarDaysIcon },
  { key: 'createdAt', label: 'Date Created', icon: DateCreatedIcon },
  { key: 'statusUpdatedAt', label: 'Last Modified', icon: LastModifiedIcon },
];

// FIX: Added THEMES export to resolve import error in App.tsx
export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      border: 'border-slate-500',
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      accent: 'bg-slate-500',
      glow: '14, 165, 233',
      dark: {
        border: 'border-slate-600',
        bg: 'bg-slate-900',
        text: 'text-slate-200',
        accent: 'bg-slate-500',
        gradientBg: 'bg-gradient-to-bl from-slate-900 from-10% to-slate-800 to-50%',
      },
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
      glow: '14, 165, 233',
      dark: {
        border: 'border-sky-700',
        bg: 'bg-sky-900',
        text: 'text-sky-300',
        accent: 'bg-sky-600',
        gradientBg: 'bg-gradient-to-bl from-sky-900 from-10% to-slate-800 to-50%',
      },
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
      glow: '245, 158, 11',
      dark: {
        border: 'border-amber-700',
        bg: 'bg-amber-900',
        text: 'text-amber-300',
        accent: 'bg-amber-600',
        gradientBg: 'bg-gradient-to-bl from-amber-900 from-10% to-slate-800 to-50%',
      },
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
      glow: '34, 197, 94',
      dark: {
        border: 'border-green-700',
        bg: 'bg-green-900',
        text: 'text-green-300',
        accent: 'bg-green-600',
        gradientBg: 'bg-gradient-to-bl from-green-900 from-10% to-slate-800 to-50%',
      },
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
      glow: '168, 85, 247',
      dark: {
        border: 'border-purple-700',
        bg: 'bg-purple-900',
        text: 'text-purple-300',
        accent: 'bg-purple-600',
        gradientBg: 'bg-gradient-to-bl from-purple-900 from-10% to-slate-800 to-50%',
      },
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
      dark: {
        border: 'border-rose-700',
        bg: 'bg-rose-900',
        text: 'text-rose-300',
        accent: 'bg-rose-600',
        gradientBg: 'bg-gradient-to-bl from-rose-900 from-10% to-slate-800 to-50%',
      },
    },
  },
  {
    id: 'cyan',
    name: 'Cyan',
    colors: {
      border: 'border-cyan-500',
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      accent: 'bg-cyan-500',
      glow: '6, 182, 212',
      dark: {
        border: 'border-cyan-700',
        bg: 'bg-cyan-900',
        text: 'text-cyan-300',
        accent: 'bg-cyan-600',
        gradientBg: 'bg-gradient-to-bl from-cyan-900 from-10% to-slate-800 to-50%',
      },
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    colors: {
      border: 'border-slate-500',
      bg: 'bg-slate-50',
      text: 'text-slate-800',
      accent: 'bg-slate-500',
      glow: '100, 116, 139',
      dark: {
        border: 'border-slate-600',
        bg: 'bg-slate-900',
        text: 'text-slate-200',
        accent: 'bg-slate-700',
        gradientBg: 'bg-gradient-to-bl from-slate-700/80 from-10% to-slate-800 to-50%',
      },
    },
  },
  {
    id: 'zinc',
    name: 'Zinc',
    colors: {
      border: 'border-zinc-500',
      bg: 'bg-zinc-50',
      text: 'text-zinc-800',
      accent: 'bg-zinc-500',
      glow: '113, 113, 122',
      dark: {
        border: 'border-zinc-700',
        bg: 'bg-zinc-900',
        text: 'text-zinc-300',
        accent: 'bg-zinc-600',
        gradientBg: 'bg-gradient-to-bl from-zinc-900 from-10% to-slate-800 to-50%',
      },
    },
  },
];


export const DEFAULT_PREFERENCES: UserPreferences = {
  cardStyle: 'classic',
  profile: {
    // FIX: Added missing 'uid' and 'email' properties to conform to UserProfile type.
    uid: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    branch: '',
    profilePictureUrl: '',
    role: 'Member' as any,
    widgets: [],
    todoList: [],
    pinnedChecks: [],
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
    [CheckStatus.IN_TRANSIT]: 'default',
  },
  columnDisplayOptions: {
    [CheckStatus.RECEIVED]: { showCount: true, showTotal: false },
    [CheckStatus.CONFIRMING_DETAILS]: { showCount: true, showTotal: false },
    [CheckStatus.QUEUED]: { showCount: true, showTotal: true },
    [CheckStatus.COMPLETE]: { showCount: true, showTotal: false },
    [CheckStatus.ARCHIVED]: { showCount: true, showTotal: false },
    [CheckStatus.IN_TRANSIT]: { showCount: true, showTotal: false },
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
  },
  darkMode: false,
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
