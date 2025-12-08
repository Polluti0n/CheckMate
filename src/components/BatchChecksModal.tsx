import React from 'react';
import { Batch, Check } from '../types';
import { XMarkIcon } from './icons';

interface BatchChecksModalProps {
    isOpen: boolean;
    batch: Batch | null;
    checks: Check[];
    onClose: () => void;
    onSelectCheck: (check: Check) => void;
}

const BatchChecksModal: React.FC<BatchChecksModalProps> = ({ isOpen, batch, checks, onClose, onSelectCheck }) => {
    if (!isOpen || !batch) return null;

    const checksInBatch = checks.filter(check => batch.checkIds.includes(check.id));

    const handleCheckClick = (check: Check) => {
        onSelectCheck(check);
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-4 text-center">
                <div className="relative bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white" id="modal-title">Checks in Batch</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 font-mono">{batch.id}</p>
                                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Tracking #: {batch.trackingNumber}</p>
                             </div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>

                        <div className="mt-4">
                            {checksInBatch.length > 0 ? (
                                <div className="overflow-y-auto max-h-[60vh]">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                                        <thead className="bg-slate-50 dark:bg-gray-800 sticky top-0">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Payor</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Check #</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                                            {checksInBatch.map(check => (
                                                <tr key={check.id} onClick={() => handleCheckClick(check)} className="hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{check.payor}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-gray-300">${check.amount.toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-400">{check.checkNumber}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-400">{new Date(check.date).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-gray-400 text-center py-8">No checks found for this batch.</p>
                            )}
                        </div>
                         <div className="mt-6 border-t dark:border-gray-700 pt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex justify-center rounded-md border border-slate-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchChecksModal;