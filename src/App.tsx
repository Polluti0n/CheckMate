import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { auth } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import * as firestoreService from './services/firestoreService';
import { Check, Flag, Comment, AuditLog, CheckStatus, CheckCategory, Batch, UserProfile } from './types';
import { useUserProfiles } from './hooks/useUserProfiles';
import { usePreferences } from './hooks/usePreferences';
import { THEMES } from './constants';

import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import KanbanBoard from './components/CheckDashboard';
import AddCheckWizard from './components/AddCheckWizard';
import CheckDetailModal from './components/CheckDetailModal';
import FlagManager from './components/FlagManager';
import ProcessBatchModal from './components/BatchingModal';
import ArchiveView from './components/ArchiveView';
import BatchHistoryView from './components/BatchHistoryView';
import ExpandedColumnView from './components/ExpandedColumnView';
import ProfilePage from './components/ProfilePage';
import SelectionActionBar from './components/SelectionActionBar';
import ThemePickerModal from './components/ThemePickerModal';
import PreferencesModal from './components/PreferencesModal';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const [checks, setChecks] = useState<Check[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<CheckCategory | null>(null);

    const [preferences, setPreferences] = usePreferences();
    const [sortConfig, setSortConfig] = useState<Record<CheckStatus, { key: keyof Check; direction: 'asc' | 'desc' } | undefined>>({} as any);
    const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
    const [multiSelectColumns, setMultiSelectColumns] = useState<CheckStatus[]>([]);
    const [themePickerTarget, setThemePickerTarget] = useState<CheckStatus | 'ARCHIVE' | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const backgroundLocation = location.state?.backgroundLocation;

    const uidsToFetch = useMemo(() => {
        const ids = new Set<string>();
        if (user) ids.add(user.uid);
        checks.forEach(check => {
            check.comments.forEach(c => c.authorUid && ids.add(c.authorUid));
            check.auditTrail.forEach(a => a.userUid && ids.add(a.userUid));
        });
        const rawIds = Array.from(ids);
        return rawIds.filter((id): id is string => !!id);
    }, [checks, user]);

    const { profiles, loading: profilesLoading } = useUserProfiles(uidsToFetch);
    const currentUserProfile = useMemo(() => profiles.find(p => p.uid === user?.uid), [profiles, user]);

    useEffect(() => {
        if (user) {
            const unsubscribeChecks = firestoreService.onChecksSnapshot(setChecks);
            const unsubscribeFlags = firestoreService.onFlagsSnapshot(setFlags);
            const unsubscribeBatches = firestoreService.onBatchesSnapshot(setBatches);
            return () => { unsubscribeChecks(); unsubscribeFlags(); unsubscribeBatches(); };
        }
    }, [user]);
    
    useEffect(() => {
        if (checks.length > 0 && currentUserProfile) {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            checks.forEach(check => {
                if (check.status === CheckStatus.COMPLETE && check.statusUpdatedAt && new Date(check.statusUpdatedAt) < tenDaysAgo) {
                    firestoreService.archiveCheck(check.id, check.status, currentUserProfile);
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checks.length, currentUserProfile]);

    const filteredChecks = useMemo(() => {
        return checks.filter(check => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchLower === '' || 
                check.payor.toLowerCase().includes(searchLower) ||
                check.checkNumber.toLowerCase().includes(searchLower) ||
                (check.memo && check.memo.toLowerCase().includes(searchLower));
            const matchesCategory = !activeCategoryFilter || check.category === activeCategoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [checks, searchTerm, activeCategoryFilter]);

    const handleCloseModal = useCallback(() => navigate(backgroundLocation || '/', { replace: true }), [navigate, backgroundLocation]);
    const handleOpenModal = (modal: string) => navigate(`?modal=${modal}`, { state: { backgroundLocation: location } });

    const handleAddCheck = useCallback((newCheckData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>) => {
        if (!currentUserProfile) return;
        firestoreService.addCheck(newCheckData, currentUserProfile);
    }, [currentUserProfile]);
    
    const handleUpdateCheck = useCallback((updatedCheck: Check, log: Omit<AuditLog, 'id' | 'timestamp' | 'userUid' | 'userName' | 'userPhotoURL'>) => {
        if (!currentUserProfile) return;
        const { id, ...updateData } = updatedCheck;
        firestoreService.updateCheck(id, updateData, log, currentUserProfile);
    }, [currentUserProfile]);

    const handleDeleteCheck = useCallback((checkId: string) => {
        firestoreService.deleteCheck(checkId);
        handleCloseModal();
    }, [handleCloseModal]);
    
    const handleMoveCheck = useCallback((checkId: string, newStatus: CheckStatus) => {
        if (!currentUserProfile) return;
        const check = checks.find(c => c.id === checkId);
        if (check && check.status !== newStatus) {
            firestoreService.updateCheckStatus(checkId, check.status, newStatus, currentUserProfile);
        }
    }, [currentUserProfile, checks]);
    
    const handleAddComment = useCallback((checkId: string, commentText: string) => {
        if (!currentUserProfile) return;
        firestoreService.addComment(checkId, commentText, currentUserProfile);
    }, [currentUserProfile]);
    
    const handleToggleFlag = useCallback((checkId: string, flagId: string) => {
        if (!currentUserProfile) return;
        const check = checks.find(c => c.id === checkId);
        const flag = flags.find(f => f.id === flagId);
        if (!check || !flag) return;
        firestoreService.toggleFlag(checkId, flagId, !check.flags.includes(flagId), flag.name, currentUserProfile);
    }, [currentUserProfile, checks, flags]);

    const handleProcessBatch = (checkIds: string[], trackingNumber: string) => {
        if (!currentUserProfile) return;
        firestoreService.processBatch(checkIds, trackingNumber, currentUserProfile);
    };

    const handleSort = useCallback((status: CheckStatus, key: keyof Check) => {
        setSortConfig(prev => {
            const currentSort = prev[status];
            const direction = currentSort && currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
            return { ...prev, [status]: { key, direction } };
        });
    }, []);

    const handleToggleSelection = useCallback((checkId: string) => {
        setSelectedCheckIds(prev => prev.includes(checkId) ? prev.filter(id => id !== checkId) : [...prev, checkId]);
    }, []);

    const handleSelectAllInColumn = useCallback((status: CheckStatus) => {
        const checkIdsInColumn = checks.filter(c => c.status === status).map(c => c.id);
        const allCurrentlySelected = checkIdsInColumn.length > 0 && checkIdsInColumn.every(id => selectedCheckIds.includes(id));
        if (allCurrentlySelected) {
            setSelectedCheckIds(prev => prev.filter(id => !checkIdsInColumn.includes(id)));
        } else {
            setSelectedCheckIds(prev => [...new Set([...prev, ...checkIdsInColumn])]);
        }
    }, [checks, selectedCheckIds]);

    const handleToggleColumnMultiSelect = useCallback((status: CheckStatus) => {
        setMultiSelectColumns(prev => {
            if (prev.includes(status)) {
                const idsInColumn = checks.filter(c => c.status === status).map(c => c.id);
                setSelectedCheckIds(currentIds => currentIds.filter(id => !idsInColumn.includes(id)));
                return prev.filter(s => s !== status);
            }
            return [...prev, status];
        });
    }, [checks]);

    const handleToggleDisplayOption = useCallback((status: CheckStatus, option: 'showCount' | 'showTotal') => {
        const newPrefs = { ...preferences };
        newPrefs.columnDisplayOptions[status][option] = !newPrefs.columnDisplayOptions[status][option];
        setPreferences(newPrefs);
    }, [preferences, setPreferences]);

    const handleSetTheme = useCallback((target: CheckStatus | 'ARCHIVE', themeId: string) => {
        const newPrefs = { ...preferences };
        if (target === 'ARCHIVE') {
            newPrefs.archiveTheme = themeId;
        } else {
            newPrefs.columnThemes[target] = themeId;
        }
        setPreferences(newPrefs);
    }, [preferences, setPreferences]);

    const handleBulkUpdate = (newStatus: CheckStatus) => {
        if (!currentUserProfile) return;
        const checksToUpdate = checks.filter(c => selectedCheckIds.includes(c.id));
        firestoreService.bulkUpdateChecksStatus(checksToUpdate, newStatus, currentUserProfile);
        setSelectedCheckIds([]);
        setMultiSelectColumns([]);
    };
    
    if (loading || (user && profilesLoading)) return <SplashScreen />;
    if (!user) return <Login />;
    if (!currentUserProfile) return <SplashScreen />;

    const modalParam = new URLSearchParams(location.search).get('modal');

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Header
                onSearchChange={setSearchTerm}
                activeCategory={activeCategoryFilter}
                onCategoryFilterChange={setActiveCategoryFilter}
                userProfile={currentUserProfile}
            />
            
            <div className="flex-grow flex flex-col">
                 <Routes location={backgroundLocation || location}>
                    <Route path="/" element={
                        <KanbanBoard
                            checks={filteredChecks.filter(c => c.status !== CheckStatus.ARCHIVED)}
                            flags={flags}
                            themes={THEMES}
                            onMoveCheck={handleMoveCheck}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            onSelectAllInColumn={handleSelectAllInColumn}
                            selectedCheckIds={selectedCheckIds}
                            onToggleSelection={handleToggleSelection}
                            columnDisplayOptions={preferences.columnDisplayOptions}
                            columnThemes={preferences.columnThemes}
                            onToggleDisplayOption={handleToggleDisplayOption}
                            onOpenThemePicker={setThemePickerTarget}
                            multiSelectColumns={multiSelectColumns}
                            onToggleColumnMultiSelect={handleToggleColumnMultiSelect}
                            cardLayout={preferences.cardLayout}
                        />
                    } />
                    <Route path="/archive" element={<ArchiveView 
                        checks={filteredChecks.filter(c => c.status === CheckStatus.ARCHIVED)} 
                        onUnarchiveCheck={(check) => firestoreService.unarchiveCheck(check.id, check.statusBeforeArchive, currentUserProfile)}
                        searchTerm={searchTerm}
                        visibleColumns={preferences.visibleArchiveColumns}
                        onVisibleColumnsChange={(newColumns) => setPreferences({...preferences, visibleArchiveColumns: newColumns})}
                        columnWidths={preferences.archiveColumnWidths}
                        onColumnWidthsChange={(newWidths) => setPreferences({...preferences, archiveColumnWidths: newWidths})}
                        archiveTheme={preferences.archiveTheme}
                        themes={THEMES}
                        onOpenThemePicker={() => setThemePickerTarget('ARCHIVE')}
                    />} />
                    <Route path="/batches" element={<BatchHistoryView batches={batches} checks={checks} />} />
                    <Route path="/profile" element={<ProfilePage userProfile={currentUserProfile} onUpdateProfile={firestoreService.updateUserProfile} />} />
                    <Route path="/column/:status" element={<ExpandedColumnView allChecks={filteredChecks} allFlags={flags} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>

            {backgroundLocation && (
                <Routes>
                    <Route path="/check/:checkId" element={
                        <CheckDetailModal
                            allChecks={checks} allFlags={flags} profiles={profiles}
                            onClose={handleCloseModal} onUpdateCheck={handleUpdateCheck} onAddComment={handleAddComment}
                            onToggleFlag={handleToggleFlag} onOpenFlagManager={() => handleOpenModal('manage-flags')}
                            onDeleteCheck={handleDeleteCheck} currentUser={currentUserProfile}
                        />
                    }/>
                </Routes>
            )}
            
            {modalParam === 'add-check' && <AddCheckWizard isOpen={true} onClose={handleCloseModal} onAddCheck={handleAddCheck} />}
            {modalParam === 'batching' && <ProcessBatchModal isOpen={true} checks={checks} onClose={handleCloseModal} onProcessBatch={handleProcessBatch} />}
            {modalParam === 'manage-flags' && <FlagManager isOpen={true} flags={flags} onClose={handleCloseModal} onUpdateFlags={firestoreService.syncFlags} />}
            {modalParam === 'preferences' && <PreferencesModal isOpen={true} onClose={handleCloseModal} currentPreferences={preferences} onSave={setPreferences} />}

            {themePickerTarget && (
                <ThemePickerModal
                    isOpen={!!themePickerTarget}
                    onClose={() => setThemePickerTarget(null)}
                    themes={THEMES}
                    onSetTheme={handleSetTheme}
                    target={themePickerTarget}
                />
            )}

            {selectedCheckIds.length > 0 && (
                <SelectionActionBar
                    selectedCount={selectedCheckIds.length}
                    onCancel={() => {
                        setSelectedCheckIds([]);
                        setMultiSelectColumns([]);
                    }}
                    onMove={handleBulkUpdate}
                />
            )}
        </div>
    );
};

export default App;
