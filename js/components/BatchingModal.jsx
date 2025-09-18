import React, { useState, useMemo, useEffect } from 'react';
import { CheckStatus, CheckCategory } from '../types';
import { XMarkIcon, ProcessingLoaderIcon } from './icons';
// FIX: Import as namespace to resolve type errors for Fill and Font
import * as ExcelJS from 'exceljs';
const ProcessBatchModal = ({ isOpen, checks, onClose, onProcessBatch }) => {
    const [selectedChecks, setSelectedChecks] = useState({});
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const checksToBatch = useMemo(() => checks.filter(c => c.status === CheckStatus.QUEUED), [checks]);
    useEffect(() => {
        if (isOpen) {
            const initialSelection = checksToBatch.reduce((acc, check) => {
                acc[check.id] = true;
                return acc;
            }, {});
            setSelectedChecks(initialSelection);
            setTrackingNumber('');
            setError(null);
            setIsProcessing(false);
        }
    }, [checksToBatch, isOpen]);
    if (!isOpen)
        return null;
    const handleToggleCheck = (checkId) => {
        setSelectedChecks(prev => ({ ...prev, [checkId]: !prev[checkId] }));
    };
    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        const newSelection = { ...selectedChecks };
        checksToBatch.forEach(check => {
            newSelection[check.id] = isChecked;
        });
        setSelectedChecks(newSelection);
    };
    const handleProcessBatch = async () => {
        const idsToProcess = Object.keys(selectedChecks).filter(id => selectedChecks[id]);
        if (idsToProcess.length === 0 || !trackingNumber.trim()) {
            return;
        }
        setIsProcessing(true);
        setError(null);
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'CheckMate App';
            workbook.created = new Date();
            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            const headerFont = { bold: true };
            // Define sheet structures
            const sheetDefs = {
                'Tracking Log': {
                    headers: ['Tracking #', 'Association', 'Memo', 'Type', 'Account #', 'Property Address', 'Check #', 'Amount'],
                    columns: [{ width: 25 }, { width: 25 }, { width: 40 }, { width: 15 }, { width: 20 }, { width: 25 }, { width: 15 }, { width: 15, numFmt: '"$"#,##0.00' }],
                    dataMap: (c) => {
                        let type = 'Misc';
                        if (c.category === CheckCategory.HOMEOWNER_LOCKBOX || c.category === CheckCategory.MISC_HOMEOWNER_INCOME)
                            type = 'Homeowner';
                        else if (c.category === CheckCategory.MISC_NON_HOMEOWNER_INCOME)
                            type = c.department || 'GL';
                        else if (c.category === CheckCategory.COMMUNITY_ARCHIVES)
                            type = 'Settlement';
                        return [trackingNumber.trim(), c.associationName, c.memo, type, c.accountNumber || 'N/A', '', c.checkNumber, c.amount];
                    }
                },
                'HO LockBox': {
                    headers: ['Date', 'Association', 'Check #', 'Amount', 'Payor', 'Account #', 'Memo'],
                    columns: [{ width: 12, numFmt: 'm/d/yy' }, { width: 25 }, { width: 15 }, { width: 15, numFmt: '"$"#,##0.00' }, { width: 25 }, { width: 20 }, { width: 40 }],
                    category: CheckCategory.HOMEOWNER_LOCKBOX,
                    dataMap: (c) => [new Date(c.date), c.associationName, c.checkNumber, c.amount, c.payor, c.accountNumber, c.memo]
                },
                'Misc Income Homeowner': {
                    headers: ['Date', 'Association', 'Payor', 'Account #', 'Amount', 'Check #', 'Charge Type', 'Memo'],
                    columns: [{ width: 12, numFmt: 'm/d/yy' }, { width: 25 }, { width: 25 }, { width: 20 }, { width: 15, numFmt: '"$"#,##0.00' }, { width: 15 }, { width: 25 }, { width: 40 }],
                    category: CheckCategory.MISC_HOMEOWNER_INCOME,
                    dataMap: (c) => [new Date(c.date), c.associationName, c.payor, c.accountNumber, c.amount, c.checkNumber, c.chargeType, c.memo]
                },
                'Misc Income Non Homeowner': {
                    headers: ['Association', 'Check #', 'Amount', 'GL Code', 'GL Description', 'Depositing Bank', 'Department', 'Memo'],
                    columns: [{ width: 25 }, { width: 15 }, { width: 15, numFmt: '"$"#,##0.00' }, { width: 15 }, { width: 25 }, { width: 25 }, { width: 20 }, { width: 40 }],
                    category: CheckCategory.MISC_NON_HOMEOWNER_INCOME,
                    dataMap: (c) => [c.associationName, c.checkNumber, c.amount, c.glCode, c.glDescription, c.depositingBank, c.department, c.memo]
                },
                'Attorney': {
                    headers: ['Date', 'Association', 'Check #', 'Amount', 'Payor', 'Account #', 'Memo'],
                    columns: [{ width: 12, numFmt: 'm/d/yy' }, { width: 25 }, { width: 15 }, { width: 15, numFmt: '"$"#,##0.00' }, { width: 25 }, { width: 20 }, { width: 40 }],
                    category: CheckCategory.COMMUNITY_ARCHIVES,
                    dataMap: (c) => [new Date(c.date), c.associationName, c.checkNumber, c.amount, c.payor, c.accountNumber, c.memo]
                },
            };
            const selectedCheckObjects = checksToBatch.filter(c => selectedChecks[c.id]);
            const modifiedSheetNames = new Set();
            // Process checks into appropriate sheets
            for (const [sheetName, def] of Object.entries(sheetDefs)) {
                const sheet = workbook.addWorksheet(sheetName);
                sheet.getRow(1).values = def.headers;
                sheet.getRow(1).fill = headerFill;
                sheet.getRow(1).font = headerFont;
                // FIX: Removed `key: col.key` as `col` object does not have a `key` property.
                sheet.columns = def.columns.map((col) => ({ width: col.width, style: { numFmt: col.numFmt } }));
                // FIX: Use a type guard to safely access `def.category` which doesn't exist on the 'Tracking Log' definition.
                const checksForSheet = 'category' in def
                    ? selectedCheckObjects.filter((c) => c.category === def.category)
                    : selectedCheckObjects;
                if (checksForSheet.length > 0) {
                    checksForSheet.forEach(check => {
                        sheet.addRow(def.dataMap(check));
                    });
                    modifiedSheetNames.add(sheetName);
                }
            }
            // Remove unmodified sheets
            for (let i = workbook.worksheets.length - 1; i >= 0; i--) {
                const sheet = workbook.worksheets[i];
                if (!modifiedSheetNames.has(sheet.name)) {
                    workbook.removeWorksheet(sheet.id);
                }
            }
            if (modifiedSheetNames.size > 0) {
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                const formattedDate = new Intl.DateTimeFormat('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/\//g, '-');
                link.download = `Batch_Log_${formattedDate}_${trackingNumber.trim().replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                onProcessBatch(idsToProcess, trackingNumber.trim());
                onClose();
            }
            else {
                setError("No checks were selected or no data could be added to the log.");
            }
        }
        catch (e) {
            console.error("Error processing batch:", e);
            setError(e.message || "An unexpected error occurred during batch processing.");
        }
        finally {
            setIsProcessing(false);
        }
    };
    const allSelected = checksToBatch.length > 0 && checksToBatch.every(c => selectedChecks[c.id]);
    const selectedCount = Object.values(selectedChecks).filter(Boolean).length;
    return (<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-start justify-center min-h-screen p-4 text-center overflow-y-auto">
                <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-2xl sm:w-full">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <h3 className="text-2xl font-bold text-slate-800">Process Queued Checks</h3>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><XMarkIcon className="h-6 w-6"/></button>
                        </div>

                        <div className="mt-4">
                             <div className="mb-4">
                                <label htmlFor="trackingNumber" className="block text-sm font-medium text-slate-600">Package Tracking Number</label>
                                <input type="text" name="trackingNumber" id="trackingNumber" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="mt-1 block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-500 sm:text-sm" placeholder="Enter tracking number..." required/>
                            </div>

                            <div className="flex justify-between items-center mb-2 p-2 bg-slate-100 rounded-t-md border-b">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={allSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                                    <label htmlFor="select-all" className="ml-3 text-sm font-medium text-slate-700">Select All</label>
                                </div>
                                <span className="text-sm font-medium text-slate-600">{selectedCount} / {checksToBatch.length} selected</span>
                            </div>
                            <div className="space-y-2 max-h-[40vh] overflow-y-auto p-2 bg-slate-50 rounded-b-md">
                                {checksToBatch.length > 0 ? (<ul className="space-y-1">
                                        {checksToBatch.map(check => (<li key={check.id} className="flex items-center p-2 bg-white rounded-md border">
                                                <input type="checkbox" checked={!!selectedChecks[check.id]} onChange={() => handleToggleCheck(check.id)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/>
                                                <div className="ml-3 flex-grow flex justify-between">
                                                    <div>
                                                        <span className="text-sm text-slate-800 font-medium">{check.payor} - #{check.checkNumber}</span>
                                                        <p className="text-xs text-slate-500">{check.category}</p>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-800">${check.amount.toFixed(2)}</span>
                                                </div>
                                            </li>))}
                                    </ul>) : <p className="text-slate-500 text-center py-8">No checks are currently in the queue.</p>}
                            </div>
                        </div>
                        {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}

                        <div className="mt-6 border-t pt-4 flex justify-end">
                             <button onClick={handleProcessBatch} className="w-full sm:w-auto px-6 py-2 text-base font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed flex items-center justify-center" disabled={selectedCount === 0 || !trackingNumber.trim() || isProcessing}>
                                {isProcessing ? <><ProcessingLoaderIcon className="h-5 w-5 mr-2"/> Processing...</> : `Process Batch & Download (${selectedCount})`}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
};
export default ProcessBatchModal;
