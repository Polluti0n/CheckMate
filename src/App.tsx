

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { usePreferences } from './hooks/usePreferences';
import { useCheckData } from './hooks/useCheckData';
import { useCheckActions } from './hooks/useCheckActions';
import { Check, CheckStatus, CurrentUser } from './types';
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import AppRoutes from './AppRoutes';

const App: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // Custom hook for data fetching and filtering
    const { checks, flags, batches, filteredChecks, searchTerm, setSearchTerm, activeCategoryFilter, setActiveCategoryFilter } = useCheckData(user);

    // Custom hook for preferences stored in localStorage
    const [preferences, savePreferences] = usePreferences();

    // State for UI that doesn't belong in other hooks
    const [sortConfig, setSortConfig] = useState<any>({});
    const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
    const [expandedStatus, setExpandedStatus] = useState<CheckStatus | null>(null);

    const currentUser = useMemo<CurrentUser | null>(() => {
        if (!user) return null;
        return { name: user.displayName || user.email || 'User', uid: user.uid };
    }, [user]);

    // Custom hook for all Firestore write operations
    const actions = useCheckActions(currentUser, checks, flags);
    
    const handleToggleMultiSelect = useCallback(() => {
        setIsMultiSelectMode(prev => {
            const isTurningOff = prev;
            if (isTurningOff) {
                setSelectedCheckIds([]);
            }
            return !prev;
        });
        setIsMainMenuOpen(false); // Always close menu after action
    }, [setSelectedCheckIds, setIsMainMenuOpen]);


    // Navigation handlers that use the router's navigate function
    const handleSelectCheck = useCallback((check: Check) => {
        navigate(`/check/${check.id}`);
    }, [navigate]);

    const handleCloseModal = useCallback(() => {
        navigate('/');
    }, [navigate]);

    const handleGoBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    // This specific handler combines state from multiple hooks, so it lives here.
    const handleMoveCheck = useCallback((checkId: string, newStatus: CheckStatus, targetIndex: number) => {
        const idsToMove = selectedCheckIds.length > 0 && isMultiSelectMode ? selectedCheckIds : [checkId];
        if (!currentUser) return;

        const isSingleMove = idsToMove.length === 1;

        if (isSingleMove) {
            const checkToMove = checks.find(c => c.id === checkId);
            if (!checkToMove) return;

            const allChecksInOriginalColumn = checks
                .filter(c => c.status === checkToMove.status)
                .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));
            const originalIndex = allChecksInOriginalColumn.findIndex(c => c.id === checkId);

            // Prevent drop in the exact same spot
            if (checkToMove.status === newStatus && originalIndex === targetIndex) return;

            let newBoardOrder: number;
            
            const destinationColumnChecks = checks
                .filter(c => c.status === newStatus)
                .sort((a, b) => (a.boardOrder || 0) - (b.boardOrder || 0));

            let calculationList = [...destinationColumnChecks];
            const finalTargetIndex = targetIndex;

            // If moving within the same column, remove the dragged item from our temporary list.
            // The `targetIndex` is already correct relative to this new list, so no adjustment is needed.
            if (checkToMove.status === newStatus) {
                calculationList = calculationList.filter(c => c.id !== checkId);
            }
            
            // Calculate the new boardOrder based on the final list and index
            if (calculationList.length === 0) {
                newBoardOrder = 1; // First item in an empty column
            } else if (finalTargetIndex >= calculationList.length) {
                const lastCheck = calculationList[calculationList.length - 1];
                newBoardOrder = (lastCheck.boardOrder || 0) + 1; // At the end
            } else if (finalTargetIndex === 0) {
                const firstCheck = calculationList[0];
                newBoardOrder = (firstCheck.boardOrder || 1) / 2; // At the beginning
            } else {
                const prevCheck = calculationList[finalTargetIndex - 1];
                const nextCheck = calculationList[finalTargetIndex];
                newBoardOrder = ((prevCheck.boardOrder || 0) + (nextCheck.boardOrder || 0)) / 2; // In the middle
            }

            const updates: Partial<Check> = { status: newStatus, boardOrder: newBoardOrder };
            const log = {
                user: currentUser.name,
                field: checkToMove.status !== newStatus ? 'status' : 'reordered',
                oldValue: checkToMove.status,
                newValue: checkToMove.status !== newStatus ? newStatus : `position ${finalTargetIndex + 1}`
            };
            
            actions.handleUpdateCheck(checkId, updates, log);

        } else { // Multi-select move logic
            idsToMove.forEach((id, index) => {
                const check = checks.find(c => c.id === id);
                if (!check) return;
                const log = { user: currentUser.name, field: 'status', oldValue: check.status, newValue: newStatus };
                const newBoardOrder = (Date.now() / 1000) + index; // Use a stable order
                const updates: Partial<Check> = { status: newStatus, boardOrder: newBoardOrder };
                actions.handleUpdateCheck(id, updates, log);
            });

            if (selectedCheckIds.length > 0) {
                setSelectedCheckIds([]);
                setIsMultiSelectMode(false);
            }
        }
    }, [currentUser, checks, selectedCheckIds, actions, isMultiSelectMode]);


    if (loading) return <SplashScreen />;
    if (!user) return <Login />;

    // Consolidate all state and handlers into a single object to pass to the router.
    // This keeps the AppRoutes component's props clean.
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
        handleToggleMultiSelect,
        handleGoBack
    };

    return <AppRoutes appState={appState} />;
};

export default App;