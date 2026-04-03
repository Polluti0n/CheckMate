import React, { useState, useMemo } from 'react';
import { 
    Check, 
    CheckStatus, 
    Flag, 
    Theme, 
    UserPreferences, 
    CheckViewOptions,
    CardStyle,
    CardLayoutZone,
    CheckField,
    UserRole
} from '../../types';
import KanbanView from './KanbanView';
import TableView from './TableView';
import { 
    TableCellsIcon, 
    Square2StackIcon, 
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon
} from '../icons';

interface CheckDashboardProps {
    checks: Check[];
    flags: Flag[];
    themes: Theme[];
    onSelectCheck: (check: Check) => void;
    onMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    onUpdateCheck: (checkId: string, updates: Partial<Check>) => void;
    onExpandColumn: (status: CheckStatus) => void;
    sortConfig: Record<CheckStatus, { key: keyof Check; direction: 'asc' | 'desc' } | undefined>;
    onSort: (status: CheckStatus, key: keyof Check) => void;
    onSelectAllInColumn: (status: CheckStatus) => void;
    selectedCheckIds: string[];
    isMultiSelectMode: boolean;
    onCheckSelection: (clickedCheckId: string, event: React.MouseEvent, allChecksInOrder: Check[]) => void;
    columnDisplayOptions: Record<CheckStatus, { showCount: boolean; showTotal: boolean }>;
    columnThemes: Record<CheckStatus, string>;
    onToggleDisplayOption: (status: CheckStatus, option: 'showCount' | 'showTotal') => void;
    onOpenThemePicker: (status: CheckStatus) => void;
    cardLayout: Partial<Record<CardLayoutZone, CheckField | 'flags' | 'category'>>;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;
    preferences: UserPreferences;
    currentUser: any;
}

const CheckDashboard: React.FC<CheckDashboardProps> = (props) => {
    const { 
        checks, 
        onUpdateCheck, 
        selectedCheckIds, 
        onCheckSelection,
        onSelectCheck,
        currentUser
    } = props;
    
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChecks = useMemo(() => {
        if (!searchQuery) return checks;
        const q = searchQuery.toLowerCase();
        return checks.filter(c => 
            c.payor?.toLowerCase().includes(q) || 
            c.payee?.toLowerCase().includes(q) || 
            c.checkNumber?.toLowerCase().includes(q) ||
            c.amount?.toString().includes(q)
        );
    }, [checks, searchQuery]);

    // Role-based title
    const dashboardTitle = useMemo(() => {
        if (currentUser?.role === UserRole.GLOBAL_ADMIN) return 'Hq Management Hub';
        if (currentUser?.role === UserRole.BRANCH_LEADERSHIP) return 'Branch Operations View';
        if (currentUser?.role === UserRole.OFFICE_ADMIN) return 'Administrative Command Center';
        return 'Check Management Hub';
    }, [currentUser]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Dashboard Header Bar */}
            <header className="px-6 py-6 border-b border-slate-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-600/30">
                        <Square2StackIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none uppercase tracking-wider">{dashboardTitle}</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 opacity-60">Total Checks: {checks.length}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 pl-10 pr-4 py-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                        />
                    </div>

                    {/* View Switcher Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800 rounded-xl shadow-inner border border-slate-200 dark:border-gray-700">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Square2StackIcon className="h-4 w-4" />
                            Kanban
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <TableCellsIcon className="h-4 w-4" />
                            Table List
                        </button>
                    </div>

                    {/* Meta-Filtering Button */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-200 hover:border-sky-300 dark:hover:border-sky-700 transition-colors">
                        <FunnelIcon className="h-4 w-4 opacity-50" />
                        Filter Pipeline
                        <ChevronDownIcon className="h-3 w-3 opacity-30" />
                    </button>
                </div>
            </header>

            {/* Main Application Area */}
            <main className="flex-grow p-6 lg:p-8 overflow-hidden h-[calc(100vh-100px)]">
                {viewMode === 'kanban' ? (
                    <KanbanView {...props} checks={filteredChecks} />
                ) : (
                    <TableView 
                        checks={filteredChecks} 
                        flags={props.flags}
                        onSelectCheck={onSelectCheck}
                        onUpdateCheck={onUpdateCheck}
                        selectedCheckIds={selectedCheckIds}
                        onCheckSelection={(id, e) => onCheckSelection(id, e, filteredChecks)}
                    />
                )}
            </main>
        </div>
    );
};

export default CheckDashboard;
