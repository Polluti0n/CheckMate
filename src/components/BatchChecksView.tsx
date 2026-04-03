import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Batch, Check } from '../types';
import { TrashIcon, DocumentTextIcon, QrCodeIcon, ArrowSmallLeftIcon } from './icons';
import { QRCodeSVG } from 'qrcode.react';

interface BatchChecksViewProps {
    batches: Batch[];
    checks: Check[];
    onSelectCheck: (check: Check) => void;
    onDeleteBatch: (batchId: string, checkIds: string[]) => void;
}

const BatchChecksView: React.FC<BatchChecksViewProps> = ({ batches, checks, onSelectCheck, onDeleteBatch }) => {
    const { batchId } = useParams();
    const navigate = useNavigate();
    
    const batch = batches.find(b => b.id === batchId);
    
    if (!batch) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700">
                <DocumentTextIcon className="h-16 w-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Batch not found</h2>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-6 px-6 py-2 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition-all"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const checksInBatch = checks.filter(check => batch.checkIds.includes(check.id));

    const handleCheckClick = (check: Check) => {
        onSelectCheck(check);
        navigate(`/check/${check.id}`);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900 animate-in fade-in duration-300">
            {/* Header Area */}
            <header className="h-16 px-6 border-b border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowSmallLeftIcon className="h-6 w-6 text-slate-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Batch Management</h1>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Tracking ID: {batch.trackingNumber}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => {
                            if (window.confirm('Delete this batch record? Checks will remain but will be unbundled.')) {
                                onDeleteBatch(batch.id, batch.checkIds);
                                navigate('/batch-history');
                            }
                        }}
                        className="flex items-center px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                        <TrashIcon className="h-5 w-5 mr-2" />
                        Delete Batch
                    </button>
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel: Batch Info & QR */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="h-10 w-10 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                                    <QrCodeIcon className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Physical Packaging</h3>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100 mb-4">
                                    <QRCodeSVG 
                                        value={batch.id}
                                        size={180}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-gray-400 text-center px-4">
                                    Scan this code to verify contents at headquarters or track logistics status.
                                </p>
                                <button className="mt-6 w-full py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                                    <DocumentTextIcon className="h-4 w-4" />
                                    Print Packing Slip
                                </button>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Batch Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Internal ID</label>
                                    <p className="text-sm font-mono text-slate-700 dark:text-gray-300 break-all">{batch.id}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Checks Count</label>
                                    <p className="text-sm font-bold text-slate-700 dark:text-gray-300">{batch.checkIds.length} Items</p>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Current Logistics Status</label>
                                    <div className="mt-1">
                                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                                            In Transit to HQ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Checks List */}
                    <div className="lg:col-span-2">
                        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-gray-700/50">
                                <h3 className="font-bold text-slate-800 dark:text-white">Checks in this Batch</h3>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-700">
                                    <thead className="bg-slate-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payor</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Check #</th>
                                            <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                                        {checksInBatch.map(check => (
                                            <tr key={check.id} onClick={() => handleCheckClick(check)} className="hover:bg-slate-50 dark:hover:bg-gray-800/80 cursor-pointer transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-slate-700 dark:text-gray-200 group-hover:text-sky-600 dark:group-hover:text-sky-400">{check.payor}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                                        {check.amount ? `$${check.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs font-mono text-slate-500 dark:text-gray-400">{check.checkNumber}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs text-slate-500 dark:text-gray-400">{new Date(check.date).toLocaleDateString()}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {checksInBatch.length === 0 && (
                                <div className="p-12 text-center">
                                    <DocumentTextIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-500 dark:text-gray-400 text-sm">No checks bundled in this batch yet.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BatchChecksView;