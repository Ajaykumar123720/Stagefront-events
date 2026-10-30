import { useState, useEffect, useCallback } from 'react';
import { EventItem, EventFilterQuery, SeatItem } from '../types/api';
import { eventService } from '../services/eventService';

export function useEvents(initialFilters?: EventFilterQuery) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventItem[]>([]);
  const [filters, setFilters] = useState<EventFilterQuery>(initialFilters || { category: 'all' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventService.getEvents(filters);
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const fetchFeatured = useCallback(async () => {
    try {
      const data = await eventService.getFeaturedEvents();
      setFeaturedEvents(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  // Real-time synchronization for events catalog
  useEffect(() => {
    const unsubscribe = eventService.subscribeToEvents((liveEvents) => {
      let filtered = [...liveEvents];
      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter((e) => e.category === filters.category);
      }
      if (filters.city && filters.city !== 'all') {
        filtered = filtered.filter((e) => e.venue.city.toLowerCase() === filters.city?.toLowerCase());
      }
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.venue.name.toLowerCase().includes(q) ||
            e.venue.city.toLowerCase().includes(q)
        );
      }
      if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
        filtered = filtered.filter((e) => e.priceStartingFrom <= filters.maxPrice!);
      }
      if (filters.sortBy === 'price_asc') {
        filtered.sort((a, b) => a.priceStartingFrom - b.priceStartingFrom);
      } else if (filters.sortBy === 'price_desc') {
        filtered.sort((a, b) => b.priceStartingFrom - a.priceStartingFrom);
      } else if (filters.sortBy === 'date_asc') {
        filtered.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      }
      setEvents(filtered);
      setFeaturedEvents(liveEvents.filter((e) => e.isFeatured));
    });

    return () => {
      unsubscribe();
    };
  }, [filters]);

  const updateFilters = (newFilters: Partial<EventFilterQuery>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({ category: 'all', searchQuery: '', city: 'all' });
  };

  return {
    events,
    featuredEvents,
    filters,
    isLoading,
    error,
    updateFilters,
    resetFilters,
    refetch: fetchEvents,
  };
}

export function useEventDetail(eventId: string | null) {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [seatMap, setSeatMap] = useState<SeatItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      setSeatMap([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [evtData, seatsData] = await Promise.all([
        eventService.getEventById(eventId),
        eventService.getSeatMap(eventId),
      ]);
      setEvent(evtData);
      setSeatMap(seatsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Real-time synchronization for seat inventory matrix
  useEffect(() => {
    if (!eventId) return;

    const unsubscribe = eventService.subscribeToSeatMap(eventId, (liveSeats) => {
      if (liveSeats && liveSeats.length > 0) {
        setSeatMap(liveSeats);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventId]);

  return {
    event,
    seatMap,
    isLoading,
    error,
    reload: loadEvent,
  };
}
