import React, { useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { useEvents, useEventDetail } from '../../hooks/useEvents';
import { useBooking } from '../../hooks/useBooking';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { EventItem, BookingRecord, formatINR } from '../../types/api';
import { EventCreateModal } from './EventCreateModal';
import { EventEditModal } from './EventEditModal';
import { SeatingChart } from '../seating/SeatingChart';
import { SeatLegend } from '../seating/SeatLegend';
import {
  IndianRupee,
  Ticket,
  TrendingUp,
  Percent,
  Plus,
  Download,
  Trash2,
  Armchair,
  RefreshCw,
  X,
  LayoutDashboard,
  CalendarDays,
  FileSpreadsheet,
  Building2,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Edit2,
  Users,
} from 'lucide-react';
import { CategoryBadge, StatusBadge } from '../common/StatusBadge';

type AdminTab =
  | 'overview'
  | 'events'
  | 'bookings'
  | 'inventory'
  | 'analytics'
  | 'architecture';

interface AdminDashboardProps {
  onBrowseEvents?: () => void;
  onOpenAuth?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBrowseEvents,
  onOpenAuth,
}) => {
  const { currentUser, isAdmin, refreshUser } = useAuth();
  const { metrics, createEvent, updateEvent, deleteEvent, exportManifest, refetch } = useAdmin();
  const { events, refetch: refetchEvents } = useEvents();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [inspectingEvent, setInspectingEvent] = useState<EventItem | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isReverifying, setIsReverifying] = useState(false);

  const { seatMap } = useEventDetail(inspectingEvent?.id || null);

  const handleReverifyAccess = async () => {
    setIsReverifying(true);
    try {
      await refreshUser();
    } finally {
      setIsReverifying(false);
    }
  };

  // Authorization Route Protection: strictly enforced
  if (!isAdmin || !currentUser) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#20242C]">Administrator Access Required</h2>
        <p className="text-xs text-[#687386] leading-relaxed">
          The StageFront Admin Console is protected by server-side role-based access control. Administrator privileges must be granted via Firebase Custom Claims (e.g. <code>admin: true</code>), a verified document in <code>/admins/{'{uid}'}</code>, or the server-side authorized email allowlist.
        </p>
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-[#687386] text-left space-y-1">
          <span className="font-semibold text-[#20242C] block">Current Authenticated Session:</span>
          <div>UID: <code className="font-mono text-[#20242C]">{currentUser?.id || 'Unauthenticated'}</code></div>
          <div>Email: <code className="font-mono text-[#20242C]">{currentUser?.email || 'None'}</code></div>
          <div>Assigned Role: <span className="font-semibold text-rose-600 uppercase">{currentUser?.role || 'Guest'}</span></div>
        </div>
        <div className="pt-2 flex items-center justify-center flex-wrap gap-3 text-xs">
          {currentUser && (
            <button
              onClick={handleReverifyAccess}
              disabled={isReverifying}
              className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReverifying ? 'animate-spin' : ''}`} />
              {isReverifying ? 'Verifying...' : 'Re-verify Admin Access'}
            </button>
          )}
          {onBrowseEvents && (
            <button
              onClick={onBrowseEvents}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#20242C] font-medium transition cursor-pointer"
            >
              Browse Events
            </button>
          )}
          {!currentUser && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium transition cursor-pointer"
            >
              Sign In with Authorized Account
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(eventToDelete.id);
      await refetchEvents();
      setSuccessMessage(`Event "${eventToDelete.title}" successfully deleted.`);
      setEventToDelete(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete event. Please ensure your account has administrator rights.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (e: EventItem) => {
    await exportManifest(e.id, e.title);
    setSuccessMessage(`Attendee manifest CSV generated for "${e.title}".`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Admin Shell Layout: Sidebar + Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
            <div className="px-3 py-2 border-b border-slate-100 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Admin Console
              </span>
              <p className="text-xs font-bold text-[#20242C] truncate">
                {currentUser.fullName}
              </p>
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'events'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Event Management
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Booking Manifests
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Venues &amp; Inventory
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Reports &amp; Analytics
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-blue-50 text-[#356AE6] font-semibold'
                  : 'text-[#687386] hover:bg-slate-50 hover:text-[#20242C]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              System Architecture
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-bold text-[#20242C] capitalize">
                {activeTab === 'overview' && 'Overview Telemetry'}
                {activeTab === 'events' && 'Event Management & Inventory'}
                {activeTab === 'bookings' && 'Booking Manifests & Orders'}
                {activeTab === 'inventory' && 'Venue & Floor Plan Inspector'}
                {activeTab === 'analytics' && 'Ticketing Analytics & Capacity'}
                {activeTab === 'architecture' && 'Full-Stack Architecture Status'}
              </h1>
              <p className="text-xs text-[#687386] mt-0.5">
                StageFront Management Portal • College Final-Year Project
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  refetch();
                  refetchEvents();
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#20242C] shadow-2xs transition cursor-pointer"
                title="Refresh metrics"
                aria-label="Refresh metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </div>
          </div>

          {/* Operation Status Feedback */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="cursor-pointer text-emerald-600 hover:text-emerald-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {deleteError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fadeIn">
              <span>{deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="cursor-pointer text-rose-600 hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Restrained Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Gross Revenue (INR)</span>
                    <IndianRupee className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-xl font-bold text-[#20242C] font-mono block">
                    {formatINR(metrics?.totalRevenue || 0)}
                  </span>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">
                    Confirmed orders only
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Total Bookings</span>
                    <Ticket className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-xl font-bold text-[#20242C] font-mono block">
                    {metrics?.totalBookings || 0}
                  </span>
                  <span className="text-[11px] text-[#687386] mt-0.5 block">
                    {metrics?.totalTicketsSold || 0} tickets issued
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Customers</span>
                    <Users className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-xl font-bold text-[#20242C] font-mono block">
                    {metrics?.registeredCustomers || 1}
                  </span>
                  <span className="text-[11px] text-[#687386] mt-0.5 block">
                    Registered accounts
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Seat Capacity</span>
                    <Armchair className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-lg font-bold text-[#20242C] font-mono block truncate">
                    {metrics?.bookedSeats ?? (events.reduce((s, e) => s + (e.totalSeats - e.availableSeats), 0))} / {(metrics?.bookedSeats ?? 0) + (metrics?.availableSeats ?? events.reduce((s, e) => s + e.availableSeats, 0))}
                  </span>
                  <span className="text-[11px] text-[#687386] mt-0.5 block">
                    Booked vs Total Seats
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Active Events</span>
                    <CalendarDays className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-xl font-bold text-[#20242C] font-mono block">
                    {metrics?.totalEvents || events.length}
                  </span>
                  <span className="text-[11px] text-[#687386] mt-0.5 block">
                    Live productions
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[#687386] text-xs mb-1.5">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Occupancy</span>
                    <Percent className="w-4 h-4 text-[#356AE6]" />
                  </div>
                  <span className="text-xl font-bold text-[#20242C] font-mono block">
                    {metrics?.occupancyRate || 0}%
                  </span>
                  <span className="text-[11px] text-[#356AE6] mt-0.5 block">
                    Average stadium fill
                  </span>
                </div>
              </div>

              {/* Revenue by Event Category */}
              {metrics?.categorySalesDistribution && (
                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                    Revenue by Event Category
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {metrics.categorySalesDistribution.map((cat) => (
                      <div key={cat.category} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <CategoryBadge category={cat.category} />
                          <span className="text-xs font-mono font-bold text-[#20242C]">{formatINR(cat.revenue)}</span>
                        </div>
                        <div className="text-[11px] text-[#687386]">
                          {cat.count} ticket(s) reserved
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Bookings Feed */}
              {metrics?.recentBookings && (
                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                    Recent Booking Activity
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[#687386] uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3">Event Title</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Seats</th>
                          <th className="py-2.5 px-3">Amount (INR)</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.recentBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#356AE6]">{b.bookingReference}</td>
                            <td className="py-2.5 px-3 text-[#20242C] font-medium">{b.eventTitle}</td>
                            <td className="py-2.5 px-3 text-[#687386]">{b.userName}</td>
                            <td className="py-2.5 px-3 text-[#20242C] font-mono">{b.seats.length}</td>
                            <td className="py-2.5 px-3 text-[#20242C] font-mono font-semibold">{formatINR(b.totalAmount, true)}</td>
                            <td className="py-2.5 px-3">
                              <StatusBadge status={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVENTS MANAGEMENT */}
          {activeTab === 'events' && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                  Event Inventory &amp; Seat Capacity Table
                </h3>
                <span className="text-xs text-[#687386]">{events.length} events loaded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[#687386] uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Title</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Venue / City</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Capacity</th>
                      <th className="py-3 px-3">Price</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((e) => {
                      const sold = e.totalSeats - e.availableSeats;
                      const ratio = Math.round((sold / e.totalSeats) * 100);

                      return (
                        <tr key={e.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3">
                            <span className="font-bold text-[#20242C] block max-w-xs truncate">{e.title}</span>
                            <span className="text-[11px] text-[#687386] block max-w-xs truncate">{e.subtitle}</span>
                          </td>
                          <td className="py-3 px-3">
                            <CategoryBadge category={e.category} />
                          </td>
                          <td className="py-3 px-3 text-[#687386]">
                            <span className="text-[#20242C] font-medium block">{e.venue.name}</span>
                            <span className="text-[11px]">{e.venue.city}</span>
                          </td>
                          <td className="py-3 px-3 text-[#687386]">
                            {new Date(e.dateTime).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-mono font-semibold text-[#20242C]">
                                {sold}/{e.totalSeats} ({ratio}%)
                              </span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-[#356AE6] rounded-full"
                                  style={{ width: `${ratio}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[#20242C] font-bold">
                            {formatINR(e.priceStartingFrom)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectingEvent(e)}
                                className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-[#356AE6] border border-slate-200 text-xs font-medium transition cursor-pointer"
                                title="Inspect Live Seating Chart"
                              >
                                <Armchair className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingEvent(e)}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                                title="Edit Event Information"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleExport(e)}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                                title="Export CSV Attendee Manifest"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteError(null);
                                  setEventToDelete(e);
                                }}
                                className="p-1 rounded bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
                                title="Delete event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BOOKING MANIFESTS */}
          {activeTab === 'bookings' && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                    Audited Booking Manifests
                  </h3>
                  <p className="text-xs text-[#687386]">Export attendee records to CSV for gate verification</p>
                </div>
              </div>

              <div className="space-y-3">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#20242C] block">{e.title}</span>
                      <span className="text-[#687386] text-[11px]">{e.venue.name} • {new Date(e.dateTime).toLocaleDateString()}</span>
                    </div>

                    <button
                      onClick={() => handleExport(e)}
                      className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[#20242C] font-medium text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer self-start sm:self-auto"
                    >
                      <Download className="w-3.5 h-3.5 text-[#356AE6]" />
                      Download Manifest CSV
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: VENUES & INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                Venue Layouts &amp; Floor Plan Inspector
              </h3>
              <p className="text-xs text-[#687386]">
                Select any scheduled production to inspect live seat matrix availability:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-slate-300 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#20242C] text-xs block truncate max-w-[200px]">{e.title}</span>
                      <span className="text-[11px] text-[#687386]">{e.venue.name} ({e.venue.layoutType})</span>
                    </div>
                    <button
                      onClick={() => setInspectingEvent(e)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#356AE6] text-[#356AE6] font-medium text-xs transition cursor-pointer shadow-2xs"
                    >
                      Inspect Map
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                Reports &amp; Occupancy Performance
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-[#687386] block mb-1">Total Capacity</span>
                  <span className="text-lg font-bold text-[#20242C] font-mono">
                    {events.reduce((sum, e) => sum + e.totalSeats, 0)} seats
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-[#687386] block mb-1">Seats Reserved</span>
                  <span className="text-lg font-bold text-[#356AE6] font-mono">
                    {events.reduce((sum, e) => sum + (e.totalSeats - e.availableSeats), 0)} seats
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-[#687386] block mb-1">Global Occupancy</span>
                  <span className="text-lg font-bold text-emerald-700 font-mono">
                    {metrics?.occupancyRate || 0}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SYSTEM ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs">
              <h3 className="text-xs font-bold text-[#20242C] uppercase tracking-wider">
                Full-Stack Architecture &amp; Service Health
              </h3>
              <p className="text-[#687386] leading-relaxed">
                The StageFront Events application is partitioned into clean service modules ready for Express API and Firebase Firestore mounting:
              </p>

              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-[#20242C]">Express Server Blueprint</span>
                  <span className="font-mono text-emerald-700 font-bold">READY (server.ts)</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-[#20242C]">Event Service Module</span>
                  <span className="font-mono text-emerald-700 font-bold">MODULAR (eventService.ts)</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-[#20242C]">Booking Engine Module</span>
                  <span className="font-mono text-emerald-700 font-bold">MODULAR (bookingService.ts)</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-[#20242C]">User &amp; Auth RBAC Module</span>
                  <span className="font-mono text-emerald-700 font-bold">ACTIVE (userService.ts)</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Live Seat Matrix Inspector Modal */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#20242C]">
                    Floor Plan Inspector: {inspectingEvent.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {inspectingEvent.availableSeats} of {inspectingEvent.totalSeats} Available
                  </span>
                </div>
                <p className="text-xs text-[#687386]">{inspectingEvent.venue.name}, {inspectingEvent.venue.city}</p>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1 rounded text-slate-400 hover:text-[#20242C] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <SeatLegend tiers={inspectingEvent.tierConfigs} />
              <SeatingChart
                seatMap={seatMap}
                selectedSeats={[]}
                tiers={inspectingEvent.tierConfigs}
                onToggleSeat={() => {}}
                layoutType={inspectingEvent.venue.layoutType}
              />
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-[#687386]">
              <span>Admin Diagnostic View (Read-Only)</span>
              <button
                onClick={() => setInspectingEvent(null)}
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-[#20242C] font-semibold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <EventCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={async (data) => {
          await createEvent(data);
          await refetchEvents();
          setSuccessMessage(`New event "${data.title}" successfully published.`);
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* Edit Event Modal */}
      <EventEditModal
        event={editingEvent}
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSubmit={async (id, updates) => {
          await updateEvent(id, updates);
          await refetchEvents();
          setSuccessMessage('Event updated successfully.');
          setTimeout(() => setSuccessMessage(null), 4000);
        }}
      />

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#20242C]">Delete Event</h3>
                <p className="text-xs text-[#687386]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-[#20242C] block">{eventToDelete.title}</span>
              <p className="text-[11px] text-[#687386]">
                {eventToDelete.venue.name}, {eventToDelete.venue.city} • {new Date(eventToDelete.dateTime).toLocaleDateString()}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                Deleting this event will remove it from the public catalog, delete its {eventToDelete.totalSeats}-seat inventory map, and archive any associated records.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setEventToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
