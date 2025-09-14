import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Comment, AuditLog, Flag, CheckStatus, UserProfile } from '../types';
import { XMarkIcon, FlagIcon, PencilIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, TrashIcon, ExclamationTriangleIcon, UserCircleIcon } from './icons';

interface CheckDetailModalProps {
    allChecks: Check[];
    allFlags: Flag[];
    profiles: UserProfile[];
    onClose: () => void;
    onUpdateCheck: (updatedCheck: Check, log: Omit<AuditLog, 'id' | 'timestamp' | 'userUid' | 'userName' | 'userPhotoURL'>) => void;
    onAddComment: (checkId: string, commentText: string) => void;
    onToggleFlag: (checkId: string, flagId: string) => void;
    onOpenFlagManager: () => void;
    onDeleteCheck: (checkId: string) => void;
    currentUser: UserProfile | null;
}

const CheckDetailModal: React.FC<CheckDetailModalProps> = ({ allChecks, allFlags, profiles, onClose, onUpdateCheck, onAddComment, onToggleFlag, onOpenFlagManager, onDeleteCheck, currentUser }) => {
    const { checkId } = useParams<{ checkId: string }>();
    const navigate = useNavigate();

    const check = useMemo(() => allChecks.find(c => c.id === checkId), [allChecks, checkId]);

    const [isEditing, setIsEditing] = useState(false);
    const [editableCheck, setEditableCheck] = useState<Check | null>(check || null);
    const [commentText, setCommentText] = useState('');
    const [isFlagDropdownOpen, setIsFlagDropdownOpen] = useState(false);
    const [expandedView, setExpandedView] = useState<'NONE' | 'COMMENTS' | 'AUDIT'>('NONE');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const auditTrailEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!check) {
            onClose();
            return;
        }
        setEditableCheck(check);
        setIsEditing(false);
        setIsFlagDropdownOpen(false);
        setExpandedView('NONE');
        setIsDeleteConfirmOpen(false);
        
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            auditTrailEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

    }, [check, onClose]);
    
    if (!check || !editableCheck) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableCheck(prev => prev ? { ...prev, [name]: name === 'amount' ? parseFloat(value) : value } : null);
    };

    const handleSave = () => {
        if (editableCheck) {
            const changes = Object.keys(editableCheck).find(key => editableCheck[key as keyof Check] !== check[key as keyof Check]);
            if (changes) {
                const log = {
                    field: changes,
                    oldValue: String(check[changes as keyof Check] || ''),
                    newValue: String(editableCheck[changes as keyof Check] || ''),
                };
                onUpdateCheck(editableCheck, log);
            }
        }
        setIsEditing(false);
    };

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (commentText.trim()) {
            onAddComment(check.id, commentText.trim());
            setCommentText('');
        }
    };
    
    const checkFlags = allFlags.filter(f => check.flags.includes(f.id));
    const availableFlags = allFlags.filter(f => !check.flags.includes(f.id));
    
    const UserAvatar = ({ photoURL, name }: { photoURL?: string, name?: string }) => {
        return photoURL ? 
            <img src={photoURL} alt={name || 'User'} className="w-8 h-8 rounded-full bg-slate-200 object-cover" /> :
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <UserCircleIcon className="w-6 h-6 text-slate-400" />
            </div>;
    };


    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-start justify-center min-h-screen p-4 text-center overflow-y-auto">
                <div className={`relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:w-full ${expandedView === 'NONE' ? 'sm:max-w-3xl' : 'sm:max-w-4xl'} max-h-[80vh] flex flex-col`}>
                     <div className="p-6 flex-shrink-0 border-b">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-2xl font-bold text-slate-800" id="modal-title">Check Details</h3>
                                <p className="text-sm text-slate-500 mt-1">From: {check.payor}</p>
                             </div>
                            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><XMarkIcon className="h-6 w-6" /></button>
                        </div>
                    </div>
                    
                    <div className="p-6 flex-grow overflow-y-auto">
                        {expandedView === 'NONE' && (
                            <>
                                {/* Main Details */}
                                <div className="border-b border-slate-200 pb-4 grid grid-cols-3 gap-4">
                                    <div><label className="text-sm font-medium text-slate-500">Amount</label><p className="font-semibold text-lg text-slate-800">${editableCheck.amount.toFixed(2)}</p></div>
                                    <div><label className="text-sm font-medium text-slate-500">Check #</label><p className="text-slate-700">{editableCheck.checkNumber}</p></div>
                                    <div><label className="text-sm font-medium text-slate-500">Date</label><p className="text-slate-700">{new Date(editableCheck.date).toLocaleDateString()}</p></div>
                                    <div className="col-span-3"><label className="text-sm font-medium text-slate-500">Memo</label><p className="text-slate-700">{editableCheck.memo || 'N/A'}</p></div>
                                    <div>
                                        <label htmlFor="status" className="text-sm font-medium text-slate-500">Status</label>
                                        {isEditing ? (<select id="status" name="status" value={editableCheck.status} onChange={handleInputChange} className="mt-1 block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 sm:text-sm">{Object.values(CheckStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>) : (<p className="text-slate-700">{editableCheck.status}</p>)}
                                    </div>
                                    <div>
                                        <label htmlFor="glCode" className="text-sm font-medium text-slate-500">GL Code</label>
                                        {isEditing ? (<input type="text" id="glCode" name="glCode" value={editableCheck.glCode || ''} onChange={handleInputChange} className="mt-1 block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 sm:text-sm" />) : (<p className="text-slate-700">{editableCheck.glCode || 'Not set'}</p>)}
                                    </div>
                                    <div>
                                        <label htmlFor="accountNumber" className="text-sm font-medium text-slate-500">Account #</label>
                                        {isEditing ? (<input type="text" id="accountNumber" name="accountNumber" value={editableCheck.accountNumber || ''} onChange={handleInputChange} className="mt-1 block w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-md shadow-sm py-2 px-3 sm:text-sm" />) : (<p className="text-slate-700">{editableCheck.accountNumber || 'Not set'}</p>)}
                                    </div>
                                    <div className="col-span-3 mt-2">
                                        {isEditing ? (
                                            <div className="flex justify-between items-center w-full"><button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700"><TrashIcon className="h-4 w-4 mr-2" /> Delete</button><div className="flex justify-end gap-2"><button onClick={() => { setIsEditing(false); setEditableCheck(check); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-sm hover:bg-slate-50">Cancel</button><button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md shadow-sm hover:bg-sky-700">Save</button></div></div>
                                        ) : (
                                            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-md shadow-sm hover:bg-slate-700"><PencilIcon className="h-4 w-4 mr-2" /> Edit</button>
                                        )}
                                    </div>
                                </div>

                                {/* Flags */}
                                <div className="mt-4">
                                    <h4 className="text-md font-semibold text-slate-700">Flags</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {checkFlags.map(flag => (<span key={flag.id} className={`flex items-center px-2 py-1 rounded-full text-sm font-medium ${flag.color} ${flag.textColor}`}>{flag.name}<button onClick={() => onToggleFlag(check.id, flag.id)} className="ml-2 opacity-75 hover:opacity-100"><XMarkIcon className="h-4 w-4" /></button></span>))}
                                        <div className="relative">
                                            <button onClick={() => setIsFlagDropdownOpen(prev => !prev)} className="flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 text-sm"><FlagIcon className="h-4 w-4 mr-1"/> Add</button>
                                            {isFlagDropdownOpen && (<div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-md shadow-xl z-10">{availableFlags.map(flag => (<a href="#" key={flag.id} onClick={(e) => {e.preventDefault(); onToggleFlag(check.id, flag.id); setIsFlagDropdownOpen(false);}} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"><span className={`w-3 h-3 rounded-full mr-3 ${flag.color}`}></span>{flag.name}</a>))}{availableFlags.length > 0 && <div className="border-t my-1"></div>}<a href="#" onClick={(e) => { e.preventDefault(); onOpenFlagManager(); setIsFlagDropdownOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">Manage...</a></div>)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}


                        <div className={`mt-6 grid gap-6 ${expandedView === 'NONE' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                            { (expandedView === 'NONE' || expandedView === 'COMMENTS') && (
                                <div>
                                    <h4 className="text-md font-semibold text-slate-700 flex justify-between items-center"><span>Comments</span><button onClick={() => setExpandedView(p => p === 'COMMENTS' ? 'NONE' : 'COMMENTS')} className="p-1 rounded-full text-slate-500 hover:text-sky-600 hover:bg-slate-100">{expandedView === 'COMMENTS' ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}</button></h4>
                                    <div className={`mt-2 space-y-3 pr-2 overflow-y-auto ${expandedView === 'COMMENTS' ? 'max-h-[50vh]' : 'max-h-48'}`}>
                                        {check.comments.map(c => (<div key={c.id} className="flex items-start gap-2.5"><UserAvatar photoURL={c.authorPhotoURL} name={c.authorName} /><div className="bg-slate-50 p-2 rounded-md flex-1"><p className="text-sm text-slate-800">{c.text}</p><p className="text-xs text-slate-400 text-right">-{c.authorName.split(' ')[0]} on {new Date(c.timestamp).toLocaleDateString()}</p></div></div>))}
                                        {check.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
                                        <div ref={commentsEndRef} />
                                    </div>
                                    <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2"><input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-grow bg-slate-50 border border-slate-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"/><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700">Add</button></form>
                                </div>
                            )}
                            { (expandedView === 'NONE' || expandedView === 'AUDIT') && (
                                <div>
                                    <h4 className="text-md font-semibold text-slate-700 flex justify-between items-center"><span>Audit Trail</span><button onClick={() => setExpandedView(p => p === 'AUDIT' ? 'NONE' : 'AUDIT')} className="p-1 rounded-full text-slate-500 hover:text-sky-600 hover:bg-slate-100">{expandedView === 'AUDIT' ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}</button></h4>
                                    <div className={`mt-2 space-y-3 pr-2 overflow-y-auto ${expandedView === 'AUDIT' ? 'max-h-[50vh]' : 'max-h-56'}`}>
                                        {check.auditTrail.map(log => (<div key={log.id} className="flex items-start gap-2.5 text-xs text-slate-500"><UserAvatar photoURL={log.userPhotoURL} name={log.userName} /><div className="flex-1"><p><span className="font-semibold">{log.userName.split(' ')[0]}</span> {log.field.startsWith('Flag') ? '' : 'updated '}<span className="font-semibold">{log.field}</span> from "{log.oldValue}" to "{log.newValue}"</p><p className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</p></div></div>))}
                                        {check.auditTrail.length === 0 && <p className="text-sm text-slate-400">No changes recorded.</p>}
                                        <div ref={auditTrailEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isDeleteConfirmOpen && (<div className="absolute inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50 rounded-lg"><div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4"><div className="sm:flex sm:items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"><ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" /></div><div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"><h3 className="text-lg font-medium text-gray-900">Delete Check</h3><div className="mt-2"><p className="text-sm text-gray-500">Are you sure? This action is irreversible.</p></div></div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm" onClick={() => onDeleteCheck(check.id)}>Confirm Delete</button><button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm" onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</button></div></div></div>)}
                </div>
            </div>
        </div>
    );
};

export default CheckDetailModal;
