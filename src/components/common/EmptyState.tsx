import React from 'react';
import { SearchX, CalendarX, TicketX } from 'lucide-react';

interface EmptyStateProps {
  type?: 'search' | 'events' | 'tickets';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'search',
  title,
  description,
  actionText,
  onAction,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'events':
        return <CalendarX className="w-8 h-8 text-slate-400" />;
      case 'tickets':
        return <TicketX className="w-8 h-8 text-[#356AE6]" />;
      case 'search':
      default:
        return <SearchX className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200/80 rounded-2xl max-w-lg mx-auto shadow-xs">
      <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-bold text-[#20242C] mb-1.5">{title}</h3>
      <p className="text-sm text-[#687386] max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-lg bg-[#356AE6] hover:bg-[#2A55B8] text-white font-medium text-xs transition shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
