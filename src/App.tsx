import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useUserData } from './hooks/useUserData';
import { useCheckData } from './hooks/useCheckData';
import { useCheckActions } from './hooks/useCheckActions';
import { Check, CheckStatus, CurrentUser, Notification, UserProfile } from './types';
import * as firestoreService from './services/firestoreService';
import Login from './components/Login';
import SplashScreen from './components/SplashScreen';
import AppRoutes from './AppRoutes';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import NotificationStack from './components/NotificationStack';

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [preferences, savePreferences, clearPreferences] = useUserData();
    const { addToast, removeToast } = useNotification();
    const [sessionStartTimestamp] = useState(new Date().toISOString());
    const [shownToastIds, setShownToastIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (preferences?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [preferences?.darkMode]);
    
    useEffect(() => {
        if (user) {
            const unsubscribeNotifications = firestoreService.onNotificationsSnapshot(user.uid, (newNotifications) => {
                setNotifications(newNotifications);
                newNotifications.forEach(notification => {
                    if (notification.timestamp > sessionStartTimestamp && !shownToastIds.has(notification.id)) {
                        const userProfile = allUsers.find(u => u.uid === notification.actorId);
                        addToast({
                            userProfile,
                            notification: { message: notification.message },
                            handleToastClick: () => {
                                navigate(notification.link);
                                firestoreService.markNotificationsAsRead([notification.id]);
                            }
                        });
                        setShownToastIds(prevIds => new Set(prevIds).add(notification.id));
                    }
                });
            });

            const unsubscribeUsers = firestoreService.onUsersSnapshot(setAllUsers);
            
            return () => {
                unsubscribeNotifications();
                unsubscribeUsers();
            };
        } else {
            setNotifications([]);
            setAllUsers([]);
            clearPreferences();
        }
    }, [user, clearPreferences, addToast, navigate, sessionStartTimestamp, shownToastIds]);

    const currentUser = useMemo<UserProfile | null>(() => {
        if (!user || !preferences) return null;
        return preferences.profile;
    }, [user, preferences]);
    
    const { checks, flags, batches, filteredChecks, searchTerm, setSearchTerm, activeCategoryFilter, setActiveCategoryFilter } = useCheckData(user, preferences?.profile);
   
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [sortConfig, setSortConfig] = useState<any>({});
    const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([]);
    const [lastSelectedCheckId, setLastSelectedCheckId] = useState<string | null>(null);
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
    const [expandedStatus, setExpandedStatus] = useState<CheckStatus | null>(null);
    const [viewingBatchId, setViewingBatchId] = useState<string | null>(null);

    const actions = useCheckActions(currentUser, checks, flags);
    
    const handleToggleMultiSelect = useCallback(() => {
        setIsMultiSelectMode(prev => {
            if (prev) setSelectedCheckIds([]);
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
        } else {
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
        } else {
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
            setIsMultiSelectMode(false);
        }
    }, [currentUser, checks, selectedCheckIds, actions]);

    if (loading || !preferences) return <SplashScreen />;
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
        cardStyle: preferences.cardStyle,
    };

    return (
        <>
            <NotificationStack />
            <AppRoutes appState={appState} />
        </>
    );
};

const App: React.FC = () => (
    <NotificationProvider>
        <AppContent />
    </NotificationProvider>
);

export default App;

