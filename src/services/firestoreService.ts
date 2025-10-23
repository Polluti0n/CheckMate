import firebase from 'firebase/compat/app';
import { storage, db, Timestamp } from './firebase';
import { Check, Flag, Comment, AuditLog, Batch, CheckStatus, UserProfile, Notification, CurrentUser } from '../types';

const CHECKS_COLLECTION = 'checks';
const FLAGS_COLLECTION = 'flags';
const BATCHES_COLLECTION = 'batches';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'notifications';

const TimestampCompat = firebase.firestore.Timestamp;

// --- Helper to convert Firestore Timestamps to ISO strings recursively ---
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
export const onUsersSnapshot = (callback: (users: UserProfile[]) => void) => {
    return db.collection(USERS_COLLECTION).onSnapshot((snapshot) => {
        const users = snapshot.docs.map((doc) => doc.data() as UserProfile);
        callback(users);
    });
};

export const getOrCreateUserProfile = async (uid: string, email: string) => {
    console.log(`[firestoreService] getOrCreateUserProfile called for UID: ${uid}, Email: ${email}`);
    // Prevent creating a user profile for the system-auto-archive UID
    if (uid === 'system-auto-archive') {
        console.warn("[firestoreService] Attempted to get or create user profile for 'system-auto-archive'. This is not allowed.");
        return; // Do not proceed with Firestore write
    }
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        // Create a user document so they can be notified.
        // User can fill out profile details in preferences later.
        return userRef.set({
            uid,
            email,
            firstName: '',
            lastName: '',
            phone: '',
            profilePictureUrl: '',
        });
    }
};

export const updateUserProfile = (uid: string, updates: Partial<UserProfile>) => {
    return db.collection(USERS_COLLECTION).doc(uid).update(updates);
};

export const onUserProfileSnapshot = (uid: string, callback: (profile: UserProfile | null) => void) => {
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    return userRef.onSnapshot((doc) => {
        if (doc.exists) {
            callback(doc.data() as UserProfile);
        } else {
            callback(null);
        }
    });
};

export const onNotificationsSnapshot = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = db.collection(NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc');
  
  return q.onSnapshot((snapshot) => {
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id, ...processDocTimestamps(doc.data()),
    } as Notification));
    callback(notifications);
  });
};

// --- Notification Management (Client-side) ---

export const markNotificationsAsRead = (notificationIds: string[]) => {
    const batch = db.batch();
    notificationIds.forEach(id => {
        const docRef = db.collection(NOTIFICATIONS_COLLECTION).doc(id);
        batch.update(docRef, { read: true });
    });
    return batch.commit();
};

export const deleteReadNotifications = async (userId: string) => {
    const notificationsRef = db.collection(NOTIFICATIONS_COLLECTION);
    const q = notificationsRef.where('userId', '==', userId).where('read', '==', true);
    
    const snapshot = await q.get();

    if (snapshot.empty) {
        return; // No read notifications to delete
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    return batch.commit();
};


// --- Check Operations ---

export const addCheck = (checkData: Omit<Check, 'id' | 'createdAt' | 'comments' | 'auditTrail' | 'flags' | 'statusUpdatedAt' | 'batchId'>, currentUser: CurrentUser) => {
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    uid: currentUser.uid,
    user: currentUser.name,
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

export const updateCheck = (checkId: string, updates: Record<string, any>, logDetails: Omit<AuditLog, 'id' | 'timestamp'>, currentUser: CurrentUser) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  
  if (updates.status && (updates.status === CheckStatus.COMPLETE || updates.status === CheckStatus.ARCHIVED)) {
    updates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  
  const newLog: AuditLog = {
      ...logDetails,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
  };

  const updatePayload = {
      ...updates,
      auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  };

  return checkRef.update(updatePayload);
};

export const deleteCheckImage = async (imageUrl: string) => {
  if (!imageUrl) return;
  try {
    // Create a reference to the file to delete
    const imageRef = storage.refFromURL(imageUrl);
    // Delete the file
    await imageRef.delete();
  } catch (error: any) {
    // We don't want to block the user from deleting a check if the image deletion fails
    if (error.code === 'storage/object-not-found') {
        console.warn(`Image not found for deletion, but proceeding with check deletion: ${imageUrl}`);
    } else {
        console.error("Error deleting image from storage:", error);
    }
  }
};

export const deleteCheck = async (checkId: string, imageUrl?: string) => {
  if (imageUrl) {
    await deleteCheckImage(imageUrl);
  }
  return db.collection(CHECKS_COLLECTION).doc(checkId).delete();
};

export const bulkDeleteChecks = (checks: Check[], currentUser: CurrentUser) => {
    const batch = db.batch();
    const imageUrls: string[] = [];

    checks.forEach(check => {
        const checkRef = db.collection(CHECKS_COLLECTION).doc(check.id);
        batch.delete(checkRef);
        if (check.imageUrl) {
            imageUrls.push(check.imageUrl);
        }
    });

    // Delete all images from storage
    const imageDeletionPromises = imageUrls.map(url => deleteCheckImage(url));
    
    // We will wait for all image deletions to complete, but we won't block the firestore deletion
    Promise.all(imageDeletionPromises).catch(error => {
        console.error("One or more image deletions failed:", error);
    });

    return batch.commit();
};


export const addComment = (checkId: string, commentText: string, currentUser: CurrentUser) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newComment: Comment = {
      id: `com-${Date.now()}`,
      author: currentUser.name,
      authorUid: currentUser.uid,
      text: commentText,
      timestamp: new Date().toISOString(),
  };

  const newLog: AuditLog = {
      id: `log-comment-${Date.now()}`,
      uid: currentUser.uid,
      user: currentUser.name,
      field: 'Comment',
      oldValue: '',
      newValue: commentText,
      timestamp: new Date().toISOString(),
  };

  return checkRef.update({
    comments: firebase.firestore.FieldValue.arrayUnion(newComment),
    auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  });
};

export const toggleFlag = (checkId: string, flag: Flag, isAdding: boolean, currentUser: CurrentUser) => {
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      uid: currentUser.uid,
      user: currentUser.name,
      field: isAdding ? 'Flag Added' : 'Flag Removed',
      oldValue: isAdding ? 'N/A' : flag.name,
      newValue: isAdding ? flag.name : 'N/A',
      timestamp: new Date().toISOString(),
  };
  
  return checkRef.update({
    flags: isAdding ? firebase.firestore.FieldValue.arrayUnion(flag.id) : firebase.firestore.FieldValue.arrayRemove(flag.id),
    auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  });
};

export const bulkUpdateChecksStatus = (checks: Check[], newStatus: CheckStatus, actor: CurrentUser, asSystem = false) => {
    const batch = db.batch();
    checks.forEach(check => {
        if (check.status === newStatus) return; // No change needed
        const checkRef = db.collection(CHECKS_COLLECTION).doc(check.id);
        const log: AuditLog = {
            id: `log-${Date.now()}-${check.id}`,
            uid: actor.uid,
            user: asSystem ? 'System' : actor.name,
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
        // If this is a system action, add a flag to the log entry.
        // The log is still created by the logged-in user, satisfying security rules.
        if (asSystem) {
            (log as any).isSystemAction = true;
        }
        batch.update(checkRef, updates);
    });
    return batch.commit();
};

// --- Batch Operations ---

export const processBatch = (checkIds: string[], trackingNumber: string, currentUser: CurrentUser) => {
  const batchOp = db.batch();
  const newBatchRef = db.collection(BATCHES_COLLECTION).doc();
  
  batchOp.set(newBatchRef, {
    checkIds,
    trackingNumber,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    processedByUid: currentUser.uid,
    processedByName: currentUser.name,
  });

  const batchId = newBatchRef.id;
  checkIds.forEach(checkId => {
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    const log: AuditLog = {
        id: `log-${Date.now()}-${checkId}`,
        uid: currentUser.uid,
        user: currentUser.name,
        field: 'Batch Processed',
        oldValue: 'N/A',
        newValue: batchId,
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
export const addFlag = (flagData: Omit<Flag, 'id'>) => {
    return db.collection(FLAGS_COLLECTION).add(flagData);
};

export const updateFlag = (flagId: string, updates: Partial<Omit<Flag, 'id'>>) => {
    return db.collection(FLAGS_COLLECTION).doc(flagId).update(updates);
};

export const deleteFlag = (flagId: string) => {
    return db.collection(FLAGS_COLLECTION).doc(flagId).delete();
};


// --- Storage Operations ---

export const uploadCheckImage = async (file: Blob, path: string): Promise<string> => {
  const storageRef = storage.ref(`check-images/${path}`);
  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();
  return downloadURL;
};

export const uploadProfilePicture = async (file: Blob, userId: string): Promise<string> => {
  const imagePath = `profile-pictures/${userId}/profile.jpg`;
  const storageRef = storage.ref(imagePath);
  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();
  return downloadURL;
};