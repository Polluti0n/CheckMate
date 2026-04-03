import React, { useMemo, useState } from 'react';
import { Check, CheckStatus, CheckCategory, Flag } from '../../types';
import { 
    ChevronUpDownIcon, 
    ArrowSmallUpIcon, 
    ArrowSmallDownIcon, 
    ExclamationTriangleIcon,
    TableCellsIcon
} from '../icons';
import { CHECK_TYPE_COLORS } from '../../constants';
import { categoryConfig } from '../../formConfig';

const USDollar = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', });

interface TableViewProps {
    checks: Check[];
    flags: Flag[];
    onSelectCheck: (check: Check) => void;
    onUpdateCheck: (checkId: string, updates: Partial<Check>) => void;
    selectedCheckIds: string[];
    onCheckSelection: (checkId: string, event: React.MouseEvent) => void;
}

type VisibleField = keyof Check | 'flags' | 'actions';

const TableView: React.FC<TableViewProps> = (props) => {
    const { 
        checks, 
        onUpdateCheck, 
        selectedCheckIds, 
        onSelectCheck,
        onCheckSelection
    } = props;
    const [sortKey, setSortKey] = useState<keyof Check>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [visibleFields, setVisibleFields] = useState<VisibleField[]>(['payor', 'payee', 'amount', 'date', 'status', 'category', 'flags']);
    const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

    const allColumns: { key: VisibleField; label: string }[] = [
        { key: 'payor', label: 'Payor / Homeowner' },
        { key: 'payee', label: 'Payee' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date Received' },
        { key: 'status', label: 'Processing Status' },
        { key: 'category', label: 'Business Vertical' },
        { key: 'checkNumber', label: 'Check #' },
        { key: 'bankName', label: 'Financial Institution' },
        { key: 'flags', label: 'Audit Flags' },
    ];

    const toggleField = (field: VisibleField) => {
        setVisibleFields(prev => 
            prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
        );
    };

    const sortedChecks = useMemo(() => {
        return [...checks].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA === undefined || valB === undefined) return 0;
            if (valA === null) return 1;
            if (valB === null) return -1;
            
            let comparison = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } else if (sortKey === 'date') {
                comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [checks, sortKey, sortDirection]);

    const handleSort = (key: keyof Check) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const StatusBadge = ({ status, checkId }: { status: CheckStatus; checkId: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        const statuses = Object.values(CheckStatus);

        return (
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                        status === CheckStatus.COMPLETE ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                        status === CheckStatus.QUEUED ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' :
                        status === CheckStatus.RECEIVED ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                    }`}
                >
                    {status}
                </button>
                {isOpen && (
                    <div className="absolute z-50 mt-2 w-48 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1">
                        {statuses.map(s => (
                            <button
                                key={s}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateCheck(checkId, { status: s });
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-700 ${s === status ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-600 dark:text-gray-300'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const CategoryBadge = ({ category, checkId }: { category: CheckCategory; checkId: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        const categories = Object.values(CheckCategory);

        return (
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className="flex items-center space-x-2 hover:bg-slate-100 dark:hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors group"
                >
                    <div className={`h-2 w-2 rounded-full ${CHECK_TYPE_COLORS[category]?.bg || 'bg-slate-400'}`}></div>
                    <span className="text-xs font-bold text-slate-700 dark:text-gray-300 group-hover:text-sky-600 truncate max-w-[120px]">{category}</span>
                </button>
                {isOpen && (
                    <div className="absolute z-50 mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1">
                        {categories.map(c => {
                            const Icon = categoryConfig[c].icon;
                            return (
                                <button
                                    key={c}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateCheck(checkId, { category: c });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3 ${c === category ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20' : 'text-slate-600 dark:text-gray-300'}`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {c}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
                <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Filters:</span>
                    <div className="flex gap-2">
                        {visibleFields.length === allColumns.length ? (
                            <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded text-[10px] font-bold">All Columns</span>
                        ) : (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-[10px] font-bold">{visibleFields.length} Columns Active</span>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-gray-300 hover:border-sky-500 transition-all"
                    >
                        <TableCellsIcon className="h-3.5 w-3.5" />
                        Configure Columns
                    </button>

                    {isColumnPickerOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsColumnPickerOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Settings</h4>
                                </div>
                                <div className="max-height-[300px] overflow-y-auto py-1">
                                    {allColumns.map(col => (
                                        <label key={col.key} className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={visibleFields.includes(col.key)}
                                                onChange={() => toggleField(col.key)}
                                                className="h-3.5 w-3.5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 mr-3"
                                            />
                                            <span className="text-xs font-bold text-slate-600 dark:text-gray-300">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-full">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800 border-separate border-spacing-0">
                    <thead className="bg-slate-50 dark:bg-gray-900 sticky top-0 z-20">
                        <tr>
                            <th scope="col" className="w-12 px-6 py-4 text-left border-b dark:border-gray-800">
                                <span className="sr-only">Selection</span>
                            </th>
                            {visibleFields.includes('payor') && (
                                <th 
                                    scope="col" 
                                    onClick={() => handleSort('payor')}
                                    className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-sky-600 transition-colors border-b dark:border-gray-800"
                                >
                                    <div className="flex items-center gap-2">
                                        Payor
                                        {sortKey === 'payor' ? (
                                            sortDirection === 'asc' ? <ArrowSmallUpIcon className="h-3 w-3" /> : <ArrowSmallDownIcon className="h-3 w-3" />
                                        ) : <ChevronUpDownIcon className="h-3 w-3 opacity-30" />}
                                    </div>
                                </th>
                            )}
                            {visibleFields.includes('payee') && (
                                <th 
                                    scope="col" 
                                    onClick={() => handleSort('payee')}
                                    className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-sky-600 transition-colors border-b dark:border-gray-800"
                                >
                                    <div className="flex items-center gap-2">
                                        Payee
                                        {sortKey === 'payee' ? (
                                            sortDirection === 'asc' ? <ArrowSmallUpIcon className="h-3 w-3" /> : <ArrowSmallDownIcon className="h-3 w-3" />
                                        ) : <ChevronUpDownIcon className="h-3 w-3 opacity-30" />}
                                    </div>
                                </th>
                            )}
                            {visibleFields.includes('amount') && (
                                <th 
                                    scope="col" 
                                    onClick={() => handleSort('amount')}
                                    className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-sky-600 transition-colors border-b dark:border-gray-800"
                                >
                                    <div className="flex items-center gap-2">
                                        Amount
                                        {sortKey === 'amount' ? (
                                            sortDirection === 'asc' ? <ArrowSmallUpIcon className="h-3 w-3" /> : <ArrowSmallDownIcon className="h-3 w-3" />
                                        ) : <ChevronUpDownIcon className="h-3 w-3 opacity-30" />}
                                    </div>
                                </th>
                            )}
                            {visibleFields.includes('date') && (
                                <th 
                                    scope="col" 
                                    onClick={() => handleSort('date')}
                                    className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-sky-600 transition-colors border-b dark:border-gray-800"
                                >
                                    <div className="flex items-center gap-2">
                                        Date
                                        {sortKey === 'date' ? (
                                            sortDirection === 'asc' ? <ArrowSmallUpIcon className="h-3 w-3" /> : <ArrowSmallDownIcon className="h-3 w-3" />
                                        ) : <ChevronUpDownIcon className="h-3 w-3 opacity-30" />}
                                    </div>
                                </th>
                            )}
                            {visibleFields.includes('status') && (
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-gray-800">
                                    Status
                                </th>
                            )}
                            {visibleFields.includes('category') && (
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-gray-800">
                                    Category
                                </th>
                            )}
                            {visibleFields.includes('checkNumber') && (
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-gray-800">
                                    Check #
                                </th>
                            )}
                            {visibleFields.includes('bankName') && (
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-gray-800">
                                    Bank
                                </th>
                            )}
                            {visibleFields.includes('flags') && (
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b dark:border-gray-800">
                                    Flags
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                        {sortedChecks.map((check) => {
                            const isSelected = selectedCheckIds.includes(check.id);
                            return (
                                <tr 
                                    key={check.id} 
                                    onClick={() => onSelectCheck(check)}
                                    className={`group hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer ${isSelected ? 'bg-sky-50/50 dark:bg-sky-900/10' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <div 
                                            onClick={(e) => onCheckSelection(check.id, e as any)}
                                            className={`h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-sky-600 border-sky-600' : 'border-slate-300 dark:border-gray-700 hover:border-sky-500'}`}
                                        >
                                            {isSelected && <TableCellsIcon className="h-3 w-3 text-white" />}
                                        </div>
                                    </td>
                                    {visibleFields.includes('payor') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-sky-600 transition-colors">{check.payor || '-'}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('payee') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">{check.payee || '-'}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('amount') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-black text-slate-900 dark:text-white">{USDollar.format(check.amount || 0)}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('date') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs text-slate-500 dark:text-gray-500 font-mono italic">{check.date || '-'}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('status') && (
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <StatusBadge status={check.status} checkId={check.id} />
                                        </td>
                                    )}
                                    {visibleFields.includes('category') && (
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <CategoryBadge category={check.category} checkId={check.id} />
                                        </td>
                                    )}
                                    {visibleFields.includes('checkNumber') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-mono text-slate-500 dark:text-gray-400">{check.checkNumber || '-'}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('bankName') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs text-slate-500 dark:text-gray-400 italic">{check.bankName || '-'}</div>
                                        </td>
                                    )}
                                    {visibleFields.includes('flags') && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                {check.flaggedFields && check.flaggedFields.length > 0 && (
                                                    <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] font-black uppercase">
                                                        <ExclamationTriangleIcon className="h-3 w-3" />
                                                        {check.flaggedFields.length}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {sortedChecks.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                        <TableCellsIcon className="h-16 w-16 text-slate-200 dark:text-gray-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No checks found</h3>
                        <p className="text-sm text-slate-500">Try adjusting your filters or adding a new check.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TableView;
