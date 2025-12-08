import React, { useState, useMemo, useEffect } from "react";
import { Check, CheckStatus, CheckCategory, UserProfile } from "../types";
import { XMarkIcon, ProcessingLoaderIcon } from "./icons";
import * as ExcelJS from "exceljs";

interface ProcessBatchModalProps {
  isOpen: boolean;
  checks: Check[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onProcessBatch: (checkIds: string[], trackingNumber: string) => void;
}

const ProcessBatchModal: React.FC<ProcessBatchModalProps> = ({
  isOpen,
  checks,
  currentUser,
  onClose,
  onProcessBatch,
}) => {
  const [selectedChecks, setSelectedChecks] = useState<Record<string, boolean>>(
    {}
  );
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checksToBatch = useMemo(
    () => checks.filter((c) => c.status === CheckStatus.QUEUED),
    [checks]
  );

  useEffect(() => {
    if (isOpen) {
      const initialSelection = checksToBatch.reduce((acc, check) => {
        acc[check.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedChecks(initialSelection);
            setTrackingNumber('');
      setError(null);
      setIsProcessing(false);
    }
  }, [checksToBatch, isOpen]);

  if (!isOpen) return null;

  const handleToggleCheck = (checkId: string) => {
    setSelectedChecks((prev) => ({ ...prev, [checkId]: !prev[checkId] }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    const newSelection = { ...selectedChecks };
    checksToBatch.forEach((check) => {
      newSelection[check.id] = isChecked;
    });
    setSelectedChecks(newSelection);
  };

  const processDate = new Date().toLocaleDateString('en-US', {  
    year: '2-digit', 
    month: '2-digit', 
    day: '2-digit' 
  });

  const handleProcessBatch = async () => {
    const idsToProcess = Object.keys(selectedChecks).filter(id => selectedChecks[id]);
    if (idsToProcess.length === 0 || !trackingNumber.trim()) {
        return;
    }

    setIsProcessing(true);
    setError(null);

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

        const selectedCheckObjects = checksToBatch.filter(c => selectedChecks[c.id]);
        const modifiedSheetNames = new Set<string>();

        // 3. Process checks into their specific sheets
        for (const check of selectedCheckObjects) {
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
                switch(sheetName) {
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
            
            const trackingSummary: { [key: string]: { name: string; type: string; association: Array; count: number; total: number } } = {
                [CheckCategory.HOMEOWNER_LOCKBOX]: { name: 'Homeowner Lockbox', type: 'Homeowner', association: [], count: 0, total: 0 },
                [CheckCategory.MISC_HOMEOWNER_INCOME]: { name: 'Misc Homeowner Income', type: 'Misc', association: [], count: 0, total: 0 },
                [CheckCategory.MISC_NON_HOMEOWNER_INCOME]: { name: 'Misc Non Homeowner Income', type: 'GL', association: [], count: 0, total: 0 },
                [CheckCategory.COMMUNITY_ARCHIVES]: { name: 'Community Archives', type: 'Settlement', association: [], count: 0, total: 0 },
            };

            selectedCheckObjects.forEach(check => {
                if (trackingSummary[check.category]) {
                    trackingSummary[check.category].count++;
                    trackingSummary[check.category].total += check.amount;
                    trackingSummary[check.category].association.push(check.associationName)
                }
            });
            
            let currentRowNum = 16;

            Object.values(trackingSummary).forEach(summary => {
                if (summary.count > 0) {
                  const summaryData = [
                    null,
                    trackingNumber.trim() || 'N/A', 
                    summary.association.length === 1 ? summary.association[0] : 'N/A',  
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
        workbook.eachSheet(worksheet => {
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

            onProcessBatch(idsToProcess, trackingNumber.trim());
            onClose();
        } else {
            setError("No checks were selected to process.");
        }
    } catch (e: any) {
        console.error("Error processing batch:", e);
        setError(e.message || "An unexpected error occurred during batch processing.");
    } finally {
        setIsProcessing(false);
    }
  };

    const allSelected = checksToBatch.length > 0 && checksToBatch.every(c => selectedChecks[c.id]);
    const selectedCount = Object.values(selectedChecks).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-start justify-center min-h-screen p-4 text-center overflow-y-auto">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-2xl sm:w-full">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                Process Queued Checks
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-4">
                <label
                  htmlFor="trackingNumber"
                  className="block text-sm font-medium text-slate-600 dark:text-gray-300"
                >
                  Package Tracking Number
                </label>
                <input
                  type="text"
                  name="trackingNumber"
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1 block w-full bg-slate-50 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 sm:text-sm"
                  placeholder="Enter tracking number..."
                  required
                />
              </div>

              <div className="flex justify-between items-center mb-2 p-2 bg-slate-100 dark:bg-gray-700 rounded-t-md border-b dark:border-gray-600">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500"
                  />
                  <label
                    htmlFor="select-all"
                    className="ml-3 text-sm font-medium text-slate-700 dark:text-gray-300"
                  >
                    Select All
                  </label>
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-gray-300">
                  {selectedCount} / {checksToBatch.length} selected
                </span>
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto p-2 bg-slate-50 dark:bg-gray-800 rounded-b-md">
                {checksToBatch.length > 0 ? (
                  <ul className="space-y-1">
                    {checksToBatch.map((check) => (
                      <li
                        key={check.id}
                        className="flex items-center p-2 bg-white dark:bg-gray-700 rounded-md border dark:border-gray-600"
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedChecks[check.id]}
                          onChange={() => handleToggleCheck(check.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500"
                        />
                        <div className="ml-3 flex-grow flex justify-between">
                          <div>
                            <span className="text-sm text-slate-800 dark:text-white font-medium">
                              {check.payor} , #{check.checkNumber}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-gray-400">
                              {check.category}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-white">
                            ${check.amount.toFixed(2)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 dark:text-gray-400 text-center py-8">
                    No checks are currently in the queue.
                  </p>
                )}
              </div>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            )}

            <div className="mt-6 border-t dark:border-gray-700 pt-4 flex justify-end">
              <button
                onClick={handleProcessBatch}
                className="w-full sm:w-auto px-6 py-2 text-base font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={
                  selectedCount === 0 || !trackingNumber.trim() || isProcessing
                }
              >
                {isProcessing ? (
                  <>
                    <ProcessingLoaderIcon className="h-5 w-5 mr-2" /> Processing...
                  </>
                ) : (
                  `Process Batch & Download (${selectedCount})`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessBatchModal;