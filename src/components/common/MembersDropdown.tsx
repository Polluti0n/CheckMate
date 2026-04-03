import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { UserProfile } from '../../types';
import { XMarkIcon, UserCircleIcon, PlusIcon } from '../icons';
import Portal from './Portal';

interface MembersDropdownProps {
    users: UserProfile[]; // all users in the same branch
    selectedMemberIds: string[];
    onAddMember: (uidOrEmail: string, isEmailInvite: boolean) => void;
    onRemoveMember: (uidOrEmail: string) => void;
    canRemoveMember: (uidOrEmail: string) => boolean;
    compact?: boolean;
}

const MembersDropdown: React.FC<MembersDropdownProps> = ({
    users,
    selectedMemberIds,
    onAddMember,
    onRemoveMember,
    canRemoveMember,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on click outside and scroll
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // If the click is inside a portal-root, we don't close.
                // But the portal itself is in #portal-root.
                const portalRoot = document.getElementById('portal-root');
                if (portalRoot && portalRoot.contains(event.target as Node)) return;
                
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    // Calculate position
    useLayoutEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const dropdownWidth = 288; // w-72 = 18rem = 288px
            
            // Default: align left edge with trigger left edge
            let left = rect.left;
            
            // If it would go off the right edge, align right edge with trigger right edge
            if (left + dropdownWidth > viewportWidth) {
                left = rect.right - dropdownWidth;
            }
            
            // If it's still negative, just push it to zero
            if (left < 0) left = 4; // small margin

            setDropdownStyles({
                position: 'fixed',
                top: rect.bottom + 8,
                left: left,
                width: dropdownWidth,
            });
        }
    }, [isOpen]);

    const filteredUsers = users.filter(u =>
        !selectedMemberIds.includes(u.uid) &&
        (u.firstName.toLowerCase().includes(query.toLowerCase()) ||
            u.lastName.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()))
    );

    const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);

    const handleSelect = (uid: string) => {
        onAddMember(uid, false);
        setQuery('');
        setIsOpen(false);
    };

    const handleInvite = () => {
        if (isEmailFormat) {
            onAddMember(query, true);
            setQuery('');
            setIsOpen(false);
        }
    };

    const selectedMembersList = selectedMemberIds.map(id => {
        const user = users.find(u => u.uid === id);
        return user ? { id, type: 'user', data: user } : { id, type: 'email', data: null };
    });

    return (
        <div className={`relative flex items-center ${compact ? 'gap-1' : 'flex-wrap gap-2'}`} ref={containerRef}>
            {/* Avatar Stack for Compact View */}
            {compact ? (
                <div className="flex -space-x-2 overflow-hidden mr-1">
                    {selectedMembersList.slice(0, 5).map(member => (
                        <div key={member.id} className="relative group inline-block ring-2 ring-white dark:ring-gray-800 rounded-full cursor-help">
                            {member.type === 'user' && member.data?.profilePictureUrl ? (
                                <img src={member.data.profilePictureUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center text-slate-500">
                                    <UserCircleIcon className="w-5 h-5" />
                                </div>
                            )}
                            
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity">
                                {member.type === 'user' ? `${member.data?.firstName} ${member.data?.lastName}` : member.id}
                            </div>

                            {canRemoveMember(member.id) && (
                                <button 
                                    onClick={() => onRemoveMember(member.id)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <XMarkIcon className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {selectedMembersList.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-gray-600 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-gray-300">
                            +{selectedMembersList.length - 5}
                        </div>
                    )}
                </div>
            ) : (
                /* Standard Pill View */
                selectedMembersList.map(member => (
                    <div key={member.id} className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full text-sm border border-sky-200 dark:border-sky-800/50 transition-colors">
                        {member.type === 'user' ? (
                            <>
                                {member.data?.profilePictureUrl ? (
                                    <img src={member.data.profilePictureUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="w-5 h-5 opacity-75" />
                                )}
                                <span className="font-medium">{member.data?.firstName} {member.data?.lastName}</span>
                            </>
                        ) : (
                            <span className="font-medium italic">{member.id} (Invited)</span>
                        )}

                        {canRemoveMember(member.id) && (
                            <button onClick={() => onRemoveMember(member.id)} className="p-0.5 hover:bg-sky-200 dark:hover:bg-sky-800 rounded-full transition-colors ml-1">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))
            )}

            {/* Add Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={compact 
                    ? "w-7 h-7 rounded-full flex items-center justify-center bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 hover:bg-sky-200 dark:hover:bg-sky-800 transition-colors"
                    : "flex items-center gap-1 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                }
                title="Add Member"
            >
                <PlusIcon className="w-4 h-4" />
                {!compact && <span>Add Member</span>}
            </button>

            {/* Dropdown in Portal */}
            {isOpen && (
                <Portal>
                    <div 
                        style={dropdownStyles}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-slate-200 dark:border-gray-700 z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        <div className="p-2 border-b border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/20">
                            <input
                                type="text"
                                className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-500"
                                placeholder="Name or email address..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredUsers.map(u => (
                                <button
                                    key={u.uid}
                                    type="button"
                                    onClick={() => handleSelect(u.uid)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-700/50 text-left transition-colors"
                                >
                                    {u.profilePictureUrl ? (
                                        <img src={u.profilePictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-gray-200">{u.firstName} {u.lastName}</div>
                                        <div className="text-xs text-slate-500 dark:text-gray-400">{u.role}</div>
                                    </div>
                                </button>
                            ))}

                            {filteredUsers.length === 0 && !isEmailFormat && (
                                <div className="p-4 text-center text-sm text-slate-500 dark:text-gray-400 bg-transparent">
                                    No members found matching "{query}"
                                </div>
                            )}

                            {isEmailFormat && (
                                <button
                                    type="button"
                                    onClick={handleInvite}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-sky-100/50 dark:bg-sky-900/10 hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors mt-1 border border-sky-100 dark:border-sky-800/30"
                                >
                                    <div className="w-8 h-8 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300">
                                        <PlusIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-sky-800 dark:text-sky-300">Invite by email</div>
                                        <div className="text-xs text-sky-600 dark:text-sky-400 font-medium">{query}</div>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default MembersDropdown;
