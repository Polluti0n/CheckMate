import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Branch } from '../types';

const BRANCHES_COLLECTION = 'branches';

export const createBranch = async (branchData: Omit<Branch, 'id' | 'createdAt'>): Promise<string> => {
    const newBranchRef = doc(collection(db, BRANCHES_COLLECTION));
    const branch: Partial<Branch> = {
        id: newBranchRef.id,
        ...branchData,
        createdAt: new Date().toISOString()
    };
    
    await setDoc(newBranchRef, { ...branch, createdAt: serverTimestamp() } as any);
    return newBranchRef.id;
};

export const updateBranch = async (id: string, updates: Partial<Omit<Branch, 'id'>>): Promise<void> => {
    const branchRef = doc(db, BRANCHES_COLLECTION, id);
    await updateDoc(branchRef, updates as any);
};

export const deleteBranch = async (id: string): Promise<void> => {
    const branchRef = doc(db, BRANCHES_COLLECTION, id);
    await deleteDoc(branchRef);
};

export const getBranchById = async (id: string): Promise<Branch | null> => {
    const branchRef = doc(db, BRANCHES_COLLECTION, id);
    const snap = await getDoc(branchRef);
    if (!snap.exists()) return null;
    return snap.data() as Branch;
};

export const getBranchesByRegion = async (regionId: string): Promise<Branch[]> => {
    const q = query(collection(db, BRANCHES_COLLECTION), where("regionId", "==", regionId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Branch);
};

export const getBranches = async (): Promise<Branch[]> => {
    const snap = await getDocs(collection(db, BRANCHES_COLLECTION));
    return snap.docs.map(doc => doc.data() as Branch);
};

export const onBranchesSnapshot = (callback: (branches: Branch[]) => void, regionId?: string) => {
    let q = query(collection(db, BRANCHES_COLLECTION));
    if (regionId) {
        q = query(collection(db, BRANCHES_COLLECTION), where("regionId", "==", regionId));
    }
    return onSnapshot(q, (snapshot) => {
        const branches = snapshot.docs.map(doc => doc.data() as Branch);
        callback(branches);
    }, (error) => {
        console.error("Error listening to branches: ", error);
    });
};
