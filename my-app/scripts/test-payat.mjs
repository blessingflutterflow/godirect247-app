/**
 * End-to-end test for the Pay@ integration (sandbox mode).
 *
 * 1. Seeds two non-activated test users in Firestore.
 * 2. Calls /api/payat/initiate to get a Pay@ reference.
 * 3. Simulates Pay@'s success webhook -> /api/payat/notify.
 * 4. Verifies the user flips to isActivated = true.
 *
 * Usage (dev server must be running on :3000):
 *   node scripts/test-payat.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDorSWqTXSSvF5JzmX4APRlTAMu1jYVCZs',
  authDomain: 'zarkudu.firebaseapp.com',
  projectId: 'zarkudu',
  storageBucket: 'zarkudu.firebasestorage.app',
  messagingSenderId: '558310978632',
  appId: '1:558310978632:web:f2572a8c705f762ce9947d',
};

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const info = (m) => console.log(`\x1b[36m•\x1b[0m ${m}`);
const fail = (m) => { console.log(`\x1b[31m✗ ${m}\x1b[0m`); process.exitCode = 1; };

function baseUserDoc(uid, fullName) {
  return {
    uid, fullName, email: `${uid}@test.local`, phone: '0710000000', idNumber: '0000000000000',
    employmentStatus: 'Full Time', source: 'Test', planType: 'plus', tier: 'Silver Plus',
    referralCode: uid.slice(-8).toUpperCase(), referredBy: null, referredByName: '',
    beneficiary: null, spouse: null, dependents: [], extendedFamily: null,
    isActivated: false, totalPaid: 0, activationDate: null, rewardReleaseDate: null,
    families: [], funeralCoverActive: false, funeralCoverExpiry: null,
    applicationStatus: 'submitted', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
}

async function main() {
  // ── 1. Seed a login-able browser test user (left non-activated) ──────────────
  const EMAIL = 'test-payat@godirect247.co.za';
  const PASSWORD = 'Test@2026!';
  let browserUid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
    browserUid = cred.user.uid;
    ok(`Created browser test auth user (${EMAIL})`);
  } catch {
    const cred = await signInWithEmailAndPassword(auth, EMAIL, PASSWORD);
    browserUid = cred.user.uid;
    ok(`Reusing existing browser test auth user (${EMAIL})`);
  }
  await setDoc(doc(db, 'users', browserUid), baseUserDoc(browserUid, 'Browser Tester'));
  info(`Browser login → ${BASE}/login  ·  ${EMAIL} / ${PASSWORD}`);

  // ── 2. Automated flow on a separate doc-only user ────────────────────────────
  const autoUid = 'test-payat-auto';
  await setDoc(doc(db, 'users', autoUid), baseUserDoc(autoUid, 'Auto Tester'));
  ok(`Seeded automated test user (${autoUid}), isActivated=false`);

  // initiate
  const initRes = await fetch(`${BASE}/api/payat/initiate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: autoUid }),
  });
  const init = await initRes.json();
  if (!initRes.ok || !init.success) return fail(`initiate failed: ${JSON.stringify(init)}`);
  ok(`initiate → reference ${init.accountNumber} · amount R${init.amount} · sandbox=${!!init.sandbox}`);

  // simulate Pay@ success webhook (correlates by accountNumber)
  const notifyRes = await fetch(`${BASE}/api/payat/notify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: crypto.randomUUID(),
      transmissionDateTime: new Date().toISOString(),
      paymentResult: 'SUCCESS',
      paymentRspCode: 'APPROVED',
      paymentRspDescription: 'Approved',
      accountNumber: init.accountNumber,
      amountPaid: init.amount * 100,
      payatTransactionId: `test-${Date.now()}`,
    }),
  });
  const notify = await notifyRes.json();
  if (!notifyRes.ok) return fail(`notify failed (${notifyRes.status}): ${JSON.stringify(notify)}`);
  ok(`notify → HTTP ${notifyRes.status} ${JSON.stringify(notify)}`);

  // verify activation
  const after = (await getDoc(doc(db, 'users', autoUid))).data();
  if (after.isActivated === true && after.funeralCoverActive === true) {
    ok(`User is now ACTIVE · totalPaid=R${after.totalPaid} · cover active`);
  } else {
    return fail(`User not activated: isActivated=${after.isActivated}`);
  }

  // idempotency: replay the same webhook
  const replay = await fetch(`${BASE}/api/payat/notify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: crypto.randomUUID(), transmissionDateTime: new Date().toISOString(),
      paymentResult: 'SUCCESS', paymentRspCode: 'APPROVED', paymentRspDescription: 'Approved',
      accountNumber: init.accountNumber, amountPaid: init.amount * 100, payatTransactionId: `test-replay`,
    }),
  });
  const afterReplay = (await getDoc(doc(db, 'users', autoUid))).data();
  if (replay.status === 200 && afterReplay.totalPaid === after.totalPaid) {
    ok(`Idempotent: replayed webhook did not double-charge (totalPaid still R${afterReplay.totalPaid})`);
  } else {
    fail(`Idempotency broken: totalPaid went R${after.totalPaid} → R${afterReplay.totalPaid}`);
  }

  console.log('\n\x1b[1mDone.\x1b[0m Log in as the browser tester above to click the Pay@ flow yourself.');
  process.exit(process.exitCode || 0);
}

main().catch((e) => { fail(e.message); process.exit(1); });
