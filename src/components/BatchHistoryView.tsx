import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Batch, Check } from '../types';
import { CubeIcon } from './icons';
import BatchChecksModal from './BatchChecksModal';

interface BatchHistoryViewProps {
    batches: Batch[];
    checks: Check[];
}

const BatchHistoryView: React.FC<BatchHistoryViewProps> = ({ batches, checks }) => {
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const navigate = useNavigate();

    return (
        <>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Batch History</h1>
                            <p className="text-slate-500">{batches.length} batches processed</p>
                        </div>
                        <button 
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm transition-colors duration-200"
                        >
                            Back to Board
                        </button>
                    </div>
                    
                    {batches.length > 0 ? (
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
                                    {batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(batch => (
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
            />
        </>
    );
};

export default BatchHistoryView;