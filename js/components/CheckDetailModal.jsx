import React, { useState, useEffect, useRef } from 'react';
import { CheckStatus } from '../types';
import { XMarkIcon, FlagIcon, PencilIcon, TrashIcon } from './icons';
const CheckDetailModal = ({ check, flags, onClose, onUpdateCheck, onAddComment, onToggleFlag, onOpenFlagManager, onDeleteCheck, currentUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCheck, setEditableCheck] = useState(check);
    const [commentText, setCommentText] = useState('');
    const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
    const [expandedView, setExpandedView] = useState('NONE');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const commentsEndRef = useRef(null);
    const auditTrailEndRef = useRef(null);
    useEffect(() => {
        setEditableCheck(check);
        setIsEditing(false);
        setIsFlagDropdownOpen(false);
        setExpandedView('NONE');
        setIsDeleteConfirmOpen(false);
        // Scroll to bottom of logs when modal opens or check data changes
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            auditTrailEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [check]);
    if (!check || !editableCheck)
        return null;
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableCheck(prev => prev ? { ...prev, [name]: name === 'amount' ? parseFloat(value) : value } : null);
    };
    const handleSave = () => {
        if (editableCheck) {
            const changes = Object.keys(editableCheck).find(key => editableCheck[key] !== check[key]);
            if (changes) {
                const log = {
                    user: currentUser?.name || 'Unknown User',
                    field: changes,
                    oldValue: String(check[changes]),
                    newValue: String(editableCheck[changes]),
                };
                onUpdateCheck(editableCheck, log);
            }
        }
        setIsEditing(false);
    };
    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (commentText.trim()) {
            onAddComment(check.id, commentText.trim());
            setCommentText('');
        }
    };
    const checkFlags = flags.filter(f => check.flags.includes(f.id));
    const availableFlags = flags.filter(f => !check.flags.includes(f.id));
    return (<div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true"/>

            <div className="relative w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100">
                    <div className="min-w-0">
                        <h3 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">Check Details</h3>
                        <p className="text-sm text-slate-500 truncate">{check.payor} • {check.checkNumber || 'No #'} • {new Date(check.date).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIsEditing(p => !p); if (!isEditing)
        setEditableCheck(check); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                            <PencilIcon className="h-4 w-4"/> {isEditing ? 'Editing' : 'Edit'}
                        </button>
                        <button onClick={() => setIsDeleteConfirmOpen(true)} aria-label="Delete" className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700">
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                        <button onClick={onClose} aria-label="Close" className="ml-2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-slate-50 hover:bg-slate-100">
                            <XMarkIcon className="h-5 w-5 text-slate-700"/>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-hidden p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left: Details + Flags */}
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-3 rounded-md">
                                    <p className="text-xs text-slate-500">Amount</p>
                                    {isEditing ? (<input aria-label="Amount" name="amount" type="number" step="0.01" value={editableCheck.amount} onChange={handleInputChange} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"/>) : (<p className="font-semibold text-lg text-slate-900">${editableCheck.amount.toFixed(2)}</p>)}
                                </div>

                                <div className="bg-slate-50 p-3 rounded-md">
                                    <p className="text-xs text-slate-500">Check #</p>
                                    {isEditing ? (<input aria-label="Check number" name="checkNumber" value={editableCheck.checkNumber} onChange={handleInputChange} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"/>) : (<p className="font-medium text-slate-800">{editableCheck.checkNumber || '—'}</p>)}
                                </div>

                                <div className="bg-slate-50 p-3 rounded-md">
                                    <p className="text-xs text-slate-500">Date</p>
                                    {isEditing ? (<input aria-label="Date" name="date" type="date" value={editableCheck.date} onChange={handleInputChange} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"/>) : (<p className="font-medium text-slate-800">{new Date(editableCheck.date).toLocaleDateString()}</p>)}
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-md p-4">
                                <label className="text-sm text-slate-500">Memo</label>
                                {isEditing ? (<input aria-label="Memo" name="memo" value={editableCheck.memo || ''} onChange={handleInputChange} className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"/>) : (<p className="mt-2 text-slate-700">{editableCheck.memo || 'No memo provided.'}</p>)}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 bg-white border border-slate-100 rounded-md p-3">
                                    <p className="text-xs text-slate-500">Status</p>
                                    {isEditing ? (<select aria-label="Status" name="status" value={editableCheck.status} onChange={handleInputChange} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900">
                                            {Object.values(CheckStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>) : (<p className="mt-1 font-medium text-slate-800">{editableCheck.status}</p>)}
                                </div>

                                <div className="w-full sm:w-64 bg-white border border-slate-100 rounded-md p-3">
                                    <p className="text-xs text-slate-500">GL Code</p>
                                    {isEditing ? (<input aria-label="GL Code" name="glCode" value={editableCheck.glCode || ''} onChange={handleInputChange} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-900"/>) : (<p className="mt-1 text-slate-700">{editableCheck.glCode || 'Not set'}</p>)}
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-md p-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-800">Flags</h4>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setIsFlagDropdownOpen(p => !p)} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-50 text-sm text-slate-700 border border-slate-200 hover:bg-slate-100">
                                            <FlagIcon className="h-4 w-4"/> Add
                                        </button>
                                        <button onClick={onOpenFlagManager} className="inline-flex items-center px-2 py-1 rounded-md text-sm text-slate-500 hover:bg-slate-50">Manage</button>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {checkFlags.map(flag => (<span key={flag.id} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${flag.color} ${flag.textColor}`}>
                                            {flag.name}
                                            <button aria-label={`Remove flag ${flag.name}`} onClick={() => onToggleFlag(check.id, flag.id)} className="inline-flex items-center p-1 rounded-full bg-white/30 hover:bg-white/50"><XMarkIcon className="h-3 w-3"/></button>
                                        </span>))}
                                </div>

                                {isFlagDropdownOpen && (<div className="mt-3 border-t pt-3">
                                        {availableFlags.length > 0 ? availableFlags.map(flag => (<button key={flag.id} onClick={() => { onToggleFlag(check.id, flag.id); setIsFlagDropdownOpen(false); }} className="block w-full text-left px-3 py-2 hover:bg-slate-50">{flag.name}</button>)) : <p className="text-sm text-slate-400">No flags available</p>}
                                    </div>)}
                            </div>
                        </div>

                        {/* Right: Comments & Audit */}
                        <div className="flex flex-col gap-4">
                            <div className="flex-1 bg-white border border-slate-100 rounded-md p-4 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-800">Comments</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'COMMENTS' ? 'NONE' : 'COMMENTS')} className="text-sm text-slate-500 hover:text-slate-700">{expandedView === 'COMMENTS' ? 'Collapse' : 'Expand'}</button>
                                </div>

                                <div className={`mt-3 overflow-y-auto ${expandedView === 'COMMENTS' ? 'max-h-[50vh]' : 'max-h-[22rem]'}`}>
                                    {check.comments.length > 0 ? check.comments.map(c => (<div key={c.id} className="mb-3">
                                            <p className="text-sm text-slate-800">{c.text}</p>
                                            <p className="text-xs text-slate-400">{c.author} • {new Date(c.timestamp).toLocaleString()}</p>
                                        </div>)) : <p className="text-sm text-slate-400">No comments yet.</p>}
                                    <div ref={commentsEndRef}/>
                                </div>

                                <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2">
                                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"/>
                                    <button type="submit" className="inline-flex items-center px-3 py-2 bg-sky-600 text-white rounded-md text-sm">Add</button>
                                </form>
                            </div>

                            <div className="bg-white border border-slate-100 rounded-md p-4 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-800">Audit Trail</h4>
                                    <button onClick={() => setExpandedView(prev => prev === 'AUDIT' ? 'NONE' : 'AUDIT')} className="text-sm text-slate-500 hover:text-slate-700">{expandedView === 'AUDIT' ? 'Collapse' : 'Expand'}</button>
                                </div>

                                <div className={`mt-3 overflow-y-auto ${expandedView === 'AUDIT' ? 'max-h-[50vh]' : 'max-h-40'}`}>
                                    {check.auditTrail.length > 0 ? check.auditTrail.map(log => (<div key={log.id} className="mb-2 text-sm text-slate-700">
                                            <p><span className="font-semibold">{log.user}</span> {log.field.startsWith('Flag') ? '' : 'updated '}<span className="font-semibold">{log.field}</span></p>
                                            <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                                        </div>)) : <p className="text-sm text-slate-400">No changes recorded.</p>}
                                    <div ref={auditTrailEndRef}/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 p-4 flex items-center justify-end gap-3">
                    {isEditing ? (<>
                            <button onClick={() => { setIsEditing(false); setEditableCheck(check); }} className="px-4 py-2 rounded-md border border-slate-200 bg-white">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-sky-600 text-white">Save Changes</button>
                        </>) : (<button onClick={onClose} className="px-4 py-2 rounded-md border border-slate-200 bg-white">Close</button>)}
                </div>

                {/* Delete Confirmation Modal */}
                {isDeleteConfirmOpen && (<div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="bg-white p-5 rounded-lg shadow-lg w-full max-w-sm">
                            <h3 className="text-lg font-semibold text-slate-900">Delete Check</h3>
                            <p className="text-sm text-slate-500 mt-2">Are you sure? This action cannot be undone.</p>
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-3 py-1 rounded-md border border-slate-200">Cancel</button>
                                <button onClick={() => onDeleteCheck(check.id)} className="px-3 py-1 rounded-md bg-red-600 text-white">Delete</button>
                            </div>
                        </div>
                    </div>)}
            </div>
        </div>);
};
export default CheckDetailModal;
