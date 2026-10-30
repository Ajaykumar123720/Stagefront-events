/**
 * StageFront Events — Safe, Idempotent Firestore Data Migration Script
 *
 * Usage:
 *   Dry-run (read-only preview, no writes):
 *     npx tsx scripts/migrate-to-firestore.ts --dry-run
 *
 *   Execute migration:
 *     npx tsx scripts/migrate-to-firestore.ts
 *
 * Behavior:
 * - Verifies that valid Firebase Admin service-account credentials are configured.
 * - Idempotently migrates INITIAL_EVENTS into `/events/{eventId}` without overwriting existing events.
 * - Populates missing seat documents in `/events/{eventId}/seats/{seatId}` (160 seats per event),
 *   sanitizing `undefined` fields to `null` for Firestore compatibility and never overwriting existing
 *   seat documents (preserving any active holds or confirmed bookings).
 * - Never modifies `/users`, `/admins`, or existing `/bookings`.
 */

import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'], override: true });
import fs from 'fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { INITIAL_EVENTS, generateEventSeatMap } from '../src/data/seedData.ts';
import { SeatItem } from '../src/types/api.ts';

function parseServiceAccountEnv(raw: string): Record<string, any> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
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

export function sanitizeSeatForFirestore(seat: SeatItem): Record<string, any> {
  return {
    id: seat.id,
    row: seat.row,
    number: seat.number,
    tier: seat.tier,
    price: Number(seat.price),
    currencyCode: 'INR',
    status: 'available',
    heldBy: null,
    heldUntil: null,
  };
}

async function migrateToFirestore() {
  const isDryRun = process.argv.includes('--dry-run');
  const projId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'stagefront-events';

  let app = null;
  const parsedSa = parseServiceAccountEnv(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '');

  if (parsedSa && parsedSa.client_email && parsedSa.private_key) {
    app = initializeApp({
      credential: cert(parsedSa),
      projectId: parsedSa.project_id || projId,
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    app = initializeApp({
      credential: cert({
        projectId: projId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: projId,
    });
  } else if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    app = initializeApp({
      credential: applicationDefault(),
      projectId: projId,
    });
  } else if (!isDryRun) {
    console.error(
      '[Migration Aborted] No Firebase Admin service-account credentials found.\n' +
        'Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS in .env.local or AI Studio Secrets before running migration.'
    );
    process.exit(1);
  }

  const db = app ? getFirestore(app) : null;
  if (db) {
    db.settings({ ignoreUndefinedProperties: true });
  }

  console.log(
    `[StageFront Migration] Target project: ${projId} | Currency: INR (₹) | Mode: ${
      isDryRun ? (db ? 'DRY-RUN (LIVE FIRESTORE READ-ONLY)' : 'DRY-RUN (OFFLINE SEED MANIFEST)') : 'EXECUTE'
    }`
  );

  let eventsToCreate = 0;
  let eventsPreserved = 0;
  let seatsToCreate = 0;
  let seatsPreserved = 0;

  for (const event of INITIAL_EVENTS) {
    const seats = generateEventSeatMap(event.id, event.tierConfigs);
    const availableCount = seats.filter((s) => s.status === 'available').length;
    const bookedCount = seats.filter((s) => s.status === 'booked').length;
    const heldCount = seats.filter((s) => s.status === 'held').length;

    let eventExists = false;
    let existingSeatIds = new Set<string>();

    if (db) {
      const eventRef = db.collection('events').doc(event.id);
      const existingEventSnap = await eventRef.get();
      eventExists = existingEventSnap.exists;

      const seatsCol = eventRef.collection('seats');
      const existingSeatsSnap = await seatsCol.get();
      existingSeatIds = new Set(existingSeatsSnap.docs.map((d) => d.id));
    }

    const missingSeats = seats.filter((s) => !existingSeatIds.has(s.id));

    if (!eventExists) {
      eventsToCreate++;
      if (!isDryRun && db) {
        await db.collection('events').doc(event.id).set({
          ...event,
          currencyCode: 'INR',
          totalSeats: seats.length,
          availableSeats: availableCount,
          migratedAt: new Date().toISOString(),
        });
      }
      console.log(
        `  [${isDryRun ? 'DRY-RUN +' : '+'}] Event /events/${event.id} ("${event.title}") — Starting: ₹${event.priceStartingFrom.toLocaleString('en-IN')} INR | totalSeats: ${
          seats.length
        }, available: ${availableCount}, booked: ${bookedCount}, held: ${heldCount}`
      );
    } else {
      eventsPreserved++;
      console.log(`  [=] Preserved existing event: /events/${event.id} ("${event.title}")`);
    }

    seatsPreserved += existingSeatIds.size;
    seatsToCreate += missingSeats.length;

    if (missingSeats.length > 0 && !isDryRun && db) {
      const seatsCol = db.collection('events').doc(event.id).collection('seats');
      const batch = db.batch();
      for (const seat of missingSeats) {
        batch.set(seatsCol.doc(seat.id), sanitizeSeatForFirestore(seat));
      }
      await batch.commit();
    }

    const tierSummary = event.tierConfigs
      .map((t) => `${t.tier.toUpperCase()}: ₹${t.price.toLocaleString('en-IN')}`)
      .join(', ');

    console.log(
      `      -> Subcollection /events/${event.id}/seats: ${
        isDryRun ? 'will create' : 'created'
      } ${missingSeats.length} seats (${tierSummary}), preserved ${existingSeatIds.size}`
    );
  }

  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Mode:             ${isDryRun ? 'DRY-RUN (0 writes performed)' : 'EXECUTED'}`);
  console.log(`Events to create: ${eventsToCreate} (preserved: ${eventsPreserved})`);
  console.log(`Seats to create:  ${seatsToCreate} (preserved: ${seatsPreserved})`);
}

migrateToFirestore().catch((err) => {
  console.error('[StageFront Migration] Failed:', err);
  process.exit(1);
});
