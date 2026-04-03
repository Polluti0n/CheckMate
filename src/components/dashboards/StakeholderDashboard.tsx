import React, { useMemo, useState } from 'react';
import { Check, CheckStatus, Region, Branch } from '../../types';
import {
    calculateAgingReport,
    calculateAverageProcessingTime,
    calculateVolumeTrends
} from '../../utils/analyticsUtils';
import { 
    ChevronRightIcon, 
    ChevronDownIcon, 
    BuildingOfficeIcon, 
    GlobeAmericasIcon, 
    DocumentTextIcon, 
    ArrowUpRightIcon
} from '../icons';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

interface StakeholderDashboardProps {
    checks: Check[];
    allRegions: Region[];
    allBranches: Branch[];
    onSelectCheck?: (checkId: string) => void;
}

const StakeholderDashboard: React.FC<StakeholderDashboardProps> = ({ checks, allRegions, allBranches, onSelectCheck }) => {
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
    const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

    // Toggle expansion
    const toggleRegion = (id: string) => {
        setExpandedRegions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleBranch = (id: string) => {
        setExpandedBranches(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Advanced analytics
    const agingData = useMemo(() => calculateAgingReport(checks), [checks]);
    const avgProcessingTime = useMemo(() => calculateAverageProcessingTime(checks), [checks]);
    const trendsData = useMemo(() => calculateVolumeTrends(checks), [checks]);


    const totalAmount = checks.reduce((sum, check) => sum + check.amount, 0);
    const completeChecks = checks.filter(c => c.status === CheckStatus.COMPLETE || c.status === CheckStatus.ARCHIVED);
    const completeAmount = completeChecks.reduce((sum, check) => sum + check.amount, 0);
    const pendingChecks = checks.filter(c => c.status !== CheckStatus.COMPLETE && c.status !== CheckStatus.ARCHIVED);
    const pendingAmount = pendingChecks.reduce((sum, check) => sum + check.amount, 0);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Corporate Insights</h1>
                <p className="text-slate-500 dark:text-gray-400">High-level insights into accounts receivable performance across all regions.</p>
            </div>

            {/* KPI Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Total Processing</h3>
                    <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider mb-2">Completed</h3>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">
                        ${completeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-2">Pending In-Flight</h3>
                    <div className="text-3xl font-black text-amber-500 mb-1">
                        ${pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-2">Avg Processing Time</h3>
                    <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mb-1">
                        {avgProcessingTime}
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Pending Aging Report</h3>
                    <div className="flex-1 relative flex justify-center h-64">
                        <Doughnut
                            data={{
                                labels: Object.keys(agingData),
                                datasets: [{
                                    data: Object.values(agingData),
                                    backgroundColor: ['#38bdf8', '#fbbf24', '#f97316', '#ef4444', '#7f1d1d'],
                                    borderWidth: 0,
                                }]
                            }}
                            options={{
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } },
                                cutout: '70%',
                            }}
                        />
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">6-Month Ingestion Trend</h3>
                    <div className="flex-1 relative h-64">
                        <Line
                            data={{
                                labels: trendsData.labels,
                                datasets: [{
                                    label: 'Checks Processed',
                                    data: trendsData.data,
                                    borderColor: '#0ea5e9',
                                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                    fill: true,
                                    tension: 0.4,
                                }]
                            }}
                            options={{
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: '#94a3b8' } },
                                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Corporate Structure Explorer (Nested List) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Corporate Resource Explorer</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Navigate the organization hierarchy to view checks by location.</p>
                    </div>
                    <div className="hidden sm:flex gap-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                            <span>Regions</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span>Branches</span>
                        </div>
                    </div>
                </div>

                <div className="divide-y dark:divide-gray-700">
                    {allRegions.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <GlobeAmericasIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No regions found in organization data.</p>
                        </div>
                    ) : (
                        allRegions.map(region => {
                            const isRegionExpanded = expandedRegions.has(region.id);
                            const regionBranches = allBranches.filter(b => b.regionId === region.id);
                            const regionCheckCount = checks.filter(c => c.regionId === region.id).length;

                            return (
                                <div key={region.id} className="group">
                                    {/* Region Row */}
                                    <div 
                                        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors ${isRegionExpanded ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}
                                        onClick={() => toggleRegion(region.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                                <GlobeAmericasIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    {region.name}
                                                </h4>
                                                <p className="text-xs text-slate-500">{regionBranches.length} Branches · {regionCheckCount} Total Checks</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isRegionExpanded ? <ChevronDownIcon className="h-5 w-5 text-slate-400" /> : <ChevronRightIcon className="h-5 w-5 text-slate-400" />}
                                        </div>
                                    </div>

                                    {/* Branches Container */}
                                    {isRegionExpanded && (
                                        <div className="bg-slate-50/50 dark:bg-gray-900/20 pl-4 py-1 pr-4 space-y-2 mb-4 mt-2">
                                            {regionBranches.length === 0 ? (
                                                <p className="p-4 text-xs text-slate-400 italic">No branches assigned to this region.</p>
                                            ) : (
                                                regionBranches.map(branch => {
                                                    const isBranchExpanded = expandedBranches.has(branch.id);
                                                    const branchChecks = checks.filter(c => c.branchId === branch.id);
                                                    const branchTotalAmount = branchChecks.reduce((s, c) => s + c.amount, 0);

                                                    return (
                                                        <div key={branch.id} className="border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                                                            {/* Branch Header */}
                                                            <div 
                                                                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors ${isBranchExpanded ? 'border-b dark:border-gray-700' : ''}`}
                                                                onClick={() => toggleBranch(branch.id)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                                        <BuildingOfficeIcon className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-sm font-bold text-slate-700 dark:text-gray-200">
                                                                            {branch.name}
                                                                            <span className="ml-2 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{branch.designation}</span>
                                                                        </h5>
                                                                        <p className="text-[10px] text-slate-500 uppercase font-semibold">{branchChecks.length} Checks · ${branchTotalAmount.toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                                {isBranchExpanded ? <ChevronDownIcon className="h-4 w-4 text-slate-400" /> : <ChevronRightIcon className="h-4 w-4 text-slate-400" />}
                                                            </div>

                                                            {/* Checks List */}
                                                            {isBranchExpanded && (
                                                                <div className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                                                                    {branchChecks.length === 0 ? (
                                                                        <div className="p-8 text-center text-slate-400">
                                                                            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                                            <p className="text-xs">No checks available for this branch.</p>
                                                                        </div>
                                                                    ) : (
                                                                        branchChecks.map(check => (
                                                                            <div 
                                                                                key={check.id} 
                                                                                className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-gray-700 group/check cursor-pointer"
                                                                                onClick={() => onSelectCheck && onSelectCheck(check.id)}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-slate-400 group-hover/check:text-sky-500 transition-colors">
                                                                                        <DocumentTextIcon className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-slate-700 dark:text-gray-200 capitalize">{check.payor || 'Unknown Payor'}</p>
                                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                                            <span className="text-[10px] text-slate-500">{check.date}</span>
                                                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                                            <span className="text-[10px] font-semibold text-slate-400">#{check.checkNumber || '---'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-4 text-right">
                                                                                    <div>
                                                                                        <p className="text-xs font-black text-slate-800 dark:text-white">${check.amount.toFixed(2)}</p>
                                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${check.status === CheckStatus.COMPLETE ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                            {check.status}
                                                                                        </span>
                                                                                    </div>
                                                                                    <ArrowUpRightIcon className="h-4 w-4 text-slate-300 group-hover/check:text-sky-500 opacity-0 group-hover/check:opacity-100 transition-all" />
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Global Recent Activity */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Global Recent Activity</h3>
                <div className="relative overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-gray-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Branch</th>
                                <th scope="col" className="px-6 py-3">Payor</th>
                                <th scope="col" className="px-6 py-3 font-semibold text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checks.slice(0, 10).map(c => {
                                const branch = allBranches.find(b => b.id === c.branchId);
                                return (
                                    <tr 
                                        key={c.id} 
                                        className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-600 cursor-pointer"
                                        onClick={() => onSelectCheck && onSelectCheck(c.id)}
                                    >
                                        <td className="px-6 py-4">{c.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{branch?.designation || '---'}</span>
                                                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{branch?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.payor}</td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                            ${c.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StakeholderDashboard;
