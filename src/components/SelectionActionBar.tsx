import React, { useState, useMemo } from 'react';
import { CheckStatus } from '../types';
import { XMarkIcon, ArchiveBoxIcon } from './icons';

interface SelectionActionBarProps {
    selectedCount: number;
    onCancel: () => void;
    onMove: (newStatus: CheckStatus) => void;
}

const SelectionActionBar: React.FC<SelectionActionBarProps> = ({ selectedCount, onCancel, onMove }) => {
    const [targetStatus, setTargetStatus] = useState<CheckStatus | ''>('');
    const boardStatuses = Object.values(CheckStatus);

    const handleMove = () => {
        if (targetStatus) {
            onMove(targetStatus);
        }
    };

    const availableStatuses = useMemo(() => 
        boardStatuses.filter(s => s !== CheckStatus.ARCHIVED),
    [boardStatuses]);

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-30 transition-transform duration-300 ease-in-out transform translate-y-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="p-2 rounded-full hover:bg-slate-100" aria-label="Cancel selection">
                            <XMarkIcon className="h-6 w-6 text-slate-600" />
                        </button>
                        <span className="text-lg font-semibold text-slate-800">{selectedCount} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={targetStatus}
                            onChange={(e) => setTargetStatus(e.target.value as CheckStatus)}
                            className="w-full sm:w-auto flex-grow bg-white border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                            aria-label="Select destination status"
                        >
                            <option value="" disabled>Move to...</option>
                            {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            onClick={handleMove}
                            disabled={!targetStatus || selectedCount === 0}
                            className="px-6 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed"
                        >
                            Move
                        </button>
                         <button
                            onClick={() => onMove(CheckStatus.ARCHIVED)}
                            disabled={selectedCount === 0}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 disabled:bg-slate-200 disabled:cursor-not-allowed"
                        >
                            <ArchiveBoxIcon className="h-5 w-5" />
                            <span>Archive</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectionActionBar;