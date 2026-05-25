/**
 * Backfill personal promo codes ("FirstName##") for every existing user.
 *
 * Reads `users` collection, generates a unique code per member with
 * collision avoidance, and writes:
 *   - users/{uid}.memberPromoCode
 *   - memberPromoCodes/{CODE} → { uid, fullName, createdAt }
 *
 * Usage:
 *   node scripts/generate-member-codes.mjs [--dry-run]
 *
 * Requires the same Firebase project as the live app.
 * Run this once when launching the promo, then any new sign-up
 * gets a code automatically through signUpUser().
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDorSWqTXSSvF5JzmX4APRlTAMu1jYVCZs',
  authDomain: 'zarkudu.firebaseapp.com',
  projectId: 'zarkudu',
  storageBucket: 'zarkudu.firebasestorage.app',
  messagingSenderId: '558310978632',
  appId: '1:558310978632:web:f2572a8c705f762ce9947d',
};

const DRY_RUN = process.argv.includes('--dry-run');

function generateMemberPromoCode(firstName) {
  const cleaned = (firstName || '').trim().split(/\s+/)[0] || 'Member';
  const safe = cleaned.replace(/[^A-Za-z]/g, '') || 'Member';
  const titleCase = safe.charAt(0).toUpperCase() + safe.slice(1).toLowerCase();
  const digits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${titleCase}${digits}`;
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Generating member promo codes…\n`);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const usersSnap = await getDocs(collection(db, 'users'));
  const codesSnap = await getDocs(collection(db, 'memberPromoCodes'));
  const taken = new Set(codesSnap.docs.map((d) => d.id));

  let skipped = 0;
  let created = 0;
  const rows = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data() || {};
    if (data.memberPromoCode) {
      skipped += 1;
      rows.push({ uid: userDoc.id, name: data.fullName, code: data.memberPromoCode, status: 'existing' });
      continue;
    }

    let code = generateMemberPromoCode(data.fullName || 'Member');
    let attempts = 0;
    while (taken.has(code) && attempts < 100) {
      code = generateMemberPromoCode(data.fullName || 'Member');
      attempts += 1;
    }
    if (taken.has(code)) {
      console.warn(`  ⚠ Could not find a unique code for ${userDoc.id}, skipping`);
      continue;
    }
    taken.add(code);

    rows.push({ uid: userDoc.id, name: data.fullName, code, status: 'new' });

    if (!DRY_RUN) {
      await updateDoc(doc(db, 'users', userDoc.id), { memberPromoCode: code });
      await setDoc(doc(db, 'memberPromoCodes', code), {
        uid: userDoc.id,
        fullName: data.fullName || null,
        createdAt: serverTimestamp(),
      });
    }
    created += 1;
  }

  console.table(rows);
  console.log(`\nUsers scanned:  ${usersSnap.size}`);
  console.log(`Already had a code: ${skipped}`);
  console.log(`${DRY_RUN ? 'Would create' : 'Created'}: ${created}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
