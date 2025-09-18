import React from 'react';
import { Routes, Route, Outlet, useNavigate, useParams } from 'react-router-dom';
import * as firestoreService from './services/firestoreService';

// Import all your components and types
import { THEMES } from './constants';
// FIX: Use named import for AddCheckWizard and its step components.
import { Check, CheckStatus, CurrentUser, UserPreferences, CheckField, CheckCategory } from './types';
import Header from './components/Header';
import KanbanBoard from './components/CheckDashboard';
import ArchiveView from './components/ArchiveView';
import BatchHistoryView from './components/BatchHistoryView';
import CheckDetailModal from './components/CheckDetailModal';
import FlagManager from './components/FlagManager';
import ProcessBatchModal from './components/BatchingModal';
import ThemePickerModal from './components/ThemePickerModal';
import PreferencesModal from './components/PreferencesModal';
import ExpandedColumnView from './components/ExpandedColumnView';
import SelectionActionBar from './components/SelectionActionBar';
import MainMenu from './components/MainMenu';
import {
    AddCheckWizard,
    CategoryStep,
    UploadStep,
    DetailsStep
} from './components/AddCheckWizard';

// Define a single, comprehensive type for all props passed from App.tsx
export interface AppState {
    currentUser: CurrentUser | null;
    userEmail: string | null;
    checks: Check[];
    flags: any[];
    batches: any[];
    filteredChecks: Check[];
    preferences: UserPreferences;
    savePreferences: (prefs: UserPreferences) => void;
    
    // State and Setters
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeCategoryFilter: any;
    setActiveCategoryFilter: (filter: any) => void;
    sortConfig: any;
    setSortConfig: (config: any) => void;
    selectedCheckIds: string[];
    setSelectedCheckIds: (ids: string[]) => void;
    isMultiSelectMode: boolean;
    setIsMultiSelectMode: (mode: boolean) => void;
    isMainMenuOpen: boolean;
    setIsMainMenuOpen: (isOpen: boolean) => void;
    expandedStatus: CheckStatus | null;
    setExpandedStatus: (status: CheckStatus | null) => void;
    
    // Actions
    actions: {
        handleAddCheck: (data: any) => void;
        handleUpdateCheck: (id: string, updates: any, log: any) => void;
        handleDeleteCheck: (id: string) => void;
        handleAddComment: (id: string, text: string) => void;
        handleToggleFlag: (checkId: string, flagId: string) => void;
        handleProcessBatch: (ids: string[], tracking: string) => void;
    };
    
    // Navigation
    handleSelectCheck: (check: Check) => void;
    handleCloseModal: () => void;
    
    // Misc handlers
    handleMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    handleToggleMultiSelect: () => void;
}

// A layout component to keep the header and action bar consistent across views
const MainLayout: React.FC<{ appState: AppState }> = ({ appState }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Header
                onOpenMainMenu={() => appState.setIsMainMenuOpen(true)}
                onAddCheck={() => navigate('/add-check')}
                onBatching={() => navigate('/batching')}
                searchTerm={appState.searchTerm}
                onSearchChange={appState.setSearchTerm}
                activeCategory={appState.activeCategoryFilter}
                onCategoryFilterChange={appState.setActiveCategoryFilter}
                userEmail={appState.userEmail}
                onOpenPreferences={() => navigate('/preferences')}
            />
             <MainMenu
                isOpen={appState.isMainMenuOpen}
                onClose={() => appState.setIsMainMenuOpen(false)}
                onNavigate={(path) => navigate(path)}
                onToggleMultiSelect={appState.handleToggleMultiSelect}
                isMultiSelectModeActive={appState.isMultiSelectMode}
                userEmail={appState.userEmail}
                activeCategory={appState.activeCategoryFilter}
                onCategoryFilterChange={appState.setActiveCategoryFilter}
            />
            <div className="flex-grow flex flex-col pb-16">
                <Outlet /> {/* Nested routes (views and modals) are rendered here */}
            </div>
            {appState.selectedCheckIds.length > 0 && (
                 <SelectionActionBar
                    selectedCount={appState.selectedCheckIds.length}
                    onCancel={() => {
                        appState.setSelectedCheckIds([]);
                        appState.setIsMultiSelectMode(false);
                    }}
                    onMove={(newStatus) => appState.handleMoveCheck('', newStatus, 9999)}
                />
            )}
        </div>
    );
};

// Wrapper components to get URL params and find the correct data
const CheckDetailWrapper: React.FC<{ appState: AppState }> = ({ appState }) => {
    const { checkId } = useParams<{ checkId: string }>();
    const navigate = useNavigate();
    const check = appState.filteredChecks.find(c => c.id === checkId);
    
    const onUpdate = (updatedCheck: Check, log: any) => {
        // Assumption: The log is generated inside the modal. The action only needs the ID and data.
        const { id, ...updates } = updatedCheck;
        appState.actions.handleUpdateCheck(id, updates, log);
    };

    return check ? (
        <CheckDetailModal
            check={check}
            flags={appState.flags}
            onClose={appState.handleCloseModal}
            onUpdateCheck={onUpdate}
            onAddComment={(...args) => appState.actions.handleAddComment(...args)}
            onToggleFlag={(...args) => appState.actions.handleToggleFlag(...args)}
            onOpenFlagManager={() => navigate(`/check/${checkId}/manage-flags`)}
            onDeleteCheck={() => appState.actions.handleDeleteCheck(check.id)}
            currentUser={appState.currentUser}
        />
    ) : null; // or a loading/not found component
};

const ExpandedColumnWrapper: React.FC<{ appState: AppState }> = ({ appState }) => {
    const { status } = useParams<{ status: CheckStatus }>();
    const navigate = useNavigate();
    const checksInColumn = appState.filteredChecks.filter(c => c.status === status);

    return status ? (
        <ExpandedColumnView
            status={status}
            checks={checksInColumn}
            flags={appState.flags}
            onSelectCheck={appState.handleSelectCheck}
            onClose={() => navigate('/')}
        />
    ) : null;
};

const ThemePickerWrapper: React.FC<{ appState: AppState }> = ({ appState }) => {
    const { target } = useParams<{ target: string }>();
    const navigate = useNavigate();

    const handleSetTheme = (target: CheckStatus | 'ARCHIVE', themeId: string) => {
        if (target === 'ARCHIVE') {
            appState.savePreferences({ ...appState.preferences, archiveTheme: themeId });
        } else {
            const newColumnThemes = { ...appState.preferences.columnThemes, [target]: themeId };
            appState.savePreferences({ ...appState.preferences, columnThemes: newColumnThemes });
        }
    };

    if (!target) {
        navigate('/');
        return null;
    }

    return (
        <ThemePickerModal
            isOpen={true}
            onClose={() => navigate(-1)}
            themes={THEMES}
            onSetTheme={handleSetTheme}
            target={target as CheckStatus | 'ARCHIVE'}
        />
    );
};


// Main Routing Definition
const AppRoutes: React.FC<{ appState: AppState }> = ({ appState }) => {
    const navigate = useNavigate();
    // These handlers are passed to multiple components so they are defined once here.
    const handleSort = (status: CheckStatus, key: keyof Check) => {
        const currentSort = appState.sortConfig[status];
        const newDirection = currentSort && currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc';
        appState.setSortConfig((prev: any) => ({ ...prev, [status]: { key, direction: newDirection } }));
    };
    
    const handleSelectAllInColumn = (status: CheckStatus) => {
        // This function now requires multi-select mode to be active first.
        if (!appState.isMultiSelectMode) return;
        const checkIdsInColumn = appState.checks.filter(c => c.status === status).map(c => c.id);
        const allSelected = checkIdsInColumn.every(id => appState.selectedCheckIds.includes(id));
        if (allSelected) {
            appState.setSelectedCheckIds(appState.selectedCheckIds.filter(id => !checkIdsInColumn.includes(id)));
        } else {
            appState.setSelectedCheckIds([...new Set([...appState.selectedCheckIds, ...checkIdsInColumn])]);
        }
    };

    return (
        <Routes>
            <Route path="/" element={<MainLayout appState={appState} />}>
                {/* Main Views */}
                <Route index element={
                    <KanbanBoard
                        checks={appState.filteredChecks.filter(c => c.status !== CheckStatus.ARCHIVED)}
                        flags={appState.flags}
                        themes={THEMES}
                        onSelectCheck={appState.handleSelectCheck}
                        onMoveCheck={appState.handleMoveCheck}
                        onExpandColumn={(status) => navigate(`/column/${status}`)}
                        sortConfig={appState.sortConfig}
                        onSort={handleSort}
                        onSelectAllInColumn={handleSelectAllInColumn}
                        selectedCheckIds={appState.selectedCheckIds}
                        isMultiSelectMode={appState.isMultiSelectMode}
                        onToggleSelection={(id) => {
                            if (!appState.isMultiSelectMode) return;
                            appState.setSelectedCheckIds(appState.selectedCheckIds.includes(id) ? appState.selectedCheckIds.filter(i => i !== id) : [...appState.selectedCheckIds, id])
                        }}
                        columnDisplayOptions={appState.preferences.columnDisplayOptions}
                        columnThemes={appState.preferences.columnThemes}
                        cardLayout={appState.preferences.cardLayout}
                        onToggleDisplayOption={(status, option) => {
                            const currentOptions = appState.preferences.columnDisplayOptions[status];
                            const newOptions = { ...currentOptions, [option]: !currentOptions[option] };
                            const newDisplayOptions = { ...appState.preferences.columnDisplayOptions, [status]: newOptions };
                            appState.savePreferences({ ...appState.preferences, columnDisplayOptions: newDisplayOptions });
                        }}
                        onOpenThemePicker={(status) => navigate(`/theme-picker/${status}`)}
                    />
                } />
                <Route path="archive" element={
                    <ArchiveView
                        checks={appState.filteredChecks.filter(c => c.status === CheckStatus.ARCHIVED)}
                        onSelectCheck={appState.handleSelectCheck}
                        onBack={() => navigate('/')}
                        searchTerm={appState.searchTerm}
                        visibleColumns={appState.preferences.visibleArchiveColumns}
                        onVisibleColumnsChange={(newCols: CheckField[]) => appState.savePreferences({...appState.preferences, visibleArchiveColumns: newCols})}
                        columnWidths={appState.preferences.archiveColumnWidths}
                        onColumnWidthsChange={(newWidths) => appState.savePreferences({...appState.preferences, archiveColumnWidths: newWidths})}
                        archiveTheme={appState.preferences.archiveTheme}
                        themes={THEMES}
                        onOpenThemePicker={() => navigate('/theme-picker/ARCHIVE')}
                    />
                } />
                <Route path="batch-history" element={<BatchHistoryView batches={appState.batches} checks={appState.checks} onSelectCheck={appState.handleSelectCheck} onBack={() => navigate('/')} />} />

                {/* Modals as Routes */}
                <Route path="add-check" element={<AddCheckWizard isOpen={true} onClose={appState.handleCloseModal} onAddCheck={appState.actions.handleAddCheck} /> }>
                    <Route index element={<CategoryStep />} />
                    <Route path="upload" element={<UploadStep />} />
                    <Route path="details" element={<DetailsStep />} />
                </Route>
                <Route path="batching" element={<ProcessBatchModal isOpen={true} checks={appState.checks} onClose={appState.handleCloseModal} onProcessBatch={appState.actions.handleProcessBatch} />} />
                <Route path="preferences" element={<PreferencesModal isOpen={true} onClose={appState.handleCloseModal} currentPreferences={appState.preferences} onSave={appState.savePreferences} />} />
                <Route path="check/:checkId" element={<CheckDetailWrapper appState={appState} />} />
                <Route path="check/:checkId/manage-flags" element={<FlagManager isOpen={true} flags={appState.flags} onClose={appState.handleCloseModal} onUpdateFlags={firestoreService.syncFlags} />} />
                <Route path="theme-picker/:target" element={<ThemePickerWrapper appState={appState} />} />
            </Route>

            {/* Expanded view as a separate, top-level route */}
            <Route path="/column/:status" element={<ExpandedColumnWrapper appState={appState} />} />
        </Routes>
    );
};

export default AppRoutes;