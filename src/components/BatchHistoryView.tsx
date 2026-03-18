import React, { useState } from 'react';
import { Batch, Check, UserPreferences, UserProfile } from '../types';
import { CubeIcon, ListBulletIcon, CalendarDaysIcon, TrashIcon, ArrowPathIcon } from './icons';
import { generateExcelBatch } from '../utils/excelGenerator';
import BatchChecksModal from './BatchChecksModal';
import BatchCalendarView from './BatchCalendarView'; // Import the new component

interface BatchHistoryViewProps {
    batches: Batch[];
    checks: Check[];
    onSelectCheck: (check: Check) => void;
    onBack: () => void;
    preferences: UserPreferences;
    savePreferences: (prefs: Partial<UserPreferences>) => void;
    viewingBatchId: string | null;
    onViewBatch: (batchId: string) => void;
    onCloseBatch: () => void;
    onDeleteBatch: (batchId: string, checkIds: string[]) => void;
    currentUser: UserProfile | null;
}

const BatchHistoryView: React.FC<BatchHistoryViewProps> = ({ batches, checks, onSelectCheck, onBack, preferences, savePreferences, viewingBatchId, onViewBatch, onCloseBatch, onDeleteBatch, currentUser }) => {
    const viewMode = preferences.batchViewMode || 'list';

    const selectedBatch = React.useMemo(() =>
        batches.find(b => b.id === viewingBatchId) || null,
        [batches, viewingBatchId]);

    const handleSetViewMode = (mode: 'list' | 'calendar') => {
        savePreferences({ batchViewMode: mode });
    };

    const sortedBatches = React.useMemo(() =>
        [...batches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [batches]
    );

    const handleReRunBatch = async (batch: Batch) => {
        try {
            const batchChecks = checks.filter(c => batch.checkIds.includes(c.id));
            if (batchChecks.length === 0) {
                alert("Could not find any checks for this batch locally. They may have been deleted.");
                return;
            }

            await generateExcelBatch({
                checks: batchChecks,
                trackingNumber: batch.trackingNumber,
                currentUser: currentUser
            });
        } catch (error) {
            console.error("Failed to re-run batch excel generation:", error);
            alert("Failed to generate Excel file. Please try again.");
        }
    };

    return (
        <>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Batch History</h1>
                            <p className="text-slate-500 dark:text-gray-400">{batches.length} batches processed</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-700 rounded-lg">
                                <button onClick={() => handleSetViewMode('list')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'}`}>
                                    <ListBulletIcon className="h-5 w-5" /> List
                                </button>
                                <button onClick={() => handleSetViewMode('calendar')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 shadow-sm text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'}`}>
                                    <CalendarDaysIcon className="h-5 w-5" /> Calendar
                                </button>
                            </div>
                            <button
                                onClick={onBack}
                                className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 font-semibold rounded-md shadow-sm transition-colors duration-200"
                            >
                                Back to Board
                            </button>
                        </div>
                    </div>

                    {batches.length > 0 ? (
                        viewMode === 'list' ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                                    <thead className="bg-slate-50 dark:bg-gray-800">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Processed Date</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Tracking #</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider"># of Checks</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Batch ID</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                                        {sortedBatches.map(batch => (
                                            <tr key={batch.id} onClick={() => onViewBatch(batch.id)} className="hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{new Date(batch.createdAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300 font-mono">{batch.trackingNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-400 text-center">{batch.checkIds.length}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-400 font-mono">{batch.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReRunBatch(batch);
                                                            }}
                                                            className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300 p-2 rounded-md hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                                                            title="Re-run Excel Generation"
                                                        >
                                                            <ArrowPathIcon className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm('Are you sure you want to delete this batch record? The checks will remain, but their association with this batch will be removed.')) {
                                                                    onDeleteBatch(batch.id, batch.checkIds);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Delete Batch Record"
                                                        >
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <BatchCalendarView batches={sortedBatches} onSelectBatch={(batch) => onViewBatch(batch.id)} />
                        )
                    ) : (
                        <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-lg">
                            <CubeIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-600" />
                            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">No batches have been processed yet.</p>
                        </div>
                    )}
                </div>
            </main>

            <BatchChecksModal
                isOpen={!!selectedBatch}
                batch={selectedBatch}
                checks={checks}
                onClose={onCloseBatch}
                onSelectCheck={onSelectCheck}
                onDeleteBatch={onDeleteBatch}
            />
        </>
    );
};

export default BatchHistoryView;