import React, { useState, useEffect } from 'react';
import { EventCategory, EventItem } from '../../types/api';
import { X, Save, Edit3, Sparkles } from 'lucide-react';

interface EventEditModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, updates: Partial<EventItem>) => Promise<void>;
}

export const EventEditModal: React.FC<EventEditModalProps> = ({
  event,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('concert');
  const [venueName, setVenueName] = useState('');
  const [city, setCity] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [doorTime, setDoorTime] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [description, setDescription] = useState('');
  const [silverPrice, setSilverPrice] = useState(1500);
  const [goldPrice, setGoldPrice] = useState(3500);
  const [platinumPrice, setPlatinumPrice] = useState(6000);
  const [vipPrice, setVipPrice] = useState(10000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setSubtitle(event.subtitle || '');
      setCategory(event.category || 'concert');
      setVenueName(event.venue?.name || '');
      setCity(event.venue?.city || '');
      setDateTime(event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : '');
      setDoorTime(event.doorTime || '');
      setBannerUrl(event.bannerUrl || '');
      setDescription(event.description || '');

      const vip = event.tierConfigs?.find((t) => t.tier === 'vip')?.price || 10000;
      const plat = event.tierConfigs?.find((t) => t.tier === 'platinum')?.price || 6000;
      const gold = event.tierConfigs?.find((t) => t.tier === 'gold')?.price || 3500;
      const silv = event.tierConfigs?.find((t) => t.tier === 'silver')?.price || 1500;

      setVipPrice(vip);
      setPlatinumPrice(plat);
      setGoldPrice(gold);
      setSilverPrice(silv);
      setError(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Event title cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedTiers = (event.tierConfigs || []).map((t) => {
        if (t.tier === 'vip') return { ...t, price: Number(vipPrice), currencyCode: 'INR' as const };
        if (t.tier === 'platinum') return { ...t, price: Number(platinumPrice), currencyCode: 'INR' as const };
        if (t.tier === 'gold') return { ...t, price: Number(goldPrice), currencyCode: 'INR' as const };
        if (t.tier === 'silver') return { ...t, price: Number(silverPrice), currencyCode: 'INR' as const };
        return t;
      });

      await onSubmit(event.id, {
        title: title.trim(),
        subtitle: subtitle.trim(),
        category,
        bannerUrl: bannerUrl.trim(),
        venue: {
          ...event.venue,
          name: venueName.trim(),
          city: city.trim(),
        },
        dateTime: dateTime ? new Date(dateTime).toISOString() : event.dateTime,
        doorTime: doorTime.trim(),
        description: description.trim(),
        priceStartingFrom: Math.min(silverPrice, goldPrice, platinumPrice, vipPrice),
        currencyCode: 'INR',
        tierConfigs: updatedTiers,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update event.');
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
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#20242C]">Edit Event Details</h3>
              <p className="text-xs text-[#687386]">Update production information, schedule, and pricing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-[#20242C] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[#687386] mb-1 font-medium">Event Title *</label>
              <input
                type="text"
                required
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[#20242C] outline-none focus:border-[#356AE6] transition"
              />
            </div>
          </div>

          {/* Pricing Tiers Section */}
          <div className="pt-2 border-t border-slate-100">
            <span className="font-bold text-[#687386] block mb-2 uppercase tracking-wider text-[11px]">
              Seat Tier Prices (₹ INR)
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

          {/* Footer Actions */}
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
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
