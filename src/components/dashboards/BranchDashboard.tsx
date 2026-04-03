import React, { useMemo } from 'react';
import { Check, CheckStatus, Batch, UserProfile } from '../../types';
import { 
    DocumentTextIcon, 
    FlagIcon, 
    CircleStackIcon, 
    ArrowTrendUpIcon, 
    ClockIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    PlusIcon,
    ArrowUpRightIcon
} from '../icons';

interface BranchDashboardProps {
    checks: Check[];
    batches: Batch[];
    currentUser: UserProfile;
    onSelectCheck: (check: Check) => void;
    onAddCheck: () => void;
}

const BranchDashboard: React.FC<BranchDashboardProps> = ({ 
    checks, 
    batches, 
    currentUser, 
    onSelectCheck, 
    onAddCheck 
}) => {
    // 1. Data Processing for Widgets
    const unresolvedFlags = useMemo(() => 
        checks.filter(c => c.flaggedFields && c.flaggedFields.length > 0 && c.status !== CheckStatus.COMPLETE),
    [checks]);

    const recentBatches = useMemo(() => 
        [...batches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [batches]);

    const todayChecks = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return checks.filter(c => c.createdAt && c.createdAt.startsWith(today));
    }, [checks]);

    const performanceMetrics = useMemo(() => {
        const total = checks.length;
        const completed = checks.filter(c => c.status === CheckStatus.COMPLETE || c.status === CheckStatus.ARCHIVED).length;
        const rate = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, rate };
    }, [checks]);

    const pinnedChecks = useMemo(() => 
        checks.filter(c => currentUser.pinnedChecks?.includes(c.id)),
    [checks, currentUser.pinnedChecks]);

    // 2. Greeting & Date
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    const todayStr = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Section: Greeting & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">
                        {greeting}, <span className="text-sky-600 dark:text-sky-400">{currentUser.firstName}</span>
                    </h1>
                    <p className="text-slate-500 font-medium flex items-center mt-1">
                        <ClockIcon className="h-4 w-4 mr-1.5 opacity-50" />
                        {todayStr} • {currentUser.branch || 'Corporate HQ'}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={onAddCheck}
                        className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Add New Check</span>
                    </button>
                </div>
            </div>

            {/* Performance Banner Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-300">
                        <DocumentTextIcon className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 bg-sky-50 dark:bg-sky-900/30 rounded-xl flex items-center justify-center mb-4">
                            <CircleStackIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Assigned</h3>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">
                            {performanceMetrics.total}
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400 flex items-center">
                            <ArrowTrendUpIcon className="h-3 w-3 mr-1 text-emerald-500" />
                            <span className="text-emerald-500 mr-1">{todayChecks.length} Added Today</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-300">
                        <CheckBadgeIcon className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                            <CheckBadgeIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Efficiency Rate</h3>
                        <div className="text-3xl font-black text-slate-800 dark:text-white">
                            {performanceMetrics.rate.toFixed(1)}%
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400">
                            {performanceMetrics.completed} of {performanceMetrics.total} Items Completed
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-300">
                        <FlagIcon className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Unresolved Flags</h3>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                            {unresolvedFlags.length}
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-slate-400">
                            Requires AI verification
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Unresolved Flags & Batches */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Unresolved Flags Section */}
                    {unresolvedFlags.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-2" />
                                    Needs Review
                                </h2>
                                <button className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">View All Review Queue</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {unresolvedFlags.slice(0, 4).map(check => (
                                    <div 
                                        key={check.id}
                                        onClick={() => onSelectCheck(check)}
                                        className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-900/50 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                                                Low Confidence
                                            </div>
                                            <ArrowUpRightIcon className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{check.payor || 'Unknown Payor'}</h4>
                                        <p className="text-xs text-slate-500 mb-3 truncate">Flagged: {check.flaggedFields?.join(', ')}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-black text-slate-900 dark:text-white">${check.amount.toFixed(2)}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">#{check.checkNumber}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Upcoming/Recent Batches */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                                <CircleStackIcon className="h-6 w-6 text-sky-500 mr-2" />
                                Recent Activity Log
                            </h2>
                            <button className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">Full Audit History</button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking #</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                    {recentBatches.map(batch => (
                                        <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-slate-700 dark:text-gray-300 font-mono group-hover:text-sky-600">{batch.trackingNumber}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-slate-500">{new Date(batch.createdAt).toLocaleDateString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-600 dark:text-gray-400">{batch.checkIds.length} Checks</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                                    Processed
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Side: Pinned & To-Do */}
                <div className="space-y-8">
                    {/* Pinned Checks */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center">
                            <span className="h-2 w-2 bg-sky-500 rounded-full mr-2"></span>
                            Priority Workspace
                        </h2>
                        <div className="space-y-3">
                            {pinnedChecks.length > 0 ? pinnedChecks.map(check => (
                                <div 
                                    key={check.id}
                                    onClick={() => onSelectCheck(check)}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="h-8 w-8 bg-slate-50 dark:bg-gray-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-sky-600 transition-colors">
                                            <DocumentTextIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{check.payor}</h4>
                                            <p className="text-[10px] text-slate-400">Archived {new Date(check.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white">${check.amount.toFixed(2)}</span>
                                </div>
                            )) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700">
                                    <p className="text-xs text-slate-400 italic">No pinned items. Click the pin icon in check details to track items here.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Personal Worklist */}
                    <section className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-950 dark:to-black p-6 rounded-3xl shadow-xl shadow-slate-900/20 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CircleStackIcon className="h-24 w-24" />
                        </div>
                        <h2 className="text-lg font-bold mb-6 relative z-10">Worklist Recap</h2>
                        <div className="space-y-4 relative z-10">
                            {(currentUser.todoList || []).length > 0 ? (currentUser.todoList || []).map(item => (
                                <div key={item.id} className="flex items-start space-x-3 group">
                                    <div className={`mt-0.5 h-5 w-5 rounded-md border-2 transition-colors flex items-center justify-center cursor-pointer ${item.completed ? 'bg-sky-500 border-sky-500' : 'border-slate-600 hover:border-sky-400'}`}>
                                        {item.completed && <CheckBadgeIcon className="h-4 w-4 text-white" />}
                                    </div>
                                    <span className={`text-sm font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                        {item.text}
                                    </span>
                                </div>
                            )) : (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3 opacity-50">
                                        <div className="h-5 w-5 rounded-md border-2 border-slate-600"></div>
                                        <span className="text-sm">Finalize Batch #2938</span>
                                    </div>
                                    <div className="flex items-center space-x-3 opacity-50">
                                        <div className="h-5 w-5 rounded-md border-2 border-slate-600"></div>
                                        <span className="text-sm">Approve AI Flagged Items</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="mt-8 w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold tracking-widest uppercase transition-all backdrop-blur-sm">
                            Edit Worklist
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default BranchDashboard;
