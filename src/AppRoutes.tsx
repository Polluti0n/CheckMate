import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import * as firestoreService from './services/firestoreService';

// Import all your components and types 
import { THEMES } from './constants';
// FIX: Use named import for AddCheckWizard and its step components.
import { Check, CheckStatus, CurrentUser, UserPreferences, CheckField, CheckCategory, Notification, UserProfile, CheckViewOptions, CardStyle } from './types';
import Header from './components/Header'; // FIX: Added Batch to imports
import CheckDetailModal from './components/CheckDetailModal';
import FlagManager from './components/FlagManager';
import ProcessBatchModal from './components/BatchingModal';
import ThemePickerModal from './components/ThemePickerModal';
import PreferencesModal from './components/PreferencesModal';
import SelectionActionBar from './components/SelectionActionBar';
import MainMenu from './components/MainMenu';
import ImageCropperModal from './components/ImageCropperModal'; // Import the new component
import BatchChecksModal from './components/BatchChecksModal'; // Import BatchChecksModal
import SplashScreen from './components/SplashScreen';
import {
    AddCheckWizard,
    CategoryStep,
    UploadStep,
    DetailsStep,
    CropStep
} from './components/AddCheckWizard';

// Lazy-load page components for code splitting
const KanbanBoard = lazy(() => import('./components/CheckDashboard'));
const ArchiveView = lazy(() => import('./components/ArchiveView'));
const BatchHistoryView = lazy(() => import('./components/BatchHistoryView'));
const ExpandedColumnView = lazy(() => import('./components/ExpandedColumnView'));


// Define a single, comprehensive type for all props passed from App.tsx
export interface AppState {
    currentUser: UserProfile | null;
    userEmail: string | null;
    checks: Check[];
    flags: any[];
    batches: any[];
    filteredChecks: Check[];
    preferences: UserPreferences;
    savePreferences: (prefs: Partial<UserPreferences>) => void;
    
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
    setIsMultiSelectMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
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
    handleGoBack: () => void;
    viewingBatchId: string | null;
    handleViewBatch: (batchId: string) => void;
    
    // Misc handlers
    handleMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
    handleCheckSelection: (clickedCheckId: string, event: React.MouseEvent, allChecksInOrder: Check[]) => void;
    handleToggleMultiSelect: () => void;
    cardStyle: CardStyle;
    checkViewOptions: CheckViewOptions;

    // Notifications
    notifications: Notification[];
    notificationCount: number;
    allUsers: UserProfile[];
}

// A layout component to keep the header and action bar consistent across views
const MainLayout: React.FC<{ appState: AppState }> = ({ appState }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900 font-sans flex flex-col">
            <Header
                onOpenMainMenu={() => appState.setIsMainMenuOpen(true)}
                onAddCheck={() => navigate('/add-check')}
                onBatching={() => navigate('/batching')}
                searchTerm={appState.searchTerm}
                onSearchChange={appState.setSearchTerm}
                activeCategory={appState.activeCategoryFilter}
                onCategoryFilterChange={appState.setActiveCategoryFilter}
                userEmail={appState.userEmail}
                currentUser={appState.currentUser}
                onOpenPreferences={() => navigate('/preferences')}
                profilePictureUrl={appState.preferences.profilePictureUrl}
                notificationCount={appState.notificationCount}
                notifications={appState.notifications}
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
            {appState.isMultiSelectMode && (
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
        const { id, ...updates } = updatedCheck;
        appState.actions.handleUpdateCheck(id, updates, log);
    };

    if (!check) return null; // or a loading/not found component

    return (
        <>
            <CheckDetailModal
                check={check}
                flags={appState.flags}
                onClose={appState.handleGoBack}
                onUpdateCheck={onUpdate}
                onAddComment={(...args) => appState.actions.handleAddComment(...args)}
                onToggleFlag={(...args) => appState.actions.handleToggleFlag(...args)}
                onOpenFlagManager={() => navigate(`/check/${checkId}/manage-flags`)}
                onDeleteCheck={() => {
                    appState.actions.handleDeleteCheck(check.id);
                    navigate(-1);
                }}
                currentUser={appState.currentUser}
                allUsers={appState.allUsers}
                onNavigateToBatch={appState.handleViewBatch}
                preferences={appState.preferences}
            />
            {/* THIS OUTLET IS THE FIX. It renders the nested FlagManager route. */}
            <Outlet />
        </>
    );
};

const BatchChecksWrapper: React.FC<{ appState: AppState }> = ({ appState }) => {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const batch = appState.batches.find(b => b.id === batchId);

    if (!batch) {
        // Optionally, show a "not found" message before navigating away
        useEffect(() => {
            navigate(-1);
        }, [navigate]);
        return null;
    }

    return (
        <BatchChecksModal isOpen={true} batch={batch} checks={appState.checks} onClose={() => navigate(-1)} onSelectCheck={appState.handleSelectCheck} />
    );
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
        const checkIdsInColumn = appState.filteredChecks.filter(c => c.status === status).map(c => c.id);
        const currentSelected = new Set(appState.selectedCheckIds);
        let allSelected = true;
        for(const id of checkIdsInColumn) {
            if(!currentSelected.has(id)){
                allSelected = false;
                break;
            }
        }
        
        if (allSelected) {
            appState.setSelectedCheckIds(appState.selectedCheckIds.filter(id => !checkIdsInColumn.includes(id)));
        } else {
            const newSelected = new Set([...appState.selectedCheckIds, ...checkIdsInColumn]);
            appState.setSelectedCheckIds(Array.from(newSelected));
        }
    };
    
    const handleToggleDisplayOption = (status: CheckStatus, option: 'showCount' | 'showTotal') => {
        const newOptions = { ...appState.preferences.columnDisplayOptions };
        newOptions[status][option] = !newOptions[status][option];
        appState.savePreferences({ ...appState.preferences, columnDisplayOptions: newOptions });
    };

    return (
      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route path="/" element={<MainLayout appState={appState} />}>
            {/* Main Views */}
            <Route
              index
              element={
                <KanbanBoard
                  checks={appState.filteredChecks.filter(
                    (c) => c.status !== CheckStatus.ARCHIVED
                  )}
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
                  onCheckSelection={appState.handleCheckSelection}
                  columnDisplayOptions={
                    appState.preferences.columnDisplayOptions
                  }
                  columnThemes={appState.preferences.columnThemes}
                  onToggleDisplayOption={handleToggleDisplayOption}
                  onOpenThemePicker={(status) => navigate(`/theme/${status}`)}
                  cardLayout={appState.preferences.cardLayout}
                  viewMode={appState.preferences.viewMode}
                  cardStyle={appState.preferences.cardStyle}
                  checkViewOptions={appState.preferences.checkViewOptions}
                  preferences={appState.preferences}
                />
              }
            />
            <Route
              path="/archive"
              element={
                <ArchiveView
                  checks={appState.filteredChecks.filter(
                    (c) => c.status === CheckStatus.ARCHIVED
                  )}
                  onSelectCheck={appState.handleSelectCheck}
                  onBack={() => navigate("/")}
                  searchTerm={appState.searchTerm}
                  visibleColumns={appState.preferences.visibleArchiveColumns}
                  onVisibleColumnsChange={(cols) =>
                    appState.savePreferences({
                      ...appState.preferences,
                      visibleArchiveColumns: cols,
                    })
                  }
                  columnWidths={appState.preferences.archiveColumnWidths}
                  onColumnWidthsChange={(widths) =>
                    appState.savePreferences({
                      ...appState.preferences,
                      archiveColumnWidths: widths,
                    })
                  }
                  archiveTheme={appState.preferences.archiveTheme}
                  themes={THEMES}
                  onOpenThemePicker={() => navigate("/theme/ARCHIVE")}
                  preferences={appState.preferences}
                />
              }
            />
            <Route
              path="/batch-history"
              element={
                <BatchHistoryView
                  batches={appState.batches}
                  checks={appState.checks}
                  onSelectCheck={appState.onSelectCheck}
                  onBack={() => navigate("/")}
                  preferences={appState.preferences}
                  savePreferences={appState.savePreferences}
                />
              }
            />
            <Route
              path="/column/:status"
              element={<ExpandedColumnWrapper appState={appState} />}
            />

            {/* Modals as Routes */}
            <Route
              path="/check/:checkId"
              element={<CheckDetailWrapper appState={appState} />}
            >
              <Route
                path="manage-flags"
                element={
                  <FlagManager
                    isOpen={true}
                    flags={appState.flags}
                    onClose={appState.handleGoBack}
                    currentUser={appState.currentUser}
                  />
                }
              />
            </Route>

            <Route
              path="/add-check"
              element={
                <AddCheckWizard
                  isOpen={true}
                  onClose={() => navigate("/")}
                  onAddCheck={appState.actions.handleAddCheck}
                />
              }
            >
              <Route index element={<CategoryStep />} />
              <Route path="upload" element={<UploadStep />} />
              <Route path="crop" element={<CropStep />} />
              <Route path="details" element={<DetailsStep />} />
            </Route>

            <Route
              path="/batching"
              element={
                <ProcessBatchModal
                  isOpen={true}
                  checks={appState.checks}
                  currentUser={appState.currentUser}
                  onClose={() => navigate("/")}
                  onProcessBatch={appState.actions.handleProcessBatch}
                  preferences={appState.preferences}
                />
              }
            />
            <Route
              path="/preferences"
              element={
                <PreferencesModal
                  isOpen={true}
                  onClose={() => navigate("/")}
                  currentPreferences={appState.preferences}
                  onSave={appState.savePreferences}
                  userEmail={appState.userEmail}
                  currentUser={appState.currentUser}
                />
              }
            />
            <Route
              path="/theme/:target"
              element={<ThemePickerWrapper appState={appState} />}
            />
            <Route
              path="/batch/:batchId"
              element={<BatchChecksWrapper appState={appState} />}
            />
          </Route>
        </Routes>
        {/* Render BatchChecksModal on top of other content, outside of <Routes> */}
        {appState.viewingBatchId && (
          <BatchChecksModal
            isOpen={true}
            batch={
              appState.batches.find((b) => b.id === appState.viewingBatchId) ||
              null
            }
            checks={appState.checks}
            onClose={() => appState.handleViewBatch(null as any)} // Close by setting ID to null
            onSelectCheck={appState.handleSelectCheck}
          />
        )}
      </Suspense>
    );
};

export default AppRoutes;