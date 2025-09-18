// src/formConfig.ts

import { CheckCategory } from './types';
import { HomeIcon, UsersIcon, BuildingOfficeIcon, ArchiveBoxIcon } from './components/icons';

// UI Configuration for category selection cards
export const categoryConfig = {
    [CheckCategory.HOMEOWNER_LOCKBOX]: {
        icon: HomeIcon,
        colors: "bg-sky-50 border-sky-200 hover:border-sky-400 hover:bg-sky-100",
        iconColors: "bg-sky-100 text-sky-700",
        description: "Homeowner dues payments.",
    },
    [CheckCategory.MISC_HOMEOWNER_INCOME]: {
        icon: UsersIcon,
        colors: "bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100",
        iconColors: "bg-green-100 text-green-700",
        description: "Clubhouse rentals, pool fees, key fobs, etc.",
    },
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: {
        icon: BuildingOfficeIcon,
        colors: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100",
        iconColors: "bg-purple-100 text-purple-700",
        description: "Transition fees, utility payments, insurance.",
    },
    [CheckCategory.COMMUNITY_ARCHIVES]: {
        icon: ArchiveBoxIcon,
        colors: "bg-slate-100 border-slate-200 hover:border-slate-400 hover:bg-slate-200",
        iconColors: "bg-slate-200 text-slate-700",
        description: "Resale documents, new account fees.",
    },
};

// Form field definitions and options
const chargeTypeOptions = [ { "value": "", "text": "Select..." }, /* ... all 90+ options from your file ... */ ];
const departmentOptions = [ { "value": "", "text": "Select..." }, { "value": "GL", "text": "GL" }, { "value": "Homeowner", "text": "Homeowner" }, { "value": "Misc", "text": "Misc" }, { "value": "Settlements", "text": "Settlements" }];

export const formConfig = {
    common: [
        { name: "checkNumber", label: "Check Number", type: "text", required: true },
        { name: "date", label: "Date Received", type: "date", required: true },
        { name: "associationName", label: "Association Name", type: "text", required: true, colSpan: 2 },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "payee", label: "Payee", type: "text", required: true },
    ],
    [CheckCategory.HOMEOWNER_LOCKBOX]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true },
        { name: "accountNumber", label: "Account Number", type: "text", required: true },
        { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
    ],
    [CheckCategory.MISC_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true },
        { name: "accountNumber", label: "Account Number", type: "text", required: true },
        { name: "chargeType", label: "Charge Type for Homeowner's Account", type: "datalist", required: true, options: chargeTypeOptions, colSpan: 2 },
        { name: "memo", label: "Description for Comments Field", type: "textarea", required: false, colSpan: 2 },
    ],
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Payor", type: "text", required: true },
        { name: "department", label: "Department", type: "datalist", required: true, options: departmentOptions },
        { name: "glCode", label: "GL Code", type: "text", required: true },
        { name: "glDescription", label: "GL Description", type: "text", required: false },
        { name: "depositingBank", label: "Depositing Bank", type: "text", required: false, colSpan: 2 },
    ],
    [CheckCategory.COMMUNITY_ARCHIVES]: [
        { name: "payor", label: "Payor", type: "text", required: true, colSpan: 2 },
        { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
    ]
};