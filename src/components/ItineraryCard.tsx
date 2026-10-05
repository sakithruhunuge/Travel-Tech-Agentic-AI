"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface SavedItineraryItem {
  id?: string;
  _id?: string;
  destination: string;
  travel_dates?: string;
  duration_days: number;
  party_size?: number;
  estimated_total_usd: number;
  itinerary: string;
  hotels?: Array<{ name: string; price_usd?: number; tier?: string }>;
  pois?: Array<{ name: string; category?: string }>;
  created_at?: string;
}

interface ItineraryCardProps {
  item: SavedItineraryItem;
  onDelete?: (id: string) => void;
}

export default function ItineraryCard({ item, onDelete }: ItineraryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const previewText =
    item.itinerary?.length > 200
      ? item.itinerary.substring(0, 200) + "..."
      : item.itinerary || "No itinerary text available.";

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            📍 {item.destination}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            ⏳ {item.duration_days} Days
          </span>
          {item.party_size && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              👥 {item.party_size} {item.party_size === 1 ? "Traveler" : "Travelers"}
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Est. Cost</span>
          <span className="text-lg font-bold text-emerald-600">
            ${Math.round(item.estimated_total_usd)}
          </span>
        </div>
      </div>

      {/* Dates if available */}
      {item.travel_dates && (
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
          <span>📅</span> {item.travel_dates}
        </p>
      )}

      {/* Content Preview / Full View */}
      <div className="my-4">
        {expanded ? (
          <div className="prose prose-slate prose-sm max-w-none bg-slate-50/70 p-4 rounded-xl border border-slate-100 max-h-[500px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.itinerary}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="relative">
            <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
              {previewText}
            </p>
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-brand-primary hover:text-sky-700 inline-flex items-center gap-1 transition-colors"
        >
          {expanded ? "▲ Collapse Plan" : "📖 View Full Plan"}
        </button>

        <div className="flex items-center gap-2">
          {item.id && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id!)}
              className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded"
              title="Delete Itinerary"
            >
              🗑️
            </button>
          )}
          <a
            href="#booking"
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            🔗 Book Now
          </a>
        </div>
      </div>
    </div>
  );
}
