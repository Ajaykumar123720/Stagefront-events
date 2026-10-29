import { useState, useEffect, useCallback } from 'react';
import { AdminAnalyticsMetrics, EventItem } from '../types/api';
import { adminService } from '../services/adminService';
import { eventService } from '../services/eventService';

export function useAdmin() {
  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getAnalytics();
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const createEvent = async (eventData: Omit<EventItem, 'id' | 'totalSeats' | 'availableSeats'>) => {
    try {
      const newEvt = await eventService.createEvent(eventData);
      await fetchMetrics();
      return newEvt;
    } catch (err: unknown) {
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<EventItem>) => {
    try {
      const updated = await eventService.updateEvent(id, updates);
      await fetchMetrics();
      return updated;
    } catch (err: unknown) {
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id);
      await fetchMetrics();
      return true;
    } catch (err: unknown) {
      throw err;
    }
  };

  const exportManifest = async (eventId: string, eventTitle: string) => {
    const csvContent = await adminService.generateManifestCsv(eventId);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `manifest_${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    metrics,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    exportManifest,
    refetch: fetchMetrics,
  };
}
