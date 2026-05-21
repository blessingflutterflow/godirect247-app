import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { PEARL_PLANS, DELIVERY_OPTIONS, type PearlPlan, type PearlSubscription, type Product, type Order, type CartItem, type MerchSize, type DeliveryRegion } from './pearl-types';

const SUBS = 'pearlSubscriptions';
const PRODUCTS = 'products';
const ORDERS = 'orders';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export async function signUpPearlUser(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  plan: PearlPlan
): Promise<{ success: boolean; uid?: string; subscriptionId?: string; error?: string }> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const planConfig = PEARL_PLANS[plan];

    const now = serverTimestamp();
    const subRef = await addDoc(collection(db, SUBS), {
      uid,
      email,
      fullName,
      phone,
      plan,
      priceAmount: planConfig.priceAmount,
      status: 'pending',
      startedAt: null,
      expiresAt: null,
      nextBillingAt: null,
      checkoutId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      fullName,
      phone,
      pearlActive: false,
      pearlPlan: plan,
      pearlSubscriptionId: subRef.id,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });

    return { success: true, uid, subscriptionId: subRef.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sign-up failed';
    return { success: false, error: msg };
  }
}

export async function loginPearlUser(email: string, password: string): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, uid: cred.user.uid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: msg };
  }
}

export async function getSubscription(subscriptionId: string): Promise<PearlSubscription | null> {
  const snap = await getDoc(doc(db, SUBS, subscriptionId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<PearlSubscription, 'id'>) };
}

export async function getActiveSubscriptionForUser(uid: string): Promise<PearlSubscription | null> {
  const snap = await getDocs(query(collection(db, SUBS), where('uid', '==', uid), where('status', '==', 'active')));
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as Omit<PearlSubscription, 'id'>) };
}

export async function attachCheckoutToSubscription(subscriptionId: string, checkoutId: string): Promise<void> {
  await updateDoc(doc(db, SUBS, subscriptionId), {
    checkoutId,
    updatedAt: serverTimestamp(),
  });
}

export async function markSubscriptionPaid(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sub = await getSubscription(subscriptionId);
    if (!sub) return { success: false, error: 'Subscription not found' };

    const startedAt = new Date();
    const expiresAt = sub.plan === 'once-off' ? addMonths(startedAt, 12) : addMonths(startedAt, 1);
    const nextBillingAt = sub.plan === 'monthly' ? addMonths(startedAt, 1) : null;

    await updateDoc(doc(db, SUBS, subscriptionId), {
      status: 'active',
      startedAt: Timestamp.fromDate(startedAt),
      expiresAt: Timestamp.fromDate(expiresAt),
      nextBillingAt: nextBillingAt ? Timestamp.fromDate(nextBillingAt) : null,
      paidAt: Timestamp.fromDate(startedAt),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'users', sub.uid), {
      pearlActive: true,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to activate subscription' };
  }
}

export async function getAllSubscriptions(): Promise<PearlSubscription[]> {
  const snap = await getDocs(query(collection(db, SUBS), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PearlSubscription, 'id'>) }));
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function listActiveProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, PRODUCTS), where('active', '==', true), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
}

export async function listAllProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, PRODUCTS), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
}

export async function getProduct(productId: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, PRODUCTS, productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
}

export async function saveProduct(payload: {
  id?: string;
  name: string;
  description: string;
  priceAmount: number;
  imageDataUrl: string;
  sizes: MerchSize[];
  active: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = serverTimestamp();
    if (payload.id) {
      await updateDoc(doc(db, PRODUCTS, payload.id), {
        name: payload.name,
        description: payload.description,
        priceAmount: payload.priceAmount,
        imageDataUrl: payload.imageDataUrl,
        sizes: payload.sizes,
        active: payload.active,
        updatedAt: now,
      });
      return { success: true, id: payload.id };
    }
    const ref = await addDoc(collection(db, PRODUCTS), {
      name: payload.name,
      description: payload.description,
      priceAmount: payload.priceAmount,
      imageDataUrl: payload.imageDataUrl,
      sizes: payload.sizes,
      active: payload.active,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: ref.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save product' };
  }
}

export async function setProductActive(productId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, PRODUCTS, productId), { active, updatedAt: serverTimestamp() });
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(payload: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  items: CartItem[];
  deliveryRegion: DeliveryRegion;
}): Promise<{ success: boolean; id?: string; totalAmount?: number; error?: string }> {
  try {
    const subtotalAmount = payload.items.reduce(
      (sum, it) => sum + it.priceAmount * it.qty,
      0,
    );
    const deliveryFee = DELIVERY_OPTIONS[payload.deliveryRegion].fee;
    const totalAmount = subtotalAmount + deliveryFee;
    const now = serverTimestamp();
    const ref = await addDoc(collection(db, ORDERS), {
      ...payload,
      subtotalAmount,
      deliveryFee,
      totalAmount,
      status: 'pending',
      checkoutId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, id: ref.id, totalAmount };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create order' };
  }
}

export async function attachCheckoutToOrder(orderId: string, checkoutId: string): Promise<void> {
  await updateDoc(doc(db, ORDERS, orderId), { checkoutId, updatedAt: serverTimestamp() });
}

export async function markOrderPaid(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, ORDERS, orderId), {
      status: 'paid',
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to mark order paid' };
  }
}

export async function listAllOrders(): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, ORDERS), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }));
}
