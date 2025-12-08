import React from 'react';
import { Check, CheckStatus, Flag } from '../types';
import { ArrowUturnLeftIcon, FlagIcon, DocumentTextIcon } from './icons';

interface ExpandedColumnViewProps {
    status: CheckStatus;
    checks: Check[];
    flags: Flag[];
    onSelectCheck: (check: Check) => void;
    onClose: () => void;
}

const statusColors: Record<CheckStatus, { border: string, bg: string, text: string }> = {
    [CheckStatus.RECEIVED]: { border: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800' },
    [CheckStatus.CONFIRMING_DETAILS]: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-800' },
    [CheckStatus.QUEUED]: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-800' },
    [CheckStatus.COMPLETE]: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-800' },
    [CheckStatus.ARCHIVED]: { border: 'border-slate-500', bg: 'bg-slate-50', text: 'text-slate-800' },
};

const ExpandedColumnView: React.FC<ExpandedColumnViewProps> = ({ status, checks, flags, onSelectCheck, onClose }) => {
    const colors = statusColors[status] || statusColors[CheckStatus.ARCHIVED];

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
            <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-t-4 ${colors.border}`}>
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                    <div>
                        <h1 className={`text-2xl font-bold ${colors.text}`}>{status}</h1>
                        <p className="text-slate-500 dark:text-gray-400">{checks.length} checks in this stage</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 font-semibold rounded-md shadow-sm transition-colors duration-200"
                    >
                        <ArrowUturnLeftIcon className="h-5 w-5" />
                        <span>Back to Board</span>
                    </button>
                </div>
                
                {checks.length > 0 ? (
                    <ul className="space-y-3">
                        {checks.map(check => {
                            const checkFlags = flags.filter(f => check.flags.includes(f.id));
                            return (
                                <li 
                                    key={check.id} 
                                    onClick={() => onSelectCheck(check)} 
                                    className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-slate-200 dark:border-gray-600 hover:shadow-md hover:border-sky-400 dark:hover:border-sky-700 cursor-pointer transition-all duration-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                                >
                                    <div className="md:col-span-3">
                                        <p className="font-bold text-slate-800 dark:text-white text-lg">{check.payor}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">#{check.checkNumber}</p>
                                    </div>
                                    <div className="md:col-span-4">
                                        <p className="font-semibold text-slate-700 dark:text-gray-300">{check.category}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400 truncate" title={check.memo}>Memo: {check.memo || 'N/A'}</p>
                                    </div>
                                    <div className="md:col-span-3 flex flex-wrap gap-2 items-center">
                                        {checkFlags.map(flag => (
                                            <span key={flag.id} className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${flag.color} ${flag.textColor}`}>
                                                <FlagIcon className="h-3 w-3 mr-1" />
                                                {flag.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="md:col-span-2 text-right">
                                        <p className="font-bold text-xl text-slate-900 dark:text-white">${check.amount.toFixed(2)}</p>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">{new Date(check.date).toLocaleDateString()}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-lg">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300 dark:text-gray-600" />
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">No checks in this stage.</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ExpandedColumnView;