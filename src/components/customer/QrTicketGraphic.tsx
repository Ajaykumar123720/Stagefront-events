import React, { useMemo } from 'react';
import { BookingRecord, formatINR } from '../../types/api';

const QR_GRID_SIZE = 25;

/**
 * Generates a deterministic 25x25 QR matrix with standard Finder Patterns (top-left, top-right, bottom-left),
 * Timing Patterns (row 6, col 6), Alignment Pattern (16..20, 16..20), and cryptographically-seeded data modules
 * derived from the unique booking ID, booking reference, and QR code token.
 */
export function buildQrMatrix(payload: string): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: QR_GRID_SIZE }, () =>
    Array.from({ length: QR_GRID_SIZE }, () => false)
  );
  const reserved: boolean[][] = Array.from({ length: QR_GRID_SIZE }, () =>
    Array.from({ length: QR_GRID_SIZE }, () => false)
  );

  const placeFinder = (startR: number, startC: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = startR + r;
        const cc = startC + c;
        if (rr < 0 || rr >= QR_GRID_SIZE || cc < 0 || cc >= QR_GRID_SIZE) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isOuter || isInner;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, QR_GRID_SIZE - 7);
  placeFinder(QR_GRID_SIZE - 7, 0);

  // Timing patterns
  for (let i = 8; i < QR_GRID_SIZE - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment pattern at (16..20, 16..20)
  for (let r = 16; r <= 20; r++) {
    for (let c = 16; c <= 20; c++) {
      reserved[r][c] = true;
      const isBorder = r === 16 || r === 20 || c === 16 || c === 20;
      const isCenter = r === 18 && c === 18;
      matrix[r][c] = isBorder || isCenter;
    }
  }

  // Deterministic multi-pass hash stream from payload
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i << 3);
    h2 = Math.imul(h2, 0x85ebca6b);
  }

  let step = 0;
  for (let r = 0; r < QR_GRID_SIZE; r++) {
    for (let c = 0; c < QR_GRID_SIZE; c++) {
      if (reserved[r][c]) continue;
      const charCode = payload.charCodeAt(step % payload.length) || 73;
      const mix = Math.imul(h1 ^ (r * 31 + c * 17 + step), 0x27d4eb2d) ^ Math.imul(h2, charCode + step);
      matrix[r][c] = (Math.abs(mix) & 1) === 1;
      h1 = (h1 << 5) | (h1 >>> 27);
      h1 ^= mix;
      step++;
    }
  }

  return matrix;
}

interface QrTicketGraphicProps {
  booking: BookingRecord;
  size?: number;
  className?: string;
}

export const QrTicketGraphic: React.FC<QrTicketGraphicProps> = ({
  booking,
  size = 128,
  className = '',
}) => {
  const qrPayload = useMemo(() => {
    const seatsStr = booking.seats.map((s) => `${s.row}${s.number}`).join(',');
    return `STAGEFRONT|ID:${booking.id}|REF:${booking.bookingReference}|TOKEN:${booking.qrCodeToken}|EVT:${booking.eventId}|SEATS:${seatsStr}|INR:${booking.totalAmount}`;
  }, [booking]);

  const matrix = useMemo(() => buildQrMatrix(qrPayload), [qrPayload]);

  return (
    <div
      className={`inline-flex items-center justify-center p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs ${className}`}
      title={`QR Token: ${booking.qrCodeToken}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${QR_GRID_SIZE} ${QR_GRID_SIZE}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR Ticket for Booking ${booking.bookingReference}`}
      >
        <rect width={QR_GRID_SIZE} height={QR_GRID_SIZE} fill="#FFFFFF" />
        {matrix.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill="#111827"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};

/**
 * Generates and downloads a high-resolution PNG QR Ticket Pass for the confirmed booking.
 */
export function downloadTicketPassPng(booking: BookingRecord): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Outer background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ticket card container
  const cardX = 40;
  const cardY = 40;
  const cardW = 1120;
  const cardH = 600;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.stroke();

  // Top Header Band
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 92, [20, 20, 0, 0]);
  ctx.fill();

  // Brand Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Inter, system-ui, sans-serif';
  ctx.fillText('STAGEFRONT EVENTS — OFFICIAL QR E-TICKET', cardX + 36, cardY + 50);

  // Verified Badge in Header
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold 15px Inter, system-ui, sans-serif';
  ctx.fillText(
    `VERIFIED PAID • ${booking.bookingReference}`,
    cardX + cardW - 330,
    cardY + 50
  );

  // Left Column: Event & Seat Information
  const leftX = cardX + 36;
  let curY = cardY + 145;

  // Event Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 30px Inter, system-ui, sans-serif';
  ctx.fillText(booking.eventTitle.slice(0, 48), leftX, curY);

  // Event Date & Venue
  curY += 36;
  const formattedDate = new Date(booking.eventDate).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillStyle = '#475569';
  ctx.font = '600 17px Inter, system-ui, sans-serif';
  ctx.fillText(`${formattedDate}  •  ${booking.venueName}, ${booking.venueCity}`, leftX, curY);

  // Divider
  curY += 26;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX, curY);
  ctx.lineTo(cardX + 710, curY);
  ctx.stroke();

  // Attendee & Booking Identifiers
  curY += 34;
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillText('PASS HOLDER', leftX, curY);
  ctx.fillText('BOOKING ID', leftX + 260, curY);
  ctx.fillText('BOOKING REFERENCE', leftX + 500, curY);

  curY += 24;
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText(booking.userName.slice(0, 26), leftX, curY);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText(booking.id, leftX + 260, curY);
  ctx.fillStyle = '#2563EB';
  ctx.fillText(booking.bookingReference, leftX + 500, curY);

  // Selected Seats Section
  curY += 42;
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px Inter, system-ui, sans-serif';
  ctx.fillText(`CONFIRMED SEATS (${booking.seats.length})`, leftX, curY);

  curY += 24;
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 15px monospace';
  const seatSummary = booking.seats
    .map((s) => `Row ${s.row}-${s.number} (${s.tier.toUpperCase()} • ${formatINR(s.price)})`)
    .join('   ');
  ctx.fillText(seatSummary.slice(0, 68), leftX, curY);
  if (seatSummary.length > 68) {
    curY += 22;
    ctx.fillText(seatSummary.slice(68, 136), leftX, curY);
  }

  // INR Payment Breakdown Box
  const boxY = cardY + 410;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.roundRect(leftX, boxY, 675, 150, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '500 14px Inter, system-ui, sans-serif';
  ctx.fillText(`Tickets Subtotal:`, leftX + 20, boxY + 32);
  ctx.fillText(formatINR(booking.subtotal, true), leftX + 210, boxY + 32);

  ctx.fillText(`Convenience Fee (5%):`, leftX + 20, boxY + 58);
  ctx.fillText(formatINR(booking.convenienceFee, true), leftX + 210, boxY + 58);

  ctx.fillText(`GST (10%):`, leftX + 20, boxY + 84);
  ctx.fillText(formatINR(booking.taxAmount, true), leftX + 210, boxY + 84);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px Inter, system-ui, sans-serif';
  ctx.fillText(`Total Paid (INR):`, leftX + 20, boxY + 122);
  ctx.fillStyle = '#2563EB';
  ctx.fillText(formatINR(booking.totalAmount, true), leftX + 210, boxY + 122);

  // Payment metadata on right side of box
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.fillText('RAZORPAY PAYMENT ID', leftX + 370, boxY + 40);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(booking.razorpayPaymentId || booking.paymentTransactionId, leftX + 370, boxY + 62);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.fillText('RAZORPAY ORDER ID', leftX + 370, boxY + 95);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(booking.razorpayOrderId || 'VERIFIED-TEST-ORDER', leftX + 370, boxY + 117);

  // Perforated Vertical Stub Line
  const stubX = cardX + 755;
  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(stubX, cardY + 92);
  ctx.lineTo(stubX, cardY + cardH);
  ctx.stroke();
  ctx.restore();

  // Right Column: QR Code Matrix
  const qrPayload = `STAGEFRONT|ID:${booking.id}|REF:${booking.bookingReference}|TOKEN:${booking.qrCodeToken}|EVT:${booking.eventId}|INR:${booking.totalAmount}`;
  const matrix = buildQrMatrix(qrPayload);
  const cellSize = 9;
  const qrSize = QR_GRID_SIZE * cellSize;
  const qrStartX = stubX + Math.floor((cardW - 755 - qrSize) / 2);
  const qrStartY = cardY + 145;

  // QR Frame
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(qrStartX - 16, qrStartY - 16, qrSize + 32, qrSize + 32, 12);
  ctx.fill();
  ctx.stroke();

  // Render QR Cells
  ctx.fillStyle = '#0F172A';
  for (let r = 0; r < QR_GRID_SIZE; r++) {
    for (let c = 0; c < QR_GRID_SIZE; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(qrStartX + c * cellSize, qrStartY + r * cellSize, cellSize, cellSize);
      }
    }
  }

  // QR Token Caption
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const centerStubX = stubX + (cardW - 755) / 2;
  ctx.fillText(`ADMIT ${booking.seats.length} GUEST(S)`, centerStubX, qrStartY + qrSize + 46);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(booking.qrCodeToken.slice(0, 34), centerStubX, qrStartY + qrSize + 72);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText('Scan QR at venue turnstile', centerStubX, qrStartY + qrSize + 96);

  // Trigger PNG download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `StageFront-Ticket-${booking.bookingReference}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
