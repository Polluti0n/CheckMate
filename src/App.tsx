
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { auth } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import * as firestoreService from './services/firestoreService';
import { Check, Flag, Comment, AuditLog, CheckStatus, CheckCategory, Batch, CheckField, CardLayoutZone, Theme, UserPreferences } from './types';
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
import SelectionActionBar from './components/SelectionActionBar';
import ThemePickerModal from './components/ThemePickerModal';
import PreferencesModal from './components/PreferencesModal';


type View = 'KANBAN' | 'ARCHIVE' | 'BATCH_HISTORY';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const [checks, setChecks] = useState<Check[]>([]);
    const [flags, setFlags] = useState<Flag[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
    const [currentView, setCurrentView] = useState<View>('KANBAN');
    const [expandedStatus, setExpandedStatus] = useState<CheckStatus | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<CheckCategory | null>(null);
    
    // FIX: Add preferences state and handlers
    const [preferences, savePreferences] = usePreferences();
    const [sortConfig, setSortConfig] = useState<Record<CheckStatus, { key: keyof Check; direction: 'asc' | 'desc' } | undefined>>({
        [CheckStatus.RECEIVED]: undefined,
        [CheckStatus.CONFIRMING_DETAILS]: undefined,
        [CheckStatus.QUEUED]: undefined,
        [CheckStatus.COMPLETE]: undefined,
        [CheckStatus.ARCHIVED]: undefined,
    });
    const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
    const [multiSelectColumns, setMultiSelectColumns] = useState<CheckStatus[]>([]);
    const [themePickerTarget, setThemePickerTarget] = useState<CheckStatus | 'ARCHIVE' | null>(null);

    const currentUser = useMemo(() => {
        if (!user) return null;
        return {
            name: user.displayName || user.email || 'User',
            uid: user.uid,
        };
    }, [user]);

    // Set up Firestore listeners when user is logged in
    useEffect(() => {
        if (user) {
            const unsubscribeChecks = firestoreService.onChecksSnapshot(setChecks);
            const unsubscribeFlags = firestoreService.onFlagsSnapshot(setFlags);
            const unsubscribeBatches = firestoreService.onBatchesSnapshot(setBatches);

            // Cleanup function
            return () => {
                unsubscribeChecks();
                unsubscribeFlags();
                unsubscribeBatches();
            };
        }
    }, [user]);
    
    // Auto-archive logic (runs once when checks data is first populated)
    useEffect(() => {
        if (checks.length > 0) {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            checks.forEach(check => {
                if (check.status === CheckStatus.COMPLETE && check.statusUpdatedAt && new Date(check.statusUpdatedAt) < tenDaysAgo) {
                    firestoreService.updateCheck(check.id, { status: CheckStatus.ARCHIVED }, {
                        user: 'System',
                        field: 'status',
                        oldValue: CheckStatus.COMPLETE,
                        newValue: CheckStatus.ARCHIVED
                    });
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checks.length > 0]);


    const filteredChecks = useMemo(() => {
        return checks.filter(check => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchLower === '' || 
                check.payor.toLowerCase().includes(searchLower) ||
                check.checkNumber.toLowerCase().includes(searchLower) ||
                check.memo.toLowerCase().includes(searchLower);

            const matchesCategory = !activeCategoryFilter || check.category === activeCategoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [checks, searchTerm, activeCategoryFilter]);


    const handleSelectCheck = useCallback((check: Check) => {
        setSelectedCheck(check);
        setActiveModal('VIEW_CHECK');
    }, []);

    const handleCloseModal = useCallback(() => {
        setActiveModal(null);
        setSelectedCheck(null);
        setThemePickerTarget(null);
    }, []);

    const handleAddCheck = useCallback((newCheckData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>) => {
        if (!currentUser) return;
        const initialLog: Omit<AuditLog, 'id' | 'timestamp'> = {
            user: currentUser.name,
            field: 'Check Created',
            oldValue: 'N/A',
            newValue: `Amount: $${newCheckData.amount.toFixed(2)}`,
        };

        const newCheck: Omit<Check, 'id'> = {
            ...newCheckData,
            createdAt: new Date().toISOString(), // This will be replaced by serverTimestamp
            comments: [],
            auditTrail: [], // Firestore will add the log
            flags: [],
        };
        firestoreService.addCheck(newCheck, initialLog);
    }, [currentUser]);
    
    const handleUpdateCheck = useCallback((updatedCheck: Check, log: Omit<AuditLog, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        const { id, ...updateData } = updatedCheck;
        
        firestoreService.updateCheck(id, updateData, log);
        setSelectedCheck(updatedCheck); // Optimistic update for modal
    }, [currentUser]);

    const handleDeleteCheck = useCallback((checkId: string) => {
        firestoreService.deleteCheck(checkId);
        handleCloseModal();
    }, [handleCloseModal]);
    
    const handleMoveCheck = useCallback((checkId: string, newStatus: CheckStatus, targetIndex: number) => {
        // NOTE: targetIndex is ignored as we don't persist order in Firestore.
        const idsToMove = selectedCheckIds.length > 0 ? selectedCheckIds : [checkId];

        if (!currentUser) return;

        idsToMove.forEach(id => {
            const check = checks.find(c => c.id === id);
            if (!check || check.status === newStatus) return;

            const log: Omit<AuditLog, 'id' | 'timestamp'> = {
                user: currentUser.name,
                field: 'status',
                oldValue: check.status,
                newValue: newStatus,
            };

            firestoreService.updateCheck(id, { status: newStatus }, log);
        });

        if (selectedCheckIds.length > 0) {
            setSelectedCheckIds([]);
            setMultiSelectColumns([]);
        }
    }, [currentUser, checks, selectedCheckIds]);


    const handleAddComment = useCallback((checkId: string, commentText: string) => {
        if (!currentUser) return;
        const newComment: Omit<Comment, 'id' | 'timestamp'> = {
            author: currentUser.name,
            text: commentText,
        };
        firestoreService.addComment(checkId, newComment);
    }, [currentUser]);
    
    const handleToggleFlag = useCallback((checkId: string, flagId: string) => {
        if (!currentUser) return;
        const check = checks.find(c => c.id === checkId);
        const flag = flags.find(f => f.id === flagId);
        if (!check || !flag) return;

        const isAdding = !check.flags.includes(flagId);
        const log: Omit<AuditLog, 'id' | 'timestamp'> = {
            user: currentUser.name,
            field: isAdding ? 'Flag Added' : 'Flag Removed',
            oldValue: isAdding ? 'N/A' : flag.name,
            newValue: isAdding ? flag.name : 'N/A',
        };

        firestoreService.toggleFlag(checkId, flagId, isAdding, log);
    }, [currentUser, checks, flags]);

    const handleProcessBatch = (checkIds: string[], trackingNumber: string) => {
        firestoreService.processBatch(checkIds, trackingNumber);
    };

    const handleSort = (status: CheckStatus, key: keyof Check) => {
        const currentSort = sortConfig[status];
        const newDirection = currentSort && currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig(prev => ({ ...prev, [status]: { key, direction: newDirection } }));
    };

    const handleToggleSelection = (checkId: string) => {
        setSelectedCheckIds(prev => prev.includes(checkId) ? prev.filter(id => id !== checkId) : [...prev, checkId]);
    };
    
    const handleSelectAllInColumn = (status: CheckStatus) => {
        const checkIdsInColumn = checks.filter(c => c.status === status).map(c => c.id);
        const allSelected = checkIdsInColumn.every(id => selectedCheckIds.includes(id));
        if (allSelected) {
            setSelectedCheckIds(prev => prev.filter(id => !checkIdsInColumn.includes(id)));
        } else {
            setSelectedCheckIds(prev => [...new Set([...prev, ...checkIdsInColumn])]);
        }
    };
    
    const handleToggleColumnMultiSelect = (status: CheckStatus) => {
        setMultiSelectColumns(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };
    
    const handleOpenThemePicker = (target: CheckStatus | 'ARCHIVE') => {
        setThemePickerTarget(target);
        setActiveModal('THEME_PICKER');
    };
    
    const handleSetTheme = (target: CheckStatus | 'ARCHIVE', themeId: string) => {
        if (target === 'ARCHIVE') {
            savePreferences({ ...preferences, archiveTheme: themeId });
        } else {
            savePreferences({ ...preferences, columnThemes: { ...preferences.columnThemes, [target]: themeId } });
        }
    };
    
    const handleToggleDisplayOption = (status: CheckStatus, option: 'showCount' | 'showTotal') => {
        savePreferences({
            ...preferences,
            columnDisplayOptions: {
                ...preferences.columnDisplayOptions,
                [status]: {
                    ...preferences.columnDisplayOptions[status],
                    [option]: !preferences.columnDisplayOptions[status][option]
                }
            }
        });
    };

    const renderView = () => {
        if (expandedStatus) {
            return <ExpandedColumnView
                status={expandedStatus}
                checks={filteredChecks.filter(c => c.status === expandedStatus)}
                flags={flags}
                onSelectCheck={handleSelectCheck}
                onClose={() => setExpandedStatus(null)}
            />;
        }

        switch (currentView) {
            case 'ARCHIVE':
                return <ArchiveView 
                    checks={filteredChecks.filter(c => c.status === CheckStatus.ARCHIVED)} 
                    onSelectCheck={handleSelectCheck} 
                    onBack={() => setCurrentView('KANBAN')} 
                    searchTerm={searchTerm}
                    visibleColumns={preferences.visibleArchiveColumns}
                    onVisibleColumnsChange={(newColumns) => savePreferences({...preferences, visibleArchiveColumns: newColumns})}
                    columnWidths={preferences.archiveColumnWidths}
                    onColumnWidthsChange={(newWidths) => savePreferences({...preferences, archiveColumnWidths: newWidths})}
                    archiveTheme={preferences.archiveTheme}
                    themes={THEMES}
                    onOpenThemePicker={() => handleOpenThemePicker('ARCHIVE')}
                />;
            case 'BATCH_HISTORY':
                return <BatchHistoryView batches={batches} checks={checks} onSelectCheck={handleSelectCheck} onBack={() => setCurrentView('KANBAN')} />;
            case 'KANBAN':
            default:
                return <KanbanBoard
                    checks={filteredChecks.filter(c => c.status !== CheckStatus.ARCHIVED)}
                    flags={flags}
                    themes={THEMES}
                    onSelectCheck={handleSelectCheck}
                    onMoveCheck={handleMoveCheck}
                    onExpandColumn={setExpandedStatus}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onSelectAllInColumn={handleSelectAllInColumn}
                    selectedCheckIds={selectedCheckIds}
                    onToggleSelection={handleToggleSelection}
                    columnDisplayOptions={preferences.columnDisplayOptions}
                    columnThemes={preferences.columnThemes}
                    onToggleDisplayOption={handleToggleDisplayOption}
                    onOpenThemePicker={handleOpenThemePicker}
                    multiSelectColumns={multiSelectColumns}
                    onToggleColumnMultiSelect={handleToggleColumnMultiSelect}
                    cardLayout={preferences.cardLayout}
                />;
        }
    }

    if (loading) {
        return <SplashScreen />;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Header
                onAddCheck={() => setActiveModal('ADD_CHECK')}
                onBatching={() => setActiveModal('BATCHING')}
                onViewArchive={() => setCurrentView('ARCHIVE')}
                onViewBatchHistory={() => setCurrentView('BATCH_HISTORY')}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeCategory={activeCategoryFilter}
                onCategoryFilterChange={setActiveCategoryFilter}
                userEmail={user.email}
                onOpenPreferences={() => setActiveModal('PREFERENCES')}
            />
            
            <div className="flex-grow flex flex-col pb-16"> {/* Add padding-bottom for action bar */}
                {renderView()}
            </div>
            
            {selectedCheckIds.length > 0 && (
                 <SelectionActionBar
                    selectedCount={selectedCheckIds.length}
                    onCancel={() => setSelectedCheckIds([])}
                    onMove={(newStatus) => handleMoveCheck('', newStatus, 0)} // checkId and index are not used when moving selections
                />
            )}

            {activeModal === 'ADD_CHECK' && (
                <AddCheckWizard
                    isOpen={true}
                    onClose={handleCloseModal}
                    onAddCheck={handleAddCheck}
                />
            )}
            {activeModal === 'VIEW_CHECK' && (
                <CheckDetailModal
                    check={selectedCheck}
                    flags={flags}
                    onClose={handleCloseModal}
                    onUpdateCheck={handleUpdateCheck}
                    onAddComment={handleAddComment}
                    onToggleFlag={handleToggleFlag}
                    onOpenFlagManager={() => setActiveModal('MANAGE_FLAGS')}
                    onDeleteCheck={handleDeleteCheck}
                    currentUser={currentUser}
                />
            )}
            {activeModal === 'MANAGE_FLAGS' && (
                <FlagManager
                    isOpen={true}
                    flags={flags}
                    onClose={() => {
                        if (selectedCheck) setActiveModal('VIEW_CHECK');
                        else handleCloseModal();
                    }}
                    onUpdateFlags={firestoreService.syncFlags}
                />
            )}
            {activeModal === 'BATCHING' && (
                <ProcessBatchModal
                    isOpen={true}
                    checks={checks}
                    onClose={handleCloseModal}
                    onProcessBatch={handleProcessBatch}
                />
            )}
            {activeModal === 'THEME_PICKER' && (
                <ThemePickerModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    themes={THEMES}
                    onSetTheme={handleSetTheme}
                    target={themePickerTarget}
                />
            )}
             {activeModal === 'PREFERENCES' && (
                <PreferencesModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    currentPreferences={preferences}
                    onSave={savePreferences}
                />
            )}
        </div>
    );
};

export default App;
