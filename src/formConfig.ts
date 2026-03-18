// src/formConfig.ts

import { CheckCategory } from './types';
import { HomeIcon, BuildingOfficeIcon, ArchiveBoxIcon, communityIcon } from './components/icons';

// UI Configuration for category selection cards
export const categoryConfig = {
    [CheckCategory.HOMEOWNER_LOCKBOX]: {
        name: 'Homeowner Lockbox',
        icon: HomeIcon,
        description: "Homeowner dues payments.",
        color: {
            name: 'sky', border: 'border-sky-500', text: 'text-sky-700', bg: 'bg-sky-500', bgLight: 'bg-sky-200', glow: 'shadow-sky-500/20', borderLight: 'border-sky-200',
            dark: { border: 'border-sky-700', bg: 'bg-sky-900', text: 'text-sky-300', bgLight: 'bg-sky-800', glow: 'shadow-sky-700/20', borderLight: 'border-sky-700' }
        },
    },
    [CheckCategory.MISC_HOMEOWNER_INCOME]: {
        name: 'Misc Homeowner/Attorney',
        icon: communityIcon,
        description: "Clubhouse rentals, pool fees, key fobs, etc.",
        color: { name: 'green', border: 'border-green-500', text: 'text-green-700', bg: 'bg-green-500', bgLight: 'bg-green-200', glow: 'shadow-green-500/20', borderLight: 'border-green-200' },
        dark: { border: 'border-green-700', bg: 'bg-green-900', text: 'text-green-300', bgLight: 'bg-green-800', glow: 'shadow-green-700/20', borderLight: 'border-green-700' }
    },
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: {
        name: 'Misc Non-Homeowner/GL',
        icon: BuildingOfficeIcon,
        description: "Transition fees, utility payments, insurance.",
        color: {
            name: 'purple', border: 'border-purple-500', text: 'text-purple-700', bg: 'bg-purple-500', bgLight: 'bg-purple-200', glow: 'shadow-purple-500/20', borderLight: 'border-purple-200',
            dark: { border: 'border-purple-700', bg: 'bg-purple-900', text: 'text-purple-300', bgLight: 'bg-purple-800', glow: 'shadow-purple-700/20', borderLight: 'border-purple-700' }
        },
    },
    [CheckCategory.COMMUNITY_ARCHIVES]: {
        name: 'Community Archives',
        icon: ArchiveBoxIcon,
        description: "Resale documents, new account fees.",
        color: { name: 'slate', border: 'border-slate-500', text: 'text-slate-700', bg: 'bg-slate-500', bgLight: 'bg-slate-200', glow: 'shadow-slate-500/20', borderLight: 'border-slate-200' },
        dark: { border: 'border-slate-700', bg: 'bg-slate-900', text: 'text-slate-300', bgLight: 'bg-slate-800', glow: 'shadow-slate-700/20', borderLight: 'border-slate-700' }
    },
};

// Form field definitions and options
const chargeTypeOptions = [{ "value": "", "text": "Select..." }, { "value": "ACCDEP", "text": "Architectural Review Deposit" }, { "value": "ACCEL", "text": "Accellerated Assessments" }, { "value": "ADMIN", "text": "Administrative Fee" }, { "value": "APP", "text": "Application Fee" }, { "value": "ASNOWNCR", "text": "Association Owned Unit Credit" }, { "value": "BADDEBT", "text": "Bad Debt/Write Off" }, { "value": "BALFWD", "text": "Balance Forward" }, { "value": "BANK", "text": "Bank Fee" }, { "value": "BANKRUPTCY", "text": "Bankruptcy" }, { "value": "BOARD", "text": "Board Compensation" }, { "value": "CABLE", "text": "Cable Assessment or Fee" }, { "value": "CERTLTR", "text": "Certified Letter Charge" }, { "value": "COLLECT", "text": "Collection Fee" }, { "value": "COMPFEE", "text": "Compliance Fee" }, { "value": "COUPON", "text": "Coupon Fee" }, { "value": "CRBUREAU", "text": "Credit Bureau" }, { "value": "DAMAGE", "text": "Damage Fee" }, { "value": "DELQASN", "text": "Delinquency Processing Fee - Association" }, { "value": "DELQMGT", "text": "Delinquency Processing Fee - Management" }, { "value": "DEMAND", "text": "Demand Letter" }, { "value": "DEPOSIT", "text": "Deposit" }, { "value": "DEVELOP", "text": "Developer Assessment" }, { "value": "DISCOUNT", "text": "Association Fee Discount" }, { "value": "ELECTRIC", "text": "Electric Assessment or Chargeback" }, { "value": "FBBANQGR", "text": "Food & Bev Banquet/Event Gratuity" }, { "value": "FBDISC", "text": "Food & Beverage Discount" }, { "value": "FBEQRENT", "text": "Food & Bev Equip Rental Fee" }, { "value": "FBGRAT", "text": "Food & Beverage Gratuity" }, { "value": "FBMISC", "text": "Food & Beverage Misc Charge" }, { "value": "FBOTHER", "text": "Food & Beverage Other Charge" }, { "value": "FBRMRENT", "text": "Food & Bev Room Rental Fee" }, { "value": "FBSERV", "text": "Food & Beverage Service Fee" }, { "value": "FINE", "text": "Compliance Fine" }, { "value": "FIRERSC", "text": "Fire and Rescue Assessment" }, { "value": "FOOD01-10", "text": "Food Revenue 1" }, { "value": "GAS", "text": "Gas Assessment" }, { "value": "GATEACCESS", "text": "Gate/Access" }, { "value": "GCADNON", "text": "Golf Course Annual Fee-Non-Res" }, { "value": "GCADOTH", "text": "Golf Course Annual Fee-Other" }, { "value": "GCADRES", "text": "Golf Course Annual Fee - Res" }, { "value": "GCCART", "text": "Golf Cart Rental" }, { "value": "GCCLUB", "text": "Golf Club Rental" }, { "value": "GCEXPGC", "text": "Golf - Expired Gift Certificate" }, { "value": "GCGFGST", "text": "Golf Course Green Fee - Guest" }, { "value": "GCGFNON", "text": "Golf Course Green Fee-Non Res" }, { "value": "GCGFOTH", "text": "Golf Course Green Fee - Other" }, { "value": "GCGFOUT", "text": "Golf Course Green Fee - Outing" }, { "value": "GCGFRES", "text": "Golf Course Green Fee - Res" }, { "value": "GCHAND", "text": "Golf Course Handicap Svc Fee" }, { "value": "GCPRO", "text": "Golf Pro Shop Charge" }, { "value": "GCRANGE", "text": "Golf Driving Range Fee" }, { "value": "HDLCHRG", "text": "Handling Charge" }, { "value": "HCSFEE", "text": "HCS Collection Fee" }, { "value": "HVAC", "text": "HVAC Assessment" }, { "value": "INSURANCE", "text": "Insurance Assessment" }, { "value": "IRRIGATION", "text": "Irrigation (Water) Assessment" }, { "value": "KEY", "text": "Key Fee" }, { "value": "KEYDEP", "text": "Key Deposit" }, { "value": "LANDSCAPE", "text": "Landscape Assessment or Chargeback" }, { "value": "LEGAL", "text": "Legal Fee" }, { "value": "LF", "text": "Late Fee" }, { "value": "LI", "text": "Late Interest" }, { "value": "LIEN", "text": "Lien Charge" }, { "value": "LIENFILE", "text": "Lien Filing Fee" }, { "value": "LOAN", "text": "Loan Assessment" }, { "value": "MAINT", "text": "General Maintenance" }, { "value": "MARINA", "text": "Marina Assessment" }, { "value": "MISC", "text": "Miscellaneous" }, { "value": "MOVE", "text": "Move In/Move Out Fee" }, { "value": "MOW", "text": "Force Mow" }, { "value": "MP", "text": "Misapplied Payment" }, { "value": "NSFASN", "text": "NSF Processing Fee - Association" }, { "value": "NSFMGT", "text": "NSF Processing Fee - Management" }, { "value": "OTHER", "text": "Other" }, { "value": "PARKING", "text": "Parking Space Maintenance" }, { "value": "PARTYROOM", "text": "Party Room Assessment" }];
const departmentOptions = [{ "value": "", "text": "Select..." }, { "value": "GL", "text": "GL" }, { "value": "Homeowner", "text": "Homeowner" }, { "value": "Misc", "text": "Misc" }, { "value": "Settlements", "text": "Settlements" }];

export const formConfig = {
    common: [
        { name: "checkNumber", label: "Check Number", type: "text", required: false, autocomplete: "off" },
        { name: "date", label: "Date Received", type: "date", required: false, autocomplete: "off" },
        { name: "associationName", label: "Association Name", type: "text", required: false, autocomplete: "on", colSpan: 2 },
        { name: "amount", label: "Amount", type: "number", required: false, step: "0.01", min: "0", autocomplete: "off" },
        { name: "payee", label: "Payee", type: "text", required: false, autocomplete: "off" },
    ],
    [CheckCategory.HOMEOWNER_LOCKBOX]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true, autocomplete: "off" },
        { name: "clientAccountNumber", label: "Account Number", type: "text", required: false, autocomplete: "off" },
        { name: "memo", label: "Memo", type: "textarea", required: false, autocomplete: "off", colSpan: 2 },
    ],
    [CheckCategory.MISC_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Homeowner Name", type: "text", required: true, autocomplete: "off" },
        { name: "clientAccountNumber", label: "Account Number", type: "text", required: false, autocomplete: "off" },
        { name: "chargeType", label: "Charge Type for Homeowner's Account", type: "datalist", required: true, autocomplete: "off", options: chargeTypeOptions, colSpan: 2 },
        { name: "memo", label: "Description for Comments Field", type: "textarea", required: false, autocomplete: "off", colSpan: 2 },
    ],
    [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: [
        { name: "payor", label: "Payor", type: "text", required: false, autocomplete: "off" },
        { name: "department", label: "Department", type: "datalist", required: false, autocomplete: "off", options: departmentOptions },
        { name: "glCode", label: "GL Code", type: "text", required: false, autocomplete: "on" },
        { name: "glDescription", label: "GL Description", type: "text", required: false, autocomplete: "on" },
        { name: "depositingBank", label: "Depositing Bank", type: "text", required: false, autocomplete: "off", colSpan: 2 },
    ],
    [CheckCategory.COMMUNITY_ARCHIVES]: [
        { name: "payor", label: "Payor", type: "text", required: true, autocomplete: "off", colSpan: 2 },
        { name: "memo", label: "Memo", type: "textarea", required: false, autocomplete: "off", colSpan: 2 },
    ]
};