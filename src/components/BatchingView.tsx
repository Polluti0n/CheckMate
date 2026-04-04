import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CheckStatus, UserProfile } from "../types";
import { 
    ProcessingLoaderIcon, 
    ChevronLeftIcon, 
    DocumentTextIcon, 
    ArrowDownTrayIcon,
    ArchiveBoxIcon
} from "./icons";
import { generateExcelBatch } from "../utils/excelGenerator";

interface BatchingViewProps {
  checks: Check[];
  currentUser?: UserProfile | null;
  onClose: () => void;
  onProcessBatch: (checkIds: string[], trackingNumber: string) => void;
}

const BatchingView: React.FC<BatchingViewProps> = ({
  checks,
  currentUser,
  onClose,
  onProcessBatch,
}) => {
  const navigate = useNavigate();
  const [selectedChecks, setSelectedChecks] = useState<Record<string, boolean>>({});
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
  }, [checksToBatch]);

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
      navigate('/');
    } catch (e: any) {
      console.error("Error processing batch:", e);
      setError(e.message || "An unexpected error occurred during batch processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  const allSelected = checksToBatch.length > 0 && checksToBatch.every(c => selectedChecks[c.id]);
  const selectedCount = Object.values(selectedChecks).filter(Boolean).length;
  const totalAmount = useMemo(() => {
    return checksToBatch
        .filter(c => selectedChecks[c.id])
        .reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [checksToBatch, selectedChecks]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 overflow-hidden animate-in fade-in duration-500">
        {/* Enterprise Header */}
        <header className="h-20 shrink-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-8 flex items-center justify-between sticky top-0 z-30 transition-colors shadow-sm">
            <div className="flex items-center gap-6 min-w-0">
                <button 
                    onClick={onClose}
                    className="group flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-gray-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all font-bold text-xs"
                >
                    <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    BACK
                </button>
                
                <div className="h-10 w-px bg-slate-200 dark:bg-gray-800 hidden md:block"></div>
                
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Batch Processing Terminal
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] mt-1">
                        Corporate Accounts Receivable • {checksToBatch.length} Items Queued
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Value</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-gray-800 hidden sm:block"></div>
                <button 
                    disabled={selectedCount === 0 || !trackingNumber.trim() || isProcessing}
                    onClick={handleProcessBatch}
                    className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isProcessing ? <ProcessingLoaderIcon className="h-4 w-4 animate-spin" /> : <ArrowDownTrayIcon className="h-4 w-4" />}
                    EXECUTE BATCH
                </button>
            </div>
        </header>

        <main className="flex-grow flex overflow-hidden">
            {/* Left: Configuration Sidebar */}
            <aside className="w-80 shrink-0 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hidden lg:flex flex-col p-8 space-y-8 overflow-y-auto custom-scrollbar">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Required Metadata</label>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-gray-400">TRACKING NUMBER</label>
                            <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-sky-500 outline-none transition-all"
                                placeholder="Enter FedEx/UPS #"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Batch Summary</label>
                    <div className="bg-slate-50 dark:bg-gray-800/40 rounded-2xl p-5 border border-slate-100 dark:border-gray-800 space-y-4 shadow-inner">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Total Items</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{selectedCount} Selected</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold">Gross Value</span>
                            <span className="text-xs font-black text-sky-600">${totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <ArchiveBoxIcon className="h-3 w-3" /> Auto-Archive On Process
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase tracking-tighter">
                        Processing will generate a Corporate Ledger and move all selected items into the Archive. Ensure all details are verified.
                    </p>
                </div>
            </aside>

            {/* Right: Selection Workspace */}
            <div className="flex-grow flex flex-col bg-slate-50 dark:bg-gray-950">
                <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-8 py-4 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="h-5 w-5 rounded-lg border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Select All Items</span>
                    </div>
                    
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-right-4">
                            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                            Error: {error}
                        </div>
                    )}
                </div>

                <div className="flex-grow overflow-y-auto no-scrollbar p-8">
                    <div className="w-full space-y-3">
                        {checksToBatch.length > 0 ? (
                            checksToBatch.map((check) => (
                                <div
                                    key={check.id}
                                    onClick={() => handleToggleCheck(check.id)}
                                    className={`group flex items-center p-5 rounded-2xl border-2 transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] ${
                                        selectedChecks[check.id]
                                            ? 'bg-white dark:bg-gray-800 border-sky-500 shadow-xl shadow-sky-500/10'
                                            : 'bg-white/50 dark:bg-gray-900/30 border-slate-100 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className={`p-2 rounded-xl transition-colors ${selectedChecks[check.id] ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-400'}`}>
                                        <DocumentTextIcon className="h-5 w-5" />
                                    </div>

                                    <div className="ml-5 flex-grow flex items-center justify-between min-w-0">
                                        <div className="min-w-0 pr-8">
                                            <span className="block text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                                                {check.payor}
                                            </span>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{check.checkNumber || 'NO NUMBER'}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">{check.category}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-8 shrink-0">
                                            <div className="hidden sm:flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</span>
                                                <span className="text-base font-black text-slate-900 dark:text-white">${check.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className={`h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center ${selectedChecks[check.id] ? 'bg-sky-500 border-sky-500' : 'border-slate-200 dark:border-gray-700'}`}>
                                                {selectedChecks[check.id] && <div className="h-2 w-2 rounded-full bg-white animate-in zoom-in duration-200"></div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-gray-900/30 rounded-3xl border-4 border-dashed border-slate-100 dark:border-gray-800">
                                <ArchiveBoxIcon className="h-16 w-16 text-slate-200 dark:text-gray-800 mb-6" />
                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Queue Is Pure</h3>
                                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-tighter">Bring new checks into the system to begin batching</p>
                                <button 
                                    onClick={() => navigate('/add-check')}
                                    className="mt-8 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                                >
                                    Initialize Ingestion
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
};

export default BatchingView;
