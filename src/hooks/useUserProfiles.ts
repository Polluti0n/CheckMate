import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserProfile } from '../types';

export function useUserProfiles(uids: string[]) {
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (uids.length === 0) {
            setProfiles([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        
        // Firestore 'in' queries are limited to 30 elements.
        // We chunk the UIDs to handle more than 30 profiles if needed.
        const chunks: string[][] = [];
        for (let i = 0; i < uids.length; i += 30) {
            chunks.push(uids.slice(i, i + 30));
        }

        const unsubscribes = chunks.map(chunk => {
            return db.collection('users').where('uid', 'in', chunk)
                .onSnapshot(snapshot => {
                    const fetchedProfiles = snapshot.docs.map(doc => doc.data() as UserProfile);
                    
                    setProfiles(currentProfiles => {
                        const profileMap = new Map(currentProfiles.map(p => [p.uid, p]));
                        fetchedProfiles.forEach(p => profileMap.set(p.uid, p));
                        return Array.from(profileMap.values());
                    });
                    setLoading(false);
                }, error => {
                    console.error("Error fetching user profiles:", error);
                    setLoading(false);
                });
        });

        return () => unsubscribes.forEach(unsub => unsub());

    }, [JSON.stringify(uids)]); // Effect dependency on stringified array

    return { profiles, loading };
}