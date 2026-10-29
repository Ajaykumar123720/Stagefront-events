/**
 * StageFront Events — Premium Event Discovery & Ticketing Platform
 * 
 * Redesigned for production-grade editorial presentation:
 * - Clean white background (#FFFFFF)
 * - Charcoal typography (#20242C)
 * - Slate gray secondary text (#687386)
 * - Subtle premium blue accent (#356AE6)
 * - Restrained rounded corners and soft borders
 */

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useEvents, useEventDetail } from './hooks/useEvents';
import { useBooking } from './hooks/useBooking';
import { testFirestoreConnection } from './services/firebase';
import { EventItem, BookingRecord, EventCategory } from './types/api';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProjectNoticeModal } from './components/layout/ProjectNoticeModal';

// Event Components
import { EventHero } from './components/events/EventHero';
import { EventFilterBar } from './components/events/EventFilterBar';
import { EventCard } from './components/events/EventCard';
import { EventDetailModal } from './components/events/EventDetailModal';

// Seating Components
import { SeatingChart } from './components/seating/SeatingChart';
import { SeatLegend } from './components/seating/SeatLegend';
import { CartSummary } from './components/seating/CartSummary';
import { CheckoutModal } from './components/seating/CheckoutModal';

// Customer & Admin Components
import { CustomerDashboard } from './components/customer/CustomerDashboard';
import { TicketPassModal } from './components/customer/TicketPassModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';

// Common Components
import { EventCardSkeleton } from './components/common/LoadingSkeleton';
import { EmptyState } from './components/common/EmptyState';
import { ArrowLeft, Calendar, MapPin, Layers } from 'lucide-react';

export default function App() {
  const { currentUser, logout } = useAuth();
  const {
    events,
    featuredEvents,
    filters,
    isLoading: isEventsLoading,
    updateFilters,
    resetFilters,
  } = useEvents();

  // Navigation & View state (Default landing page: customer event discovery 'events')
  const [activeView, setActiveView] = useState<'events' | 'my-tickets' | 'admin' | 'seating'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') return 'admin';
      if (hash === '#my-tickets') return 'my-tickets';
    }
    return 'events';
  });
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [inspectEventDetail, setInspectEventDetail] = useState<EventItem | null>(null);

  React.useEffect(() => {
    testFirestoreConnection();

    const handleHashSync = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#admin') setActiveView('admin');
      else if (hash === '#my-tickets') setActiveView('my-tickets');
      else if (hash === '#events') setActiveView('events');
    };

    window.addEventListener('hashchange', handleHashSync);
    window.addEventListener('popstate', handleHashSync);
    return () => {
      window.removeEventListener('hashchange', handleHashSync);
      window.removeEventListener('popstate', handleHashSync);
    };
  }, []);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedBookingPass, setConfirmedBookingPass] = useState<BookingRecord | null>(null);

  // Active Seating Hooks
  const { seatMap, reload: reloadSeatMap } = useEventDetail(activeEvent?.id || null);
  const {
    selectedSeats,
    toggleSeat,
    clearSelection,
    pricing,
    holdSelectedSeats,
    confirmBooking,
    isHolding,
    holdTimerSeconds,
  } = useBooking(activeEvent?.id);

  // Navigate to seating chart
  const handleStartBooking = (event: EventItem) => {
    setActiveEvent(event);
    clearSelection();
    setActiveView('seating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to browse events
  const handleBackToEvents = () => {
    clearSelection();
    setActiveEvent(null);
    setActiveView('events');
  };

  // Trigger checkout
  const handleProceedToCheckout = async () => {
    if (selectedSeats.length === 0) return;
    if (currentUser) {
      await holdSelectedSeats(currentUser.id);
    }
    setIsCheckoutOpen(true);
  };

  // Final booking confirmation
  const handleConfirmReservation = async (payload: {
    userName: string;
    userEmail: string;
    paymentMethod: string;
  }) => {
    if (!activeEvent) return;

    const record = await confirmBooking({
      eventId: activeEvent.id,
      userId: currentUser?.id || 'usr-guest',
      userName: payload.userName,
      userEmail: payload.userEmail,
      seatIds: selectedSeats.map((s) => s.id),
      paymentMethod: payload.paymentMethod,
    });

    if (record) {
      setConfirmedBookingPass(record);
      await reloadSeatMap();
      setActiveView('my-tickets');
    }
  };

  const handleCategoryNav = (cat: EventCategory | 'all') => {
    updateFilters({ category: cat });
    setActiveView('events');
  };

  return (
    <div className="min-h-screen bg-white text-[#20242C] flex flex-col font-sans selection:bg-[#356AE6] selection:text-white antialiased">
      
      {/* Discreet Academic Project Notice Bar */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-4 py-1.5 text-center text-xs text-[#687386] flex items-center justify-center gap-2 flex-wrap">
        <span>StageFront Events — College Capstone Project</span>
        <span className="text-slate-300">•</span>
        <button
          onClick={() => setIsBlueprintOpen(true)}
          className="text-[#356AE6] hover:underline font-medium cursor-pointer"
        >
          View System Architecture
        </button>
        <span className="text-slate-300">•</span>
        <button
          onClick={() => {
            window.location.hash = 'admin';
            setActiveView('admin');
          }}
          className="text-slate-600 hover:text-[#356AE6] font-medium cursor-pointer"
        >
          Faculty Admin Console
        </button>
      </div>

      {/* Primary Global Navigation */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        onViewChange={(view) => {
          if (view === 'events') {
            handleBackToEvents();
          } else {
            setActiveView(view);
          }
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={logout}
        onOpenBlueprint={() => setIsBlueprintOpen(true)}
        selectedCity={filters.city || 'all'}
        onCityChange={(city) => updateFilters({ city })}
        searchQuery={filters.searchQuery || ''}
        onSearchChange={(searchQuery) => updateFilters({ searchQuery })}
        activeCategory={filters.category || 'all'}
        onCategorySelect={handleCategoryNav}
      />

      {/* Main View Container */}
      <main className="flex-1">
        
        {/* VIEW 1: CUSTOMER EVENT DISCOVERY (DEFAULT HOMEPAGE) */}
        {activeView === 'events' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fadeIn">
            
            {/* Editorial Featured Showcase (shown on Discover view when not searching) */}
            {(!filters.searchQuery || filters.searchQuery === '') && (filters.category === 'all' || !filters.category) && (
              <EventHero
                featuredEvents={featuredEvents}
                onSelectEvent={(evt) => setInspectEventDetail(evt)}
                onBookSeats={handleStartBooking}
              />
            )}

            {/* Discovery Filter Controls */}
            <EventFilterBar
              filters={filters}
              onFilterChange={updateFilters}
              onReset={resetFilters}
              totalResults={events.length}
            />

            {/* Event Cards Grid */}
            {isEventsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                type="search"
                title="No Events Found"
                description="We couldn't find any events matching your selected criteria. Try adjusting filters or searching with another term."
                actionText="Reset All Filters"
                onAction={resetFilters}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onSelect={(evt) => setInspectEventDetail(evt)}
                    onBookSeats={handleStartBooking}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: PREMIUM VISUAL SEAT SELECTION */}
        {activeView === 'seating' && activeEvent && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
            
            {/* Breadcrumb Navigation Header */}
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
              <button
                onClick={handleBackToEvents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-[#20242C] hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                Back to Events
              </button>

              <div className="flex items-center gap-3 text-xs text-[#687386]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(activeEvent.dateTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeEvent.venue.name}, {activeEvent.venue.city}</span>
                </div>
              </div>
            </div>

            {/* Event Title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#20242C]">
                {activeEvent.title}
              </h1>
              <p className="text-xs text-[#687386] mt-0.5">
                Select your seats on the interactive floor plan. Tier pricing is updated in real time.
              </p>
            </div>

            {/* Seating Chart & Price Summary Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Seating Chart on Left */}
              <div className="lg:col-span-8 space-y-5">
                <SeatLegend tiers={activeEvent.tierConfigs} />

                <SeatingChart
                  seatMap={seatMap}
                  selectedSeats={selectedSeats}
                  tiers={activeEvent.tierConfigs}
                  onToggleSeat={toggleSeat}
                  layoutType={activeEvent.venue.layoutType}
                />
              </div>

              {/* Price Summary on Right */}
              <div className="lg:col-span-4 sticky top-24">
                <CartSummary
                  selectedSeats={selectedSeats}
                  pricing={pricing}
                  onRemoveSeat={(seat) => toggleSeat(seat)}
                  onClearAll={clearSelection}
                  onProceedToCheckout={handleProceedToCheckout}
                  holdTimerSeconds={holdTimerSeconds}
                  isHolding={isHolding}
                />
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: SEPARATE CUSTOMER ACCOUNT DASHBOARD */}
        {activeView === 'my-tickets' && currentUser && (
          <CustomerDashboard
            currentUser={currentUser}
            onBrowseEvents={handleBackToEvents}
          />
        )}

        {/* VIEW 4: SEPARATE ADMIN DASHBOARD */}
        {activeView === 'admin' && (
          <AdminDashboard
            onBrowseEvents={handleBackToEvents}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

      </main>

      {/* Floating Blueprint Document Trigger */}
      <button
        onClick={() => setIsBlueprintOpen(true)}
        className="fixed bottom-5 right-5 z-30 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-[#20242C] border border-slate-200 shadow-md text-xs font-medium flex items-center gap-2 transition cursor-pointer"
        title="View Technical Project Documentation"
      >
        <Layers className="w-4 h-4 text-[#356AE6]" />
        <span>Architecture Guide</span>
      </button>

      {/* Modals */}
      <ProjectNoticeModal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
      />

      <EventDetailModal
        event={inspectEventDetail}
        isOpen={!!inspectEventDetail}
        onClose={() => setInspectEventDetail(null)}
        onSelectSeats={handleStartBooking}
      />

      {activeEvent && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          event={activeEvent}
          seats={selectedSeats}
          pricing={pricing}
          currentUser={currentUser}
          onConfirm={handleConfirmReservation}
        />
      )}

      <TicketPassModal
        booking={confirmedBookingPass}
        isOpen={!!confirmedBookingPass}
        onClose={() => setConfirmedBookingPass(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Footer */}
      <Footer onOpenBlueprint={() => setIsBlueprintOpen(true)} />

    </div>
  );
}
