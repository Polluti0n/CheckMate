import { CheckStatus } from './types';
export const ALL_CHECK_FIELDS = [
    { key: 'payor', label: 'Payor' },
    { key: 'payee', label: 'Payee' },
    { key: 'amount', label: 'Amount', isNumeric: true },
    { key: 'date', label: 'Date Received' },
    { key: 'checkNumber', label: 'Check #' },
    { key: 'memo', label: 'Memo' },
    { key: 'category', label: 'Category' },
    { key: 'associationName', label: 'Association' },
    { key: 'accountNumber', label: 'Account #' },
    { key: 'chargeType', label: 'Charge Type' },
    { key: 'department', label: 'Department' },
    { key: 'glCode', label: 'GL Code' },
    { key: 'trackingNumber', label: 'Tracking #' },
    { key: 'batchId', label: 'Batch ID' },
    { key: 'createdAt', label: 'Created At' },
];
// A curated list of fields suitable for display on a Kanban card.
export const AVAILABLE_CARD_FIELDS = [
    { key: 'payor', label: 'Payor' },
    { key: 'amount', label: 'Amount' },
    { key: 'category', label: 'Category' },
    { key: 'checkNumber', label: 'Check #' },
    { key: 'memo', label: 'Memo' },
    { key: 'payee', label: 'Payee' },
    { key: 'associationName', label: 'Association' },
    { key: 'lastComment', label: 'Last Comment' },
    { key: 'date', label: 'Date' },
];
// FIX: Added THEMES export to resolve import error in App.tsx
export const THEMES = [
    {
        id: 'default',
        name: 'Default',
        colors: {
            border: 'border-slate-500', // This will be overridden by status-specific colors
            bg: 'bg-slate-50',
            text: 'text-slate-800',
            accent: 'bg-slate-500',
            glow: 'ring-sky-500 shadow-lg shadow-sky-500/40', // Default glow for selection
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
            glow: 'ring-sky-500 shadow-lg shadow-sky-500/40',
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
            glow: 'ring-amber-500 shadow-lg shadow-amber-500/40',
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
            glow: 'ring-green-500 shadow-lg shadow-green-500/40',
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
            glow: 'ring-purple-500 shadow-lg shadow-purple-500/40',
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
            glow: 'ring-rose-500 shadow-lg shadow-rose-500/40',
        },
    },
];
export const DEFAULT_PREFERENCES = {
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
};
