import React, { useState } from 'react';
import { SeatItem, SeatTierConfig, formatINR } from '../../types/api';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface SeatingChartProps {
  seatMap: SeatItem[];
  selectedSeats: SeatItem[];
  tiers: SeatTierConfig[];
  onToggleSeat: (seat: SeatItem) => void;
  layoutType?: 'arena' | 'stadium' | 'auditorium';
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  seatMap,
  selectedSeats,
  tiers,
  onToggleSeat,
  layoutType = 'stadium',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredSeat, setHoveredSeat] = useState<SeatItem | null>(null);

  // Rows A through H
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const isSelected = (seatId: string) => {
    return selectedSeats.some((s) => s.id === seatId);
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.15, 1.35));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.15, 0.8));
  const resetZoom = () => setZoomLevel(1);

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs overflow-hidden">
      
      {/* Controls & Tooltip Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-6 flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#20242C] uppercase tracking-wider text-[11px]">
            Floor Plan Seating Chart • {layoutType.toUpperCase()}
          </span>
        </div>

        {/* Hovered Seat Tooltip */}
        <div className="h-6 flex items-center">
          {hoveredSeat ? (
            <div className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#20242C] text-[11px] font-mono font-medium animate-fadeIn">
              Row {hoveredSeat.row} - Seat {hoveredSeat.number} • <span className="capitalize">{hoveredSeat.tier}</span> ({formatINR(hoveredSeat.price)})
              {hoveredSeat.status === 'booked' && ' (Booked)'}
              {hoveredSeat.status === 'held' && ' (Held)'}
            </div>
          ) : (
            <span className="text-[#687386] text-[11px]">Hover over a seat to view tier and price</span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={zoomOut}
            className="p-1 rounded text-[#687386] hover:text-[#20242C] hover:bg-white transition cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[#687386] px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-1 rounded text-[#687386] hover:text-[#20242C] hover:bg-white transition cursor-pointer"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1 rounded text-[#687386] hover:text-[#20242C] hover:bg-white transition cursor-pointer"
            title="Reset Zoom"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Overflow Container with Zoom */}
      <div className="overflow-x-auto overflow-y-hidden pb-6 pt-2 scrollbar-thin">
        <div
          className="min-w-[700px] mx-auto transition-transform duration-150 origin-top flex flex-col items-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Architectural Stage / Pitch Focus Area */}
          <div className="w-full max-w-xl mb-8 flex flex-col items-center">
            <div className="w-full h-11 rounded-b-2xl bg-slate-100 border-x border-b border-slate-300 flex flex-col items-center justify-center relative">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {layoutType === 'stadium' ? 'PITCH / BOUNDARY LINE' : 'STAGE & PERFORMANCE AREA'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                Sightline Focus ▼
              </span>
            </div>
          </div>

          {/* Seating Grid */}
          <div className="w-full max-w-xl space-y-2.5">
            {rows.map((rowLetter) => {
              const rowSeats = seatMap.filter((s) => s.row === rowLetter);
              const leftSeats = rowSeats.filter((s) => s.number <= 10);
              const rightSeats = rowSeats.filter((s) => s.number > 10);

              return (
                <div key={rowLetter} className="flex items-center justify-center gap-3">
                  {/* Row Label Left */}
                  <span className="w-6 text-center font-bold text-xs text-slate-600 font-mono">
                    {rowLetter}
                  </span>

                  {/* Left Aisle (Seats 1-10) */}
                  <div className="flex items-center gap-1.5">
                    {leftSeats.map((seat) => {
                      const selected = isSelected(seat.id);
                      const isBooked = seat.status === 'booked';
                      const isHeld = seat.status === 'held';

                      let btnStyle = 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer shadow-2xs';

                      if (selected) {
                        btnStyle = 'bg-[#356AE6] border-[#356AE6] text-white font-bold shadow-xs cursor-pointer';
                      } else if (isBooked) {
                        btnStyle = 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed opacity-60';
                      } else if (isHeld) {
                        btnStyle = 'bg-amber-100 border-amber-300 text-amber-800 cursor-not-allowed';
                      }

                      return (
                        <button
                          key={seat.id}
                          disabled={isBooked || isHeld}
                          onClick={() => onToggleSeat(seat)}
                          onMouseEnter={() => setHoveredSeat(seat)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={`w-7 h-7 rounded text-[10px] font-mono flex items-center justify-center transition-all ${btnStyle}`}
                          title={`Row ${seat.row}-${seat.number} (${seat.tier}) - ${formatINR(seat.price)}`}
                          aria-label={`Row ${seat.row} Seat ${seat.number}`}
                        >
                          {selected ? '✓' : seat.number}
                        </button>
                      );
                    })}
                  </div>

                  {/* Center Aisle */}
                  <div className="w-6 flex items-center justify-center">
                    <span className="text-[10px] text-slate-300">|</span>
                  </div>

                  {/* Right Aisle (Seats 11-20) */}
                  <div className="flex items-center gap-1.5">
                    {rightSeats.map((seat) => {
                      const selected = isSelected(seat.id);
                      const isBooked = seat.status === 'booked';
                      const isHeld = seat.status === 'held';

                      let btnStyle = 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer shadow-2xs';

                      if (selected) {
                        btnStyle = 'bg-[#356AE6] border-[#356AE6] text-white font-bold shadow-xs cursor-pointer';
                      } else if (isBooked) {
                        btnStyle = 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed opacity-60';
                      } else if (isHeld) {
                        btnStyle = 'bg-amber-100 border-amber-300 text-amber-800 cursor-not-allowed';
                      }

                      return (
                        <button
                          key={seat.id}
                          disabled={isBooked || isHeld}
                          onClick={() => onToggleSeat(seat)}
                          onMouseEnter={() => setHoveredSeat(seat)}
                          onMouseLeave={() => setHoveredSeat(null)}
                          className={`w-7 h-7 rounded text-[10px] font-mono flex items-center justify-center transition-all ${btnStyle}`}
                          title={`Row ${seat.row}-${seat.number} (${seat.tier}) - ${formatINR(seat.price)}`}
                          aria-label={`Row ${seat.row} Seat ${seat.number}`}
                        >
                          {selected ? '✓' : seat.number}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row Label Right */}
                  <span className="w-6 text-center font-bold text-xs text-slate-600 font-mono">
                    {rowLetter}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 px-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] uppercase font-mono tracking-wider text-slate-500">
            Center Sound &amp; Technical Platform
          </div>
        </div>
      </div>
    </div>
  );
};
