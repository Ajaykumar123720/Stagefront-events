import React, { useState } from 'react';
import {
  Ticket,
  Search,
  MapPin,
  User,
  Shield,
  Layers,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, UserRole, EventCategory } from '../../types/api';

interface NavbarProps {
  currentUser: UserProfile | null;
  activeView: 'events' | 'my-tickets' | 'admin' | 'seating';
  onViewChange: (view: 'events' | 'my-tickets' | 'admin') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenBlueprint: () => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory?: EventCategory | 'all';
  onCategorySelect: (category: EventCategory | 'all') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  onViewChange,
  onOpenAuth,
  onLogout,
  onOpenBlueprint,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchChange,
  activeCategory = 'all',
  onCategorySelect,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const handleNavCategory = (cat: EventCategory | 'all') => {
    onCategorySelect(cat);
    onViewChange('events');
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <button
              onClick={() => {
                onCategorySelect('all');
                onViewChange('events');
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#356AE6] flex items-center justify-center text-white shadow-xs group-hover:bg-[#2A55B8] transition">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#20242C]">
                StageFront
              </span>
            </button>

            {/* Location Selector */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#20242C] hover:border-slate-300 transition">
              <MapPin className="w-3.5 h-3.5 text-[#356AE6]" />
              <select
                value={selectedCity}
                aria-label="Filter events by city location"
                onChange={(e) => onCityChange(e.target.value)}
                className="bg-transparent text-[#20242C] font-medium outline-none cursor-pointer pr-1"
              >
                <option value="all">All Locations</option>
                <option value="London">London, UK</option>
                <option value="Kolkata">Kolkata, IN</option>
                <option value="Mumbai">Mumbai, IN</option>
                <option value="New York">New York, US</option>
                <option value="Sydney">Sydney, AU</option>
              </select>
            </div>
          </div>

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium">
            <button
              onClick={() => handleNavCategory('all')}
              className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                activeView === 'events' && activeCategory === 'all'
                  ? 'text-[#356AE6] bg-blue-50/80 font-bold'
                  : 'text-[#687386] hover:text-[#20242C] hover:bg-slate-50'
              }`}
            >
              Discover
            </button>

            <button
              onClick={() => handleNavCategory('concert')}
              className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                activeView === 'events' && activeCategory === 'concert'
                  ? 'text-[#356AE6] bg-blue-50/80 font-bold'
                  : 'text-[#687386] hover:text-[#20242C] hover:bg-slate-50'
              }`}
            >
              Concerts
            </button>

            <button
              onClick={() => handleNavCategory('cricket')}
              className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                activeView === 'events' && (activeCategory === 'cricket' || activeCategory === 'football')
                  ? 'text-[#356AE6] bg-blue-50/80 font-bold'
                  : 'text-[#687386] hover:text-[#20242C] hover:bg-slate-50'
              }`}
            >
              Sports
            </button>

            <button
              onClick={() => handleNavCategory('entertainment')}
              className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                activeView === 'events' && activeCategory === 'entertainment'
                  ? 'text-[#356AE6] bg-blue-50/80 font-bold'
                  : 'text-[#687386] hover:text-[#20242C] hover:bg-slate-50'
              }`}
            >
              Comedy
            </button>

            <button
              onClick={() => onViewChange('my-tickets')}
              className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                activeView === 'my-tickets'
                  ? 'text-[#356AE6] bg-blue-50/80 font-bold'
                  : 'text-[#687386] hover:text-[#20242C] hover:bg-slate-50'
              }`}
            >
              My Tickets
            </button>

            {/* Admin Portal (Authorized administrators only) */}
            {isAdmin && (
              <button
                onClick={() => onViewChange('admin')}
                className={`px-3 py-2 rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'text-[#356AE6] bg-blue-50 font-bold'
                    : 'text-slate-600 hover:text-[#20242C] hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#356AE6]" />
                Admin
              </button>
            )}
          </nav>

          {/* Search field */}
          <div className="hidden lg:flex flex-1 max-w-xs mx-2">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, venues..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:border-[#356AE6] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Right Action Menu: User Account / Sign In */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#356AE6] text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.fullName[0]}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-[#20242C] max-w-[120px] truncate">
                    {currentUser.fullName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Account dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-xs animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-semibold text-[#20242C] truncate">{currentUser.fullName}</p>
                      <p className="text-[11px] text-[#687386] truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {currentUser.role === 'admin' ? 'Faculty Admin' : 'Customer Account'}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          onViewChange('my-tickets');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Ticket className="w-4 h-4 text-slate-400" />
                        My Bookings &amp; Passes
                      </button>

                      {isAdmin ? (
                        <button
                          onClick={() => {
                            onViewChange('admin');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-[#356AE6] font-semibold hover:bg-blue-50/50 flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4 text-[#356AE6]" />
                          Admin Console
                        </button>
                      ) : null}

                      <button
                        onClick={() => {
                          onOpenBlueprint();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Layers className="w-4 h-4 text-slate-400" />
                        Project Architecture Guide
                      </button>
                    </div>

                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 text-[11px] text-[#687386]">
                      <span className="font-semibold text-[#20242C] block">Role Permission:</span>
                      <span className="capitalize">{currentUser.role === 'admin' ? 'Administrator (Custom Claim / Firestore)' : 'Standard Customer'}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-[#20242C] hover:bg-slate-100 md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-3 space-y-2">
            <div className="relative w-full mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search events, venues..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#20242C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 text-xs font-medium">
              <button
                onClick={() => handleNavCategory('all')}
                className="p-2.5 rounded-lg bg-slate-50 text-left text-[#20242C] hover:bg-slate-100"
              >
                Discover All
              </button>
              <button
                onClick={() => handleNavCategory('concert')}
                className="p-2.5 rounded-lg bg-slate-50 text-left text-[#20242C] hover:bg-slate-100"
              >
                Concerts
              </button>
              <button
                onClick={() => handleNavCategory('cricket')}
                className="p-2.5 rounded-lg bg-slate-50 text-left text-[#20242C] hover:bg-slate-100"
              >
                Sports
              </button>
              <button
                onClick={() => handleNavCategory('entertainment')}
                className="p-2.5 rounded-lg bg-slate-50 text-left text-[#20242C] hover:bg-slate-100"
              >
                Comedy
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col gap-1 text-xs">
              <button
                onClick={() => {
                  onViewChange('my-tickets');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-left text-slate-700 hover:bg-slate-50 font-medium"
              >
                My Tickets
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    onViewChange('admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-lg text-left text-[#356AE6] font-semibold hover:bg-blue-50"
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => {
                  onOpenBlueprint();
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg text-left text-slate-600 hover:bg-slate-50"
              >
                Project Documentation
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
