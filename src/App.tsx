import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { usePreferences } from './hooks/usePreferences';
import { useCheckData } from './hooks/useCheckData';
import { useCheckActions } from './hooks/useCheckActions';
import { Check, CheckStatus, CurrentUser, Notification, UserProfile } from './types';
import * as firestoreService from './services/firestoreService';
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import AppRoutes from './AppRoutes';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
     const [preferences, savePreferences, clearPreferences] = usePreferences(user?.uid || null);
   useEffect(() => {
        if (user) {
            firestoreService.getOrCreateUserProfile(user.uid, user.email || 'new.user@checkmate.com');

            const unsubscribeNotifications = firestoreService.onNotificationsSnapshot(user.uid, setNotifications);
            const unsubscribeUsers = firestoreService.onUsersSnapshot(setAllUsers);
            console.log(preferences)
            
            return () => {
                unsubscribeNotifications();
                unsubscribeUsers();
            };
        } else {
            setNotifications([]);
            setAllUsers([]);
            clearPreferences();
        }
    }, [user, clearPreferences]);

    const currentUser = useMemo<CurrentUser | null>(() => {
        if (!user) return null;
        return { 
            name: preferences.profile.firstName ? `${preferences.profile.firstName} ${preferences.profile.lastName}`.trim() : user.email || 'User',
            uid: user.uid,
            email: user.email,
        };
    }, [user, preferences.profile]);
    // Custom hooks for data
    const { checks, flags, batches, filteredChecks, searchTerm, setSearchTerm, activeCategoryFilter, setActiveCategoryFilter } = useCheckData(user, currentUser);
   
    
    // State for notifications and users
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

    // UI State
    const [sortConfig, setSortConfig] = useState<any>({});
    const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
    const [lastSelectedCheckId, setLastSelectedCheckId] = useState<string | null>(null);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // Re-added state
    const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
    const [expandedStatus, setExpandedStatus] = useState<CheckStatus | null>(null);
    const [viewingBatchId, setViewingBatchId] = useState<string | null>(null);

 

    const actions = useCheckActions(currentUser, checks, flags);
    
    // Re-added handler for the main menu button
    const handleToggleMultiSelect = useCallback(() => {
        setIsMultiSelectMode(prev => {
            if (prev) setSelectedCheckIds([]); // Clear selection when exiting mode
            return !prev;
        });
        setIsMainMenuOpen(false);
    }, []);

    const handleSelectCheck = useCallback((check: Check) => navigate(`/check/${check.id}`), [navigate]);
    const handleCloseModal = useCallback(() => navigate('/'), [navigate]);
    const handleGoBack = useCallback(() => navigate(-1), [navigate]);
    const handleViewBatch = useCallback((batchId: string) => setViewingBatchId(batchId), []);
    const handleNavigateToBatch = useCallback((batchId: string) => navigate(`/batch/${batchId}`), [navigate]);

    const handleCheckSelection = useCallback((clickedCheckId: string, event: React.MouseEvent, allChecksInOrder: Check[]) => {
        // Implicitly enable multi-select mode if a modifier key is used
        if (!isMultiSelectMode) {
            setIsMultiSelectMode(true);
        }

        const { ctrlKey, metaKey, shiftKey } = event;

        if (shiftKey && lastSelectedCheckId) {
            const lastIndex = allChecksInOrder.findIndex(c => c.id === lastSelectedCheckId);
            const currentIndex = allChecksInOrder.findIndex(c => c.id === clickedCheckId);
            if (lastIndex === -1 || currentIndex === -1) return;

            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            const rangeIds = allChecksInOrder.slice(start, end + 1).map(c => c.id);

            if (ctrlKey || metaKey) {
                setSelectedCheckIds(prevIds => [...new Set([...prevIds, ...rangeIds])]);
            } else {
                setSelectedCheckIds(rangeIds);
            }
        } else { // Handles Ctrl/Cmd click, Shift click (as first selection), and simple clicks in multi-select mode
            setSelectedCheckIds(prevIds => {
                const newIds = new Set(prevIds);
                if (newIds.has(clickedCheckId)) {
                    newIds.delete(clickedCheckId);
                } else {
                    newIds.add(clickedCheckId);
                }
                return Array.from(newIds);
            });
            setLastSelectedCheckId(clickedCheckId);
        }
    }, [isMultiSelectMode, lastSelectedCheckId]);

    const handleMoveCheck = useCallback((checkId: string, newStatus: CheckStatus, targetIndex: number) => {
        if (!currentUser) return;

        const isBulkAction = !checkId || selectedCheckIds.includes(checkId);
        const idsToMove = isBulkAction && selectedCheckIds.length > 0 ? selectedCheckIds : [checkId];
        const isSingleMove = idsToMove.length === 1 && idsToMove[0] === checkId;

        if (isSingleMove) {
            const checkToMove = checks.find(c => c.id === checkId);
            if (!checkToMove) return;

            const allChecksInOriginalColumn = checks
                .filter(c => c.status === checkToMove.status)
                .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
            const originalIndex = allChecksInOriginalColumn.findIndex(c => c.id === checkId);

            if (checkToMove.status === newStatus && originalIndex === targetIndex) {
                return;
            }

            let newBoardOrder: number;
            const destinationColumnChecks = checks
                .filter(c => c.status === newStatus)
                .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
            let calculationList = [...destinationColumnChecks];
            if (checkToMove.status === newStatus) {
                calculationList = calculationList.filter(c => c.id !== checkId);
            }
            
            if (calculationList.length === 0) {
                newBoardOrder = 1;
            } else if (targetIndex >= calculationList.length) {
                const lastCheck = calculationList[calculationList.length - 1];
                newBoardOrder = (lastCheck.boardOrder || 0) + 1;
            } else if (targetIndex === 0) {
                const firstCheck = calculationList[0];
                newBoardOrder = (firstCheck.boardOrder || 1) / 2;
            } else {
                const prevCheck = calculationList[targetIndex - 1];
                const nextCheck = calculationList[targetIndex];
                newBoardOrder = ((prevCheck.boardOrder || 0) + (nextCheck.boardOrder || 0)) / 2;
            }

            const updates: Partial<Check> = { status: newStatus, boardOrder: newBoardOrder };
            const log = {
                field: checkToMove.status !== newStatus ? 'status' : 'reordered',
                oldValue: checkToMove.status,
                newValue: checkToMove.status !== newStatus ? newStatus : `position ${targetIndex + 1}`
            };
            
            actions.handleUpdateCheck(checkId, updates, log);
        } else { // Multi-select move logic
            const checksToMove = checks.filter(c => idsToMove.includes(c.id));
            if (checksToMove.length === 0) return;

            const destinationColumnChecks = checks
                .filter(c => c.status === newStatus && !idsToMove.includes(c.id))
                .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
            
            let lastBoardOrder = destinationColumnChecks.length > 0 
                ? (destinationColumnChecks[destinationColumnChecks.length - 1].boardOrder || 0)
                : 0;

            checksToMove.forEach(check => {
                lastBoardOrder += 1;
                const updates: Partial<Check> = { status: newStatus, boardOrder: lastBoardOrder };
                const log = { field: 'status', oldValue: check.status, newValue: newStatus };
                actions.handleUpdateCheck(check.id, updates, log);
            });
            
            setSelectedCheckIds([]);
            setIsMultiSelectMode(false); // Exit multi-select mode after action
        }
    }, [currentUser, checks, selectedCheckIds, actions]);

    if (loading) return <SplashScreen />;
    if (!user) return <Login />;

    const appState = {
        currentUser,
        userEmail: user.email,
        checks,
        flags,
        batches,
        filteredChecks,
        preferences,
        savePreferences,
        searchTerm,
        setSearchTerm,
        activeCategoryFilter,
        setActiveCategoryFilter,
        sortConfig,
        setSortConfig,
        selectedCheckIds,
        setSelectedCheckIds,
        isMultiSelectMode,
        setIsMultiSelectMode,
        isMainMenuOpen,
        setIsMainMenuOpen,
        expandedStatus,
        setExpandedStatus,
        actions,
        handleSelectCheck,
        handleCloseModal,
        handleMoveCheck,
        handleCheckSelection,
        viewingBatchId,
        handleViewBatch,
        handleNavigateToBatch,
        handleToggleMultiSelect,
        handleGoBack,
        notifications,
        notificationCount: notifications.filter(n => !n.read).length,
        allUsers,
    };

    return <AppRoutes appState={appState} />;
};

export default App;
