import React, { useState } from 'react';
import { EventCategory, EventItem } from '../../types/api';
import { X, Plus, Calendar, MapPin, Tag, Sparkles } from 'lucide-react';

interface EventCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Omit<EventItem, 'id' | 'totalSeats' | 'availableSeats'>) => Promise<void>;
}

export const EventCreateModal: React.FC<EventCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('concert');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('London');
  const [address, setAddress] = useState('');
  const [dateTime, setDateTime] = useState('2026-12-25T19:00');
  const [doorTime, setDoorTime] = useState('17:30');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=80');
  const [description, setDescription] = useState('');
  const [vipPrice, setVipPrice] = useState(250);
  const [platinumPrice, setPlatinumPrice] = useState(160);
  const [goldPrice, setGoldPrice] = useState(95);
  const [silverPrice, setSilverPrice] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        subtitle: subtitle || 'Official Tour Production',
        category,
        bannerUrl,
        thumbnailUrl: bannerUrl,
        venue: {
          id: `ven-${Date.now().toString(36)}`,
          name: venueName,
          city,
          address: address || `${venueName}, ${city}`,
          capacity: 45000,
          layoutType: category === 'cricket' || category === 'football' ? 'stadium' : 'arena',
        },
        dateTime: new Date(dateTime).toISOString(),
        doorTime,
        status: 'upcoming',
        priceStartingFrom: silverPrice,
        tags: ['New Release', category.toUpperCase()],
        artistOrTeams: [title.split(':')[0] || title],
        description: description || `Experience the live presentation of ${title}.`,
        tierConfigs: [
          { tier: 'vip', label: 'VIP Lounge', price: Number(vipPrice), color: '#7E22CE', perks: ['Priority Entry', 'Hospitality Buffet'] },
          { tier: 'platinum', label: 'Platinum Pavilion', price: Number(platinumPrice), color: '#356AE6', perks: ['Direct View', 'Reserved Restroom'] },
          { tier: 'gold', label: 'Gold Lower Tier', price: Number(goldPrice), color: '#D97706', perks: ['Padded Seating'] },
          { tier: 'silver', label: 'Silver Grandstand', price: Number(silverPrice), color: '#475569', perks: ['Standard Entry'] },
        ],
        isFeatured: false,
      });
      onClose();
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-[#356AE6] border border-blue-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20242C]">Publish New Event</h3>
              <p className="text-xs text-[#687386]">Configure event metadata, venue layout and tier pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-[#20242C] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[#687386] mb-1 font-medium">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. The National Philharmonic: Beethoven No. 9"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              >
                <option value="concert">Concerts &amp; Live Music</option>
                <option value="cricket">Cricket Match</option>
                <option value="football">Football Match</option>
                <option value="entertainment">Comedy &amp; Shows</option>
              </select>
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">Tour Subtitle</label>
              <input
                type="text"
                placeholder="e.g. Live at Royal Albert Hall"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">Venue Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Albert Hall"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">City *</label>
              <input
                type="text"
                required
                placeholder="e.g. London"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">Date &amp; Time *</label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div>
              <label className="block text-[#687386] mb-1 font-medium">Door Opening Time</label>
              <input
                type="text"
                placeholder="e.g. 17:30"
                value={doorTime}
                onChange={(e) => setDoorTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#687386] mb-1 font-medium">Banner Artwork URL</label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#687386] mb-1 font-medium">Description</label>
              <textarea
                rows={2}
                placeholder="Event synopsis and attendance policies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <div className="pt-2 border-t border-slate-100">
            <span className="font-bold text-[#687386] block mb-2 uppercase tracking-wider text-[11px]">
              Seat Tier Prices ($)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[#20242C] mb-1 font-medium">VIP Lounge</label>
                <input
                  type="number"
                  min="1"
                  value={vipPrice}
                  onChange={(e) => setVipPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#20242C] mb-1 font-medium">Platinum</label>
                <input
                  type="number"
                  min="1"
                  value={platinumPrice}
                  onChange={(e) => setPlatinumPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#20242C] mb-1 font-medium">Gold</label>
                <input
                  type="number"
                  min="1"
                  value={goldPrice}
                  onChange={(e) => setGoldPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] font-mono"
                />
              </div>
              <div>
                <label className="block text-[#20242C] mb-1 font-medium">Silver</label>
                <input
                  type="number"
                  min="1"
                  value={silverPrice}
                  onChange={(e) => setSilverPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[#20242C] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[#687386] hover:text-[#20242C] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
