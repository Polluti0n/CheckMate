import React, { useState, useEffect } from 'react';
import { UserProfile, Region, Branch, UserRole } from '../../types';
import { getRegions, createRegion, deleteRegion } from '../../services/regionsService';
import { getBranches, createBranch, deleteBranch } from '../../services/branchService';
import { updateUserProfile } from '../../services/firestoreService';
import { XMarkIcon, TrashIcon } from '../icons';

interface AdminPanelProps {
    allUsers: UserProfile[];
    currentUser: UserProfile | null;
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ allUsers, currentUser, onBack }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'regions' | 'branches'>('users');
    const [regions, setRegions] = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [newRegionName, setNewRegionName] = useState('');
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchDesignation, setNewBranchDesignation] = useState('');
    const [selectedRegionForBranch, setSelectedRegionForBranch] = useState('');

    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [userAssignedRegions, setUserAssignedRegions] = useState<string[]>([]);
    const [userAssignedBranches, setUserAssignedBranches] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const fetchedRegions = await getRegions();
        const fetchedBranches = await getBranches();
        setRegions(fetchedRegions);
        setBranches(fetchedBranches);
        if (fetchedRegions.length > 0) {
            setSelectedRegionForBranch(fetchedRegions[0].id);
        }
    };

    const handleCreateRegion = async () => {
        if (!newRegionName.trim()) return;
        await createRegion({ name: newRegionName.trim(), members: [] });
        setNewRegionName('');
        loadData();
    };

    const handleDeleteRegion = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this region?')) {
            await deleteRegion(id);
            loadData();
        }
    };

    const handleCreateBranch = async () => {
        if (!newBranchName.trim() || !newBranchDesignation.trim() || !selectedRegionForBranch) return;

        // Ensure designation is 3 letters and capitalized
        const designation = newBranchDesignation.trim().toUpperCase();
        if (designation.length !== 3) {
            alert('Designation must be exactly 3 letters.');
            return;
        }

        await createBranch({
            name: newBranchName.trim(),
            designation,
            regionId: selectedRegionForBranch,
            members: []
        });
        setNewBranchName('');
        setNewBranchDesignation('');
        loadData();
    };

    const handleDeleteBranch = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this branch?')) {
            await deleteBranch(id);
            loadData();
        }
    };

    const handleCsvBranchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').filter(r => r.trim() !== '');
            let createdCount = 0;

            for (let i = 1; i < rows.length; i++) {
                const parts = rows[i].split(',');
                if (parts.length >= 3) {
                    const name = parts[0].trim();
                    const designation = parts[1].trim().toUpperCase();
                    const regionName = parts[2].trim();

                    if (name && designation.length === 3 && regionName) {
                        const region = regions.find(r => r.name.toLowerCase() === regionName.toLowerCase());
                        if (region) {
                            try {
                                await createBranch({ name, designation, regionId: region.id, members: [] });
                                createdCount++;
                            } catch (err) {
                                console.error('Failed to create branch:', name, err);
                            }
                        }
                    }
                }
            }
            alert(`Successfully created ${createdCount} branches from CSV.`);
            loadData();
        };
        reader.readAsText(file);
        // Reset file input
        if (e.target) e.target.value = '';
    };

    const handleUpdateUserRole = async (uid: string, newRole: UserRole) => {
        await updateUserProfile(uid, { 'profile.role': newRole } as any);
        alert('User role updated (may require a refresh if not listening to user updates globally).');
    };

    const handleOpenAssignmentModal = (user: UserProfile) => {
        setEditingUser(user);
        setUserAssignedRegions(user.assignedRegions || []);
        setUserAssignedBranches(user.assignedBranches || []);
    };

    const handleSaveAssignments = async () => {
        if (!editingUser) return;
        await updateUserProfile(editingUser.uid, {
            'profile.assignedRegions': userAssignedRegions,
            'profile.assignedBranches': userAssignedBranches
        } as any);
        setEditingUser(null);
        alert('User assignments updated successfully.');
    };

    const handleToggleRegion = (regionId: string) => {
        setUserAssignedRegions(prev => prev.includes(regionId) ? prev.filter(r => r !== regionId) : [...prev, regionId]);
    };

    const handleToggleBranch = (branchId: string) => {
        setUserAssignedBranches(prev => prev.includes(branchId) ? prev.filter(b => b !== branchId) : [...prev, branchId]);
    };

    if (currentUser?.role !== UserRole.GLOBAL_ADMIN && currentUser?.role !== UserRole.AR_MANAGER) {
        return (
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Access Denied</h1>
                    <p className="text-slate-500 dark:text-gray-400 mb-6">You do not have permission to view the Admin Dashboard.</p>
                    <button onClick={onBack} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md shadow-sm transition-colors duration-200 text-slate-700 dark:text-gray-300 font-semibold">
                        Back to Board
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6 border-b dark:border-gray-700 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Dashboard</h1>
                        <p className="text-slate-500 dark:text-gray-400">Manage Users, Regions, and Branches</p>
                    </div>
                    <button onClick={onBack} className="px-4 py-2 bg-white dark:bg-gray-700 hover:bg-slate-100 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 font-semibold rounded-md shadow-sm transition-colors duration-200">
                        Back to Board
                    </button>
                </div>

                <div className="flex gap-4 border-b dark:border-gray-700 mb-6 overflow-x-auto custom-scrollbar">
                    {(['users', 'regions', 'branches'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 px-1 text-sm font-semibold capitalize border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTab === tab ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'regions' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-2 items-center bg-slate-50 dark:bg-gray-900/30 p-4 rounded-lg border border-slate-200 dark:border-gray-700">
                            <input
                                type="text"
                                placeholder="New Region Name"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                className="flex-grow w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <button onClick={handleCreateRegion} className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm transition-colors">
                                Create Region
                            </button>
                        </div>
                        <ul className="divide-y divide-slate-200 dark:divide-gray-700 border border-slate-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {regions.map(r => (
                                <li key={r.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <span className="font-medium text-slate-800 dark:text-gray-200">{r.name}</span>
                                    <button onClick={() => handleDeleteRegion(r.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                            {regions.length === 0 && <li className="p-8 text-center text-slate-500 dark:text-gray-500 bg-slate-50/50 dark:bg-gray-900/20 italic">No regions exist</li>}
                        </ul>
                    </div>
                )}

                {activeTab === 'branches' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-2 items-center bg-slate-50 dark:bg-gray-900/30 p-4 rounded-lg border border-slate-200 dark:border-gray-700">
                            <input
                                type="text"
                                placeholder="Branch Name"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                className="flex-[2] w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <input
                                type="text"
                                placeholder="Code (e.g. LAX)"
                                maxLength={3}
                                value={newBranchDesignation}
                                onChange={(e) => setNewBranchDesignation(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                                className="flex-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 font-mono text-center tracking-widest"
                            />
                            <select
                                value={selectedRegionForBranch}
                                onChange={(e) => setSelectedRegionForBranch(e.target.value)}
                                className="flex-[1.5] w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                            >
                                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <button onClick={handleCreateBranch} className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm transition-colors" disabled={!selectedRegionForBranch}>
                                Create Branch
                            </button>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-gray-900/10 rounded-lg">
                            <span className="text-sm font-medium text-slate-700 dark:text-gray-300">Bulk Import via CSV:</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCsvBranchUpload}
                                className="text-sm text-slate-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-900/30 dark:file:text-sky-400"
                            />
                            <p className="text-xs text-slate-400 dark:text-gray-500 ml-2">(Format: Name, Designation, RegionName)</p>
                        </div>
                        <ul className="divide-y divide-slate-200 dark:divide-gray-700 border border-slate-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            {branches.map(b => (
                                <li key={b.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 flex items-center justify-center bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-bold rounded-lg font-mono tracking-tighter shadow-inner">
                                            {b.designation}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-800 dark:text-gray-200">{b.name}</div>
                                            <div className="text-sm text-slate-500 dark:text-gray-400">Region: <span className="text-slate-700 dark:text-gray-300">{regions.find(r => r.id === b.regionId)?.name || 'Unknown'}</span></div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteBranch(b.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                            {branches.length === 0 && <li className="p-8 text-center text-slate-500 dark:text-gray-500 bg-slate-50/50 dark:bg-gray-900/20 italic">No branches exist</li>}
                        </ul>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="overflow-x-auto custom-scrollbar border border-slate-200 dark:border-gray-700 rounded-lg">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                                <thead className="bg-slate-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-slate-200 dark:divide-gray-700">
                                    {allUsers.map(u => (
                                        <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{u.firstName} {u.lastName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-gray-400">{u.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <select
                                                    defaultValue={u.role || UserRole.AR_SPECIALIST}
                                                    onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as UserRole)}
                                                    className="p-1 border border-slate-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                                                >
                                                    {Object.values(UserRole).map(role => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 cursor-pointer font-bold" onClick={() => handleOpenAssignmentModal(u)}>
                                                Edit Assignments
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Assignment Modal */}
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-gray-700">
                            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Assign Domains to {editingUser.firstName}</h3>
                                <button onClick={() => setEditingUser(null)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-8">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-sky-500 rounded-full"></span>
                                        Regions
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {regions.map(r => (
                                            <label key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                                                <input type="checkbox" checked={userAssignedRegions.includes(r.id)} onChange={() => handleToggleRegion(r.id)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 bg-white dark:bg-gray-700" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white">{r.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                        Branches
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {branches.map(b => (
                                            <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group">
                                                <input type="checkbox" checked={userAssignedBranches.includes(b.id)} onChange={() => handleToggleBranch(b.id)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 bg-white dark:bg-gray-700" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white">{b.name}</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-gray-500 tracking-tight uppercase font-bold">{regions.find(r => r.id === b.regionId)?.name}</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 border-t dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/20 flex justify-end gap-3">
                                <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 border border-slate-300 dark:border-gray-600 rounded-lg text-slate-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 text-sm font-bold transition-all shadow-sm">Cancel</button>
                                <button onClick={handleSaveAssignments} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-bold shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Save Assignments</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
};

export default AdminPanel;
