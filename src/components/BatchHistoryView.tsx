import React, { useState } from 'react';
import { Batch, Check } from '../types';
import { CubeIcon, ListBulletIcon, CalendarDaysIcon } from './icons';
import BatchChecksModal from './BatchChecksModal';
import BatchCalendarView from './BatchCalendarView'; // Import the new component

interface BatchHistoryViewProps {
    batches: Batch[];
    checks: Check[];
    onSelectCheck: (check: Check) => void;
    onBack: () => void;
}

type ViewMode = 'list' | 'calendar';

const BatchHistoryView: React.FC<BatchHistoryViewProps> = ({ batches, checks, onSelectCheck, onBack }) => {
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

    const sortedBatches = React.useMemo(() => 
        [...batches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [batches]
    );

    return (
        <>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Batch History</h1>
                            <p className="text-slate-500">{batches.length} batches processed</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                                <button onClick={() => setViewMode('list')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <ListBulletIcon className="h-5 w-5" /> List
                                </button>
                                <button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-sm font-semibold rounded-md flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-600 hover:bg-slate-200'}`}>
                                    <CalendarDaysIcon className="h-5 w-5" /> Calendar
                                </button>
                            </div>
                            <button 
                                onClick={onBack}
                                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm transition-colors duration-200"
                            >
                                Back to Board
                            </button>
                        </div>
                    </div>
                    
                    {batches.length > 0 ? (
                        viewMode === 'list' ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Processed Date</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking #</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"># of Checks</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {sortedBatches.map(batch => (
                                            <tr key={batch.id} onClick={() => setSelectedBatch(batch)} className="hover:bg-slate-50 cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{new Date(batch.createdAt).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-mono">{batch.trackingNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">{batch.checkIds.length}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{batch.id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <BatchCalendarView batches={sortedBatches} onSelectBatch={setSelectedBatch} />
                        )
                    ) : (
                        <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-lg">
                            <CubeIcon className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-2 text-sm font-medium text-slate-500">No batches have been processed yet.</p>
                        </div>
                    )}
                </div>
            </main>

            <BatchChecksModal 
                isOpen={!!selectedBatch}
                batch={selectedBatch}
                checks={checks}
                onClose={() => setSelectedBatch(null)}
                onSelectCheck={onSelectCheck}
            />
        </>
    );
};

export default BatchHistoryView;