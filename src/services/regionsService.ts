import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Region } from '../types';

const REGIONS_COLLECTION = 'regions';

export const createRegion = async (regionData: Omit<Region, 'id' | 'createdAt'>): Promise<string> => {
    const newRegionRef = doc(collection(db, REGIONS_COLLECTION));
    const region: Partial<Region> = {
        id: newRegionRef.id,
        ...regionData,
        createdAt: new Date().toISOString()
    };

    // Using any for the serverTimestamp workaround.
    await setDoc(newRegionRef, { ...region, createdAt: serverTimestamp() } as any);
    return newRegionRef.id;
};

export const updateRegion = async (id: string, updates: Partial<Omit<Region, 'id'>>): Promise<void> => {
    const regionRef = doc(db, REGIONS_COLLECTION, id);
    await updateDoc(regionRef, updates as any);
};

export const deleteRegion = async (id: string): Promise<void> => {
    const regionRef = doc(db, REGIONS_COLLECTION, id);
    await deleteDoc(regionRef);
};

export const getRegionById = async (id: string): Promise<Region | null> => {
    const regionRef = doc(db, REGIONS_COLLECTION, id);
    const snap = await getDoc(regionRef);
    if (!snap.exists()) return null;
    return snap.data() as Region;
};

export const getRegions = async (): Promise<Region[]> => {
    const snap = await getDocs(collection(db, REGIONS_COLLECTION));
    return snap.docs.map(doc => doc.data() as Region);
};

export const onRegionsSnapshot = (callback: (regions: Region[]) => void) => {
    return onSnapshot(collection(db, REGIONS_COLLECTION), (snapshot) => {
        const regions = snapshot.docs.map(doc => doc.data() as Region);
        callback(regions);
    }, (error) => {
        console.error("Error listening to regions: ", error);
    });
};
