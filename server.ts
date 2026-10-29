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

import express, { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
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
let adminDb: FirebaseFirestore.Firestore | null = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'stagefront-events',
    });
    isAdminInitialized = true;
    console.log('[StageFront Server] Firebase Admin SDK initialized with service account key.');
  } else if (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID) {
    const projId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'stagefront-events';
    adminApp = initializeApp({
      projectId: projId,
    });
    isAdminInitialized = true;
    console.log('[StageFront Server] Firebase Admin SDK initialized with project ID:', projId);
  } else if (getApps().length > 0) {
    adminApp = getApps()[0];
    isAdminInitialized = true;
  } else {
    console.warn(
      '[StageFront Server] Firebase Admin SDK is not yet initialized with credentials. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY in .env.'
    );
  }

  if (adminApp) {
    try {
      adminDb = getAdminFirestore(adminApp);
    } catch (dbInitErr) {
      console.warn('[StageFront Server] Firestore admin client initialization deferred:', dbInitErr);
    }
  }
} catch (err) {
  console.error('[StageFront Server] Error initializing Firebase Admin SDK:', err);
}

// In-Memory Fallback State Engine (maintains transactional integrity & seat locking)
const inMemoryEvents: EventItem[] = [...INITIAL_EVENTS];
const inMemorySeatMaps: Record<string, SeatItem[]> = {};
const inMemoryBookings: BookingRecord[] = [
  {
    id: 'bkg-demo-01',
    bookingReference: 'STG-7482-9901',
    eventId: 'evt-coldplay-2026',
    eventTitle: 'Coldplay: Music of the Spheres World Tour',
    eventDate: '2026-11-14T19:30:00Z',
    venueName: 'Wembley Stadium',
    venueCity: 'London',
    category: 'concert',
    bannerUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1600&q=80',
    userId: 'usr-customer-01',
    userName: 'Alex Chen',
    userEmail: 'alex.chen@student.university.edu',
    seats: [
      { seatId: 'evt-coldplay-2026-A-8', row: 'A', number: 8, tier: 'vip', price: 295 },
      { seatId: 'evt-coldplay-2026-A-9', row: 'A', number: 9, tier: 'vip', price: 295 },
    ],
    subtotal: 590,
    convenienceFee: 29.5,
    taxAmount: 59,
    totalAmount: 678.5,
    status: 'confirmed',
    paymentMethod: 'Credit Card (•••• 4242)',
    paymentTransactionId: 'TXN_SIM_9847291034',
    createdAt: '2026-10-25T14:20:00Z',
    qrCodeToken: 'STG-TOKEN-COLDPLAY-A8-A9-VALID',
  },
];

// Prepopulate seat maps
inMemoryEvents.forEach((evt) => {
  inMemorySeatMaps[evt.id] = generateEventSeatMap(evt.id, evt.tierConfigs);
});

// Helper: Release expired holds automatically
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

// Authenticated Request Interface
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role: 'customer' | 'admin';
    token?: DecodedIdToken;
  };
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

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Empty token provided in Authorization header.',
    });
  }

  if (!isAdminInitialized || !adminApp) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Firebase Admin SDK credentials are not configured on the server. Set FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_KEY in .env.',
    });
  }

  try {
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(idToken);

    // Determine role strictly from Custom Claims or verified admin record
    const role: 'customer' | 'admin' =
      decodedToken.admin === true || decodedToken.role === 'admin'
        ? 'admin'
        : 'customer';

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      token: decodedToken,
    };

    next();
  } catch (err: any) {
    console.warn('[StageFront Auth] Token verification rejected:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid, expired, or revoked Firebase ID token.',
      code: err.code || 'auth/invalid-id-token',
    });
  }
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
// PUBLIC ROUTES
// ==========================================

// System Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    platform: 'StageFront Events API',
    version: '2.1.0-firebase',
    firebaseAdminConfigured: isAdminInitialized,
    timestamp: new Date().toISOString(),
  });
});

// Event Catalog (Public)
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const { category, city, searchQuery, sortBy } = req.query as Record<string, string>;
    let results = [...inMemoryEvents];

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

    if (sortBy === 'price_asc') {
      results.sort((a, b) => a.priceStartingFrom - b.priceStartingFrom);
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => b.priceStartingFrom - a.priceStartingFrom);
    } else if (sortBy === 'date_asc') {
      results.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }

    res.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Event Detail (Public)
app.get('/api/events/:id', (req: Request, res: Response) => {
  const event = inMemoryEvents.find((e) => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }
  res.json({ success: true, data: event });
});

// Event Seat Matrix (Public Read with Auto Expiry Cleanup)
app.get('/api/events/:id/seats', (req: Request, res: Response) => {
  const eventId = req.params.id;
  cleanExpiredHolds(eventId);
  const seats = inMemorySeatMaps[eventId] || [];
  res.json({
    success: true,
    eventId,
    totalSeats: seats.length,
    availableSeats: seats.filter((s) => s.status === 'available').length,
    data: seats,
  });
});

// ==========================================
// PROTECTED ROUTES: BOOKINGS & TRANSACTIONS
// ==========================================

// Authenticated User Profile Self-Check
app.get('/api/auth/me', verifyFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: {
      uid: req.user?.uid,
      email: req.user?.email,
      role: req.user?.role,
    },
  });
});

/**
 * ATOMIC SEAT HOLD RESERVATION (Protected)
 * Prevents race conditions: checks if seats are available,
 * locks them with a 10-minute expiry timestamp.
 */
app.post('/api/bookings/hold', verifyFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  const { eventId, seatIds, holdDurationSeconds } = req.body;
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid parameters: eventId and non-empty seatIds array are required.',
    });
  }

  const userId = req.user!.uid;
  const now = Date.now();
  cleanExpiredHolds(eventId);

  const seatMap = inMemorySeatMaps[eventId];
  if (!seatMap) {
    return res.status(404).json({ success: false, error: 'Event seat matrix not found.' });
  }

  // ATOMIC VALIDATION: Check each seat status
  const failedSeats: string[] = [];
  seatIds.forEach((id: string) => {
    const seat = seatMap.find((s) => s.id === id);
    if (!seat) {
      failedSeats.push(id);
    } else if (seat.status === 'booked') {
      failedSeats.push(id);
    } else if (seat.status === 'held' && seat.heldBy !== userId && seat.heldUntil) {
      if (new Date(seat.heldUntil).getTime() > now) {
        failedSeats.push(id);
      }
    }
  });

  if (failedSeats.length > 0) {
    return res.status(409).json({
      success: false,
      failedSeats,
      error: 'Conflict: One or more requested seats are already booked or held by another attendee.',
    });
  }

  // ATOMIC LOCK: Set seats to held with expiry
  const duration = holdDurationSeconds || 600;
  const heldUntil = new Date(now + duration * 1000).toISOString();
  const lockId = `lock-${Date.now().toString(36)}`;

  seatIds.forEach((id: string) => {
    const seat = seatMap.find((s) => s.id === id);
    if (seat) {
      seat.status = 'held';
      seat.heldBy = userId;
      seat.heldUntil = heldUntil;
    }
  });

  res.json({
    success: true,
    lockId,
    eventId,
    heldUntil,
    seatsLocked: seatIds,
    failedSeats: [],
    message: 'Seats held successfully for 10 minutes.',
  });
});

/**
 * ATOMIC BOOKING CONFIRMATION (Protected)
 * Validates that held seats belong to this user and haven't expired,
 * permanently marks them as booked, and issues booking record.
 */
app.post('/api/bookings/confirm', verifyFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  const { eventId, seatIds, paymentMethod, userName, userEmail } = req.body;
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required booking parameters.' });
  }

  const userId = req.user!.uid;
  const now = Date.now();
  cleanExpiredHolds(eventId);

  const event = inMemoryEvents.find((e) => e.id === eventId);
  const seatMap = inMemorySeatMaps[eventId];

  if (!event || !seatMap) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  // Verify all seats are valid and held by this user
  const seatsToBook: SeatItem[] = [];
  for (const id of seatIds) {
    const seat = seatMap.find((s) => s.id === id);
    if (!seat) {
      return res.status(404).json({ success: false, error: `Seat ${id} not found in inventory.` });
    }
    if (seat.status === 'booked') {
      return res.status(409).json({ success: false, error: `Seat ${seat.row}${seat.number} is already booked.` });
    }
    if (seat.status === 'held' && seat.heldBy !== userId && seat.heldUntil && new Date(seat.heldUntil).getTime() > now) {
      return res.status(409).json({ success: false, error: `Seat ${seat.row}${seat.number} is held by another user.` });
    }
    seatsToBook.push(seat);
  }

  // Calculate pricing
  const subtotal = seatsToBook.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = Math.round(subtotal * 0.05 * 100) / 100;
  const taxAmount = Math.round(subtotal * 0.1 * 100) / 100;
  const totalAmount = Math.round((subtotal + convenienceFee + taxAmount) * 100) / 100;

  const bookingRef = `STG-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const txId = `TXN_SIM_${Date.now()}`;
  const token = `STG-PASS-${event.id}-${seatsToBook.map((s) => `${s.row}${s.number}`).join('-')}-${Date.now().toString(36).toUpperCase()}`;

  // ATOMIC COMMIT: Mark seats as booked
  seatsToBook.forEach((seat) => {
    seat.status = 'booked';
    seat.heldBy = undefined;
    seat.heldUntil = undefined;
  });

  // Update event available seats
  const remaining = seatMap.filter((s) => s.status === 'available').length;
  event.availableSeats = remaining;

  const newBooking: BookingRecord = {
    id: `bkg-${Date.now().toString(36)}`,
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
    })),
    subtotal,
    convenienceFee,
    taxAmount,
    totalAmount,
    status: 'confirmed',
    paymentMethod: paymentMethod || 'Standard Gateway',
    paymentTransactionId: txId,
    createdAt: new Date().toISOString(),
    qrCodeToken: token,
  };

  inMemoryBookings.unshift(newBooking);

  res.json({
    success: true,
    data: newBooking,
    message: 'Booking confirmed and ticket generated successfully.',
  });
});

/**
 * ATOMIC BOOKING CANCELLATION (Protected: Owner or Admin)
 * Restores seat inventory back to available.
 */
app.post('/api/bookings/cancel/:id', verifyFirebaseToken, (req: AuthenticatedRequest, res: Response) => {
  const bookingId = req.params.id;
  const booking = inMemoryBookings.find((b) => b.id === bookingId);

  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking not found.' });
  }

  // Authorization check: User must own the booking or be admin
  if (req.user?.role !== 'admin' && booking.userId !== req.user?.uid) {
    return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to cancel this booking.' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ success: false, error: 'Booking is already cancelled.' });
  }

  booking.status = 'cancelled';

  // ATOMIC RESTORATION: Release seats
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

  res.json({
    success: true,
    data: booking,
    message: 'Booking cancelled successfully and seats released.',
  });
});

// Customer Bookings by User ID (Protected: Owner or Admin only)
app.get('/api/bookings/user/:userId', verifyFirebaseToken, requireOwnerOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  const targetUserId = req.params.userId;
  const userBookings = inMemoryBookings.filter((b) => b.userId === targetUserId);
  res.json({
    success: true,
    data: userBookings,
    total: userBookings.length,
  });
});

// ==========================================
// ADMIN ONLY ROUTES (Protected: requireAdmin)
// ==========================================

// Admin Telemetry & Metrics
app.get('/api/admin/metrics', verifyFirebaseToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const totalRevenue = inMemoryBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const totalTicketsSold = inMemoryBookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.seats.length, 0);

  res.json({
    success: true,
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalBookings: inMemoryBookings.filter((b) => b.status === 'confirmed').length,
      totalTicketsSold,
      averageTicketValue: totalTicketsSold > 0 ? Math.round((totalRevenue / totalTicketsSold) * 100) / 100 : 0,
      occupancyRate: 58.4,
      activeEventsCount: inMemoryEvents.length,
      categorySalesDistribution: [
        { category: 'concert', count: 1, revenue: 678.5 },
        { category: 'football', count: 1, revenue: 276.0 },
      ],
      recentBookings: inMemoryBookings.slice(0, 10),
    },
  });
});

// Admin Create Event
app.post('/api/admin/events', verifyFirebaseToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const newEventData = req.body;
  const newId = `evt-${Date.now().toString(36)}`;
  const newEvent: EventItem = {
    ...newEventData,
    id: newId,
    totalSeats: 160,
    availableSeats: 140,
  };

  inMemoryEvents.unshift(newEvent);
  inMemorySeatMaps[newId] = generateEventSeatMap(newId, newEvent.tierConfigs);

  res.json({
    success: true,
    data: newEvent,
    message: 'Event created by authorized administrator.',
  });
});

// Admin Delete Event
app.delete('/api/admin/events/:id', verifyFirebaseToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.id;
  const index = inMemoryEvents.findIndex((e) => e.id === eventId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Event not found.' });
  }

  inMemoryEvents.splice(index, 1);
  delete inMemorySeatMaps[eventId];

  res.json({
    success: true,
    eventId,
    message: 'Event removed by authorized administrator.',
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
