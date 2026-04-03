import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet, useNavigate, useParams } from 'react-router-dom';

// Import all your components and types 
import { THEMES } from './constants';
// FIX: Use named import for AddCheckWizard and its step components.
import { Check, CheckStatus, UserPreferences, Notification, UserProfile, CheckViewOptions, CardStyle, UserRole, CheckField } from './types';
import Header from './components/Header'; // FIX: Added Batch to imports
import CheckDetailView from './components/CheckDetailView';
import FlagManager from './components/FlagManager';
import ProcessBatchView from './components/BatchingModal';
import ThemePickerModal from './components/ThemePickerModal';
import PreferencesView from './components/PreferencesView';
import SelectionActionBar from './components/SelectionActionBar';
import MainMenu from './components/MainMenu';
import BatchChecksView from './components/BatchChecksView'; // Import BatchChecksView
import SplashScreen from './components/SplashScreen';
import {
  AddCheckWizard,
  CategoryStep,
  UploadStep,
  DetailsStep,
  CropStep,
  BatchStep
} from './components/AddCheckWizard';

// Lazy-load page components for code splitting
const CheckDashboard = lazy(() => import('./components/board/CheckDashboard'));
const ArchiveView = lazy(() => import('./components/ArchiveView'));
const BatchHistoryView = lazy(() => import('./components/BatchHistoryView'));
const ExpandedColumnView = lazy(() => import('./components/ExpandedColumnView'));
const PitchDeck = lazy(() => import('./components/PitchDeck'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const StakeholderDashboard = lazy(() => import('./components/dashboards/StakeholderDashboard'));
const BranchDashboard = lazy(() => import('./components/dashboards/BranchDashboard'));


// Define a single, comprehensive type for all props passed from App.tsx
export interface AppState {
  currentUser: UserProfile | null;
  userEmail: string | null;
  checks: Check[];
  flags: any[];
  batches: any[];
  filteredChecks: Check[];
  allUsers: UserProfile[];
  allRegions: any[];
  allBranches: any[];
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
    handleBulkDelete: (checks: Check[]) => void;
    handleAddComment: (id: string, text: string) => void;
    handleToggleFlag: (checkId: string, flagId: string) => void;
    handleProcessBatch: (ids: string[], tracking: string) => void;
    handleDeleteBatch: (batchId: string, checkIds: string[]) => void;
  };

  // Navigation
  handleSelectCheck: (check: Check) => void;
  handleCloseModal: () => void;
  handleGoBack: () => void;
  viewingBatchId: string | null;
  handleViewBatch: (batchId: string) => void;
  onCloseBatch: () => void;

  // Misc handlers
  handleMoveCheck: (checkId: string, newStatus: CheckStatus, targetIndex: number) => void;
  handleCheckSelection: (clickedCheckId: string, event: React.MouseEvent, allChecksInOrder: Check[]) => void;
  handleToggleMultiSelect: () => void;
  cardStyle: CardStyle;
  checkViewOptions: CheckViewOptions;

  // Notifications
  notifications: Notification[];
  notificationCount: number;
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
        currentUser={appState.currentUser as any}
        onOpenPreferences={() => navigate('/preferences')}
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
        currentUser={appState.currentUser}
        activeCategory={appState.activeCategoryFilter}
        onCategoryFilterChange={appState.setActiveCategoryFilter}
        onClearMockData={async () => {
          const { deleteAllMockData } = await import('./services/mockDataService');
          await deleteAllMockData();
        }}
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
  const check = appState.checks.find(c => c.id === checkId);

  if (!check) return null; // or a loading/not found component

  return (
    <>
      <CheckDetailView
        check={check}
        checks={appState.checks}
        onSelectCheck={appState.handleSelectCheck}
        flags={appState.flags}
        onClose={appState.handleCloseModal}
        onUpdateCheck={appState.actions.handleUpdateCheck as any}
        onAddComment={appState.actions.handleAddComment}
        onToggleFlag={appState.actions.handleToggleFlag}
        onOpenFlagManager={() => navigate("/flags")}
        onDeleteCheck={appState.actions.handleDeleteCheck}
        currentUser={appState.currentUser as any}
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
  return (
    <BatchChecksView batches={appState.batches} checks={appState.checks} onSelectCheck={appState.handleSelectCheck} onDeleteBatch={appState.actions.handleDeleteBatch} />
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
    for (const id of checkIdsInColumn) {
      if (!currentSelected.has(id)) {
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
              (appState.currentUser?.role === UserRole.STAKEHOLDER || 
               appState.currentUser?.role === UserRole.GLOBAL_ADMIN || 
               appState.currentUser?.role === UserRole.EXECUTIVE || 
               appState.currentUser?.role === UserRole.AR_MANAGER) ? (
                <StakeholderDashboard 
                  checks={appState.checks} 
                  allRegions={appState.allRegions}
                  allBranches={appState.allBranches}
                  onSelectCheck={(id: string) => {
                    const check = appState.checks.find(c => c.id === id);
                    if (check) appState.handleSelectCheck(check);
                  }}
                />
              ) : appState.currentUser ? (
                <BranchDashboard
                  checks={appState.checks}
                  batches={appState.batches}
                  currentUser={appState.currentUser}
                  onSelectCheck={appState.handleSelectCheck}
                  onAddCheck={() => navigate('/add-check')}
                />
              ) : (
                <CheckDashboard
                  checks={appState.checks}
                  flags={appState.flags}
                  themes={THEMES}
                  onSelectCheck={appState.handleSelectCheck}
                  onMoveCheck={appState.handleMoveCheck}
                  onUpdateCheck={(id, updates) => appState.actions.handleUpdateCheck(id, updates, { type: 'edit', message: 'Inline edit from dashboard', user: appState.currentUser?.email })}
                  cardStyle={appState.cardStyle}
                  onExpandColumn={(status: CheckStatus) => navigate(`/column/${status}`)}
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
                  onOpenThemePicker={(status: CheckStatus) => navigate(`/theme/${status}`)}
                  cardLayout={appState.preferences.cardLayout}
                  checkViewOptions={appState.preferences.checkViewOptions}
                  preferences={appState.preferences}
                  currentUser={appState.currentUser}
                />
              )
            }
          />
          <Route
            path="/archive"
            element={
              <ArchiveView
                checks={appState.filteredChecks.filter(
                  (c) => c.status === CheckStatus.ARCHIVED
                )}
                selectedCheckIds={appState.selectedCheckIds}
                onCheckSelection={(id: string, e: React.MouseEvent, checks: Check[]) => appState.handleCheckSelection(id, e, checks)}
                setIsMultiSelectMode={appState.setIsMultiSelectMode}
                onUpdateCheck={appState.actions.handleUpdateCheck}
                onBulkDelete={appState.actions.handleBulkDelete as any}
                onSelectCheck={appState.handleSelectCheck}
                onBack={() => navigate("/")}
                searchTerm={appState.searchTerm}
                visibleColumns={appState.preferences.visibleArchiveColumns}
                onVisibleColumnsChange={(cols: CheckField[]) =>
                  appState.savePreferences({
                    ...appState.preferences,
                    visibleArchiveColumns: cols,
                  })
                }
                columnWidths={appState.preferences.archiveColumnWidths}
                onColumnWidthsChange={(widths: Record<string, number>) =>
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
                onSelectCheck={appState.handleSelectCheck}
                onBack={() => navigate("/")}
                preferences={appState.preferences}
                savePreferences={appState.savePreferences}
                viewingBatchId={appState.viewingBatchId}
                onViewBatch={appState.handleViewBatch}
                onCloseBatch={appState.onCloseBatch}
                onDeleteBatch={appState.actions.handleDeleteBatch}
                currentUser={appState.currentUser}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminPanel
                allUsers={appState.allUsers}
                currentUser={appState.currentUser}
                onBack={() => navigate("/")}
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
                onClose={() => navigate("/")}
                onAddCheck={appState.actions.handleAddCheck}
                currentUser={appState.currentUser}
                allUsers={appState.allUsers}
                allRegions={appState.allRegions}
                allBranches={appState.allBranches}
              />
            }
          >
            <Route index element={<CategoryStep />} />
            <Route path="upload" element={<UploadStep />} />
            <Route path="batch" element={<BatchStep />} />
            <Route path="crop" element={<CropStep />} />
            <Route path="details" element={<DetailsStep />} />
          </Route>

          <Route
            path="/batching"
            element={
              <ProcessBatchView
                checks={appState.checks}
                currentUser={appState.currentUser}
                onClose={() => navigate("/")}
                onProcessBatch={appState.actions.handleProcessBatch}
              />
            }
          />
          <Route
            path="/preferences"
            element={
              <PreferencesView
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
        <Route path="/pitch" element={<PitchDeck />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;