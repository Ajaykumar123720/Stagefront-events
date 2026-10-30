import React from 'react';
import { EventCategory, EventFilterQuery, formatINR } from '../../types/api';
import { SlidersHorizontal, RotateCcw, MapPin, IndianRupee } from 'lucide-react';

interface EventFilterBarProps {
  filters: EventFilterQuery;
  onFilterChange: (filters: Partial<EventFilterQuery>) => void;
  onReset: () => void;
  totalResults: number;
}

export const EventFilterBar: React.FC<EventFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalResults,
}) => {
  const categories: { key: EventCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All Events' },
    { key: 'concert', label: 'Concerts' },
    { key: 'cricket', label: 'Cricket' },
    { key: 'football', label: 'Football' },
    { key: 'entertainment', label: 'Comedy & Shows' },
  ];

  const hasActiveFilters =
    (filters.category && filters.category !== 'all') ||
    (filters.city && filters.city !== 'all') ||
    (filters.searchQuery && filters.searchQuery !== '') ||
    (filters.maxPrice && filters.maxPrice > 0) ||
    (filters.sortBy && filters.sortBy !== 'date_asc');

  return (
    <div className="space-y-4 pt-2">
      {/* Category Pills & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = (filters.category || 'all') === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => onFilterChange({ category: cat.key })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#356AE6] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-[#687386] hover:text-[#20242C]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Controls: City, Price, Sort, Reset */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          
          {/* City filter */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#356AE6]" />
            <select
              value={filters.city || 'all'}
              aria-label="Filter events by city"
              onChange={(e) => onFilterChange({ city: e.target.value })}
              className="bg-transparent text-xs text-[#20242C] outline-none cursor-pointer"
            >
              <option value="all">All Cities</option>
              <option value="London">London</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Mumbai">Mumbai</option>
              <option value="New York">New York</option>
              <option value="Sydney">Sydney</option>
            </select>
          </div>

          {/* Price Bracket */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] shadow-2xs">
            <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.maxPrice || ''}
              aria-label="Filter events by price range"
              onChange={(e) =>
                onFilterChange({
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="bg-transparent text-xs text-[#20242C] outline-none cursor-pointer"
            >
              <option value="">Any Price</option>
              <option value="1500">Under ₹1,500</option>
              <option value="2000">Under ₹2,000</option>
              <option value="3000">Under ₹3,000</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.sortBy || 'date_asc'}
              aria-label="Sort events"
              onChange={(e) =>
                onFilterChange({
                  sortBy: e.target.value as EventFilterQuery['sortBy'],
                })
              }
              className="bg-transparent text-xs text-[#20242C] outline-none cursor-pointer"
            >
              <option value="date_asc">Upcoming Date</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
              title="Reset all search &amp; filter options"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}

        </div>
      </div>

      {/* Results Count Meta */}
      <div className="flex items-center justify-between text-xs text-[#687386]">
        <span>
          Showing <strong className="text-[#20242C] font-semibold">{totalResults}</strong> events
          {filters.city && filters.city !== 'all' ? ` in ${filters.city}` : ''}
          {filters.searchQuery ? ` matching "${filters.searchQuery}"` : ''}
          {filters.maxPrice ? ` under ${formatINR(filters.maxPrice)}` : ''}
        </span>
        <span className="hidden sm:inline text-[11px] text-slate-400">
          Official tickets with guaranteed seat selection
        </span>
      </div>
    </div>
  );
};
