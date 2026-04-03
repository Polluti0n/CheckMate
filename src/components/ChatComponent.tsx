import React, { useState, useRef, useEffect } from 'react';
import { Check, AuditLog, Comment, UserProfile } from '../types';
import { SendIcon, UserCircleIcon, ShieldCheckIcon, ChatIcon } from './icons';

interface ChatComponentProps {
    check: Check;
    currentUser: UserProfile;
    onAddComment: (text: string) => void;
}

type StreamItem = 
    | { type: 'audit'; data: AuditLog }
    | { type: 'comment'; data: Comment };

const ChatComponent: React.FC<ChatComponentProps> = ({ check, currentUser, onAddComment }) => {
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Combine and sort messages
    const stream: StreamItem[] = [
        ...(check.auditTrail || []).map(log => ({ type: 'audit' as const, data: log })),
        ...(check.comments || []).map(comment => ({ type: 'comment' as const, data: comment }))
    ].sort((a, b) => new Date(a.data.timestamp).getTime() - new Date(b.data.timestamp).getTime());

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [stream]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            onAddComment(newMessage.trim());
            setNewMessage('');
        }
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const isToday = (timestamp: string) => {
        const date = new Date(timestamp);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700/50 bg-slate-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <ChatIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Communication Hub</h3>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white dark:bg-gray-700 px-2 py-1 rounded-md border border-slate-200 dark:border-gray-600">
                    {stream.length} Entries
                </div>
            </div>

            {/* Message Stream */}
            <div 
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {stream.map((item, idx) => {
                    const isAudit = item.type === 'audit';
                    const key = isAudit ? `audit-${item.data.id}` : `comment-${item.data.id}`;
                    const showDate = idx === 0 || !isToday(item.data.timestamp) !== !isToday(stream[idx-1].data.timestamp);

                    if (isAudit) {
                        const log = item.data as AuditLog;
                        const actionMessage = `changed ${log.field} from "${log.oldValue || 'none'}" to "${log.newValue || 'none'}"`;
                        
                        return (
                            <div key={key} className="flex flex-col items-center">
                                {showDate && (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest my-4 bg-slate-50 dark:bg-gray-900/50 px-3 py-1 rounded-full border border-slate-100 dark:border-gray-800">
                                        {new Date(log.timestamp).toLocaleDateString()}
                                    </div>
                                )}
                                <div className="max-w-[90%] bg-slate-50 dark:bg-gray-900/40 rounded-lg px-3 py-2 border border-slate-100 dark:border-gray-800/50 flex items-start space-x-3">
                                    <div className="mt-0.5">
                                        <ShieldCheckIcon className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed italic">
                                            <span className="font-bold text-slate-700 dark:text-gray-300 not-italic">{log.user}</span> {actionMessage}
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium">{formatDate(log.timestamp)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        const comment = item.data as Comment;
                        const isMe = comment.authorUid === currentUser.uid;
                        return (
                            <div key={key} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`flex items-end space-x-2 max-w-[85%] ${isMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                                    <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${isMe ? 'bg-sky-100/50 text-sky-600' : 'bg-slate-100 dark:bg-gray-700 text-slate-500'}`}>
                                        <UserCircleIcon className="h-6 w-6" />
                                    </div>
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] font-bold text-slate-400 px-1 mb-1">{isMe ? 'You' : comment.author}</span>
                                        <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                            isMe 
                                                ? 'bg-sky-600 text-white rounded-tr-none' 
                                                : 'bg-white dark:bg-gray-700 dark:text-gray-200 border border-slate-200 dark:border-gray-600 rounded-tl-none'
                                        }`}>
                                            {comment.text}
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1 font-medium px-1">{formatDate(comment.timestamp)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                })}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-100 dark:border-gray-700/50">
                <form onSubmit={handleSubmit} className="relative">
                    <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message or internal note..."
                        className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all dark:text-gray-200"
                    />
                    <button 
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="absolute right-2 top-2 p-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:bg-slate-400 transition-all shadow-md active:scale-95"
                    >
                        <SendIcon className="h-5 w-5" />
                    </button>
                </form>
                <div className="mt-2 flex items-center justify-center space-x-4">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center">
                        <span className="h-1.5 w-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                        Live Collaboration
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        Enter to Send
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ChatComponent;
