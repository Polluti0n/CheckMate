import React, { useState, useMemo, useEffect } from "react";
import { Check, CheckStatus, UserProfile } from "../types";
import { XMarkIcon, ProcessingLoaderIcon } from "./icons";
import { generateExcelBatch } from "../utils/excelGenerator";

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