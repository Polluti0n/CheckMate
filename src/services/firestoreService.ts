// FIX: Import firebase compat for namespaced access to Firestore methods and types.
import firebase from 'firebase/compat/app';
import { storage, db } from './firebase';
import { Check, Flag, Comment, AuditLog, Batch, CheckStatus } from '../types';

const CHECKS_COLLECTION = 'checks';
const FLAGS_COLLECTION = 'flags';
const BATCHES_COLLECTION = 'batches';

// FIX: Use compat version of Timestamp for instanceof checks
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
  // FIX: Use v8 compat syntax for collection, query, and onSnapshot
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
  // FIX: Use v8 compat syntax for collection and onSnapshot
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
  // FIX: Use v8 compat syntax for collection, query, and onSnapshot
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

// --- Check Operations ---

export const addCheck = (checkData: Omit<Check, 'id'>, initialLog: Omit<AuditLog, 'id' | 'timestamp'>) => {
  const { auditTrail, ...rest } = checkData;
  // FIX: Use client-side ISO string instead of serverTimestamp to avoid array creation error.
  const newLog = { ...initialLog, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
  // FIX: Use v8 compat syntax for addDoc
  return db.collection(CHECKS_COLLECTION).add({
    ...rest,
    auditTrail: [newLog],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
};

export const updateCheck = (checkId: string, updates: Record<string, any>, log: Omit<AuditLog, 'id' | 'timestamp'>) => {
  // FIX: Use v8 compat syntax for doc
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const { auditTrail, ...finalUpdates } = updates;

  // Automatically set statusUpdatedAt when status changes to a terminal state
  if (finalUpdates.status && (finalUpdates.status === CheckStatus.COMPLETE || finalUpdates.status === CheckStatus.ARCHIVED)) {
    // FIX: Use v8 compat syntax for serverTimestamp
    finalUpdates.statusUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }
  
  const newLog = {
      ...log,
      id: `log-${Date.now()}`,
      // FIX: Replace serverTimestamp with a client-side ISO string to avoid crash with arrayUnion.
      timestamp: new Date().toISOString(),
  };

  const updatePayload = {
      ...finalUpdates,
      // FIX: Use v8 compat syntax for arrayUnion
      auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  };

  // FIX: Use v8 compat syntax for updateDoc
  return checkRef.update(updatePayload);
};

export const deleteCheck = (checkId: string) => {
  // FIX: Use v8 compat syntax for deleteDoc
  return db.collection(CHECKS_COLLECTION).doc(checkId).delete();
};

export const addComment = (checkId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => {
  // FIX: Use v8 compat syntax for doc
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newComment = {
      ...comment,
      id: `com-${Date.now()}`,
      // FIX: Replace serverTimestamp with a client-side ISO string to avoid crash with arrayUnion.
      timestamp: new Date().toISOString(),
  };
  // FIX: Use v8 compat syntax for updateDoc and arrayUnion
  return checkRef.update({
    comments: firebase.firestore.FieldValue.arrayUnion(newComment),
  });
};

export const toggleFlag = (checkId: string, flagId: string, isAdding: boolean, log: Omit<AuditLog, 'id' | 'timestamp'>) => {
  // FIX: Use v8 compat syntax for doc
  const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
  const newLog = {
      ...log,
      id: `log-${Date.now()}`,
      // FIX: Replace serverTimestamp with a client-side ISO string to avoid crash with arrayUnion.
      timestamp: new Date().toISOString(),
  };
  // FIX: Use v8 compat syntax for updateDoc, arrayUnion, and arrayRemove
  return checkRef.update({
    flags: isAdding ? firebase.firestore.FieldValue.arrayUnion(flagId) : firebase.firestore.FieldValue.arrayRemove(flagId),
    auditTrail: firebase.firestore.FieldValue.arrayUnion(newLog),
  });
};

// --- Batch Operations ---

export const processBatch = (checkIds: string[], trackingNumber: string) => {
  // FIX: Use v8 compat syntax for writeBatch
  const batchOp = db.batch();

  // FIX: Use v8 compat syntax for creating a new doc ref
  const newBatchRef = db.collection(BATCHES_COLLECTION).doc();
  batchOp.set(newBatchRef, {
    checkIds,
    trackingNumber,
    // FIX: Use v8 compat syntax for serverTimestamp
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  const batchId = newBatchRef.id;
  checkIds.forEach(checkId => {
    // FIX: Use v8 compat syntax for doc
    const checkRef = db.collection(CHECKS_COLLECTION).doc(checkId);
    batchOp.update(checkRef, {
      status: CheckStatus.COMPLETE,
      // FIX: Use v8 compat syntax for serverTimestamp
      statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      trackingNumber,
      batchId,
    });
  });

  return batchOp.commit();
};


// --- Flag Management ---
export const syncFlags = async (localFlags: Flag[]) => {
    // FIX: Use v8 compat syntax for writeBatch and collection
    const batch = db.batch();
    const flagsCollectionRef = db.collection(FLAGS_COLLECTION);
    // FIX: Use v8 compat syntax for getDocs
    const firestoreFlagsSnapshot = await flagsCollectionRef.get();
    const firestoreFlags = firestoreFlagsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Flag));

    // Add or update flags
    for (const localFlag of localFlags) {
        // FIX: Use v8 compat syntax for doc
        const docRef = db.collection(FLAGS_COLLECTION).doc(localFlag.id);
        batch.set(docRef, { name: localFlag.name, color: localFlag.color, textColor: localFlag.textColor });
    }

    // Delete flags that are in Firestore but not locally
    for (const firestoreFlag of firestoreFlags) {
        if (!localFlags.some(f => f.id === firestoreFlag.id)) {
            // FIX: Use v8 compat syntax for doc
            const docRef = db.collection(FLAGS_COLLECTION).doc(firestoreFlag.id);
            batch.delete(docRef);
        }
    }

    await batch.commit();
}

// --- Storage Operations ---

export const uploadCheckImage = async (file: Blob, fileName: string): Promise<string> => {
  const imagePath = `check-images/${Date.now()}-${fileName}`;
  const storageRef = storage.ref(imagePath);

  const snapshot = await storageRef.put(file);
  const downloadURL = await snapshot.ref.getDownloadURL();
  return downloadURL;
};