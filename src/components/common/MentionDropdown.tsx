import React from 'react';
import { UserProfile } from '../../types';

interface MentionDropdownProps {
    users: UserProfile[];
    searchQuery: string;
    onSelectUser: (user: UserProfile) => void;
    position: { top: number; left: number };
}

const MentionDropdown: React.FC<MentionDropdownProps> = ({ users, searchQuery, onSelectUser, position }) => {
    const filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5); // Show max 5 suggestions

    if (filteredUsers.length === 0) return null;

    return (
        <div
            style={{ top: position.top, left: position.left }}
            className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-slate-200 dark:border-gray-700"
        >
            <ul className="py-1">
                {filteredUsers.map(user => (
                    <li
                        key={user.uid}
                        onClick={() => onSelectUser(user)}
                        className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3"
                    >
                        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-xs font-bold text-sky-700 dark:text-sky-300">
                            {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                            {user.firstName} {user.lastName}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MentionDropdown;
