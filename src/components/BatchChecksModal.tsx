import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Batch, Check } from '../types';
import { XMarkIcon } from './icons';

interface BatchChecksModalProps {
    isOpen: boolean;
    batch: Batch | null;
    checks: Check[];
    onClose: () => void;
}

const BatchChecksModal: React.FC<BatchChecksModalProps> = ({ isOpen, batch, checks, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    if (!isOpen || !batch) return null;

    const checksInBatch = checks.filter(check => batch.checkIds.includes(check.id));

    const handleCheckClick = (check: Check) => {
        onClose(); 
        navigate(`/check/${check.id}`, { state: { backgroundLocation: location } });
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-start justify-center min-h-screen p-4 text-center overflow-y-auto">
                <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:max-w-2xl sm:w-full max-h-[80vh] flex flex-col">
                    <div className="p-6 flex-shrink-0 border-b">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-2xl font-bold text-slate-800" id="modal-title">Checks in Batch</h3>
                                <p className="text-sm text-slate-500 mt-1 font-mono">{batch.id}</p>
                                <p className="text-sm text-slate-500 mt-1">Tracking #: {batch.trackingNumber}</p>
                             </div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto">
                        {checksInBatch.length > 0 ? (
                            <div className="overflow-y-auto max-h-full">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payor</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check #</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {checksInBatch.map(check => (
                                            <tr key={check.id} onClick={() => handleCheckClick(check)} className="hover:bg-slate-50 cursor-pointer">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{check.payor}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">${check.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{check.checkNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(check.date).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-center py-8">No checks found for this batch.</p>
                        )}
                    </div>
                     <div className="p-6 flex-shrink-0 border-t flex justify-end">
                        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchChecksModal;