import React, { useState, useMemo, useEffect } from 'react';
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
    UserRole,
    CheckCategory
} from '../../types';
import KanbanView from './KanbanView';
import TableView from './TableView';
import { 
    TableCellsIcon, 
    Square2StackIcon, 
    FunnelIcon,
    MagnifyingGlassIcon,
    ChevronDownIcon,
    DocumentTextIcon,
    FlagIcon
} from '../icons';
import { CHECK_TYPE_COLORS } from '../../constants';

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
    defaultView?: 'dashboard' | 'kanban' | 'table';
}

const DashboardSummaryView: React.FC<{ 
    checks: Check[]; 
    onSelectCheck: (check: Check) => void; 
    flags: Flag[];
}> = ({ checks, onSelectCheck, flags }) => {
    const totalAmount = checks.reduce((sum, c) => sum + (c.amount || 0), 0);
    const flaggedChecks = checks.filter(c => c.flags && c.flags.length > 0);
    const recentChecks = [...checks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    const checkSystemHealth = useMemo(() => {
        if (flags.length === 0) return 100;
        return Math.max(0, 100 - (flaggedChecks.length * 5));
    }, [flags, flaggedChecks]);

    const checksByCategory = useMemo(() => {
        return checks.reduce((acc, c) => {
            acc[c.category] = (acc[c.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [checks]);

    const totalFlagsCount = useMemo(() => {
        return checks.reduce((sum, c) => sum + (c.flags?.length || 0), 0);
    }, [checks]);


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-4 overflow-y-auto h-full pr-2 custom-scrollbar">
            {/* Stats Overview */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pipeline</span>
                    <div className="mt-2 text-3xl font-black text-slate-800 dark:text-white">${totalAmount.toLocaleString()}</div>
                    <div className="mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">Active Receivables</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check Count</span>
                    <div className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{checks.length}</div>
                    <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">Units in Queue</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exception Rate</span>
                    <div className="mt-2 text-3xl font-black text-red-600 dark:text-red-400">{((flaggedChecks.length / checks.length) * 100).toFixed(1)}%</div>
                    <div className="mt-1 text-[10px] font-bold text-red-500 dark:text-red-300 uppercase tracking-widest">{flaggedChecks.length} Manual Reviews</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</span>
                    <div className="mt-2 text-3xl font-black text-slate-800 dark:text-white">{checkSystemHealth}%</div>
                    <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest">Data Integrity</div>
                </div>
            </div>

            {/* Left: Recent Activity List */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
                    <div className="p-6 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                             <DocumentTextIcon className="h-5 w-5 text-sky-500" />
                             Mission Queue - Recent Arrivals
                        </h3>
                        <button className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase tracking-widest">View Master List</button>
                    </div>
                    <div className="flex-grow">
                        {recentChecks.map((c, idx) => (
                            <button 
                                key={c.id} 
                                onClick={() => onSelectCheck(c)}
                                className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors border-b border-slate-50 dark:border-gray-700/50 ${idx === recentChecks.length - 1 ? 'border-b-0' : ''}`}
                            >
                                <div className="flex items-center gap-4 text-left">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${CHECK_TYPE_COLORS[c.category as CheckCategory]?.bg || 'bg-slate-100'} text-slate-700`}>
                                        {c.payor?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{c.payor}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{c.category} • {c.status}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-800 dark:text-white">${c.amount?.toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">{new Date(c.createdAt).toLocaleDateString()}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Insights & Alerts */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 text-white shadow-2xl flex flex-col justify-between h-[200px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <FlagIcon className="h-32 w-32 -rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Strategic Insight</span>
                        <h4 className="text-xl font-black mt-2 leading-tight">Priority Flags<br/>Require Action</h4>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Detecting {totalFlagsCount} atypical processing patterns in current queue.</p>
                    </div>
                    <button className="relative z-10 w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Review Exceptions</button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-sm p-6 flex-grow">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Volume by Workflow</h3>
                    <div className="space-y-4">
                        {Object.entries(checksByCategory).map(([cat, count]) => (
                            <div key={cat} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-slate-600 dark:text-gray-400">{cat}</span>
                                    <span className="text-slate-400">{count} Units</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${CHECK_TYPE_COLORS[cat as CheckCategory]?.bg || 'bg-sky-500'}`}
                                        style={{ width: `${(count / checks.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckDashboard: React.FC<CheckDashboardProps> = (props) => {
    const { 
        checks, 
        onUpdateCheck, 
        selectedCheckIds, 
        onCheckSelection,
        onSelectCheck,
        currentUser,
        defaultView = 'dashboard'
    } = props;
    
    const [viewMode, setViewMode] = useState<'dashboard' | 'kanban' | 'table'>(defaultView);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (defaultView) setViewMode(defaultView);
    }, [defaultView]);

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
                    {/* View Switcher Toggle */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800 rounded-xl shadow-inner border border-slate-200 dark:border-gray-700">
                        <button 
                            onClick={() => setViewMode('dashboard')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'dashboard' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Square2StackIcon className="h-4 w-4" />
                            Insights
                        </button>
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <DocumentTextIcon className="h-4 w-4" />
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
                {viewMode === 'dashboard' ? (
                    <DashboardSummaryView checks={checks} onSelectCheck={onSelectCheck} flags={props.flags} />
                ) : viewMode === 'kanban' ? (
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
