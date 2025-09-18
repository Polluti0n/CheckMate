import { useCallback } from 'react';
import * as firestoreService from '../services/firestoreService';
import { Check, AuditLog, CheckStatus, CurrentUser, Comment, Flag } from '../types';

export const useCheckActions = (currentUser: CurrentUser | null, checks: Check[], flags: Flag[]) => {

    const handleAddCheck = useCallback((newCheckData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>) => {
        if (!currentUser) return;
        const initialLog: Omit<AuditLog, 'id' | 'timestamp'> = {
            user: currentUser.name, field: 'Check Created', oldValue: 'N/A', newValue: `Amount: $${newCheckData.amount.toFixed(2)}`,
        };
        const newCheck: Omit<Check, 'id'> = {
            ...newCheckData,
            createdAt: new Date().toISOString(),
            comments: [],
            auditTrail: [],
            flags: [],
            boardOrder: Date.now(), // Assign default order
        };
        firestoreService.addCheck(newCheck, initialLog);
    }, [currentUser]);

    const handleUpdateCheck = useCallback((checkId: string, updates: Partial<Check>, log: Omit<AuditLog, 'id' | 'timestamp'>) => {
        if (!currentUser) return;
        firestoreService.updateCheck(checkId, updates, log);
    }, [currentUser]);

    const handleDeleteCheck = useCallback((checkId: string) => {
        firestoreService.deleteCheck(checkId);
    }, []);

    const handleAddComment = useCallback((checkId: string, commentText: string) => {
        if (!currentUser) return;
        const newComment: Omit<Comment, 'id' | 'timestamp'> = { author: currentUser.name, text: commentText };
        firestoreService.addComment(checkId, newComment);
    }, [currentUser]);

    const handleToggleFlag = useCallback((checkId: string, flagId: string) => {
        if (!currentUser) return;
        const check = checks.find(c => c.id === checkId);
        const flag = flags.find(f => f.id === flagId);
        if (!check || !flag) return;
        const isAdding = !check.flags.includes(flagId);
        const log: Omit<AuditLog, 'id' | 'timestamp'> = {
            user: currentUser.name, field: isAdding ? 'Flag Added' : 'Flag Removed', oldValue: isAdding ? 'N/A' : flag.name, newValue: isAdding ? flag.name : 'N/A',
        };
        firestoreService.toggleFlag(checkId, flagId, isAdding, log);
    }, [currentUser, checks, flags]);
    
    const handleProcessBatch = useCallback((checkIds: string[], trackingNumber: string) => {
        firestoreService.processBatch(checkIds, trackingNumber);
    }, []);

    return {
        handleAddCheck,
        handleUpdateCheck,
        handleDeleteCheck,
        handleAddComment,
        handleToggleFlag,
        handleProcessBatch,
    };
};