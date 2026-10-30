import { EventItem, SeatItem } from '../types/api';

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-coldplay-2026',
    title: 'Coldplay: Music of the Spheres World Tour',
    subtitle: 'Sustainable Solar-Powered Stadium Spectacle',
    category: 'concert',
    bannerUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-wemb-01',
      name: 'Wembley Stadium',
      city: 'London',
      address: 'Wembley, London HA9 0WS, United Kingdom',
      capacity: 85000,
      layoutType: 'stadium',
    },
    dateTime: '2026-11-14T19:30:00Z',
    doorTime: '17:30',
    status: 'upcoming',
    priceStartingFrom: 2500,
    currencyCode: 'INR',
    tags: ['Eco-Friendly', 'Kinetic Dancefloors', 'Fireworks', 'Wristband Lights'],
    artistOrTeams: ['Coldplay', 'CHVRCHES', 'Special Guest'],
    description: 'The record-breaking global phenomenon returns with interactive LED wristbands, laser light shows, and iconic anthems spanning 25 years of groundbreaking music.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: true,
    tierConfigs: [
      { tier: 'vip', label: 'VIP Infinity Lounge', price: 14500, currencyCode: 'INR', color: '#A855F7', perks: ['Priority Entry', 'Complimentary Food & Bar', 'Laminated Pass'] },
      { tier: 'platinum', label: 'Platinum Front Stage', price: 8500, currencyCode: 'INR', color: '#6366F1', perks: ['Direct Stage View', 'Dedicated Restrooms'] },
      { tier: 'gold', label: 'Gold Lower Tier', price: 4500, currencyCode: 'INR', color: '#0EA5E9', perks: ['Clear Center Sightlines', 'Padded Seating'] },
      { tier: 'silver', label: 'Silver Grandstand', price: 2500, currencyCode: 'INR', color: '#64748B', perks: ['Panoramic Stadium View', 'Standard Access'] },
    ],
  },
  {
    id: 'evt-ind-pak-2026',
    title: 'ICC Champions Trophy: India vs Pakistan',
    subtitle: 'The Ultimate Cricket Rivalry Clash',
    category: 'cricket',
    bannerUrl: 'https://images.unsplash.com/photo-1531415074868-036b1c57e3ce?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-eden-01',
      name: 'Eden Gardens Stadium',
      city: 'Kolkata',
      address: 'B.B.D. Bagh, Kolkata, West Bengal 700021',
      capacity: 68000,
      layoutType: 'stadium',
    },
    dateTime: '2026-11-20T14:00:00Z',
    doorTime: '11:30',
    status: 'upcoming',
    priceStartingFrom: 2000,
    currencyCode: 'INR',
    tags: ['Cricket', 'High Voltage', 'Super 8s', 'Day-Night ODI'],
    artistOrTeams: ['Team India', 'Team Pakistan'],
    description: 'Witness the highest tension in world sport as two cricketing superpowers collide under the historic floodlights of Eden Gardens for tournament glory.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: true,
    tierConfigs: [
      { tier: 'vip', label: 'Presidential Corporate Box', price: 12500, currencyCode: 'INR', color: '#A855F7', perks: ['Air Conditioned Lounge', 'Buffet Dining', 'Player Walkway Access'] },
      { tier: 'platinum', label: 'Club House Pavilion', price: 7500, currencyCode: 'INR', color: '#6366F1', perks: ['Padded Bucket Seats', 'Exclusive Concessions'] },
      { tier: 'gold', label: 'East Stand Lower Wing', price: 4000, currencyCode: 'INR', color: '#0EA5E9', perks: ['Boundary Line View', 'Fast Track Entrance'] },
      { tier: 'silver', label: 'Upper Tier Bowl', price: 2000, currencyCode: 'INR', color: '#64748B', perks: ['Atmospheric Stadium View', 'Standard Entry'] },
    ],
  },
  {
    id: 'evt-ars-mci-2026',
    title: 'Premier League: Arsenal vs Manchester City',
    subtitle: 'Title Decider at Emirates Stadium',
    category: 'football',
    bannerUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-emir-01',
      name: 'Emirates Stadium',
      city: 'London',
      address: 'Hornsey Rd, London N7 7AJ, United Kingdom',
      capacity: 60704,
      layoutType: 'stadium',
    },
    dateTime: '2026-11-28T16:30:00Z',
    doorTime: '14:30',
    status: 'upcoming',
    priceStartingFrom: 1800,
    currencyCode: 'INR',
    tags: ['EPL', 'Derby Match', 'Top 4 Clash', 'Live VAR'],
    artistOrTeams: ['Arsenal FC', 'Manchester City'],
    description: 'Tactical brilliance and breathless football speed meet in London as two Premier League powerhouses battle for three decisive championship points.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: false,
    tierConfigs: [
      { tier: 'vip', label: 'Diamond Club Director Suite', price: 11000, currencyCode: 'INR', color: '#A855F7', perks: ['Michelin Dining', 'Half-time Champagne', 'Padded Heated Seats'] },
      { tier: 'platinum', label: 'Club Level Midfield', price: 6500, currencyCode: 'INR', color: '#6366F1', perks: ['Prime Midfield Line', 'Complimentary Match Program'] },
      { tier: 'gold', label: 'Lower Clock End', price: 3500, currencyCode: 'INR', color: '#0EA5E9', perks: ['Vibrant Fan Zone', 'Goalmouth Sightlines'] },
      { tier: 'silver', label: 'Upper North Bank', price: 1800, currencyCode: 'INR', color: '#64748B', perks: ['Bird’s Eye Tactical View', 'General Turnstiles'] },
    ],
  },
  {
    id: 'evt-rahman-symphony',
    title: 'A.R. Rahman Live: Symphony of Peace',
    subtitle: '70-Piece Philharmonic Orchestra & World Ensemble',
    category: 'concert',
    bannerUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-jio-01',
      name: 'Jio World Garden Arena',
      city: 'Mumbai',
      address: 'Bandra Kurla Complex, Mumbai, Maharashtra 400051',
      capacity: 25000,
      layoutType: 'arena',
    },
    dateTime: '2026-12-05T18:30:00Z',
    doorTime: '17:00',
    status: 'upcoming',
    priceStartingFrom: 1500,
    currencyCode: 'INR',
    tags: ['Academy Winner', 'Sufi & Bollywood', 'Dolby Atmos Live', 'Live Choir'],
    artistOrTeams: ['A.R. Rahman', 'Royal Philharmonic', 'Guest Singers'],
    description: 'Two-time Academy Award winner A.R. Rahman brings an audio-visual masterclass featuring Sufi melodies, cinematic orchestral scores, and high-energy hits.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: true,
    tierConfigs: [
      { tier: 'vip', label: 'Royal Stage Diwan', price: 9500, currencyCode: 'INR', color: '#A855F7', perks: ['Meet & Greet Photo Pass', 'Lounge Hospitality', 'Gift Bag'] },
      { tier: 'platinum', label: 'Center Symphony Row', price: 5500, currencyCode: 'INR', color: '#6366F1', perks: ['Acoustic Sweet Spot', 'Comfort Seating'] },
      { tier: 'gold', label: 'Grand Terrace', price: 3000, currencyCode: 'INR', color: '#0EA5E9', perks: ['Elevated Seating', 'Refreshment Voucher'] },
      { tier: 'silver', label: 'Lawn General Seating', price: 1500, currencyCode: 'INR', color: '#64748B', perks: ['Open Air Atmosphere', 'LED Wall View'] },
    ],
  },
  {
    id: 'evt-zakir-khan-2026',
    title: 'Zakir Khan: Live Arena Special',
    subtitle: 'Brand New Standup Comedy Hour & Poetry',
    category: 'entertainment',
    bannerUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-radio-01',
      name: 'Radio City Music Hall',
      city: 'New York',
      address: '1260 6th Ave, New York, NY 10020',
      capacity: 6015,
      layoutType: 'auditorium',
    },
    dateTime: '2026-12-12T20:00:00Z',
    doorTime: '19:00',
    status: 'upcoming',
    priceStartingFrom: 999,
    currencyCode: 'INR',
    tags: ['Standup Comedy', 'Storytelling', 'All Ages', 'Hilarious'],
    artistOrTeams: ['Zakir Khan'],
    description: 'The Sakht Launda brings his emotional, nostalgic and side-splitting brand new solo special exploring family, college, relationships, and life transitions.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: false,
    tierConfigs: [
      { tier: 'vip', label: 'Front Orchestra Frontline', price: 5999, currencyCode: 'INR', color: '#A855F7', perks: ['Signed Poster', 'Prime Front Rows A–B', 'Early Hall Access'] },
      { tier: 'platinum', label: 'Prime Orchestra', price: 3499, currencyCode: 'INR', color: '#6366F1', perks: ['Excellent Sightlines', 'Great Audio Clarity'] },
      { tier: 'gold', label: 'First Mezzanine', price: 1999, currencyCode: 'INR', color: '#0EA5E9', perks: ['Direct Stage Orientation'] },
      { tier: 'silver', label: 'Second Mezzanine', price: 999, currencyCode: 'INR', color: '#64748B', perks: ['Balcony View', 'Value Tickets'] },
    ],
  },
  {
    id: 'evt-cirque-crystal',
    title: 'Cirque du Soleil: Crystal On Ice',
    subtitle: 'A Breakthrough Acrobatic Ice Experience',
    category: 'entertainment',
    bannerUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    venue: {
      id: 'ven-syd-01',
      name: 'Qudos Bank Arena',
      city: 'Sydney',
      address: '19 Edwin Flack Ave, Sydney Olympic Park NSW 2127',
      capacity: 21000,
      layoutType: 'arena',
    },
    dateTime: '2026-12-19T15:00:00Z',
    doorTime: '14:00',
    status: 'upcoming',
    priceStartingFrom: 1600,
    currencyCode: 'INR',
    tags: ['Ice Acrobatics', 'Visual Wonder', 'Family Special', 'Aerial Silks'],
    artistOrTeams: ['Cirque du Soleil Troupe'],
    description: 'Gymnasts and world-class figure skaters perform synchronized acrobatics, aerial stunts, and high-speed freestyle skating on an interactive visual ice surface.',
    totalSeats: 160,
    availableSeats: 160,
    isFeatured: false,
    tierConfigs: [
      { tier: 'vip', label: 'Ice-Rink Front Row', price: 10500, currencyCode: 'INR', color: '#A855F7', perks: ['Right At The Ice Edge', 'Souvenir Program', 'VIP Lounge'] },
      { tier: 'platinum', label: 'Lower Bowl Premium', price: 6000, currencyCode: 'INR', color: '#6366F1', perks: ['Unobstructed Elevation', 'Cushioned Seats'] },
      { tier: 'gold', label: 'Mid Concourse', price: 3200, currencyCode: 'INR', color: '#0EA5E9', perks: ['Full Ice Geometry Sightline'] },
      { tier: 'silver', label: 'Upper Tier Promenade', price: 1600, currencyCode: 'INR', color: '#64748B', perks: ['Family Saver Tier', 'Wide View'] },
    ],
  },
];

export const SEAT_ROW_TIER_MAP: Record<string, 'vip' | 'platinum' | 'gold' | 'silver'> = {
  A: 'vip',
  B: 'vip',
  C: 'platinum',
  D: 'platinum',
  E: 'gold',
  F: 'gold',
  G: 'silver',
  H: 'silver',
};

/**
 * Generate standard 160-seat layout for any event
 * 8 Rows (A through H), 20 seats per row
 * - VIP: Rows A–B (40 seats)
 * - Platinum: Rows C–D (40 seats)
 * - Gold: Rows E–F (40 seats)
 * - Silver: Rows G–H (40 seats)
 * All 160 seats start as 'available' with no synthetic demo holds or placeholder bookings.
 * Individual seat prices are derived from the event's tierConfigs in INR.
 */
export function generateEventSeatMap(eventId: string, tiers: EventItem['tierConfigs']): SeatItem[] {
  const rows: { row: string; tier: 'vip' | 'platinum' | 'gold' | 'silver' }[] = [
    { row: 'A', tier: 'vip' },
    { row: 'B', tier: 'vip' },
    { row: 'C', tier: 'platinum' },
    { row: 'D', tier: 'platinum' },
    { row: 'E', tier: 'gold' },
    { row: 'F', tier: 'gold' },
    { row: 'G', tier: 'silver' },
    { row: 'H', tier: 'silver' },
  ];

  const seats: SeatItem[] = [];

  rows.forEach(({ row, tier }) => {
    const tierConfig = tiers.find((t) => t.tier === tier) || { price: 1500 };
    for (let num = 1; num <= 20; num++) {
      const seatId = `${eventId}-${row}-${num}`;

      seats.push({
        id: seatId,
        row,
        number: num,
        tier,
        price: Number(tierConfig.price),
        currencyCode: 'INR',
        status: 'available',
        heldBy: undefined,
        heldUntil: undefined,
      });
    }
  });

  return seats;
}
