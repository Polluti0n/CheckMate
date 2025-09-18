import React from 'react';
import { Routes, Route, Outlet, useNavigate, useParams } from 'react-router-dom';
import * as firestoreService from './services/firestoreService';
import Header from './components/Header';
import KanbanBoard from './components/CheckDashboard';
import AddCheckWizard from './components/AddCheckWizard';
import CheckDetailModal from './components/CheckDetailModal';
import FlagManager from './components/FlagManager';
import ArchiveView from './components/ArchiveView';
import BatchHistoryView from './components/BatchHistoryView';
import SelectionActionBar from './components/SelectionActionBar';
// Wrapper component to safely handle params and find the correct check
const CheckDetailWrapper = ({ appState }) => {
    const { checkId } = useParams();
    const { filteredChecks, flags, handleCloseModal, handleUpdateCheck, currentUser, handleDeleteCheck } = appState;
    const navigate = useNavigate();
    const selectedCheck = filteredChecks.find(c => c.id === checkId);
    return (<CheckDetailModal check={selectedCheck} flags={flags} onClose={handleCloseModal} onUpdateCheck={handleUpdateCheck} 
    // onAddComment, onToggleFlag...
    onOpenFlagManager={() => navigate(`/check/${checkId}/manage-flags`)} onDeleteCheck={handleDeleteCheck} currentUser={currentUser}/>);
};
const MainLayout = ({ appState }) => {
    const navigate = useNavigate();
    const { user, searchTerm, setSearchTerm, selectedCheckIds, setSelectedCheckIds, handleMoveCheck } = appState;
    return (<div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <Header onAddCheck={() => navigate('/add-check')} onBatching={() => navigate('/batching')} 
    // ... other Header props
    userEmail={user.email}/>
            <div className="flex-grow flex flex-col pb-16">
                <Outlet />
            </div>
            {selectedCheckIds.length > 0 && (<SelectionActionBar selectedCount={selectedCheckIds.length} onCancel={() => setSelectedCheckIds([])} onMove={(newStatus) => handleMoveCheck('', newStatus)}/>)}
        </div>);
};
const AppRoutes = ({ appState }) => {
    return (<Routes>
            <Route path="/" element={<MainLayout appState={appState}/>}>
                <Route index element={<KanbanBoard {...appState}/>}/>
                <Route path="archive" element={<ArchiveView {...appState}/>}/>
                <Route path="batch-history" element={<BatchHistoryView {...appState}/>}/>

                {/* Modals as nested routes */}
                <Route path="add-check" element={<AddCheckWizard isOpen={true} onClose={appState.handleCloseModal} onAddCheck={appState.handleAddCheck}/>}/>
                <Route path="check/:checkId" element={<CheckDetailWrapper appState={appState}/>}/>
                <Route path="check/:checkId/manage-flags" element={<FlagManager isOpen={true} flags={appState.flags} onClose={appState.handleCloseModal} onUpdateFlags={firestoreService.syncFlags}/>}/>
                {/* ... other modal routes */}
            </Route>

            {/* Expanded view can be a top-level route */}
            {/* <Route path="/column/:status" element={<ExpandedColumnView ... />} /> */}
        </Routes>);
};
export default AppRoutes;
