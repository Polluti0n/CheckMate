import * as ExcelJS from "exceljs";
import { Check, CheckCategory, UserProfile } from "../types";

export interface ExcelGenerationParams {
  checks: Check[];
  trackingNumber: string;
  currentUser: UserProfile | null;
}

export const generateExcelBatch = async ({
  checks,
  trackingNumber,
  currentUser,
}: ExcelGenerationParams): Promise<void> => {
  try {
    // 1. Fetch and load the Excel template
    const templateResponse = await fetch('/DocumentTrackingLog.xlsx');
    if (!templateResponse.ok) {
      throw new Error("Could not load the Document Tracking Log template.");
    }
    const arrayBuffer = await templateResponse.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 2. Prepare user data from preferences and current user
    const userFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'N/A';
    const userData = {
      branchName: currentUser?.branch || "N/A",
      completedBy: userFullName,
      contactPhone: currentUser?.phone || "N/A",
      contactEmail: currentUser?.email || "N/A",
      dateCompleted: new Date(),
      signature: userFullName
    };
    const fInitial = currentUser?.firstName ? currentUser.firstName[0] : '';
    const lInitial = currentUser?.lastName ? currentUser.lastName[0] : '';
    const initials = `${fInitial}${lInitial}`.toUpperCase() || 'N/A';

    const categoryToSheetMap: Partial<Record<CheckCategory, string>> = {
      [CheckCategory.HOMEOWNER_LOCKBOX]: 'HO LOCKBOX',
      [CheckCategory.MISC_HOMEOWNER_INCOME]: 'MISC-HO-ATTNY',
      [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: 'MISC-ASSOC-GL',
      [CheckCategory.COMMUNITY_ARCHIVES]: 'COMM-ARCH',
    };

    const modifiedSheetNames = new Set<string>();

    // 3. Process checks into their specific sheets
    for (const check of checks) {
      const sheetName = categoryToSheetMap[check.category];
      if (!sheetName) continue;

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) continue;

      let dataToInsert: any[] = [];

      // Build the row data based on the sheet type
      switch (sheetName) {
        case 'HO LOCKBOX':
          dataToInsert = [null, new Date(check.date), check.associationName, check.checkNumber, check.amount, check.payor, check.clientAccountNumber, check.memo];
          break;
        case 'MISC-HO-ATTNY':
          dataToInsert = [null, new Date(check.date), check.associationName, check.checkNumber, check.amount, check.payor, check.clientAccountNumber, check.chargeType, check.memo];
          break;
        case 'MISC-ASSOC-GL':
          dataToInsert = [null, check.associationName, check.checkNumber, check.amount, check.glCode, check.glDescription, check.depositingBank, check.department, check.memo];
          break;
        case 'COMM-ARCH':
          dataToInsert = [null, new Date(check.date), new Date(check.date), check.payor, check.associationName, check.checkNumber, check.amount, initials, '', '', trackingNumber.trim(), check.memo];
          break;
      }

      if (dataToInsert.length > 0) {
        const newRow = worksheet.insertRow(20, dataToInsert);

        // Apply specific formatting to the new row's cells
        switch (sheetName) {
          case 'HO LOCKBOX':
          case 'MISC-HO-ATTNY':
            newRow.getCell(2).numFmt = 'm/d/yy'; // Date Received
            newRow.getCell(5).numFmt = '"$"#,##0.00'; // Amount
            break;
          case 'MISC-ASSOC-GL':
            newRow.getCell(4).numFmt = '"$"#,##0.00'; // Amount
            break;
          case 'COMM-ARCH':
            newRow.getCell(2).numFmt = 'm/d/yy'; // Date Received
            newRow.getCell(3).numFmt = 'm/d/yy'; // Check Date
            newRow.getCell(7).numFmt = '"$"#,##0.00'; // Amount
            break;
        }
        modifiedSheetNames.add(sheetName);
      }
    }

    // 4. Populate the "Tracking Log" sheet with details for each check
    const trackingLogSheet = workbook.getWorksheet('Tracking Log');
    if (trackingLogSheet) {
      trackingLogSheet.getCell('C8').value = userData.branchName;
      trackingLogSheet.getCell('C9').value = userData.completedBy;
      trackingLogSheet.getCell('C10').value = userData.contactPhone;
      trackingLogSheet.getCell('C11').value = userData.contactEmail;
      trackingLogSheet.getCell('C12').value = userData.dateCompleted;
      trackingLogSheet.getCell('C12').numFmt = 'm/d/yy';
      trackingLogSheet.getCell('C13').value = userData.signature;
      trackingLogSheet.getCell('C14').value = trackingNumber.trim();

      const trackingSummary: { [key: string]: { name: string; type: string; association: string[]; count: number; total: number } } = {
        [CheckCategory.HOMEOWNER_LOCKBOX]: { name: 'Homeowner Lockbox', type: 'Homeowner', association: [], count: 0, total: 0 },
        [CheckCategory.MISC_HOMEOWNER_INCOME]: { name: 'Misc Homeowner Income', type: 'Misc', association: [], count: 0, total: 0 },
        [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: { name: 'Misc Non Homeowner Income', type: 'GL', association: [], count: 0, total: 0 },
        [CheckCategory.COMMUNITY_ARCHIVES]: { name: 'Community Archives', type: 'Settlement', association: [], count: 0, total: 0 },
      };

      checks.forEach(check => {
        if (trackingSummary[check.category]) {
          trackingSummary[check.category].count++;
          trackingSummary[check.category].total += check.amount;
          if (check.associationName && !trackingSummary[check.category].association.includes(check.associationName)) {
            trackingSummary[check.category].association.push(check.associationName);
          }
        }
      });

      let currentRowNum = 16;

      Object.values(trackingSummary).forEach(summary => {
        if (summary.count > 0) {
          const summaryData = [
            null,
            trackingNumber.trim() || 'N/A',
            summary.association.length === 1 ? summary.association[0] : 'Various',
            summary.name || 'N/A',
            summary.type || 'N/A',
            'N/A',
            'N/A',
            summary.count > 0 ? `${summary.count} Checks` : 'N/A',
            summary.total || 'N/A'
          ]
          const trackingRow = trackingLogSheet.insertRow(currentRowNum, summaryData);
          trackingRow.getCell(2).alignment = { horizontal: 'left' };
          trackingRow.getCell(9).numFmt = '"$"#,##0.00'; // Amount
          currentRowNum++;
        }
      });

      modifiedSheetNames.add('Tracking Log');
    }

    // 5. Add user processing info to the header of all modified sheets
    workbook.eachSheet((worksheet: any) => {
      if (modifiedSheetNames.has(worksheet.name)) {
        worksheet.getCell('C8').value = userData.branchName;
        worksheet.getCell('C9').value = userData.completedBy;
        worksheet.getCell('C10').value = userData.contactPhone;
        worksheet.getCell('C11').value = userData.contactEmail;
        worksheet.getCell('C12').value = userData.dateCompleted;
        worksheet.getCell('C12').numFmt = 'm/d/yy';
        worksheet.getCell('C13').value = userData.signature;
        worksheet.getCell('C14').value = trackingNumber.trim();
      }
    });

    // 6. Remove any sheets that were not modified
    for (let i = workbook.worksheets.length - 1; i >= 0; i--) {
      const sheet = workbook.worksheets[i];
      if (!modifiedSheetNames.has(sheet.name)) {
        workbook.removeWorksheet(sheet.id);
      }
    }

    // 7. Generate and trigger the download of the final .xlsx file
    if (modifiedSheetNames.size > 0) {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date()).replace(/ /g, '-');
      link.download = `Batch_Log_${formattedDate}_${trackingNumber.trim().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      throw new Error("No checks were identified to process for the Excel sheet.");
    }
  } catch (e: any) {
    console.error("Error generating Excel:", e);
    throw e;
  }
};
