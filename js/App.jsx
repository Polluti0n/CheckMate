import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import * as firestoreService from './services/firestoreService';
import { CheckStatus } from './types';
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
const App = () => {
    const { user, loading } = useAuth();
    const [checks, setChecks] = useState([]);
    const [flags, setFlags] = useState([]);
    const [batches, setBatches] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedCheck, setSelectedCheck] = useState(null);
    const [currentView, setCurrentView] = useState('KANBAN');
    const [expandedStatus, setExpandedStatus] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = useState(null);
    // FIX: Add preferences state and handlers
    const [preferences, savePreferences] = usePreferences();
    const [sortConfig, setSortConfig] = useState({
        [CheckStatus.RECEIVED]: undefined,
        [CheckStatus.CONFIRMING_DETAILS]: undefined,
        [CheckStatus.QUEUED]: undefined,
        [CheckStatus.COMPLETE]: undefined,
        [CheckStatus.ARCHIVED]: undefined,
    });
    const [selectedCheckIds, setSelectedCheckIds] = useState([]);
    const [multiSelectColumns, setMultiSelectColumns] = useState([]);
    const [themePickerTarget, setThemePickerTarget] = useState(null);
    const currentUser = useMemo(() => {
        if (!user)
            return null;
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
    const handleSelectCheck = useCallback((check) => {
        setSelectedCheck(check);
        setActiveModal('VIEW_CHECK');
    }, []);
    const handleCloseModal = useCallback(() => {
        setActiveModal(null);
        setSelectedCheck(null);
        setThemePickerTarget(null);
    }, []);
    const handleAddCheck = useCallback((newCheckData) => {
        if (!currentUser)
            return;
        const initialLog = {
            user: currentUser.name,
            field: 'Check Created',
            oldValue: 'N/A',
            newValue: `Amount: $${newCheckData.amount.toFixed(2)}`,
        };
        const newCheck = {
            ...newCheckData,
            createdAt: new Date().toISOString(), // This will be replaced by serverTimestamp
            comments: [],
            auditTrail: [], // Firestore will add the log
            flags: [],
        };
        firestoreService.addCheck(newCheck, initialLog);
    }, [currentUser]);
    const handleUpdateCheck = useCallback((updatedCheck, log) => {
        if (!currentUser)
            return;
        const { id, ...updateData } = updatedCheck;
        firestoreService.updateCheck(id, updateData, log);
        setSelectedCheck(updatedCheck); // Optimistic update for modal
    }, [currentUser]);
    const handleDeleteCheck = useCallback((checkId) => {
        firestoreService.deleteCheck(checkId);
        handleCloseModal();
    }, [handleCloseModal]);
    const handleMoveCheck = useCallback((checkId, newStatus, targetIndex) => {
        // NOTE: targetIndex is ignored as we don't persist order in Firestore.
        const idsToMove = selectedCheckIds.length > 0 ? selectedCheckIds : [checkId];
        if (!currentUser)
            return;
        idsToMove.forEach(id => {
            const check = checks.find(c => c.id === id);
            if (!check || check.status === newStatus)
                return;
            const log = {
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
    const handleAddComment = useCallback((checkId, commentText) => {
        if (!currentUser)
            return;
        const newComment = {
            author: currentUser.name,
            text: commentText,
        };
        firestoreService.addComment(checkId, newComment);
    }, [currentUser]);
    const handleToggleFlag = useCallback((checkId, flagId) => {
        if (!currentUser)
            return;
        const check = checks.find(c => c.id === checkId);
        const flag = flags.find(f => f.id === flagId);
        if (!check || !flag)
            return;
        const isAdding = !check.flags.includes(flagId);
        const log = {
            user: currentUser.name,
            field: isAdding ? 'Flag Added' : 'Flag Removed',
            oldValue: isAdding ? 'N/A' : flag.name,
            newValue: isAdding ? flag.name : 'N/A',
        };
        firestoreService.toggleFlag(checkId, flagId, isAdding, log);
    }, [currentUser, checks, flags]);
    const handleProcessBatch = (checkIds, trackingNumber) => {
        firestoreService.processBatch(checkIds, trackingNumber);
    };
    const handleSort = (status, key) => {
        const currentSort = sortConfig[status];
        const newDirection = currentSort && currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
        setSortConfig(prev => ({ ...prev, [status]: { key, direction: newDirection } }));
    };
    const handleToggleSelection = (checkId) => {
        setSelectedCheckIds(prev => prev.includes(checkId) ? prev.filter(id => id !== checkId) : [...prev, checkId]);
    };
    const handleSelectAllInColumn = (status) => {
        const checkIdsInColumn = checks.filter(c => c.status === status).map(c => c.id);
        const allSelected = checkIdsInColumn.every(id => selectedCheckIds.includes(id));
        if (allSelected) {
            setSelectedCheckIds(prev => prev.filter(id => !checkIdsInColumn.includes(id)));
        }
        else {
            setSelectedCheckIds(prev => [...new Set([...prev, ...checkIdsInColumn])]);
        }
    };
    const handleToggleColumnMultiSelect = (status) => {
        setMultiSelectColumns(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };
    const handleOpenThemePicker = (target) => {
        setThemePickerTarget(target);
        setActiveModal('THEME_PICKER');
    };
    const handleSetTheme = (target, themeId) => {
        if (target === 'ARCHIVE') {
            savePreferences({ ...preferences, archiveTheme: themeId });
        }
        else {
            savePreferences({ ...preferences, columnThemes: { ...preferences.columnThemes, [target]: themeId } });
        }
    };
    const handleToggleDisplayOption = (status, option) => {
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
            return <ExpandedColumnView status={expandedStatus} checks={filteredChecks.filter(c => c.status === expandedStatus)} flags={flags} onSelectCheck={handleSelectCheck} onClose={() => setExpandedStatus(null)}/>;
        }
        switch (currentView) {
            case 'ARCHIVE':
                return <ArchiveView checks={filteredChecks.filter(c => c.status === CheckStatus.ARCHIVED)} onSelectCheck={handleSelectCheck} onBack={() => setCurrentView('KANBAN')} searchTerm={searchTerm} visibleColumns={preferences.visibleArchiveColumns} onVisibleColumnsChange={(newColumns) => savePreferences({ ...preferences, visibleArchiveColumns: newColumns })} columnWidths={preferences.archiveColumnWidths} onColumnWidthsChange={(newWidths) => savePreferences({ ...preferences, archiveColumnWidths: newWidths })} archiveTheme={preferences.archiveTheme} themes={THEMES} onOpenThemePicker={() => handleOpenThemePicker('ARCHIVE')}/>;
            case 'BATCH_HISTORY':
                return <BatchHistoryView batches={batches} checks={checks} onSelectCheck={handleSelectCheck} onBack={() => setCurrentView('KANBAN')}/>;
            case 'KANBAN':
            default:
                return <KanbanBoard checks={filteredChecks.filter(c => c.status !== CheckStatus.ARCHIVED)} flags={flags} themes={THEMES} onSelectCheck={handleSelectCheck} onMoveCheck={handleMoveCheck} onExpandColumn={setExpandedStatus} sortConfig={sortConfig} onSort={handleSort} onSelectAllInColumn={handleSelectAllInColumn} selectedCheckIds={selectedCheckIds} onToggleSelection={handleToggleSelection} columnDisplayOptions={preferences.columnDisplayOptions} columnThemes={preferences.columnThemes} onToggleDisplayOption={handleToggleDisplayOption} onOpenThemePicker={handleOpenThemePicker} multiSelectColumns={multiSelectColumns} onToggleColumnMultiSelect={handleToggleColumnMultiSelect} cardLayout={preferences.cardLayout}/>;
        }
    };
    if (loading) {
        return <SplashScreen />;
    }
    if (!user) {
        return <Login />;
    }
    return (<div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Header onAddCheck={() => setActiveModal('ADD_CHECK')} onBatching={() => setActiveModal('BATCHING')} onViewArchive={() => setCurrentView('ARCHIVE')} onViewBatchHistory={() => setCurrentView('BATCH_HISTORY')} searchTerm={searchTerm} onSearchChange={setSearchTerm} activeCategory={activeCategoryFilter} onCategoryFilterChange={setActiveCategoryFilter} userEmail={user.email} onOpenPreferences={() => setActiveModal('PREFERENCES')}/>
            
            <div className="flex-grow flex flex-col pb-16"> {/* Add padding-bottom for action bar */}
                {renderView()}
            </div>
            
            {selectedCheckIds.length > 0 && (<SelectionActionBar selectedCount={selectedCheckIds.length} onCancel={() => setSelectedCheckIds([])} onMove={(newStatus) => handleMoveCheck('', newStatus, 0)} // checkId and index are not used when moving selections
        />)}

            {activeModal === 'ADD_CHECK' && (<AddCheckWizard isOpen={true} onClose={handleCloseModal} onAddCheck={handleAddCheck}/>)}
            {activeModal === 'VIEW_CHECK' && (<CheckDetailModal check={selectedCheck} flags={flags} onClose={handleCloseModal} onUpdateCheck={handleUpdateCheck} onAddComment={handleAddComment} onToggleFlag={handleToggleFlag} onOpenFlagManager={() => setActiveModal('MANAGE_FLAGS')} onDeleteCheck={handleDeleteCheck} currentUser={currentUser}/>)}
            {activeModal === 'MANAGE_FLAGS' && (<FlagManager isOpen={true} flags={flags} onClose={() => {
                if (selectedCheck)
                    setActiveModal('VIEW_CHECK');
                else
                    handleCloseModal();
            }} onUpdateFlags={firestoreService.syncFlags}/>)}
            {activeModal === 'BATCHING' && (<ProcessBatchModal isOpen={true} checks={checks} onClose={handleCloseModal} onProcessBatch={handleProcessBatch}/>)}
            {activeModal === 'THEME_PICKER' && (<ThemePickerModal isOpen={true} onClose={handleCloseModal} themes={THEMES} onSetTheme={handleSetTheme} target={themePickerTarget}/>)}
             {activeModal === 'PREFERENCES' && (<PreferencesModal isOpen={true} onClose={handleCloseModal} currentPreferences={preferences} onSave={savePreferences}/>)}
        </div>);
};
export default App;
