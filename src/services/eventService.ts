/**
 * StageFront Events — Event & Inventory Service
 * 
 * Connects the event catalog to Cloud Firestore and backend APIs
 * while preserving event discovery cards, category filters, and admin controls.
 */

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { EventItem, EventFilterQuery, SeatItem } from '../types/api';
import { INITIAL_EVENTS, generateEventSeatMap } from '../data/seedData';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { apiClient } from './apiClient';

const STORAGE_KEY_EVENTS = 'stagefront_events_data';
const STORAGE_KEY_SEATMAPS = 'stagefront_seatmaps_data';

export interface IEventService {
  getEvents(filters?: EventFilterQuery): Promise<EventItem[]>;
  getEventById(id: string): Promise<EventItem | null>;
  getFeaturedEvents(): Promise<EventItem[]>;
  getSeatMap(eventId: string): Promise<SeatItem[]>;
  createEvent(event: Omit<EventItem, 'id' | 'totalSeats' | 'availableSeats'>): Promise<EventItem>;
  deleteEvent(id: string): Promise<boolean>;
}

class EventService implements IEventService {
  private localEvents: EventItem[] = [];
  private localSeatMaps: Record<string, SeatItem[]> = {};
  private hasSeededFirestore = false;

  constructor() {
    this.initLocalStore();
  }

  private initLocalStore() {
    try {
      const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (storedEvents) {
        this.localEvents = JSON.parse(storedEvents);
      } else {
        this.localEvents = [...INITIAL_EVENTS];
        this.saveLocalEvents();
      }

      const storedMaps = localStorage.getItem(STORAGE_KEY_SEATMAPS);
      if (storedMaps) {
        this.localSeatMaps = JSON.parse(storedMaps);
      } else {
        this.localEvents.forEach((evt) => {
          this.localSeatMaps[evt.id] = generateEventSeatMap(evt.id, evt.tierConfigs);
        });
        this.saveLocalSeatMaps();
      }
    } catch {
      this.localEvents = [...INITIAL_EVENTS];
      this.localEvents.forEach((evt) => {
        this.localSeatMaps[evt.id] = generateEventSeatMap(evt.id, evt.tierConfigs);
      });
    }
  }

  private saveLocalEvents() {
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.localEvents));
    } catch {
      // ignore
    }
  }

  private saveLocalSeatMaps() {
    try {
      localStorage.setItem(STORAGE_KEY_SEATMAPS, JSON.stringify(this.localSeatMaps));
    } catch {
      // ignore
    }
  }

  /**
   * Seed initial events into Firestore if the collection is empty
   */
  private async seedFirestoreIfEmpty() {
    if (!db || this.hasSeededFirestore || !isFirebaseConfigured) return;
    try {
      const eventsRef = collection(db, 'events');
      const snap = await getDocs(eventsRef);
      if (snap.empty) {
        console.log('[StageFront] Seeding initial events to Cloud Firestore...');
        for (const evt of INITIAL_EVENTS) {
          await setDoc(doc(db, 'events', evt.id), evt);
        }
        this.hasSeededFirestore = true;
      } else {
        this.hasSeededFirestore = true;
      }
    } catch (err) {
      console.warn('[StageFront] Notice on Firestore event seeding:', err);
    }
  }

  /**
   * Fetch events with filters from Firestore, backend, or cached store
   */
  public async getEvents(filters?: EventFilterQuery): Promise<EventItem[]> {
    let eventsList: EventItem[] = [];

    // 1. Try Firestore client SDK if configured
    if (db && isFirebaseConfigured) {
      try {
        await this.seedFirestoreIfEmpty();
        const eventsRef = collection(db, 'events');
        const snap = await getDocs(eventsRef);
        if (!snap.empty) {
          eventsList = snap.docs.map((docSnap) => docSnap.data() as EventItem);
        }
      } catch (err) {
        console.warn('[StageFront] Firestore getEvents read notice:', err);
      }
    }

    // 2. Try Express backend if Firestore returned empty or failed
    if (eventsList.length === 0) {
      try {
        const res = await apiClient.get<{ success: boolean; data: EventItem[] }>('/events');
        if (res && res.data && res.data.length > 0) {
          eventsList = res.data;
        }
      } catch {
        // backend request failed, fallback to local
      }
    }

    // 3. Fallback to cached local events
    if (eventsList.length === 0) {
      eventsList = [...this.localEvents];
    }

    // Client-side filtering and sorting
    let result = [...eventsList];

    if (!filters) return result;

    if (filters.category && filters.category !== 'all') {
      result = result.filter((e) => e.category === filters.category);
    }

    if (filters.city && filters.city !== 'all') {
      result = result.filter((e) => e.venue.city.toLowerCase() === filters.city?.toLowerCase());
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.subtitle.toLowerCase().includes(query) ||
          e.venue.name.toLowerCase().includes(query) ||
          e.venue.city.toLowerCase().includes(query) ||
          e.artistOrTeams?.some((a) => a.toLowerCase().includes(query)) ||
          e.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (filters.minPrice !== undefined) {
      result = result.filter((e) => e.priceStartingFrom >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      result = result.filter((e) => e.priceStartingFrom <= filters.maxPrice!);
    }

    if (filters.sortBy) {
      if (filters.sortBy === 'price_asc') {
        result.sort((a, b) => a.priceStartingFrom - b.priceStartingFrom);
      } else if (filters.sortBy === 'price_desc') {
        result.sort((a, b) => b.priceStartingFrom - a.priceStartingFrom);
      } else if (filters.sortBy === 'date_asc') {
        result.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      }
    }

    return result;
  }

  /**
   * Fetch single event details
   */
  public async getEventById(id: string): Promise<EventItem | null> {
    if (db && isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'events', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as EventItem;
        }
      } catch (err) {
        console.warn('[StageFront] Firestore getEventById notice:', err);
      }
    }

    // Try backend
    try {
      const res = await apiClient.get<{ success: boolean; data: EventItem }>(`/events/${id}`);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // fallback
    }

    const local = this.localEvents.find((e) => e.id === id);
    return local || null;
  }

  /**
   * Fetch featured events
   */
  public async getFeaturedEvents(): Promise<EventItem[]> {
    const all = await this.getEvents();
    return all.filter((e) => e.isFeatured);
  }

  /**
   * Fetch seat availability matrix for an event
   */
  public async getSeatMap(eventId: string): Promise<SeatItem[]> {
    // 1. Try backend endpoint
    try {
      const res = await apiClient.get<{ success: boolean; data: SeatItem[] }>(`/events/${eventId}/seats`);
      if (res && res.data && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // fallback
    }

    // 2. Try Firestore subcollection /events/{eventId}/seats
    if (db && isFirebaseConfigured) {
      try {
        const seatsRef = collection(db, 'events', eventId, 'seats');
        const snap = await getDocs(seatsRef);
        if (!snap.empty) {
          return snap.docs.map((s) => s.data() as SeatItem);
        }
      } catch (err) {
        console.warn('[StageFront] Firestore seats read notice:', err);
      }
    }

    // 3. Fallback to cached layout
    if (!this.localSeatMaps[eventId]) {
      const evt = this.localEvents.find((e) => e.id === eventId);
      if (evt) {
        this.localSeatMaps[eventId] = generateEventSeatMap(eventId, evt.tierConfigs);
        this.saveLocalSeatMaps();
      } else {
        return [];
      }
    }
    return this.localSeatMaps[eventId];
  }

  /**
   * Create event via Admin endpoint
   */
  public async createEvent(
    eventData: Omit<EventItem, 'id' | 'totalSeats' | 'availableSeats'>
  ): Promise<EventItem> {
    try {
      const res = await apiClient.post<{ success: boolean; data: EventItem }>('/admin/events', eventData);
      if (res && res.data) {
        return res.data;
      }
    } catch {
      // fallback
    }

    const newId = `evt-${Date.now().toString(36)}`;
    const newEvent: EventItem = {
      ...eventData,
      id: newId,
      totalSeats: 160,
      availableSeats: 140,
    };

    if (db && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'events', newId), newEvent);
      } catch (dbErr) {
        console.warn('Could not write event to Firestore directly:', dbErr);
      }
    }

    this.localEvents.unshift(newEvent);
    this.localSeatMaps[newId] = generateEventSeatMap(newId, newEvent.tierConfigs);
    this.saveLocalEvents();
    this.saveLocalSeatMaps();

    return newEvent;
  }

  /**
   * Delete event via Admin endpoint
   */
  public async deleteEvent(id: string): Promise<boolean> {
    try {
      await apiClient.request(`/admin/events/${id}`, { method: 'DELETE' });
    } catch {
      // fallback
    }

    if (db && isFirebaseConfigured) {
      try {
        await deleteDoc(doc(db, 'events', id));
      } catch {
        // ignore
      }
    }

    this.localEvents = this.localEvents.filter((e) => e.id !== id);
    delete this.localSeatMaps[id];
    this.saveLocalEvents();
    this.saveLocalSeatMaps();
    return true;
  }
}

export const eventService = new EventService();
