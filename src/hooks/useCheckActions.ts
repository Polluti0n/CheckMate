import { useCallback } from 'react';
import * as firestoreService from '../services/firestoreService';
import { Check, AuditLog, Flag, UserProfile } from '../types';

/**
 * A custom hook that provides all Firestore write operations.
 * It now correctly passes the `currentUser` object to each service call, which is
 * required for the backend Cloud Functions to trigger notifications correctly.
 */
export const useCheckActions = (currentUser: UserProfile | null, checks: Check[], flags: Flag[]) => {

    const handleAddCheck = useCallback((newCheckData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>) => {
        if (!currentUser) return;
        firestoreService.addCheck(newCheckData, currentUser);
    }, [currentUser]);

    const handleUpdateCheck = useCallback((checkId: string, updates: Partial<Check>, log: Omit<AuditLog, 'id' | 'timestamp' | 'uid' | 'user'>) => {
        if (!currentUser) return;
        const completeLog = { ...log, user: `${currentUser.firstName} ${currentUser.lastName}`.trim(), uid: currentUser.uid };
        firestoreService.updateCheck(checkId, updates, completeLog, currentUser);
    }, [currentUser]);

    const handleDeleteCheck = useCallback((checkId: string) => {
        if (!currentUser) return;
        const check = checks.find(c => c.id === checkId);
        firestoreService.deleteCheck(checkId, check?.imageUrl);
    }, [currentUser, checks]);

    const handleBulkDelete = useCallback((checksToDelete: Check[]) => {
        if (!currentUser) return;
        firestoreService.bulkDeleteChecks(checksToDelete);
    }, [currentUser]);

    const handleAddComment = useCallback((checkId: string, commentText: string) => {
        if (!currentUser) return;
        firestoreService.addComment(checkId, commentText, currentUser);
    }, [currentUser]);

    const handleToggleFlag = useCallback((checkId: string, flagId: string) => {
        if (!currentUser) return;
        const check = checks.find(c => c.id === checkId);
        const flag = flags.find(f => f.id === flagId);
        if (!check || !flag) return;

        const isAdding = !check.flags.includes(flagId);
        firestoreService.toggleFlag(checkId, flag, isAdding, currentUser);
    }, [currentUser, checks, flags]);

    const handleProcessBatch = useCallback((checkIds: string[], trackingNumber: string) => {
        if (!currentUser) return;
        firestoreService.processBatch(checkIds, trackingNumber, currentUser);
    }, [currentUser]);

    const handleDeleteBatch = useCallback((batchId: string, checkIds: string[]) => {
        if (!currentUser) return;
        firestoreService.deleteBatch(batchId, checkIds);
    }, [currentUser]);

    return {
        handleAddCheck,
        handleUpdateCheck,
        handleDeleteCheck,
        handleBulkDelete,
        handleAddComment,
        handleToggleFlag,
        handleProcessBatch,
        handleDeleteBatch,
    };
};