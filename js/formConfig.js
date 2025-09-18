import { CheckCategory } from './types';
// Field options from user JSON
const chargeTypeOptions = [{ "value": "", "text": "Select..." }, { "value": "ACCDEP", "text": "Architectural Review Deposit" }, { "value": "ACCEL", "text": "Accellerated Assessments" }, { "value": "ADMIN", "text": "Administrative Fee" }, { "value": "APP", "text": "Application Fee" }, { "value": "ASNOWNCR", "text": "Association Owned Unit Credit" }, { "value": "BADDEBT", "text": "Bad Debt/Write Off" }, { "value": "BALFWD", "text": "Balance Forward" }, { "value": "BANK", "text": "Bank Fee" }, { "value": "BANKRUPTCY", "text": "Bankruptcy" }, { "value": "BOARD", "text": "Board Compensation" }, { "value": "CABLE", "text": "Cable Assessment or Fee" }, { "value": "CERTLTR", "text": "Certified Letter Charge" }, { "value": "COLLECT", "text": "Collection Fee" }, { "value": "COMPFEE", "text": "Compliance Fee" }, { "value": "COUPON", "text": "Coupon Fee" }, { "value": "CRBUREAU", "text": "Credit Bureau" }, { "value": "DAMAGE", "text": "Damage Fee" }, { "value": "DELQASN", "text": "Delinquency Processing Fee - Association" }, { "value": "DELQMGT", "text": "Delinquency Processing Fee - Management" }, { "value": "DEMAND", "text": "Demand Letter" }, { "value": "DEPOSIT", "text": "Deposit" }, { "value": "DEVELOP", "text": "Developer Assessment" }, { "value": "DISCOUNT", "text": "Association Fee Discount" }, { "value": "ELECTRIC", "text": "Electric Assessment or Chargeback" }, { "value": "FBBANQGR", "text": "Food & Bev Banquet/Event Gratuity" }, { "value": "FBDISC", "text": "Food & Beverage Discount" }, { "value": "FBEQRENT", "text": "Food & Bev Equip Rental Fee" }, { "value": "FBGRAT", "text": "Food & Beverage Gratuity" }, { "value": "FBMISC", "text": "Food & Beverage Misc Charge" }, { "value": "FBOTHER", "text": "Food & Beverage Other Charge" }, { "value": "FBRMRENT", "text": "Food & Bev Room Rental Fee" }, { "value": "FBSERV", "text": "Food & Beverage Service Fee" }, { "value": "FINE", "text": "Compliance Fine" }, { "value": "FIRERSC", "text": "Fire and Rescue Assessment" }, { "value": "FOOD01-10", "text": "Food Revenue 1" }, { "value": "GAS", "text": "Gas Assessment" }, { "value": "GATEACCESS", "text": "Gate/Access" }, { "value": "GCADNON", "text": "Golf Course Annual Fee-Non-Res" }, { "value": "GCADOTH", "text": "Golf Course Annual Fee-Other" }, { "value": "GCADRES", "text": "Golf Course Annual Fee - Res" }, { "value": "GCCART", "text": "Golf Cart Rental" }, { "value": "GCCLUB", "text": "Golf Club Rental" }, { "value": "GCEXPGC", "text": "Golf - Expired Gift Certificate" }, { "value": "GCGFGST", "text": "Golf Course Green Fee - Guest" }, { "value": "GCGFNON", "text": "Golf Course Green Fee-Non Res" }, { "value": "GCGFOTH", "text": "Golf Course Green Fee - Other" }, { "value": "GCGFOUT", "text": "Golf Course Green Fee - Outing" }, { "value": "GCGFRES", "text": "Golf Course Green Fee - Res" }, { "value": "GCHAND", "text": "Golf Course Handicap Svc Fee" }, { "value": "GCPRO", "text": "Golf Pro Shop Charge" }, { "value": "GCRANGE", "text": "Golf Driving Range Fee" }, { "value": "HDLCHRG", "text": "Handling Charge" }, { "value": "HCSFEE", "text": "HCS Collection Fee" }, { "value": "HVAC", "text": "HVAC Assessment" }, { "value": "INSURANCE", "text": "Insurance Assessment" }, { "value": "IRRIGATION", "text": "Irrigation (Water) Assessment" }, { "value": "KEY", "text": "Key Fee" }, { "value": "KEYDEP", "text": "Key Deposit" }, { "value": "LANDSCAPE", "text": "Landscape Assessment or Chargeback" }, { "value": "LEGAL", "text": "Legal Fee" }, { "value": "LF", "text": "Late Fee" }, { "value": "LI", "text": "Late Interest" }, { "value": "LIEN", "text": "Lien Charge" }, { "value": "LIENFILE", "text": "Lien Filing Fee" }, { "value": "LOAN", "text": "Loan Assessment" }, { "value": "MAINT", "text": "General Maintenance" }, { "value": "MARINA", "text": "Marina Assessment" }, { "value": "MISC", "text": "Miscellaneous" }, { "value": "MOVE", "text": "Move In/Move Out Fee" }, { "value": "MOW", "text": "Force Mow" }, { "value": "MP", "text": "Misapplied Payment" }, { "value": "NSFASN", "text": "NSF Processing Fee - Association" }, { "value": "NSFMGT", "text": "NSF Processing Fee - Management" }, { "value": "OTHER", "text": "Other" }, { "value": "PARKING", "text": "Parking Space Maintenance" }, { "value": "PARTYROOM", "text": "Party Room Assessment" }];
const departmentOptions = [{ "value": "", "text": "Select..." }, { "value": "GL", "text": "GL" }, { "value": "Homeowner", "text": "Homeowner" }, { "value": "Misc", "text": "Misc" }, { "value": "Settlements", "text": "Settlements" }];
export const formConfig = {
    core: [
        { name: "payor", label: "Payor", type: "text", required: true },
        { name: "payee", label: "Payee", type: "text", required: true },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "checkNumber", label: "Check Number", type: "text", required: true },
        { name: "associationName", label: "Association Name", type: "text", required: true },
    ],
    categorySpecific: {
        [CheckCategory.HOMEOWNER_LOCKBOX]: [
            { name: "accountNumber", label: "Account Number", type: "text", required: true },
            { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
        ],
        [CheckCategory.MISC_HOMEOWNER_INCOME]: [
            { name: "accountNumber", label: "Account Number", type: "text", required: true },
            { name: "chargeType", label: "Charge Type", type: "datalist", required: true, options: chargeTypeOptions },
            { name: "memo", label: "Description for Comments Field", type: "textarea", required: false, colSpan: 2 },
        ],
        [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: [
            { name: "department", label: "Department", type: "datalist", required: true, options: departmentOptions },
            { name: "glCode", label: "GL Code", type: "text", required: true },
            { name: "glDescription", label: "GL Description", type: "text", required: false },
            { name: "depositingBank", label: "Depositing Bank", type: "text", required: false },
        ],
        [CheckCategory.COMMUNITY_ARCHIVES]: [
            { name: "memo", label: "Memo", type: "textarea", required: false, colSpan: 2 },
        ]
    }
};
