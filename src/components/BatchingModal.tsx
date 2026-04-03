import React, { useState, useMemo, useEffect } from "react";
import { Check, CheckStatus, UserProfile } from "../types";
import { XMarkIcon, ProcessingLoaderIcon } from "./icons";
import { generateExcelBatch } from "../utils/excelGenerator";

interface ProcessBatchViewProps {
  checks: Check[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onProcessBatch: (checkIds: string[], trackingNumber: string) => void;
}

const ProcessBatchView: React.FC<ProcessBatchViewProps> = ({
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
    const initialSelection = checksToBatch.reduce((acc, check) => {
      acc[check.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedChecks(initialSelection);
    setTrackingNumber('');
    setError(null);
    setIsProcessing(false);
  }, [checksToBatch]);

  // Removed isOpen check as this is now a dedicated route

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


  const handleProcessBatch = async () => {
    const idsToProcess = Object.keys(selectedChecks).filter(id => selectedChecks[id]);
    if (idsToProcess.length === 0 || !trackingNumber.trim()) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const selectedCheckObjects = checksToBatch.filter(c => selectedChecks[c.id]);

      await generateExcelBatch({
        checks: selectedCheckObjects,
        trackingNumber: trackingNumber.trim(),
        currentUser: currentUser || null
      });

      onProcessBatch(idsToProcess, trackingNumber.trim());
      onClose();
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
    <div className="w-full h-full bg-slate-50 dark:bg-gray-900 flex flex-col animate-in fade-in duration-300">
      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
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
              <div className="mb-6">
                <label
                  htmlFor="trackingNumber"
                  className="block text-sm font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mb-2"
                >
                  Package Tracking Number
                </label>
                <input
                  type="text"
                  name="trackingNumber"
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-800 dark:text-white rounded-xl py-3 px-4 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-lg font-medium"
                  placeholder="Enter carrier tracking number..."
                  required
                />
              </div>

              <div className="flex justify-between items-center mb-3 p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-600">
                <div className="flex items-center">
                  <input
                    id="select-all"
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-5 w-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label
                    htmlFor="select-all"
                    className="ml-3 text-sm font-bold text-slate-700 dark:text-gray-300"
                  >
                    Select All Queued
                  </label>
                </div>
                <div className="px-3 py-1 bg-white dark:bg-gray-600 rounded-full border border-slate-200 dark:border-gray-500 shadow-sm">
                  <span className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase">
                    {selectedCount} / {checksToBatch.length} Selected
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto p-1 custom-scrollbar">
                {checksToBatch.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {checksToBatch.map((check) => (
                      <div
                        key={check.id}
                        onClick={() => handleToggleCheck(check.id)}
                        className={`group flex items-center p-4 rounded-xl border transition-all cursor-pointer ${
                          selectedChecks[check.id]
                            ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-slate-100 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedChecks[check.id]}
                          onChange={() => {}} // Controlled by parent div click
                          className="h-5 w-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <div className="ml-4 flex-grow flex justify-between items-center">
                          <div>
                            <span className={`block font-bold truncate max-w-[200px] sm:max-w-xs ${
                              selectedChecks[check.id] ? 'text-sky-900 dark:text-sky-100' : 'text-slate-800 dark:text-white'
                            }`}>
                              {check.payor}
                            </span>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                #{check.checkNumber || 'No #'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {check.category}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-black ${
                              selectedChecks[check.id] ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-white'
                            }`}>
                              ${check.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                      Queue is Empty
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start space-x-3">
                <div className="mt-0.5 h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-700">
              <button
                onClick={handleProcessBatch}
                className="w-full py-4 text-base font-black text-white bg-sky-600 rounded-2xl hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center active:scale-[0.98]"
                disabled={
                  selectedCount === 0 || !trackingNumber.trim() || isProcessing
                }
              >
                {isProcessing ? (
                  <>
                    <ProcessingLoaderIcon className="h-5 w-5 mr-3 animate-spin" /> 
                    Generating Corporate Export...
                  </>
                ) : (
                  <>
                    Process Batch & Download Manifest
                    <span className="ml-3 px-2 py-0.5 bg-white/20 rounded text-xs">
                      {selectedCount}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessBatchView;