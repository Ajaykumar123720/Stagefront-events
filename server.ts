/**
 * StageFront Events — Secure Express Backend Server
 * 
 * Implements:
 * 1. Firebase Admin SDK token verification (Bearer token)
 * 2. Role-based authorization (RBAC) with server-side privilege enforcement
 * 3. Atomic seat hold transactions with automatic expiry
 * 4. Two-phase booking confirmation preventing double-booking
 * 5. Booking cancellation and inventory restoration
 * 6. Vite dev middleware mounting for seamless full-stack dev
 */

import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'], override: true });
import express, { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_EVENTS, generateEventSeatMap } from './src/data/seedData.ts';
import { BookingRecord, EventItem, SeatItem } from './src/types/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Firebase Admin SDK
let adminApp: App | null = null;
let isAdminInitialized = false;
let isFirestorePersistenceReady = false;
let firestoreReadVerified = false;
let firestoreWriteVerified = false;
let firestoreVerificationError: string | null = null;
let adminDb: FirebaseFirestore.Firestore | null = null;
let adminCredentialSource: 'service_account_json' | 'service_account_env' | 'application_default' | 'project_id_only' | 'none' = 'none';

const isStrictProduction = (): boolean =>
  process.env.NODE_ENV === 'production' || process.env.STRICT_FIRESTORE_PERSISTENCE === 'true';

function parseServiceAccountEnv(raw: string): Record<string, any> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    // Handle optional surrounding quotes
    const unquoted =
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ? trimmed.slice(1, -1)
        : trimmed;
    const parsed = JSON.parse(unquoted);
    if (parsed && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  } catch {
    // Also support Base64-encoded service account JSON
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

/**
 * Executes an actual non-destructive Firestore write + read + cleanup probe
 * against `_system_health/admin_sdk_probe` to verify live Cloud Firestore persistence.
 * Never touches `/events`, `/bookings`, `/users`, or `/admins`.
 */
async function verifyFirestoreReadWrite(): Promise<boolean> {
  if (!adminDb || adminCredentialSource === 'project_id_only' || adminCredentialSource === 'none') {
    isFirestorePersistenceReady = false;
    firestoreReadVerified = false;
    firestoreWriteVerified = false;
    firestoreVerificationError =
      'No service-account private key configured (FIREBASE_SERVICE_ACCOUNT_KEY is empty or unset).';
    return false;
  }

  try {
    const probeRef = adminDb.collection('_system_health').doc('admin_sdk_probe');
    const probeNonce = `probe-${Date.now()}`;

    // 1. Actual Firestore Write Test
    await probeRef.set({
      nonce: probeNonce,
      verifiedAt: new Date().toISOString(),
      credentialSource: adminCredentialSource,
    });
    firestoreWriteVerified = true;

    // 2. Actual Firestore Read Test
    const snap = await probeRef.get();
    if (!snap.exists || snap.data()?.nonce !== probeNonce) {
      throw new Error('Firestore probe document read did not match written nonce.');
    }
    firestoreReadVerified = true;

    // 3. Clean up temporary probe document
    await probeRef.delete();

    isFirestorePersistenceReady = true;
    firestoreVerificationError = null;
    console.log(
      `[StageFront Server] Verified live Cloud Firestore read & write access via ${adminCredentialSource}.`
    );
    return true;
  } catch (err: any) {
    isFirestorePersistenceReady = false;
    firestoreReadVerified = false;
    firestoreWriteVerified = false;
    firestoreVerificationError = err?.message || 'Firestore read/write verification failed.';
    console.error('[StageFront Server] Firestore read/write verification failed:', firestoreVerificationError);
    return false;
  }
}

try {
  const projId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'stagefront-events';
  const rawSaKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const parsedSa = parseServiceAccountEnv(rawSaKey);

  if (parsedSa && parsedSa.client_email && parsedSa.private_key) {
    adminApp = initializeApp({
      credential: cert(parsedSa),
      projectId: parsedSa.project_id || projId,
    });
    isAdminInitialized = true;
    adminCredentialSource = 'service_account_json';
    adminDb = getAdminFirestore(adminApp);
    adminDb.settings({ ignoreUndefinedProperties: true });
    console.log('[StageFront Server] Firebase Admin SDK initialized with FIREBASE_SERVICE_ACCOUNT_KEY. Verifying Firestore read/write...');
    verifyFirestoreReadWrite().catch(() => {});
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    adminApp = initializeApp({
      credential: cert({
        projectId: projId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: projId,
    });
    isAdminInitialized = true;
    adminCredentialSource = 'service_account_env';
    adminDb = getAdminFirestore(adminApp);
    adminDb.settings({ ignoreUndefinedProperties: true });
    console.log('[StageFront Server] Firebase Admin SDK initialized with FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY. Verifying Firestore read/write...');
    verifyFirestoreReadWrite().catch(() => {});
  } else if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId: projId,
    });
    isAdminInitialized = true;
    adminCredentialSource = 'application_default';
    adminDb = getAdminFirestore(adminApp);
    adminDb.settings({ ignoreUndefinedProperties: true });
    console.log('[StageFront Server] Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS. Verifying Firestore read/write...');
    verifyFirestoreReadWrite().catch(() => {});
  } else if (projId) {
    adminApp = initializeApp({
      projectId: projId,
    });
    isAdminInitialized = true;
    isFirestorePersistenceReady = false;
    adminCredentialSource = 'project_id_only';
    firestoreVerificationError =
      'No service-account private key configured (FIREBASE_SERVICE_ACCOUNT_KEY is empty or unset).';
    console.warn(
      `[StageFront Server] Firebase Admin SDK initialized with projectId="${projId}" ONLY (no service-account private key configured).`
    );
  } else if (getApps().length > 0) {
    adminApp = getApps()[0];
    isAdminInitialized = true;
  }
} catch (err: any) {
  firestoreVerificationError = err?.message || 'Error initializing Firebase Admin SDK';
  console.error('[StageFront Server] Error initializing Firebase Admin SDK:', err);
}

/**
 * Guard helper that prevents silent in-memory fallback when running in production
 * (or when STRICT_FIRESTORE_PERSISTENCE=true).
 */
function ensurePersistenceAvailable(res: Response): boolean {
  if (isStrictProduction() && (!isFirestorePersistenceReady || !adminDb)) {
    res.status(503).json({
      success: false,
      code: 'FIRESTORE_PERSISTENCE_UNCONFIGURED',
      error:
        'Service Unavailable: Firestore persistence is required in production, and silent in-memory fallback is disabled. Configure FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS on the server.',
    });
    return false;
  }
  return true;
}

// Development/Preview Local Sandbox State (ONLY used when NODE_ENV !== 'production' and service account is not yet configured)
const inMemoryEvents: EventItem[] = [...INITIAL_EVENTS];
const inMemorySeatMaps: Record<string, SeatItem[]> = {};
const inMemoryBookings: BookingRecord[] = [];

// Prepopulate development sandbox seat maps
inMemoryEvents.forEach((evt) => {
  inMemorySeatMaps[evt.id] = generateEventSeatMap(evt.id, evt.tierConfigs);
});

// Helper: Release expired holds in development sandbox
function cleanExpiredHolds(eventId: string) {
  const map = inMemorySeatMaps[eventId];
  if (!map) return;
  const now = Date.now();
  map.forEach((seat) => {
    if (seat.status === 'held' && seat.heldUntil) {
      if (new Date(seat.heldUntil).getTime() <= now) {
        seat.status = 'available';
        seat.heldBy = undefined;
        seat.heldUntil = undefined;
      }
    }
  });
}

// Helper: Evaluate whether a seat's hold has expired
function isSeatHoldActive(seat: SeatItem, nowMs: number): boolean {
  if (seat.status !== 'held' || !seat.heldUntil) return false;
  return new Date(seat.heldUntil).getTime() > nowMs;
}

// Helper: Normalize seat status if an old hold expired in Firestore
function normalizeSeatExpiry(seat: SeatItem, nowMs: number): SeatItem {
  if (seat.status === 'held' && seat.heldUntil && new Date(seat.heldUntil).getTime() <= nowMs) {
    return {
      ...seat,
      status: 'available',
      heldBy: undefined,
      heldUntil: undefined,
    };
  }
  return seat;
}

// Authenticated Request Interface
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: 'customer' | 'admin';
    token?: DecodedIdToken;
  };
}

export function getAdminEmails(): string[] {
  const envVal = process.env.ADMIN_EMAILS || 'gvajaykumar125@gmail.com';
  return envVal
    .split(',')
    .map((e) => e.replace(/['"]/g, '').trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Token Verification Middleware
 * Rejects missing, invalid, or expired tokens with HTTP 401.
 * Never trusts client-supplied identity parameters.
 */
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <Firebase_ID_Token>.',
    });
  }

  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Empty token provided in Authorization header.',
    });
  }

  let decodedToken: DecodedIdToken | null = null;

  // Cryptographically verify Firebase ID token using Google's public keys via Firebase Admin SDK
  if (isAdminInitialized && adminApp) {
    try {
      const auth = getAuth(adminApp);
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: `Unauthorized: Invalid, expired, or forged Firebase ID token (${err.code || 'auth/invalid-id-token'}).`,
        code: err.code || 'auth/invalid-id-token',
      });
    }
  } else {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Firebase Admin SDK is not initialized to verify tokens.',
    });
  }

  if (!decodedToken || !decodedToken.uid) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid, expired, or untrusted Firebase ID token.',
      code: 'auth/invalid-id-token',
    });
  }

  // Determine role strictly from Custom Claims, Firestore admin record, or server-controlled email allowlist
  const adminList = getAdminEmails();
  const normalizedEmail = (decodedToken.email || '').toLowerCase().trim();
  const isEmailAdmin = Boolean(normalizedEmail && adminList.includes(normalizedEmail));

  const role: 'customer' | 'admin' =
    decodedToken.admin === true || (decodedToken as any).role === 'admin' || isEmailAdmin
      ? 'admin'
      : 'customer';

  // If verified admin via server allowlist, ensure Firestore /admins/{uid} doc exists
  if (isEmailAdmin && adminDb) {
    try {
      adminDb.collection('admins').doc(decodedToken.uid).set(
        {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: 'admin',
          authorizedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {
      // non-blocking
    }
  }

  req.user = {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role,
    token: decodedToken,
  };

  next();
};

/**
 * Admin Role Guard Middleware
 * Rejects non-admin users with HTTP 403 Forbidden.
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Please authenticate first.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Administrator privileges required to access this resource.',
    });
  }

  next();
};

/**
 * Strict Admin Email & Token Middleware for /api/admin/*
 * Verifies Firebase ID tokens and strictly restricts access to users
 * whose emails are explicitly defined in the ADMIN_EMAILS environment variable.
 */
export const requireAdminEmail = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !req.user.email) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid Firebase ID token is required to access admin routes.',
    });
  }

  const adminEmails = getAdminEmails();
  const userEmail = req.user.email.toLowerCase().trim();

  if (!adminEmails.includes(userEmail)) {
    console.warn(`[StageFront Security] Denied /api/admin/* access to unauthorized email: ${userEmail}. Allowed ADMIN_EMAILS:`, adminEmails);
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access to /api/admin/* is strictly restricted to emails defined in the ADMIN_EMAILS environment variable.',
      authorized: false,
    });
  }

  req.user.role = 'admin';
  next();
};

/**
 * Owner or Admin Guard Middleware
 * Prevents a customer from accessing another customer's bookings.
 */
export const requireOwnerOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Please authenticate first.' });
  }

  const targetUserId = req.params.userId;
  if (req.user.role !== 'admin' && req.user.uid !== targetUserId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have permission to view or manage bookings belonging to another user.',
    });
  }

  next();
};

// ==========================================
// RAZORPAY TEST MODE CONFIGURATION & HMAC HELPERS
// Strictly server-side: secrets never leave server.ts
// ==========================================
interface RazorpayPendingOrder {
  orderId: string;
  eventId: string;
  userId: string;
  seatIds: string[];
  amountPaise: number;
  totalAmountINR: number;
  currency: 'INR';
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
}

const inMemoryRazorpayOrders = new Map<string, RazorpayPendingOrder>();

function getRazorpayConfigStatus(): {
  configured: boolean;
  mode: 'test' | 'unconfigured' | 'live_blocked';
  keyId: string | null;
  keySecret: string | null;
  message: string;
} {
  const rawKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const rawKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (rawKeyId.startsWith('rzp_live_')) {
    return {
      configured: false,
      mode: 'live_blocked',
      keyId: null,
      keySecret: null,
      message:
        'Razorpay Live Mode keys (rzp_live_*) are strictly disabled. Configure Razorpay TEST MODE credentials (rzp_test_*) only.',
    };
  }

  if (rawKeyId.startsWith('rzp_test_') && rawKeySecret.length >= 8) {
    return {
      configured: true,
      mode: 'test',
      keyId: rawKeyId,
      keySecret: rawKeySecret,
      message: 'Razorpay Test Mode gateway is configured and active (INR).',
    };
  }

  return {
    configured: false,
    mode: 'unconfigured',
    keyId: null,
    keySecret: null,
    message:
      'Razorpay Test Mode credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Unverified bookings cannot be marked as paid or confirmed.',
  };
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    const a = Buffer.from(expectedHex, 'utf8');
    const b = Buffer.from(signature.trim(), 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Razorpay Test Mode Gateway Readiness Status (never exposes secret keys)
app.get('/api/payments/razorpay/status', (_req: Request, res: Response) => {
  const rzp = getRazorpayConfigStatus();
  res.json({
    success: true,
    configured: rzp.configured,
    mode: rzp.mode,
    keyId: rzp.keyId,
    currency: 'INR',
    message: rzp.message,
  });
});

// System Health & Persistence Readiness Check
app.get('/api/health', async (req: Request, res: Response) => {
  // If service-account credentials are present and not yet verified (or ?verify=true is requested),
  // run the live Firestore write+read probe before reporting firestorePersistenceReady: true.
  if (
    adminDb &&
    adminCredentialSource !== 'project_id_only' &&
    adminCredentialSource !== 'none' &&
    (!isFirestorePersistenceReady || req.query.verify === 'true')
  ) {
    await verifyFirestoreReadWrite();
  }

  const rzp = getRazorpayConfigStatus();

  res.json({
    status: isStrictProduction() && !isFirestorePersistenceReady ? 'degraded' : 'online',
    platform: 'StageFront Events API',
    version: '2.3.0-razorpay-test-inr',
    currencyCode: 'INR',
    firebaseAdminConfigured: isAdminInitialized,
    adminCredentialSource,
    firestorePersistenceReady: isFirestorePersistenceReady,
    firestoreReadVerified,
    firestoreWriteVerified,
    firestoreVerificationError,
    razorpayTestModeConfigured: rzp.configured,
    razorpayMode: rzp.mode,
    persistenceMode: isFirestorePersistenceReady
      ? 'firestore-transactional'
      : isStrictProduction()
      ? 'blocked-missing-credentials'
      : 'dev-sandbox-in-memory',
    timestamp: new Date().toISOString(),
  });
});

// Helper: Filter and sort EventItem list according to query parameters
function filterAndSortEvents(
  events: EventItem[],
  queryParams: Record<string, string | undefined>
): EventItem[] {
  const { category, city, searchQuery, maxPrice, sortBy } = queryParams;
  let results = events.filter((e) => e.status !== 'archived');

  if (category && category !== 'all') {
    results = results.filter((e) => e.category === category);
  }

  if (city && city !== 'all') {
    results = results.filter((e) => e.venue.city.toLowerCase() === city.toLowerCase());
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.venue.name.toLowerCase().includes(q) ||
        e.venue.city.toLowerCase().includes(q) ||
        e.artistOrTeams.some((a) => a.toLowerCase().includes(q))
    );
  }

  if (maxPrice && Number(maxPrice) > 0) {
    results = results.filter((e) => e.priceStartingFrom <= Number(maxPrice));
  }

  if (sortBy === 'price_asc') {
    results.sort((a, b) => a.priceStartingFrom - b.priceStartingFrom);
  } else if (sortBy === 'price_desc') {
    results.sort((a, b) => b.priceStartingFrom - a.priceStartingFrom);
  } else if (sortBy === 'date_asc') {
    results.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  return results;
}

// Event Catalog (Public)
app.get('/api/events', async (req: Request, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    const queryParams = req.query as Record<string, string>;

    if (isFirestorePersistenceReady && adminDb) {
      const snap = await adminDb.collection('events').get();
      if (!snap.empty || isStrictProduction()) {
        const firestoreEvents = snap.docs.map((d) => d.data() as EventItem);
        const results = filterAndSortEvents(firestoreEvents, queryParams);
        return res.json({
          success: true,
          source: 'firestore',
          data: results,
          total: results.length,
        });
      }
    }

    const results = filterAndSortEvents(inMemoryEvents, queryParams);
    return res.json({
      success: true,
      source: 'dev-sandbox-pre-migration',
      data: results,
      total: results.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Event Detail (Public)
app.get('/api/events/:id', async (req: Request, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    const eventId = req.params.id;

    if (isFirestorePersistenceReady && adminDb) {
      const docSnap = await adminDb.collection('events').doc(eventId).get();
      if (docSnap.exists) {
        return res.json({ success: true, source: 'firestore', data: docSnap.data() as EventItem });
      }
      if (isStrictProduction()) {
        return res.status(404).json({ success: false, error: 'Event not found in Firestore.' });
      }
    }

    const event = inMemoryEvents.find((e) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }
    return res.json({ success: true, source: 'dev-sandbox-pre-migration', data: event });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Event Seat Matrix (Public Read with Lazy Hold Expiry Evaluation)
app.get('/api/events/:id/seats', async (req: Request, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    const eventId = req.params.id;
    const nowMs = Date.now();

    if (isFirestorePersistenceReady && adminDb) {
      const eventRef = adminDb.collection('events').doc(eventId);
      const seatsSnap = await eventRef.collection('seats').get();

      if (!seatsSnap.empty) {
        const expiredBatch = adminDb.batch();
        let expiredCount = 0;

        const seats: SeatItem[] = seatsSnap.docs.map((docSnap) => {
          const rawSeat = docSnap.data() as SeatItem;
          if (rawSeat.status === 'held' && rawSeat.heldUntil && new Date(rawSeat.heldUntil).getTime() <= nowMs) {
            expiredCount++;
            expiredBatch.update(docSnap.ref, {
              status: 'available',
              heldBy: null,
              heldUntil: null,
            });
            return normalizeSeatExpiry(rawSeat, nowMs);
          }
          return rawSeat;
        });

        if (expiredCount > 0) {
          await expiredBatch.commit();
        }

        // Sort seats consistently by row and number
        seats.sort((a, b) => (a.row === b.row ? a.number - b.number : a.row.localeCompare(b.row)));

        return res.json({
          success: true,
          source: 'firestore',
          eventId,
          totalSeats: seats.length,
          availableSeats: seats.filter((s) => s.status === 'available').length,
          data: seats,
        });
      }

      if (isStrictProduction()) {
        return res.status(404).json({
          success: false,
          error: `Seat inventory for event ${eventId} has not been initialized in Firestore.`,
        });
      }
    }

    cleanExpiredHolds(eventId);
    const seats = inMemorySeatMaps[eventId] || [];
    return res.json({
      success: true,
      source: 'dev-sandbox',
      eventId,
      totalSeats: seats.length,
      availableSeats: seats.filter((s) => s.status === 'available').length,
      data: seats,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PROTECTED ROUTES: BOOKINGS & TRANSACTIONS
// ==========================================

// Authenticated User Profile Self-Check (Server-authoritative role verification)
app.get('/api/auth/me', verifyFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  const adminList = getAdminEmails();
  const userEmail = (req.user?.email || '').toLowerCase().trim();
  const isEmailAdmin = Boolean(userEmail && adminList.includes(userEmail));
  const assignedRole = req.user?.role === 'admin' || isEmailAdmin ? 'admin' : 'customer';

  res.json({
    success: true,
    user: {
      uid: req.user?.uid,
      email: req.user?.email,
      role: assignedRole,
      isAdmin: assignedRole === 'admin',
    },
  });
});

/**
 * ATOMIC SEAT HOLD RESERVATION (Protected)
 * Uses a Firestore Transaction (`adminDb.runTransaction`) to prevent race conditions
 * across multiple server instances and restarts: checks if seats are available (or hold expired)
 * and atomically locks them with a 10-minute expiry timestamp.
 */
app.post('/api/bookings/hold', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const { eventId, seatIds, holdDurationSeconds } = req.body;
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid parameters: eventId and non-empty seatIds array are required.',
    });
  }

  if (seatIds.length > 6) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 6 seats can be held in a single reservation.',
    });
  }

  const userId = req.user!.uid;
  const now = Date.now();
  const duration = Number(holdDurationSeconds) > 0 ? Number(holdDurationSeconds) : 600;
  const heldUntil = new Date(now + duration * 1000).toISOString();
  const lockId = `lock-${now.toString(36)}-${userId.slice(0, 6)}`;

  // 1. Production Firestore Transactional Path (when event & seats are present in Firestore)
  if (isFirestorePersistenceReady && adminDb) {
    try {
      const eventRef = adminDb.collection('events').doc(eventId);
      const seatRefs = seatIds.map((id: string) => eventRef.collection('seats').doc(id));

      const firestoreHandled = await adminDb.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        const seatSnaps = await Promise.all(seatRefs.map((ref) => tx.get(ref)));

        // If event or seat subcollection has not been migrated to Firestore yet, fall back to pre-migration seat map
        if (!eventSnap.exists || !seatSnaps.every((s) => s.exists)) {
          if (isStrictProduction()) {
            const notFoundErr: any = new Error('Event or seat inventory not found in Firestore.');
            notFoundErr.statusCode = 404;
            throw notFoundErr;
          }
          return false;
        }

        const failedSeats: string[] = [];

        seatSnaps.forEach((snap, idx) => {
          const requestedId = seatIds[idx];
          const seat = snap.data() as SeatItem;
          if (seat.status === 'booked') {
            failedSeats.push(requestedId);
          } else if (seat.status === 'held' && seat.heldBy !== userId && isSeatHoldActive(seat, now)) {
            failedSeats.push(requestedId);
          }
        });

        if (failedSeats.length > 0) {
          const conflictErr: any = new Error(
            'Conflict: One or more requested seats are already booked or held by another attendee.'
          );
          conflictErr.statusCode = 409;
          conflictErr.failedSeats = failedSeats;
          throw conflictErr;
        }

        // Atomically lock all requested seats inside the Firestore transaction
        seatRefs.forEach((ref) => {
          tx.update(ref, {
            status: 'held',
            heldBy: userId,
            heldUntil,
            lockId,
          });
        });

        return true;
      });

      if (firestoreHandled) {
        // Mirror hold in in-memory seat map as well
        const seatMap = inMemorySeatMaps[eventId];
        if (seatMap) {
          seatIds.forEach((id: string) => {
            const seat = seatMap.find((s) => s.id === id);
            if (seat) {
              seat.status = 'held';
              seat.heldBy = userId;
              seat.heldUntil = heldUntil;
            }
          });
        }

        return res.json({
          success: true,
          source: 'firestore-transaction',
          lockId,
          eventId,
          heldUntil,
          seatsLocked: seatIds,
          failedSeats: [],
          message: 'Seats held atomically in Firestore for 10 minutes.',
        });
      }
    } catch (err: any) {
      const status = err.statusCode || 500;
      return res.status(status).json({
        success: false,
        failedSeats: err.failedSeats || seatIds,
        error: err.message || 'Firestore seat hold transaction failed.',
      });
    }
  }

  // 2. Pre-Migration / Development Sandbox Seat Hold Path
  cleanExpiredHolds(eventId);
  const seatMap = inMemorySeatMaps[eventId];
  if (!seatMap) {
    return res.status(404).json({ success: false, error: 'Event seat matrix not found.' });
  }

  const failedSeats: string[] = [];
  seatIds.forEach((id: string) => {
    const seat = seatMap.find((s) => s.id === id);
    if (!seat) {
      failedSeats.push(id);
    } else if (seat.status === 'booked') {
      failedSeats.push(id);
    } else if (seat.status === 'held' && seat.heldBy !== userId && isSeatHoldActive(seat, now)) {
      failedSeats.push(id);
    }
  });

  if (failedSeats.length > 0) {
    return res.status(409).json({
      success: false,
      failedSeats,
      error: 'Conflict: One or more requested seats are already booked or held by another attendee.',
    });
  }

  seatIds.forEach((id: string) => {
    const seat = seatMap.find((s) => s.id === id);
    if (seat) {
      seat.status = 'held';
      seat.heldBy = userId;
      seat.heldUntil = heldUntil;
    }
  });

  return res.json({
    success: true,
    source: 'dev-sandbox',
    lockId,
    eventId,
    heldUntil,
    seatsLocked: seatIds,
    failedSeats: [],
    message: 'Seats held successfully for 10 minutes.',
  });
});

/**
 * RELEASE HELD SEATS EARLY (Protected: Owner or Admin)
 * Uses a Firestore Transaction to release ONLY seats held by the authenticated user (or admin).
 */
app.post('/api/bookings/release', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const { eventId, seatIds } = req.body;
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing eventId or seatIds array.' });
  }

  const userId = req.user!.uid;
  const isAdmin = req.user!.role === 'admin';

  if (isFirestorePersistenceReady && adminDb) {
    try {
      const eventRef = adminDb.collection('events').doc(eventId);
      const seatRefs = seatIds.map((id: string) => eventRef.collection('seats').doc(id));

      const firestoreReleased = await adminDb.runTransaction(async (tx) => {
        const seatSnaps = await Promise.all(seatRefs.map((ref) => tx.get(ref)));
        if (!seatSnaps.some((s) => s.exists)) {
          return false;
        }
        const unauthorizedSeats: string[] = [];

        seatSnaps.forEach((snap, idx) => {
          if (!snap.exists) return;
          const seat = snap.data() as SeatItem;
          if (seat.status === 'held') {
            if (seat.heldBy === userId || isAdmin) {
              tx.update(seatRefs[idx], {
                status: 'available',
                heldBy: null,
                heldUntil: null,
              });
            } else {
              unauthorizedSeats.push(seatIds[idx]);
            }
          }
        });

        if (unauthorizedSeats.length > 0) {
          const forbiddenErr: any = new Error('Forbidden: You cannot release seats held by another user.');
          forbiddenErr.statusCode = 403;
          forbiddenErr.unauthorizedSeats = unauthorizedSeats;
          throw forbiddenErr;
        }

        return true;
      });

      if (firestoreReleased) {
        const seatMap = inMemorySeatMaps[eventId];
        if (seatMap) {
          seatMap.forEach((seat) => {
            if (seatIds.includes(seat.id) && seat.status === 'held' && (seat.heldBy === userId || isAdmin)) {
              seat.status = 'available';
              seat.heldBy = undefined;
              seat.heldUntil = undefined;
            }
          });
        }
        return res.json({ success: true, source: 'firestore-transaction', message: 'Held seats successfully released.' });
      }
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        unauthorizedSeats: err.unauthorizedSeats,
        error: err.message || 'Failed to release held seats in Firestore.',
      });
    }
  }

  const seatMap = inMemorySeatMaps[eventId];
  const unauthorizedSeats: string[] = [];

  if (seatMap) {
    seatMap.forEach((seat) => {
      if (seatIds.includes(seat.id) && seat.status === 'held') {
        if (seat.heldBy === userId || isAdmin) {
          seat.status = 'available';
          seat.heldBy = undefined;
          seat.heldUntil = undefined;
        } else {
          unauthorizedSeats.push(seat.id);
        }
      }
    });
  }

  if (unauthorizedSeats.length > 0) {
    return res.status(403).json({
      success: false,
      unauthorizedSeats,
      error: 'Forbidden: You cannot release seats held by another user.',
    });
  }

  return res.json({ success: true, source: 'dev-sandbox', message: 'Held seats successfully released.' });
});

/**
 * SERVER-SIDE RAZORPAY ORDER CREATION (Protected: Customer or Admin)
 * Creates a Razorpay Order in INR (paise) strictly in TEST MODE after verifying/acquiring active seat holds.
 */
app.post(
  '/api/payments/razorpay/create-order',
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!ensurePersistenceAvailable(res)) return;

    const rzp = getRazorpayConfigStatus();
    if (!rzp.configured || !rzp.keyId || !rzp.keySecret) {
      return res.status(503).json({
        success: false,
        code: 'RAZORPAY_TEST_NOT_CONFIGURED',
        error: rzp.message,
      });
    }

    const { eventId, seatIds } = req.body;
    if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing eventId or seatIds array for Razorpay order creation.',
      });
    }

    if (seatIds.length > 6) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 6 seats can be booked in a single transaction.',
      });
    }

    const userId = req.user!.uid;
    const now = Date.now();
    const heldUntil = new Date(now + 600 * 1000).toISOString();

    try {
      let eventTitle = 'StageFront Event';
      let seatsToPrice: SeatItem[] = [];

      if (isFirestorePersistenceReady && adminDb) {
        const eventRef = adminDb.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();
        if (eventSnap.exists) {
          const evtData = eventSnap.data() as EventItem;
          eventTitle = evtData.title;
          const seatRefs = seatIds.map((id: string) => eventRef.collection('seats').doc(id));
          const seatSnaps = await Promise.all(seatRefs.map((ref) => ref.get()));
          if (seatSnaps.every((s) => s.exists)) {
            const batch = adminDb.batch();
            for (let i = 0; i < seatSnaps.length; i++) {
              const s = seatSnaps[i].data() as SeatItem;
              if (s.status === 'booked') {
                return res.status(409).json({
                  success: false,
                  error: `Seat ${s.row}${s.number} is already booked.`,
                });
              }
              if (s.status === 'held' && s.heldBy !== userId && isSeatHoldActive(s, now)) {
                return res.status(409).json({
                  success: false,
                  error: `Seat ${s.row}${s.number} is currently held by another attendee.`,
                });
              }
              batch.update(seatRefs[i], {
                status: 'held',
                heldBy: userId,
                heldUntil,
              });
              seatsToPrice.push(s);
            }
            await batch.commit();
          }
        }
      }

      if (seatsToPrice.length === 0) {
        cleanExpiredHolds(eventId);
        const evt = inMemoryEvents.find((e) => e.id === eventId);
        const seatMap = inMemorySeatMaps[eventId];
        if (!evt || !seatMap) {
          return res.status(404).json({ success: false, error: 'Event not found.' });
        }
        eventTitle = evt.title;
        for (const id of seatIds) {
          const s = seatMap.find((seat) => seat.id === id);
          if (!s) {
            return res.status(404).json({ success: false, error: `Seat ${id} not found.` });
          }
          if (s.status === 'booked') {
            return res.status(409).json({
              success: false,
              error: `Seat ${s.row}${s.number} is already booked.`,
            });
          }
          if (s.status === 'held' && s.heldBy !== userId && isSeatHoldActive(s, now)) {
            return res.status(409).json({
              success: false,
              error: `Seat ${s.row}${s.number} is currently held by another attendee.`,
            });
          }
          // Ensure/refresh active 10-minute hold for this user during checkout
          s.status = 'held';
          s.heldBy = userId;
          s.heldUntil = heldUntil;
          seatsToPrice.push(s);
        }
      }

      const subtotal = seatsToPrice.reduce((sum, s) => sum + s.price, 0);
      const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100;
      const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
      const totalAmountINR = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;
      const amountPaise = Math.round(totalAmountINR * 100); // Integer paise for Razorpay Orders API

      const basicAuth = Buffer.from(`${rzp.keyId}:${rzp.keySecret}`).toString('base64');
      const receipt = `stg_${now.toString(36)}_${userId.slice(0, 6)}`;

      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            eventId,
            userId,
            seatIds: seatIds.join(','),
            environment: 'test',
          },
        }),
      });

      const rzpJson: any = await rzpResponse.json();
      if (!rzpResponse.ok || !rzpJson?.id) {
        return res.status(502).json({
          success: false,
          error:
            rzpJson?.error?.description ||
            'Failed to create Razorpay Test Mode order. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
        });
      }

      const orderRecord: RazorpayPendingOrder = {
        orderId: rzpJson.id,
        eventId,
        userId,
        seatIds,
        amountPaise,
        totalAmountINR,
        currency: 'INR',
        status: 'created',
        createdAt: new Date(now).toISOString(),
      };

      inMemoryRazorpayOrders.set(rzpJson.id, orderRecord);
      if (isFirestorePersistenceReady && adminDb) {
        await adminDb
          .collection('payment_orders')
          .doc(rzpJson.id)
          .set(orderRecord, { merge: true })
          .catch(() => {});
      }

      return res.json({
        success: true,
        keyId: rzp.keyId,
        orderId: rzpJson.id,
        amount: amountPaise,
        currency: 'INR',
        totalAmountINR,
        eventTitle,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error creating Razorpay Test Mode order.',
      });
    }
  }
);

/**
 * RAZORPAY WEBHOOK HANDLER (POST /api/webhooks/razorpay)
 * Verifies X-Razorpay-Signature using RAZORPAY_WEBHOOK_SECRET and updates payment order status idempotently.
 */
app.post('/api/webhooks/razorpay', async (req: Request, res: Response) => {
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const signature = (req.headers['x-razorpay-signature'] as string) || '';

  if (!webhookSecret || !signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing RAZORPAY_WEBHOOK_SECRET configuration or X-Razorpay-Signature header.',
    });
  }

  const rawPayload = JSON.stringify(req.body);
  const expectedHex = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

  try {
    const a = Buffer.from(expectedHex, 'utf8');
    const b = Buffer.from(signature.trim(), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ success: false, error: 'Invalid Razorpay webhook signature.' });
    }
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid Razorpay webhook signature.' });
  }

  const eventType = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  if (orderId) {
    const existing = inMemoryRazorpayOrders.get(orderId);
    if (existing) {
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        existing.status = 'paid';
      } else if (eventType === 'payment.failed') {
        existing.status = 'failed';
      }
    }
    if (isFirestorePersistenceReady && adminDb) {
      await adminDb
        .collection('payment_orders')
        .doc(orderId)
        .set(
          {
            orderId,
            paymentId: paymentId || null,
            webhookEvent: eventType || 'unknown',
            status:
              eventType === 'payment.captured' || eventType === 'order.paid'
                ? 'paid'
                : eventType === 'payment.failed'
                ? 'failed'
                : 'created',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
        .catch(() => {});
    }
  }

  return res.json({ success: true, received: true });
});

/**
 * ATOMIC BOOKING CONFIRMATION (Protected)
 * Strictly requires a verified Razorpay Test Mode payment signature before marking any booking
 * as paid/confirmed or marking any seats as booked.
 */
app.post(
  ['/api/bookings/confirm', '/api/payments/razorpay/verify'],
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!ensurePersistenceAvailable(res)) return;

    const {
      eventId,
      seatIds,
      paymentMethod,
      userName,
      userEmail,
      idempotencyKey,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing required booking parameters.' });
    }

    // PRIORITY 2 GUARD: Never mark a booking as paid or confirmed without verified Razorpay Test Mode payment
    const rzp = getRazorpayConfigStatus();
    if (!rzp.configured || !rzp.keySecret) {
      return res.status(503).json({
        success: false,
        code: 'RAZORPAY_TEST_NOT_CONFIGURED',
        error:
          'Payment Not Configured: Razorpay Test Mode credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Bookings cannot be marked as paid or confirmed without verified Razorpay payment.',
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(402).json({
        success: false,
        code: 'PAYMENT_VERIFICATION_REQUIRED',
        error:
          'Unverified Payment Blocked: razorpayOrderId, razorpayPaymentId, and razorpaySignature are required to confirm a booking.',
      });
    }

    const isSignatureValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      rzp.keySecret
    );

    if (!isSignatureValid) {
      return res.status(402).json({
        success: false,
        code: 'INVALID_PAYMENT_SIGNATURE',
        error: 'Payment verification failed: Invalid Razorpay HMAC-SHA256 payment signature.',
      });
    }

    const userId = req.user!.uid;
    const now = Date.now();
    const normalizedSeatKey = [...seatIds].sort().join(',');
    const verifiedTxId = razorpayPaymentId || idempotencyKey;

    // Cross-verify against recorded Razorpay order if tracked in memory
    const trackedOrder = inMemoryRazorpayOrders.get(razorpayOrderId);
    if (trackedOrder && (trackedOrder.userId !== userId || trackedOrder.eventId !== eventId)) {
      return res.status(403).json({
        success: false,
        error: 'Payment order mismatch: This Razorpay order belongs to a different user or event.',
      });
    }

    // 1. Production Firestore Transactional Path (Always persists confirmed bookings to Firestore /bookings)
    if (isFirestorePersistenceReady && adminDb) {
      try {
        const eventRef = adminDb.collection('events').doc(eventId);
        const seatRefs = seatIds.map((id: string) => eventRef.collection('seats').doc(id));
        const bookingsCol = adminDb.collection('bookings');

        const result = await adminDb.runTransaction(async (tx) => {
          // Idempotency Check inside Transaction: query existing confirmed bookings for this user + event
          const existingQuery = bookingsCol
            .where('userId', '==', userId)
            .where('eventId', '==', eventId);
          const existingSnap = await tx.get(existingQuery);

          for (const docSnap of existingSnap.docs) {
            const b = docSnap.data() as BookingRecord;
            if (b.status !== 'confirmed') continue;
            if (
              (verifiedTxId && b.paymentTransactionId === verifiedTxId) ||
              (razorpayPaymentId && b.razorpayPaymentId === razorpayPaymentId) ||
              (razorpayOrderId && b.razorpayOrderId === razorpayOrderId)
            ) {
              return { booking: b, idempotentReplay: true, usedFirestoreSeats: false };
            }
            const bookedKey = b.seats.map((s) => s.seatId).sort().join(',');
            const createdAgeMs = now - new Date(b.createdAt).getTime();
            if (bookedKey === normalizedSeatKey && createdAgeMs < 60000) {
              return { booking: b, idempotentReplay: true, usedFirestoreSeats: false };
            }
          }

          const eventSnap = await tx.get(eventRef);
          const seatSnaps = await Promise.all(seatRefs.map((ref) => tx.get(ref)));
          const hasFirestoreEventAndSeats = eventSnap.exists && seatSnaps.every((s) => s.exists);

          let event: EventItem;
          const seatsToBook: SeatItem[] = [];

          if (hasFirestoreEventAndSeats) {
            event = eventSnap.data() as EventItem;
            for (let i = 0; i < seatSnaps.length; i++) {
              const snap = seatSnaps[i];
              const seat = snap.data() as SeatItem;
              if (seat.status === 'booked') {
                const err: any = new Error(`Seat ${seat.row}${seat.number} is already booked.`);
                err.statusCode = 409;
                throw err;
              }
              if (seat.status === 'held' && seat.heldBy !== userId && isSeatHoldActive(seat, now)) {
                const err: any = new Error(
                  `Seat ${seat.row}${seat.number} is currently held by another attendee.`
                );
                err.statusCode = 409;
                throw err;
              }
              seatsToBook.push(seat);
            }
          } else {
            if (isStrictProduction()) {
              const err: any = new Error('Event or seat inventory not found in Firestore.');
              err.statusCode = 404;
              throw err;
            }
            cleanExpiredHolds(eventId);
            const memEvt = inMemoryEvents.find((e) => e.id === eventId);
            const memSeatMap = inMemorySeatMaps[eventId];
            if (!memEvt || !memSeatMap) {
              const err: any = new Error('Event not found.');
              err.statusCode = 404;
              throw err;
            }
            event = memEvt;
            for (const requestedId of seatIds) {
              const seat = memSeatMap.find((s) => s.id === requestedId);
              if (!seat) {
                const err: any = new Error(`Seat ${requestedId} not found in inventory.`);
                err.statusCode = 404;
                throw err;
              }
              if (seat.status === 'booked') {
                const err: any = new Error(`Seat ${seat.row}${seat.number} is already booked.`);
                err.statusCode = 409;
                throw err;
              }
              if (seat.status === 'held' && seat.heldBy !== userId && isSeatHoldActive(seat, now)) {
                const err: any = new Error(
                  `Seat ${seat.row}${seat.number} is currently held by another attendee.`
                );
                err.statusCode = 409;
                throw err;
              }
              seatsToBook.push(seat);
            }
          }

          // Calculate pricing server-side in INR
          const subtotal = seatsToBook.reduce((sum, s) => sum + s.price, 0);
          const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100;
          const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
          const totalAmount = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

          const bookingId = `bkg-${now.toString(36)}-${userId.slice(0, 5)}`;
          const bookingRef = `STG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
          const token = `STG-PASS-${event.id}-${seatsToBook.map((s) => `${s.row}${s.number}`).join('-')}-${now.toString(36).toUpperCase()}`;

          const newBooking: BookingRecord = {
            id: bookingId,
            bookingReference: bookingRef,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.dateTime,
            venueName: event.venue.name,
            venueCity: event.venue.city,
            category: event.category,
            bannerUrl: event.bannerUrl,
            userId,
            userName: userName || req.user?.email?.split('@')[0] || 'Customer',
            userEmail: userEmail || req.user?.email || '',
            seats: seatsToBook.map((s) => ({
              seatId: s.id,
              row: s.row,
              number: s.number,
              tier: s.tier,
              price: s.price,
              currencyCode: 'INR',
            })),
            subtotal,
            convenienceFee,
            taxAmount,
            totalAmount,
            currencyCode: 'INR',
            status: 'confirmed',
            paymentMethod: paymentMethod || 'Razorpay Test Mode (INR)',
            paymentTransactionId: verifiedTxId,
            razorpayOrderId,
            razorpayPaymentId,
            createdAt: new Date(now).toISOString(),
            qrCodeToken: token,
          };

          if (hasFirestoreEventAndSeats) {
            // Atomically mark each seat as booked in Firestore
            seatRefs.forEach((ref) => {
              tx.update(ref, {
                status: 'booked',
                heldBy: null,
                heldUntil: null,
                bookedBy: userId,
                bookingId: newBooking.id,
              });
            });

            // Atomically decrement availableSeats on the event document
            const updatedAvailable = Math.max(0, (event.availableSeats || 0) - seatsToBook.length);
            tx.update(eventRef, { availableSeats: updatedAvailable });
          }

          // Atomically write the confirmed booking document to Firestore /bookings/{bookingId}
          const bookingDocRef = bookingsCol.doc(newBooking.id);
          tx.set(bookingDocRef, newBooking);

          return {
            booking: newBooking,
            idempotentReplay: false,
            usedFirestoreSeats: hasFirestoreEventAndSeats,
          };
        });

        // Synchronize in-memory seat map and bookings list
        if (!result.idempotentReplay) {
          const memSeatMap = inMemorySeatMaps[eventId];
          const memEvt = inMemoryEvents.find((e) => e.id === eventId);
          if (memSeatMap) {
            seatIds.forEach((id: string) => {
              const s = memSeatMap.find((seat) => seat.id === id);
              if (s) {
                s.status = 'booked';
                s.heldBy = undefined;
                s.heldUntil = undefined;
              }
            });
            if (memEvt) {
              memEvt.availableSeats = memSeatMap.filter((s) => s.status === 'available').length;
            }
          }
          if (!inMemoryBookings.some((b) => b.id === result.booking.id)) {
            inMemoryBookings.unshift(result.booking);
          }
          if (trackedOrder) {
            trackedOrder.status = 'paid';
          }
          await adminDb
            .collection('payment_orders')
            .doc(razorpayOrderId)
            .set(
              {
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
                bookingId: result.booking.id,
                status: 'paid',
                verifiedAt: new Date(now).toISOString(),
              },
              { merge: true }
            )
            .catch(() => {});
        }

        return res.status(200).json({
          success: true,
          source: 'firestore-transaction',
          idempotentReplay: result.idempotentReplay,
          data: result.booking,
          message: result.idempotentReplay
            ? 'Idempotent replay: Booking already confirmed.'
            : 'Booking confirmed atomically in Firestore after verified Razorpay Test Mode payment.',
        });
      } catch (err: any) {
        return res.status(err.statusCode || 500).json({
          success: false,
          error: err.message || 'Firestore booking confirmation transaction failed.',
        });
      }
    }

    // 2. Development Sandbox Path (still requires verified Razorpay Test Mode signature above!)
    cleanExpiredHolds(eventId);
    const existingDuplicate = inMemoryBookings.find((b) => {
      if (b.status !== 'confirmed' || b.userId !== userId || b.eventId !== eventId) return false;
      if (
        (verifiedTxId && b.paymentTransactionId === verifiedTxId) ||
        (razorpayPaymentId && b.razorpayPaymentId === razorpayPaymentId) ||
        (razorpayOrderId && b.razorpayOrderId === razorpayOrderId)
      ) {
        return true;
      }
      const bookedKey = b.seats.map((s) => s.seatId).sort().join(',');
      const createdAgeMs = now - new Date(b.createdAt).getTime();
      return bookedKey === normalizedSeatKey && createdAgeMs < 60000;
    });

    if (existingDuplicate) {
      return res.status(200).json({
        success: true,
        source: 'dev-sandbox',
        idempotentReplay: true,
        data: existingDuplicate,
        message: 'Idempotent replay: Booking already confirmed.',
      });
    }

    const event = inMemoryEvents.find((e) => e.id === eventId);
    const seatMap = inMemorySeatMaps[eventId];

    if (!event || !seatMap) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const seatsToBook: SeatItem[] = [];
    for (const id of seatIds) {
      const seat = seatMap.find((s) => s.id === id);
      if (!seat) {
        return res.status(404).json({ success: false, error: `Seat ${id} not found in inventory.` });
      }
      if (seat.status === 'booked') {
        return res.status(409).json({ success: false, error: `Seat ${seat.row}${seat.number} is already booked.` });
      }
      if (seat.status === 'held' && seat.heldBy !== userId && isSeatHoldActive(seat, now)) {
        return res.status(409).json({
          success: false,
          error: `Seat ${seat.row}${seat.number} is currently held by another attendee.`,
        });
      }
      seatsToBook.push(seat);
    }

    const subtotal = seatsToBook.reduce((sum, s) => sum + s.price, 0);
    const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100;
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
    const totalAmount = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

    const bookingRef = `STG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const token = `STG-PASS-${event.id}-${seatsToBook.map((s) => `${s.row}${s.number}`).join('-')}-${now.toString(36).toUpperCase()}`;

    seatsToBook.forEach((seat) => {
      seat.status = 'booked';
      seat.heldBy = undefined;
      seat.heldUntil = undefined;
    });

    const remaining = seatMap.filter((s) => s.status === 'available').length;
    event.availableSeats = remaining;

    const newBooking: BookingRecord = {
      id: `bkg-${now.toString(36)}-${userId.slice(0, 5)}`,
      bookingReference: bookingRef,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.dateTime,
      venueName: event.venue.name,
      venueCity: event.venue.city,
      category: event.category,
      bannerUrl: event.bannerUrl,
      userId,
      userName: userName || req.user?.email?.split('@')[0] || 'Customer',
      userEmail: userEmail || req.user?.email || '',
      seats: seatsToBook.map((s) => ({
        seatId: s.id,
        row: s.row,
        number: s.number,
        tier: s.tier,
        price: s.price,
        currencyCode: 'INR',
      })),
      subtotal,
      convenienceFee,
      taxAmount,
      totalAmount,
      currencyCode: 'INR',
      status: 'confirmed',
      paymentMethod: paymentMethod || 'Razorpay Test Mode (INR)',
      paymentTransactionId: verifiedTxId,
      razorpayOrderId,
      razorpayPaymentId,
      createdAt: new Date(now).toISOString(),
      qrCodeToken: token,
    };

    inMemoryBookings.unshift(newBooking);
    if (trackedOrder) {
      trackedOrder.status = 'paid';
    }

    return res.json({
      success: true,
      source: 'dev-sandbox',
      data: newBooking,
      message: 'Booking confirmed after verified Razorpay Test Mode payment.',
    });
  }
);

/**
 * ATOMIC BOOKING CANCELLATION (Protected: Owner or Admin)
 * Uses a Firestore Transaction (`adminDb.runTransaction`) to verify ownership,
 * enforce cancellation idempotency, mark the booking cancelled, and restore seat inventory.
 */
app.post('/api/bookings/cancel/:id', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const bookingId = req.params.id;
  const userId = req.user!.uid;
  const isAdmin = req.user!.role === 'admin';

  if (isFirestorePersistenceReady && adminDb) {
    try {
      const bookingRef = adminDb.collection('bookings').doc(bookingId);

      const cancelledBooking = await adminDb.runTransaction(async (tx) => {
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists) {
          const err: any = new Error('Booking not found.');
          err.statusCode = 404;
          throw err;
        }

        const booking = bookingSnap.data() as BookingRecord;
        if (!isAdmin && booking.userId !== userId) {
          const err: any = new Error('Forbidden: You do not have permission to cancel this booking.');
          err.statusCode = 403;
          throw err;
        }

        if (booking.status === 'cancelled') {
          const err: any = new Error('Booking is already cancelled.');
          err.statusCode = 400;
          throw err;
        }

        const eventRef = adminDb!.collection('events').doc(booking.eventId);
        const eventSnap = await tx.get(eventRef);
        const seatRefs = booking.seats.map((s) => eventRef.collection('seats').doc(s.seatId));
        const seatSnaps = await Promise.all(seatRefs.map((ref) => tx.get(ref)));

        // Restore booked seats back to available in Firestore if present
        seatSnaps.forEach((snap, idx) => {
          if (snap.exists) {
            tx.update(seatRefs[idx], {
              status: 'available',
              heldBy: null,
              heldUntil: null,
              bookedBy: null,
              bookingId: null,
            });
          }
        });

        if (eventSnap.exists) {
          const eventData = eventSnap.data() as EventItem;
          const restoredAvailable = Math.min(
            eventData.totalSeats || 160,
            (eventData.availableSeats || 0) + booking.seats.length
          );
          tx.update(eventRef, { availableSeats: restoredAvailable });
        }

        const updatedBooking: BookingRecord = {
          ...booking,
          status: 'cancelled',
        };
        tx.update(bookingRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        });

        return updatedBooking;
      });

      // Also restore seat availability in in-memory seat map
      const seatMap = inMemorySeatMaps[cancelledBooking.eventId];
      if (seatMap) {
        const seatIds = cancelledBooking.seats.map((s) => s.seatId);
        seatMap.forEach((seat) => {
          if (seatIds.includes(seat.id)) {
            seat.status = 'available';
            seat.heldBy = undefined;
            seat.heldUntil = undefined;
          }
        });
        const event = inMemoryEvents.find((e) => e.id === cancelledBooking.eventId);
        if (event) {
          event.availableSeats = seatMap.filter((s) => s.status === 'available').length;
        }
      }
      const memBooking = inMemoryBookings.find((b) => b.id === bookingId);
      if (memBooking) {
        memBooking.status = 'cancelled';
      }

      return res.json({
        success: true,
        source: 'firestore-transaction',
        data: cancelledBooking,
        message: 'Booking cancelled atomically in Firestore and seats released.',
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Firestore booking cancellation transaction failed.',
      });
    }
  }

  // Development Sandbox Path
  const booking = inMemoryBookings.find((b) => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found.' });
  }

  if (!isAdmin && booking.userId !== userId) {
    return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to cancel this booking.' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'Booking is already cancelled.' });
  }

  booking.status = 'cancelled';

  const seatMap = inMemorySeatMaps[booking.eventId];
  if (seatMap) {
    const seatIds = booking.seats.map((s) => s.seatId);
    seatMap.forEach((seat) => {
      if (seatIds.includes(seat.id)) {
        seat.status = 'available';
        seat.heldBy = undefined;
        seat.heldUntil = undefined;
      }
    });

    const event = inMemoryEvents.find((e) => e.id === booking.eventId);
    if (event) {
      event.availableSeats = seatMap.filter((s) => s.status === 'available').length;
    }
  }

  return res.json({
    success: true,
    source: 'dev-sandbox',
    data: booking,
    message: 'Booking cancelled successfully and seats released.',
  });
});

// Customer Bookings by User ID (Protected: Owner or Admin only)
app.get('/api/bookings/user/:userId', verifyFirebaseToken, requireOwnerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    const targetUserId = req.params.userId;

    if (isFirestorePersistenceReady && adminDb) {
      const snap = await adminDb
        .collection('bookings')
        .where('userId', '==', targetUserId)
        .get();
      const mergedMap = new Map<string, BookingRecord>();
      inMemoryBookings
        .filter((b) => b.userId === targetUserId)
        .forEach((b) => mergedMap.set(b.id, b));
      snap.docs.forEach((d) => {
        const b = d.data() as BookingRecord;
        mergedMap.set(b.id || d.id, { ...b, id: b.id || d.id });
      });
      const userBookings = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return res.json({
        success: true,
        source: 'firestore',
        data: userBookings,
        total: userBookings.length,
      });
    }

    const userBookings = inMemoryBookings.filter((b) => b.userId === targetUserId);
    return res.json({
      success: true,
      source: 'dev-sandbox',
      data: userBookings,
      total: userBookings.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Single Booking Details by ID (Protected: Owner or Admin only)
app.get('/api/bookings/:id', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    const bookingId = req.params.id;
    const userId = req.user!.uid;
    const isAdmin = req.user!.role === 'admin';

    if (isFirestorePersistenceReady && adminDb) {
      const snap = await adminDb.collection('bookings').doc(bookingId).get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Booking not found.' });
      }
      const booking = snap.data() as BookingRecord;
      if (!isAdmin && booking.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Forbidden: You do not own this booking.' });
      }
      return res.json({ success: true, source: 'firestore', data: booking });
    }

    const booking = inMemoryBookings.find((b) => b.id === bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    if (!isAdmin && booking.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this booking.' });
    }
    return res.json({ success: true, source: 'dev-sandbox', data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN ROUTE PROTECTION MIDDLEWARE
// Applies Firebase ID token verification and ADMIN_EMAILS check to all /api/admin/* routes
// ==========================================
app.use('/api/admin', verifyFirebaseToken, requireAdminEmail);

// Admin Telemetry & Metrics
app.get('/api/admin/metrics', async (_req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  try {
    let allEvents: EventItem[] = inMemoryEvents;
    let allBookings: BookingRecord[] = inMemoryBookings;

    if (isFirestorePersistenceReady && adminDb) {
      const [eventsSnap, bookingsSnap] = await Promise.all([
        adminDb.collection('events').get(),
        adminDb.collection('bookings').get(),
      ]);
      allEvents = eventsSnap.docs.map((d) => d.data() as EventItem);
      allBookings = bookingsSnap.docs
        .map((d) => d.data() as BookingRecord)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const confirmedBookings = allBookings.filter((b) => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTicketsSold = confirmedBookings.reduce((sum, b) => sum + b.seats.length, 0);

    const activeEvents = allEvents.filter((e) => e.status !== 'archived');
    const totalCapacity = activeEvents.reduce((sum, e) => sum + e.totalSeats, 0);
    const availableSeats = activeEvents.reduce((sum, e) => sum + e.availableSeats, 0);
    const bookedSeats = Math.max(0, totalCapacity - availableSeats);
    const occupancyRate = totalCapacity > 0 ? Math.round((bookedSeats / totalCapacity) * 100) : 0;

    const uniqueCustomerUids = new Set(allBookings.map((b) => b.userId));
    const categories = ['concert', 'cricket', 'football', 'entertainment'] as const;
    const categorySalesDistribution = categories.map((cat) => {
      const catBookings = confirmedBookings.filter((b) => b.category === cat);
      return {
        category: cat,
        count: catBookings.reduce((sum, b) => sum + b.seats.length, 0),
        revenue: Math.round(catBookings.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100,
      };
    });

    return res.json({
      success: true,
      source: isFirestorePersistenceReady ? 'firestore' : 'dev-sandbox',
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings: confirmedBookings.length,
        totalTicketsSold,
        totalEvents: activeEvents.length,
        activeEventsCount: activeEvents.length,
        registeredCustomers: Math.max(uniqueCustomerUids.size, 1),
        availableSeats,
        bookedSeats,
        averageTicketValue: totalTicketsSold > 0 ? Math.round((totalRevenue / totalTicketsSold) * 100) / 100 : 0,
        occupancyRate,
        categorySalesDistribution,
        recentBookings: allBookings.slice(0, 15),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Create Event (creates both /events/{id} and /events/{id}/seats/{seatId} batch in Firestore)
app.post('/api/admin/events', async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const newEventData = req.body;
  if (!newEventData.title || newEventData.title.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Valid event title is required.' });
  }

  const newId = `evt-${Date.now().toString(36)}`;
  const generatedSeats = generateEventSeatMap(newId, newEventData.tierConfigs);
  const availableCount = generatedSeats.filter((s) => s.status === 'available').length;

  const newEvent: EventItem = {
    ...newEventData,
    id: newId,
    currencyCode: 'INR',
    totalSeats: generatedSeats.length,
    availableSeats: availableCount,
    status: newEventData.status || 'upcoming',
  };

  if (isFirestorePersistenceReady && adminDb) {
    try {
      const batch = adminDb.batch();
      const eventRef = adminDb.collection('events').doc(newId);
      batch.set(eventRef, newEvent);
      for (const seat of generatedSeats) {
        const seatRef = eventRef.collection('seats').doc(seat.id);
        batch.set(seatRef, {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          tier: seat.tier,
          price: seat.price,
          currencyCode: 'INR',
          status: seat.status,
          heldBy: seat.heldBy ?? null,
          heldUntil: seat.heldUntil ?? null,
        });
      }
      await batch.commit();

      return res.json({
        success: true,
        source: 'firestore',
        data: newEvent,
        message: 'Event and seat inventory created in Firestore.',
      });
    } catch (dbErr: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to persist new event to Firestore: ${dbErr.message}`,
      });
    }
  }

  inMemoryEvents.unshift(newEvent);
  inMemorySeatMaps[newId] = generatedSeats;

  return res.json({
    success: true,
    source: 'dev-sandbox',
    data: newEvent,
    message: 'Event created by authorized administrator.',
  });
});

// Admin Update Event (PUT /api/admin/events/:id)
app.put('/api/admin/events/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const eventId = req.params.id;
  const updateData = req.body;

  if (updateData.title && updateData.title.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Event title must be at least 2 characters long.' });
  }

  if (isFirestorePersistenceReady && adminDb) {
    try {
      const eventRef = adminDb.collection('events').doc(eventId);
      const snap = await eventRef.get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Event not found in Firestore.' });
      }
      const existing = snap.data() as EventItem;
      const updatedEvent: EventItem = {
        ...existing,
        ...updateData,
        id: eventId,
        totalSeats: existing.totalSeats,
        availableSeats: existing.availableSeats,
      };
      await eventRef.set(updatedEvent, { merge: true });
      return res.json({
        success: true,
        source: 'firestore',
        data: updatedEvent,
        message: 'Event updated in Firestore.',
      });
    } catch (dbErr: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to update event in Firestore: ${dbErr.message}`,
      });
    }
  }

  const index = inMemoryEvents.findIndex((e) => e.id === eventId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  const existing = inMemoryEvents[index];
  const updatedEvent: EventItem = {
    ...existing,
    ...updateData,
    id: eventId,
    totalSeats: existing.totalSeats,
    availableSeats: existing.availableSeats,
  };

  inMemoryEvents[index] = updatedEvent;

  return res.json({
    success: true,
    source: 'dev-sandbox',
    data: updatedEvent,
    message: 'Event updated successfully.',
  });
});

// Admin Delete Event (DELETE /api/admin/events/:id)
app.delete('/api/admin/events/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!ensurePersistenceAvailable(res)) return;

  const eventId = req.params.id;

  if (isFirestorePersistenceReady && adminDb) {
    try {
      const eventRef = adminDb.collection('events').doc(eventId);
      const eventSnap = await eventRef.get();
      if (!eventSnap.exists) {
        return res.status(404).json({ success: false, error: 'Event not found in Firestore.' });
      }
      const removedEvent = eventSnap.data() as EventItem;

      // Delete nested /seats subcollection documents and event document in a batch
      const seatsSnap = await eventRef.collection('seats').get();
      const batch = adminDb.batch();
      seatsSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      batch.delete(eventRef);

      // Cancel associated bookings in Firestore
      const bookingsSnap = await adminDb.collection('bookings').where('eventId', '==', eventId).get();
      bookingsSnap.docs.forEach((bDoc) => {
        batch.update(bDoc.ref, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      });

      await batch.commit();

      return res.json({
        success: true,
        source: 'firestore',
        eventId,
        message: `Event "${removedEvent.title}" and its seat inventory were deleted from Firestore.`,
      });
    } catch (dbErr: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to delete event from Firestore: ${dbErr.message}`,
      });
    }
  }

  const index = inMemoryEvents.findIndex((e) => e.id === eventId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  const removedEvent = inMemoryEvents.splice(index, 1)[0];
  delete inMemorySeatMaps[eventId];

  inMemoryBookings.forEach((b) => {
    if (b.eventId === eventId) {
      b.status = 'cancelled';
    }
  });

  return res.json({
    success: true,
    source: 'dev-sandbox',
    eventId,
    message: `Event "${removedEvent.title}" and its seat inventory were successfully deleted.`,
  });
});

/**
 * Admin Idempotent Event & Seat Subcollection Migration Endpoint (POST /api/admin/migrate-firestore)
 * Ensures all INITIAL_EVENTS and existing /events documents have populated
 * /events/{eventId}/seats/{seatId} subcollections in Cloud Firestore without overwriting booked seats.
 */
app.post('/api/admin/migrate-firestore', async (req: AuthenticatedRequest, res: Response) => {
  if (!isFirestorePersistenceReady || !adminDb) {
    return res.status(503).json({
      success: false,
      code: 'FIRESTORE_PERSISTENCE_UNCONFIGURED',
      error:
        'Cannot run Firestore migration: Firebase Admin service-account credentials (FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS) are not configured yet.',
    });
  }

  try {
    const db = adminDb;
    const isDryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
    let eventsCreated = 0;
    let eventsSkipped = 0;
    let seatsCreated = 0;
    let seatsSkipped = 0;

    const existingEventsSnap = await db.collection('events').get();
    const existingEventIds = new Set(existingEventsSnap.docs.map((d) => d.id));

    // Merge INITIAL_EVENTS + any custom runtime events in inMemoryEvents or req.body.customEvents without duplicates
    const candidateMap = new Map<string, EventItem>();
    for (const d of existingEventsSnap.docs) {
      candidateMap.set(d.id, d.data() as EventItem);
    }
    for (const evt of INITIAL_EVENTS) {
      if (!candidateMap.has(evt.id)) candidateMap.set(evt.id, evt);
    }
    for (const evt of inMemoryEvents) {
      if (!candidateMap.has(evt.id)) candidateMap.set(evt.id, evt);
    }
    if (Array.isArray(req.body?.customEvents)) {
      for (const evt of req.body.customEvents as EventItem[]) {
        if (evt?.id && !candidateMap.has(evt.id)) candidateMap.set(evt.id, evt);
      }
    }

    const eventsToEnsure = Array.from(candidateMap.values());
    const eventBreakdown: Array<{
      eventId: string;
      title: string;
      eventAction: 'create' | 'skip_existing';
      totalSeats: number;
      seatsToCreate: number;
      seatsExistingSkipped: number;
      availableSeats: number;
    }> = [];

    for (const evt of eventsToEnsure) {
      const eventRef = db.collection('events').doc(evt.id);
      const existingSeatsSnap = await eventRef.collection('seats').get();
      const existingSeatIds = new Set(existingSeatsSnap.docs.map((d) => d.id));

      const generatedSeats = generateEventSeatMap(evt.id, evt.tierConfigs);
      const missingSeats = generatedSeats.filter((s) => !existingSeatIds.has(s.id));
      const skippedCount = generatedSeats.length - missingSeats.length;
      seatsSkipped += skippedCount;

      const availableCount =
        existingSeatsSnap.empty
          ? generatedSeats.length
          : existingSeatsSnap.docs.filter((d) => d.data().status === 'available').length +
            missingSeats.length;

      const eventAlreadyExists = existingEventIds.has(evt.id);
      if (eventAlreadyExists) {
        eventsSkipped++;
      } else {
        eventsCreated++;
      }
      seatsCreated += missingSeats.length;

      eventBreakdown.push({
        eventId: evt.id,
        title: evt.title,
        eventAction: eventAlreadyExists ? 'skip_existing' : 'create',
        totalSeats: generatedSeats.length,
        seatsToCreate: missingSeats.length,
        seatsExistingSkipped: skippedCount,
        availableSeats: availableCount,
      });

      if (!isDryRun && (!eventAlreadyExists || missingSeats.length > 0)) {
        const batch = db.batch();
        if (!eventAlreadyExists) {
          batch.set(
            eventRef,
            {
              ...evt,
              currencyCode: 'INR',
              totalSeats: generatedSeats.length,
              availableSeats: availableCount,
              migratedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
        for (const seat of missingSeats) {
          batch.set(eventRef.collection('seats').doc(seat.id), {
            id: seat.id,
            row: seat.row,
            number: seat.number,
            tier: seat.tier,
            price: seat.price,
            currencyCode: 'INR',
            status: 'available',
            heldBy: null,
            heldUntil: null,
          });
        }
        await batch.commit();
      }
    }

    return res.json({
      success: true,
      dryRun: isDryRun,
      eventsCreated,
      eventsSkipped,
      seatsCreated,
      seatsSkipped,
      totalEventsEnsured: eventsToEnsure.length,
      eventBreakdown,
      message: isDryRun
        ? 'Dry-run completed. No documents were written to Firestore.'
        : 'Firestore event and seat subcollection migration completed idempotently.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Firestore migration failed: ${err.message}`,
    });
  }
});

// Direct endpoint to download full production zip file for VS Code
app.get(['/api/download-project', '/stagefront-production.zip'], (_req: Request, res: Response) => {
  const zipPath = path.resolve(__dirname, 'public', 'stagefront-production.zip');
  res.download(zipPath, 'stagefront-production.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, error: 'Zip archive not found.' });
    }
  });
});

// Start Express server and mount Vite in development
async function startServer() {

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite dev middleware not loaded:', e);
    }
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StageFront] Express full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
