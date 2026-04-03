import { db } from './firebase';
import { Check, CheckCategory, CheckStatus, UserProfile } from '../types';
import firebase from 'firebase/compat/app';

const CHECKS_COLLECTION = 'checks';

const MOCK_PAYORS = [
  "John R. Smitherton", "Apex Realty Group", "Blue Horizon HOA", "Sarah Jenkins",
  "Metropolitan Water District", "Pacific Gas & Electric", "Linda Thompson",
  "West Coast Developers Inc.", "Emerald Valley Association", "Robert C. Miller",
  "The Artisan Loft Co.", "Stellar Management", "Golden State Investors", "Martha V. Ruiz"
];

const MOCK_ASSOCIATIONS = [
  "Sunnyvale Highlands", "Riverview Condominiums", "Oakwood Estate", "Bayside Marina Lofts",
  "Pembrook Manor", "The Grand View", "Harbor Lights HOA", "Skyline Ridge"
];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

export const seedMockPitchData = async (currentUser: UserProfile) => {
  const batch = db.batch();

  // Generate 15-20 checks
  const count = 15;

  for (let i = 0; i < count; i++) {
    const status = getRandom(Object.values(CheckStatus));
    const category = getRandom(Object.values(CheckCategory));
    const amount = parseFloat((Math.random() * 2500 + 50).toFixed(2));

    const checkRef = db.collection(CHECKS_COLLECTION).doc();

    const mockCheck: Partial<Check> = {
      category,
      status,
      payor: getRandom(MOCK_PAYORS),
      payee: status === CheckStatus.COMPLETE ? "Operating Account" : "",
      amount,
      date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      checkNumber: Math.floor(Math.random() * 9000 + 1000).toString(),
      bankName: "Chase Bank",
      associationName: getRandom(MOCK_ASSOCIATIONS),
      memo: i % 3 === 0 ? "Monthly Assessment" : "Arrears Payment",
      isMock: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp() as any,
      auditTrail: [{
        id: `log-${Date.now()}-${i}`,
        uid: currentUser.uid,
        user: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        field: 'Check Created (Mock Data)',
        oldValue: 'N/A',
        newValue: `Amount: $${amount.toFixed(2)}`,
        timestamp: new Date().toISOString(),
      }],
      comments: i % 4 === 0 ? [{
        id: `com-${Date.now()}-${i}`,
        author: "System AI",
        authorUid: "ai-system",
        text: "Auto-verified: MICR matches previous homeowner records.",
        timestamp: new Date().toISOString()
      }] : [],
      flags: i % 5 === 0 ? [] : [] // Can add flag IDs here if needed
    };

    batch.set(checkRef, mockCheck);
  }

  return batch.commit();
};

export const deleteAllMockData = async () => {
  const snapshot = await db.collection(CHECKS_COLLECTION).where('isMock', '==', true).get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  return batch.commit();
};
