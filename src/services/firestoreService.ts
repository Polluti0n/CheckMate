import firebase from 'firebase/compat/app';
import { storage, db } from './firebase';
import { Check, Flag, Comment, AuditLog, Batch, CheckStatus, UserProfile } from '../types';

const CHECKS_COLLECTION = 'checks';
const FLAGS_COLLECTION = 'flags';
const BATCHES_COLLECTION = 'batches';
const USERS_COLLECTION = 'users';

const TimestampCompat = firebase.firestore.Timestamp;

// Helper to convert Firestore Timestamps to ISO strings recursively
const processDocTimestamps = (data: any) => {
    if (!data) return data;
    const processedData = { ...data };
    for (const key in processedData) {
        if (processedData[key] instanceof TimestampCompat) {
            processedData[key] = (processedData[key] as firebase.firestore.Timestamp).toDate().toISOString();
        } else if (Array.isArray(processedData[key])) {
            processedData[key] = processedData[key].map((item: any) => 
                typeof item === 'object' && item !== null ? processDocTimestamps(item) : item
            );
        }
    }
    return processedData;
}

// --- Real-time Listeners ---

export const onChecksSnapshot = (callback: (checks: Check[]) => void) => {
  const q = db.collection(CHECKS_COLLECTION).orderBy('createdAt', 'desc');
  return q.onSnapshot((snapshot) => {
    const checks = snapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...processDocTimestamps(doc.data()),
      } as Check;
    });
    callback(checks);
  });
};

export const onFlagsSnapshot = (callback: (flags: Flag[]) => void) => {
  const q = db.collection(FLAGS_COLLECTION);
  return q.onSnapshot((snapshot) => {
    const flags = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Flag));
    callback(flags);
  });
};

export const onBatchesSnapshot = (callback: (batches: Batch[]) => void) => {
  const q = db.collection(BATCHES_COLLECTION).orderBy('createdAt', 'desc');
  return q.onSnapshot((snapshot) => {
    const batches = snapshot.docs.map((doc) => {
      return {
        id: doc.id,
        ...processDocTimestamps(doc.data()),
      } as Batch;
    });
    callback(batches);
  });
};

// --- User Profile ---
export const createUserProfile = (uid: string, profileData: { email: string; firstName: string; lastName: string; }) => {
    return db.collection(USERS_COLLECTION).doc(uid).set({
        uid,
        ...profileData,
        photoURL: '',
        phone: '',
    });
};

export const updateUserProfile = (uid: string, updates: Partial<UserProfile>) => {
    return db.collection(USERS_COLLECTION).doc(uid).update(updates);
};

// --- Check Operations ---

export const addCheck = (checkData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>, userProfile: UserProfile) => {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    userUid: userProfile.uid,
    userName: `${userProfile.firstName} ${userProfile.lastName}`,
    userPhotoURL: userProfile.photoURL || '',
    field: 'Check Created',
    oldValue: 'N/A',
    newValue: `Amount: $${checkData.amount.toFixed(2)}`,
    timestamp: new Date().toISOString(),
  };
  
  return db.collection(CHECKS_COLLECTION).add({
    ...checkData,
    comments: [],
    flags: [],
    auditTrail: [newLog],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
};

export const updateCheck = (checkId: string, updates: Record<string, any>, log: Omit<AuditLog, 'id' | 'timestamp' | 'userUid' | 'userName' | 'userPhotoURL'>, userProfile: UserProfile) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const { auditTrail, ...finalUpdates } = updates;

  if (finalUpdates.status && (finalUpdates.status === CheckStatus.COMPLETE || finalUpdates.status === CheckStatus.ARCHIVED)) {
    finalUpdates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  
  const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      userUid: userProfile.uid,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      userPhotoURL: userProfile.photoURL || '',
      timestamp: new Date().toISOString(),
  };

  const updatePayload = {
      ...finalUpdates,
      auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  };

  return checkRef.update(updatePayload);
};

export const deleteCheck = (checkId: string) => {
  return db.collection(CHECKS_COLLECTION).doc(checkId).delete();
};

export const addComment = (checkId: string, commentText: string, userProfile: UserProfile) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newComment: Comment = {
      id: `com-${Date.now()}`,
      authorUid: userProfile.uid,
      authorName: `${userProfile.firstName} ${userProfile.lastName}`,
      authorPhotoURL: userProfile.photoURL || '',
      text: commentText,
      timestamp: new Date().toISOString(),
  };
  return checkRef.update({
    comments: firebase.firestore.FieldValue.arrayUnion(newComment),
  });
};

export const toggleFlag = (checkId: string, flagId: string, isAdding: boolean, flagName: string, userProfile: UserProfile) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userUid: userProfile.uid,
      userName: `${userProfile.firstName} ${userProfile.lastName}`,
      userPhotoURL: userProfile.photoURL || '',
      field: isAdding ? 'Flag Added' : 'Flag Removed',
      oldValue: isAdding ? 'N/A' : flagName,
      newValue: isAdding ? flagName : 'N/A',
      timestamp: new Date().toISOString(),
  };
  return checkRef.update({
    flags: isAdding ? firebase.firestore.FieldValue.arrayUnion(flagId) : firebase.firestore.FieldValue.arrayRemove(flagId),
    auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  });
};

export const updateCheckStatus = (checkId: string, oldStatus: CheckStatus, newStatus: CheckStatus, userProfile: UserProfile) => {
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    const log: AuditLog = {
        id: `log-${Date.now()}`,
        userUid: userProfile.uid,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userPhotoURL: userProfile.photoURL || '',
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        timestamp: new Date().toISOString(),
    };
    const updates: any = {
        status: newStatus,
        auditTrail: firebase.firestore.FieldValue.arrayUnion(log),
    };
    if (newStatus === CheckStatus.COMPLETE) {
        updates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    return checkRef.update(updates);
};

// FIX: Add function to bulk update check statuses for multi-select actions.
export const bulkUpdateChecksStatus = (checks: Check[], newStatus: CheckStatus, userProfile: UserProfile) => {
    const batch = db.batch();
    checks.forEach(check => {
        if (check.status === newStatus) return; // No change needed
        const checkRef = db.collection(CHECKS_COLLECTION).doc(check.id);
        const log: AuditLog = {
            id: `log-${Date.now()}-${check.id}`,
            userUid: userProfile.uid,
            userName: `${userProfile.firstName} ${userProfile.lastName}`,
            userPhotoURL: userProfile.photoURL || '',
            field: 'status',
            oldValue: check.status,
            newValue: newStatus,
            timestamp: new Date().toISOString(),
        };
        const updates: any = {
            status: newStatus,
            auditTrail: firebase.firestore.FieldValue.arrayUnion(log),
        };
        if (newStatus === CheckStatus.COMPLETE || newStatus === CheckStatus.ARCHIVED) {
            updates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        if (newStatus === CheckStatus.ARCHIVED) {
            updates.statusBeforeArchive = check.status;
        }
        batch.update(checkRef, updates);
    });
    return batch.commit();
};

export const archiveCheck = (checkId: string, statusBeforeArchive: CheckStatus, userProfile: UserProfile) => {
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    const log: AuditLog = {
        id: `log-${Date.now()}`,
        userUid: userProfile.uid,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userPhotoURL: userProfile.photoURL || '',
        field: 'status',
        oldValue: statusBeforeArchive,
        newValue: CheckStatus.ARCHIVED,
        timestamp: new Date().toISOString(),
    };
    return checkRef.update({
        status: CheckStatus.ARCHIVED,
        statusBeforeArchive,
        statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        auditTrail: firebase.firestore.FieldValue.arrayUnion(log),
    });
};

export const unarchiveCheck = (checkId: string, statusBeforeArchive: CheckStatus | undefined, userProfile: UserProfile) => {
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    const statusToRestore = statusBeforeArchive || CheckStatus.RECEIVED;
    const log: AuditLog = {
        id: `log-${Date.now()}`,
        userUid: userProfile.uid,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userPhotoURL: userProfile.photoURL || '',
        field: 'status',
        oldValue: CheckStatus.ARCHIVED,
        newValue: statusToRestore,
        timestamp: new Date().toISOString(),
    };
    return checkRef.update({
        status: statusToRestore,
        statusBeforeArchive: firebase.firestore.FieldValue.delete(),
        auditTrail: firebase.firestore.FieldValue.arrayUnion(log),
    });
};

// --- Batch Operations ---
export const processBatch = (checkIds: string[], trackingNumber: string, userProfile: UserProfile) => {
  const batchOp = db.batch();

  const newBatchRef = db.collection(BATCHES_COLLECTION).doc();
  batchOp.set(newBatchRef, {
    checkIds,
    trackingNumber,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  const batchId = newBatchRef.id;
  checkIds.forEach(checkId => {
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    const log: AuditLog = {
        id: `log-${Date.now()}-${checkId}`,
        userUid: userProfile.uid,
        userName: `${userProfile.firstName} ${userProfile.lastName}`,
        userPhotoURL: userProfile.photoURL || '',
        field: 'Batch Processed',
        oldValue: CheckStatus.QUEUED,
        newValue: CheckStatus.COMPLETE,
        timestamp: new Date().toISOString(),
    };
    batchOp.update(checkRef, {
      status: CheckStatus.COMPLETE,
      statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      trackingNumber,
      batchId,
      auditTrail: firebase.firestore.FieldValue.arrayUnion(log),
    });
  });

  return batchOp.commit();
};


// --- Flag Management ---
export const syncFlags = async (localFlags: Flag[]) => {
    const batch = db.batch();
    const flagsCollectionRef = db.collection(FLAGS_COLLECTION);
    const firestoreFlagsSnapshot = await flagsCollectionRef.get();
    const firestoreFlags = firestoreFlagsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Flag));

    for (const localFlag of localFlags) {
        const docRef = db.collection(FLAGS_COLLECTION).doc(localFlag.id);
        batch.set(docRef, { name: localFlag.name, color: localFlag.color, textColor: localFlag.textColor });
    }

    for (const firestoreFlag of firestoreFlags) {
        if (!localFlags.some(f => f.id === firestoreFlag.id)) {
            const docRef = db.collection(FLAGS_COLLECTION).doc(firestoreFlag.id);
            batch.delete(docRef);
        }
    }

    await batch.commit();
}

// --- Storage Operations ---

export const uploadCheckImage = async (file: Blob, path: string): Promise<string> => {
  const storageRef = storage.ref(path);
  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();
  return downloadURL;
};
