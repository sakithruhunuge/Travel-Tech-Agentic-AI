"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import type LType from "leaflet";
import {
  CompassOutlined,
  DollarOutlined,
  CarOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  UsergroupAddOutlined,
  AppstoreAddOutlined,
  CoffeeOutlined,
  StarFilled,
  RobotOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  FireOutlined,
  CameraOutlined,
  SendOutlined,
} from "@ant-design/icons";

import { useToast } from "@/context/ToastContext";
import {
  calculateTripPricing,
  PricingInputs,
  HOTEL_LABELS,
  HOTEL_RATES,
  TRANSPORT_LABELS,
  SEASON_MULTIPLIERS,
  ACTIVITY_RATES,
  ACTIVITY_LABELS,
  ADDON_RATES,
  DESTINATION_SURCHARGES,
} from "@/lib/pricingEngine";
import {
  runMultiAgentPipeline,
  getMockAgentPipelineResult,
  FullAgentPipelineResult,
  AgentApiError,
} from "@/lib/agentApi";

/* ---------------- 24 Sri Lanka Locations (real coordinates) ---------------- */
export interface MapLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  img: string;
  description: string;
  category?: "cultural" | "highlands" | "beach" | "wildlife" | "urban";
}

export interface MapPlaceHotel {
  id: string | number;
  name: string;
  avg_nightly_usd: number;
  rating?: number;
  price_tier?: string;
  description?: string;
  primary_image?: string;
}

export interface MapPlacePoi {
  id: string | number;
  name: string;
  ticket_price_usd: number;
  rating?: number;
  description?: string;
  primary_image?: string;
  street_view_url?: string;
}

export interface DestinationPlaces {
  hotels?: MapPlaceHotel[];
  poi?: MapPlacePoi[];
}

export const LOCATIONS: MapLocation[] = [
  // Urban & Gateway Hubs
  { id: "Colombo", name: "Colombo", lat: 6.9271, lng: 79.8612, img: "/images/colombo.png", description: "Vibrant capital, colonial charm, and luxury oceanfront dining.", category: "urban" },
  { id: "Negombo", name: "Negombo", lat: 7.2008, lng: 79.8737, img: "/images/colombo.png", description: "Coastal town near airport, famous for fish markets and Dutch canals.", category: "urban" },
  { id: "Jaffna", name: "Jaffna", lat: 9.6615, lng: 80.0255, img: "/images/colombo.png", description: "Northern cultural peninsula, Nallur Kovil, and vibrant Tamil heritage.", category: "cultural" },
  { id: "Batticaloa", name: "Batticaloa", lat: 7.717, lng: 81.7, img: "/images/galle.png", description: "Singing fish lagoon, historic Dutch fort, and tranquil eastern coast.", category: "urban" },
  { id: "Mannar", name: "Mannar", lat: 8.981, lng: 79.904, img: "/images/colombo.png", description: "Baobab trees, historic fort, flamingo wetlands and Adam's Bridge.", category: "urban" },

  // Ancient & Cultural Triangle
  { id: "Sigiriya", name: "Sigiriya", lat: 7.957, lng: 80.76, img: "/images/sigiriya.png", description: "5th-century Lion Rock citadel surrounded by royal water gardens.", category: "cultural" },
  { id: "Dambulla", name: "Dambulla", lat: 7.8742, lng: 80.6511, img: "/images/dambulla.png", description: "Ancient Cave Temple complex and UNESCO sacred rock art.", category: "cultural" },
  { id: "Kandy", name: "Kandy", lat: 7.2906, lng: 80.6337, img: "/images/kandy.png", description: "Sacred Temple of the Tooth, mist-covered lake, and royal gardens.", category: "cultural" },
  { id: "Anuradhapura", name: "Anuradhapura", lat: 8.3114, lng: 80.4037, img: "/images/dambulla.png", description: "Ancient sacred capital with towering stupas and sacred Jaya Sri Maha Bodhi.", category: "cultural" },
  { id: "Polonnaruwa", name: "Polonnaruwa", lat: 7.9403, lng: 81.0188, img: "/images/sigiriya.png", description: "Medieval royal kingdom, stone carved Gal Vihara Buddha statues.", category: "cultural" },
  { id: "Pinnawala", name: "Pinnawala", lat: 7.3015, lng: 80.3847, img: "/images/yala.png", description: "Famous elephant orphanage and river bathing sanctuary.", category: "cultural" },

  // Hill Country & Tea Trails
  { id: "Ella", name: "Ella", lat: 6.8667, lng: 81.0466, img: "/images/nine_arch.png", description: "Nine Arch Bridge, iconic mountain hikes, and lush tea trails.", category: "highlands" },
  { id: "Nuwara Eliya", name: "Nuwara Eliya", lat: 6.9497, lng: 80.7891, img: "/images/tea.png", description: "Little England, rolling tea plantations, and cool mountain air.", category: "highlands" },
  { id: "Badulla", name: "Badulla", lat: 6.9934, lng: 81.055, img: "/images/tea.png", description: "Dunhinda waterfall, historic railway terminal and scenic mountain valleys.", category: "highlands" },
  { id: "Haputale", name: "Haputale", lat: 6.7682, lng: 80.9507, img: "/images/tea.png", description: "Lipton's Seat, cloud forests, and breathtaking southern plain views.", category: "highlands" },
  { id: "Horton Plains", name: "Horton Plains", lat: 6.8028, lng: 80.8092, img: "/images/nine_arch.png", description: "World's End sheer cliff drop, Baker's Falls and high-altitude plateau trek.", category: "highlands" },
  { id: "Knuckles Range", name: "Knuckles Range", lat: 7.4589, lng: 80.7892, img: "/images/nine_arch.png", description: "UNESCO cloud forest wilderness, mist-draped peaks and hiking trails.", category: "highlands" },
  { id: "Kitulgala", name: "Kitulgala", lat: 6.9961, lng: 80.4106, img: "/images/bentota.png", description: "White-water rafting hub on Kelani river, rain forest treks and jungle zip-lines.", category: "highlands" },
  { id: "Ratnapura", name: "Ratnapura", lat: 6.6828, lng: 80.3992, img: "/images/tea.png", description: "City of Gems, gateway to Adam's Peak (Sri Pada) and rainforest valleys.", category: "highlands" },

  // Beaches & Coastline
  { id: "Galle", name: "Galle", lat: 6.0535, lng: 80.221, img: "/images/galle.png", description: "17th century Dutch Fort, cobblestone alleys, and boutique cafes.", category: "beach" },
  { id: "Bentota", name: "Bentota", lat: 6.423, lng: 79.9984, img: "/images/bentota.png", description: "Golden sand beaches, luxury water sports, and tranquil river safaris.", category: "beach" },
  { id: "Beruwala", name: "Beruwala", lat: 6.4788, lng: 79.9828, img: "/images/bentota.png", description: "Golden bay beach resorts, Barberyn lighthouse island, and water sports.", category: "beach" },
  { id: "Mirissa", name: "Mirissa", lat: 5.9483, lng: 80.4716, img: "/images/bentota.png", description: "Whale watching center, palm coconut hills, and lively surf bays.", category: "beach" },
  { id: "Weligama", name: "Weligama", lat: 5.9722, lng: 80.4289, img: "/images/bentota.png", description: "Beginner surf paradise, stilt fishermen, and modern beach resorts.", category: "beach" },
  { id: "Unawatuna", name: "Unawatuna", lat: 6.0094, lng: 80.2486, img: "/images/galle.png", description: "Horseshoe bay, Japanese Peace Pagoda, and bustling beach restaurants.", category: "beach" },
  { id: "Hikkaduwa", name: "Hikkaduwa", lat: 6.1392, lng: 80.1011, img: "/images/galle.png", description: "Coral reef sanctuaries, sea turtle feeding, and beachside night spots.", category: "beach" },
  { id: "Tangalle", name: "Tangalle", lat: 6.0244, lng: 80.7941, img: "/images/galle.png", description: "Quiet secluded southern bays, luxury hideaways, and turtle nesting.", category: "beach" },
  { id: "Matara", name: "Matara", lat: 5.9496, lng: 80.5469, img: "/images/galle.png", description: "Historic southern hub with Pigeon Island shrine and Dutch ramparts.", category: "beach" },
  { id: "Trincomalee", name: "Trincomalee", lat: 8.5874, lng: 81.2152, img: "/images/galle.png", description: "Pristine eastern white beaches, Koneswaram temple, and pigeon island.", category: "beach" },
  { id: "Pasikuda", name: "Pasikuda", lat: 7.9228, lng: 81.5647, img: "/images/bentota.png", description: "Shallow glass-clear bay perfect for relaxing luxury beach stays.", category: "beach" },
  { id: "Arugam Bay", name: "Arugam Bay", lat: 6.8415, lng: 81.8358, img: "/images/bentota.png", description: "World-class point break surf haven and relaxed beach vibes.", category: "beach" },
  { id: "Kalpitiya", name: "Kalpitiya", lat: 8.2294, lng: 79.7618, img: "/images/bentota.png", description: "Kitesurfing capital of South Asia, dolphin pods and secluded lagoon sandbars.", category: "beach" },

  // Wildlife & Nature Parks
  { id: "Yala", name: "Yala", lat: 6.3725, lng: 81.516, img: "/images/yala.png", description: "World famous national park with highest density of wild leopards.", category: "wildlife" },
  { id: "Udawalawe", name: "Udawalawe", lat: 6.4746, lng: 80.8986, img: "/images/yala.png", description: "Guaranteed wild elephant sightings and open reservoir safaris.", category: "wildlife" },
  { id: "Wilpattu", name: "Wilpattu", lat: 8.4526, lng: 80.0545, img: "/images/yala.png", description: "Sri Lanka's largest national park famous for natural lakes and sloth bears.", category: "wildlife" },
  { id: "Sinharaja", name: "Sinharaja", lat: 6.4167, lng: 80.4167, img: "/images/yala.png", description: "UNESCO virgin tropical rainforest reserve with rare endemic wildlife.", category: "wildlife" },
  { id: "Minneriya", name: "Minneriya", lat: 8.0333, lng: 80.9, img: "/images/yala.png", description: "Famous Elephant Gathering on reservoir banks during dry season.", category: "wildlife" },
  { id: "Kaudulla", name: "Kaudulla", lat: 8.136, lng: 80.916, img: "/images/yala.png", description: "Scenic national park with large herds of wild Asian elephants.", category: "wildlife" },
  { id: "Tissamaharama", name: "Tissamaharama", lat: 6.2796, lng: 81.2863, img: "/images/yala.png", description: "Ancient southern lake capital, gateway to Yala and Bundala bird safaris.", category: "wildlife" },
];

export const BASE_TOURS = [
  { id: "cultural", nameKey: "cultural", descKey: "culturalDesc", destinations: ["Colombo", "Dambulla", "Sigiriya", "Kandy"], duration: 5 },
  { id: "southern", nameKey: "southern", descKey: "southernDesc", destinations: ["Bentota", "Galle", "Mirissa", "Yala"], duration: 6 },
  { id: "hill", nameKey: "hill", descKey: "hillDesc", destinations: ["Kandy", "Nuwara Eliya", "Ella"], duration: 6 },
  { id: "custom", nameKey: "custom", descKey: "customDesc", destinations: ["Colombo", "Kandy"], duration: 4 },
];

/* Iconic experiences showcase — real project imagery, tap to add to route */
const SPOTLIGHTS = [
  { id: "Sigiriya", img: "/images/sigiriya.png", tag: "UNESCO Heritage", title: "Sigiriya Lion Rock", blurb: "A 5th-century sky palace rising 200 metres above the misty jungle plain." },
  { id: "Ella", img: "/images/nine_arch.png", tag: "Scenic Rail", title: "Nine Arch Bridge", blurb: "Ride the world's most photographed train through emerald tea country." },
  { id: "Nuwara Eliya", img: "/images/tea.png", tag: "Hill Country", title: "Ceylon Tea Trails", blurb: "Cool-climate plantations, waterfall valleys and colonial bungalow stays." },
  { id: "Yala", img: "/images/yala.png", tag: "Wild Safari", title: "Yala Leopard Kingdom", blurb: "The highest density of wild leopards on Earth, at golden-hour jeep range." },
  { id: "Galle", img: "/images/galle.png", tag: "Colonial Charm", title: "Galle Dutch Fort", blurb: "Cobblestone ramparts, sunset walks and boutique café culture since 1663." },
  { id: "Mirissa", img: "/images/mirissa.png", tag: "Ocean Wonder", title: "Mirissa Blue Waters", blurb: "Sail at dawn for blue whales, then dine barefoot on the golden sand." },
];

const QUICK_CHIPS = ["beach", "ancient", "wildlife", "hill country", "quiet", "food"];

const SEASONS = [
  { id: "off-peak", name: "Off-Peak", window: "May – Jun · Oct – Nov", mult: SEASON_MULTIPLIERS["off-peak"] },
  { id: "shoulder", name: "Shoulder", window: "Jul – Sep", mult: SEASON_MULTIPLIERS["shoulder"] },
  { id: "peak", name: "Peak", window: "Dec – Apr", mult: SEASON_MULTIPLIERS["peak"] },
] as const;

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  "yala-safari": <CameraOutlined />,
  "surf-lessons": <SendOutlined />,
  "sigiriya-hike": <ThunderboltOutlined />,
  "cooking-class": <FireOutlined />,
};

const ADDONS = [
  { id: "breakfast", icon: <CoffeeOutlined />, price: ADDON_RATES.breakfast, per: "day · traveler" },
  { id: "dinner", icon: <FireOutlined />, price: ADDON_RATES.dinner, per: "day · traveler" },
  { id: "airport-transfer", icon: <CarOutlined />, price: ADDON_RATES["airport-transfer"], per: "flat" },
  { id: "guide", icon: <UsergroupAddOutlined />, price: ADDON_RATES.guide, per: "day" },
];

const cleanLabel = (label: string) => label.replace(/\s*\(\+\$.*\)$/, "").trim();

const getPlainText = (node: React.ReactNode): string => {
  if (!node) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getPlainText).join("");
  if (React.isValidElement<{ children?: React.ReactNode }>(node) && node.props && node.props.children) {
    return getPlainText(node.props.children);
  }
  return "";
};

/* ---------------- Distance & Compass Direction Helpers ---------------- */
export function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateRoadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const directKm = calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
  // Scale by 1.25x for realistic Sri Lankan road topography and winding highways
  return Math.round(directKm * 1.25);
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(radLat2);
  const x = Math.cos(radLat1) * Math.sin(radLat2) - Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export interface DirectionInfo {
  code: string;
  label: string;
  arrow: string;
}

export function getCompassDirection(bearing: number): DirectionInfo {
  if (bearing >= 337.5 || bearing < 22.5) return { code: "N", label: "North", arrow: "⬆" };
  if (bearing >= 22.5 && bearing < 67.5) return { code: "NE", label: "North-East", arrow: "↗" };
  if (bearing >= 67.5 && bearing < 112.5) return { code: "E", label: "East", arrow: "➔" };
  if (bearing >= 112.5 && bearing < 157.5) return { code: "SE", label: "South-East", arrow: "↘" };
  if (bearing >= 157.5 && bearing < 202.5) return { code: "S", label: "South", arrow: "⬇" };
  if (bearing >= 202.5 && bearing < 247.5) return { code: "SW", label: "South-West", arrow: "↙" };
  if (bearing >= 247.5 && bearing < 292.5) return { code: "W", label: "West", arrow: "⬅" };
  return { code: "NW", label: "North-West", arrow: "↖" };
}

export function calculateMidpoint(lat1: number, lon1: number, lat2: number, lon2: number): [number, number] {
  return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
}

export function estimateDriveTimeHours(distanceKm: number): { hours: number; minutes: number; label: string } {
  const totalMinutes = Math.round((distanceKm / 40) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let label = "";
  if (hours > 0) label += `${hours}h `;
  label += `${minutes}m`;
  return { hours, minutes, label: label.trim() || "0m" };
}

export interface RouteLeg {
  from: MapLocation;
  to: MapLocation;
  distanceKm: number;
  bearing: number;
  direction: DirectionInfo;
  driveTime: { hours: number; minutes: number; label: string };
}

export interface RealRoadLegResult {
  from: MapLocation;
  to: MapLocation;
  pathCoords: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  driveTimeLabel: string;
  bearing: number;
  direction: DirectionInfo;
}

const roadRouteCache: Record<string, RealRoadLegResult> = {};

export async function fetchRealRoadRoute(from: MapLocation, to: MapLocation): Promise<RealRoadLegResult> {
  const cacheKey = `${from.id}->${to.id}`;
  if (roadRouteCache[cacheKey]) {
    return roadRouteCache[cacheKey];
  }

  const directKm = calculateRoadDistanceKm(from.lat, from.lng, to.lat, to.lng);
  const bearing = calculateBearing(from.lat, from.lng, to.lat, to.lng);
  const direction = getCompassDirection(bearing);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates;
        const pathCoords: [number, number][] = rawCoords.map(([lon, lat]) => [lat, lon]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const totalMin = Math.max(1, Math.round(route.duration / 60));
        const hrs = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        let driveTimeLabel = "";
        if (hrs > 0) driveTimeLabel += `${hrs}h `;
        driveTimeLabel += `${mins}m`;

        const result: RealRoadLegResult = {
          from,
          to,
          pathCoords,
          distanceKm,
          durationMinutes: totalMin,
          driveTimeLabel: driveTimeLabel.trim(),
          bearing,
          direction,
        };
        roadRouteCache[cacheKey] = result;
        return result;
      }
    }
  } catch (err) {
    console.warn("OSRM road route fetch fallback:", err);
  }

  // Fallback if network offline
  const driveTime = estimateDriveTimeHours(directKm);
  return {
    from,
    to,
    pathCoords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceKm: directKm,
    durationMinutes: Math.round((directKm / 40) * 60),
    driveTimeLabel: driveTime.label,
    bearing,
    direction,
  };
}

/* ---------------- animated count-up ---------------- */
function useAnimatedNumber(target: number) {
  const [val, setVal] = useState(target);
  const valRef = useRef(target);
  useEffect(() => {
    const from = valRef.current;
    const to = target;
    if (Math.abs(to - from) < 1) {
      valRef.current = to;
      setVal(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 650;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      valRef.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
}

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

function Stepper({
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
  suffix,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled?: boolean;
  incDisabled?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={onDec}
        disabled={decDisabled}
        className="w-11 h-11 rounded-2xl bg-white border border-[#F0E7D8] text-[#7A7263] text-lg font-black flex items-center justify-center hover:border-[#FF8B50] hover:text-[#FF8B50] hover:shadow-md hover:shadow-[#FF8B50]/15 transition disabled:opacity-35 disabled:pointer-events-none"
        aria-label="decrease"
      >
        −
      </motion.button>
      <div className="min-w-[92px] text-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="inline-block text-2xl font-semibold text-[#44403C] itc-serif"
          >
            {value}
            {suffix && <span className="ml-1.5 text-xs font-sans font-bold text-[#B5AC9A] uppercase tracking-wider">{suffix}</span>}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        type="button"
        onClick={onInc}
        disabled={incDisabled}
        className="w-11 h-11 rounded-2xl bg-white border border-[#F0E7D8] text-[#7A7263] text-lg font-black flex items-center justify-center hover:border-[#FF8B50] hover:text-[#FF8B50] hover:shadow-md hover:shadow-[#FF8B50]/15 transition disabled:opacity-35 disabled:pointer-events-none"
        aria-label="increase"
      >
        +
      </motion.button>
    </div>
  );
}

/* ============================================================================ */
export default function InteractiveTourCustomizer() {
  const t = useTranslations("CustomizeTour");
  const locale = useLocale();
  const translateKey = (key: string) => t(key as Parameters<typeof t>[0]);

  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const { addToast } = useToast();

  const currency = "USD";
  const formatPrice = (v: number) => `$${Math.round(v).toLocaleString()}`;

  const [selectedTour, setSelectedTour] = useState<string>("ai-suggested");
  const [inputs, setInputs] = useState<PricingInputs>({
    duration: 5,
    numberOfTravelers: 2,
    destinations: ["Colombo", "Dambulla", "Sigiriya", "Kandy"],
    hotelClass: "standard",
    transportMode: "private-driver",
    season: "shoulder",
    activities: ["sigiriya-hike"],
    extraNights: 0,
    addOns: ["breakfast"],
    baggageCount: 2,
    pricingMode: "per-day",
    selectedRealPrices: {},
  });

  const [preferredStartDate, setPreferredStartDate] = useState<string>("");
  const [specialRequests, setSpecialRequests] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [todayStr, setTodayStr] = useState<string>("");
  const [aiStartDate, setAiStartDate] = useState<string>("");
  const [aiEndDate, setAiEndDate] = useState<string>("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
    setTodayStr(today);
    setAiStartDate(today);
    setAiEndDate(nextWeek);
  }, []);
  const [aiDuration, setAiDuration] = useState<number>(5);
  const [aiKeywords, setAiKeywords] = useState<string>("ancient rock fort, quiet beaches, wildlife safari");
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeAgentStep, setActiveAgentStep] = useState<number>(1);
  const [aiItinerary, setAiItinerary] = useState<string | null>(null);

  const [suggestedPlacesByDestination, setSuggestedPlacesByDestination] = useState<Record<string, DestinationPlaces>>({});
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [failedPoiImages, setFailedPoiImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (aiStartDate && aiEndDate) {
      const start = new Date(aiStartDate).getTime();
      const end = new Date(aiEndDate).getTime();
      setAiDuration(Math.max(1, Math.round((end - start) / (1000 * 3600 * 24))));
    }
  }, [aiStartDate, aiEndDate]);

  const leafletLibRef = useRef<typeof LType | null>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const markersRef = useRef<Record<string, LType.Marker>>({});
  const polylineRef = useRef<LType.Polyline | null>(null);
  const segmentMarkersRef = useRef<LType.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  /* restore draft */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("tour_customizer_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputs) setInputs(parsed.inputs);
        if (parsed.preferredStartDate) setPreferredStartDate(parsed.preferredStartDate);
        if (parsed.specialRequests) setSpecialRequests(parsed.specialRequests);
        if (parsed.selectedTour) setSelectedTour(parsed.selectedTour);
        if (parsed.aiItinerary) setAiItinerary(parsed.aiItinerary);
        if (parsed.suggestedPlacesByDestination) setSuggestedPlacesByDestination(parsed.suggestedPlacesByDestination);
        if (parsed.selectedPlaceIds) setSelectedPlaceIds(parsed.selectedPlaceIds);
        sessionStorage.removeItem("tour_customizer_draft");
        addToast("success", t("customizedTourSaved"));
      }
    } catch (e) {
      console.warn("Failed to load tour customizer draft:", e);
    }
  }, [addToast, t]);

  const handleToggleLocation = useCallback(
    (locId: string) => {
      setInputs((prev) => {
        const isSelected = prev.destinations.includes(locId);
        let nextDests: string[] = [];
        if (isSelected) {
          if (prev.destinations.length > 1) {
            nextDests = prev.destinations.filter((d) => d !== locId);
          } else {
            nextDests = [...prev.destinations];
            addToast("info", "Please keep at least one destination selected.");
          }
        } else {
          nextDests = [...prev.destinations, locId];
        }
        return { ...prev, destinations: nextDests };
      });
    },
    [addToast]
  );

  const handleToggleSuggestedPlace = (item: MapPlaceHotel | MapPlacePoi, city: string, isHotel: boolean) => {
    const itemId = String(item.id);
    const isSelected = selectedPlaceIds.includes(itemId);
    const nextSelectedIds = isSelected ? selectedPlaceIds.filter((id) => id !== itemId) : [...selectedPlaceIds, itemId];
    setSelectedPlaceIds(nextSelectedIds);

    setInputs((prev) => {
      const nextDests = [...prev.destinations];
      if (!isSelected && !nextDests.includes(city)) nextDests.push(city);

      const hotelNightlyRateByDestination: Record<string, number> = { ...(prev.selectedRealPrices?.hotelNightlyRateByDestination || {}) };
      const poiCostsUsd: number[] = [];

      Object.entries(suggestedPlacesByDestination).forEach(([destName, data]) => {
        (data.hotels || []).forEach((h) => {
          if (nextSelectedIds.includes(String(h.id))) hotelNightlyRateByDestination[destName] = h.avg_nightly_usd;
        });
        (data.poi || []).forEach((p) => {
          if (nextSelectedIds.includes(String(p.id)) && p.ticket_price_usd > 0) poiCostsUsd.push(p.ticket_price_usd);
        });
      });

      if (isSelected && isHotel) {
        const remainingCityHotels = (suggestedPlacesByDestination[city]?.hotels || []).filter((h) => nextSelectedIds.includes(String(h.id)));
        if (remainingCityHotels.length === 0) delete hotelNightlyRateByDestination[city];
      }

      return { ...prev, destinations: nextDests, selectedRealPrices: { hotelNightlyRateByDestination, poiCostsUsd } };
    });

    if (!isSelected) addToast("success", `Added ${item.name} (${city}) to your itinerary!`);
  };

  const handleToggleAddOn = (addonId: string) =>
    setInputs((prev) => ({ ...prev, addOns: prev.addOns.includes(addonId) ? prev.addOns.filter((a) => a !== addonId) : [...prev.addOns, addonId] }));

  const handleToggleActivity = (actId: string) =>
    setInputs((prev) => ({ ...prev, activities: prev.activities.includes(actId) ? prev.activities.filter((a) => a !== actId) : [...prev.activities, actId] }));

  const handleBaseTourChange = (tourId: string) => {
    setSelectedTour(tourId);
    const tour = BASE_TOURS.find((bt) => bt.id === tourId);
    if (tour) setInputs((prev) => ({ ...prev, duration: tour.duration, destinations: [...tour.destinations] }));
  };

  const pricing = calculateTripPricing(inputs);
  const animatedTotal = useAnimatedNumber(pricing.totalPrice);
  const totalNights = inputs.duration + inputs.extraNights;
  const perTraveler = Math.round(pricing.totalPrice / Math.max(1, inputs.numberOfTravelers));

  const selectedRouteLocations = inputs.destinations
    .map((id) => LOCATIONS.find((loc) => loc.id === id))
    .filter((loc): loc is MapLocation => !!loc);

  const routeLegs: RouteLeg[] = [];
  let totalRouteKm = 0;
  for (let i = 0; i < selectedRouteLocations.length - 1; i++) {
    const from = selectedRouteLocations[i];
    const to = selectedRouteLocations[i + 1];
    const distanceKm = calculateRoadDistanceKm(from.lat, from.lng, to.lat, to.lng);
    const bearing = calculateBearing(from.lat, from.lng, to.lat, to.lng);
    const direction = getCompassDirection(bearing);
    const driveTime = estimateDriveTimeHours(distanceKm);
    totalRouteKm += distanceKm;
    routeLegs.push({ from, to, distanceKm, bearing, direction, driveTime });
  }
  const totalDriveTime = estimateDriveTimeHours(totalRouteKm);

  /* Real road routes state (OSRM API) */
  const [realLegsData, setRealLegsData] = useState<RealRoadLegResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadRealRoutes = async () => {
      const selectedLocs = inputs.destinations
        .map((id) => LOCATIONS.find((loc) => loc.id === id))
        .filter((loc): loc is MapLocation => !!loc);

      if (selectedLocs.length < 2) {
        setRealLegsData([]);
        return;
      }

      const promises: Promise<RealRoadLegResult>[] = [];
      for (let i = 0; i < selectedLocs.length - 1; i++) {
        promises.push(fetchRealRoadRoute(selectedLocs[i], selectedLocs[i + 1]));
      }

      const results = await Promise.all(promises);
      if (!cancelled) {
        setRealLegsData(results);
      }
    };

    loadRealRoutes();
    return () => {
      cancelled = true;
    };
  }, [inputs.destinations]);

  const activeLegs = realLegsData.length > 0 && realLegsData.length === inputs.destinations.length - 1
    ? realLegsData.map((rl) => ({
        from: rl.from,
        to: rl.to,
        distanceKm: rl.distanceKm,
        bearing: rl.bearing,
        direction: rl.direction,
        driveTime: { hours: Math.floor(rl.durationMinutes / 60), minutes: rl.durationMinutes % 60, label: rl.driveTimeLabel },
        pathCoords: rl.pathCoords,
      }))
    : routeLegs.map((rl) => ({
        ...rl,
        pathCoords: [[rl.from.lat, rl.from.lng], [rl.to.lat, rl.to.lng]] as [number, number][],
      }));

  const displayTotalKm = Math.round(activeLegs.reduce((acc, leg) => acc + leg.distanceKm, 0) * 10) / 10;
  const displayTotalMins = activeLegs.reduce((acc, leg) => acc + (leg.driveTime.hours * 60 + leg.driveTime.minutes), 0);
  const displayTotalHrs = Math.floor(displayTotalMins / 60);
  const displayTotalRemMins = displayTotalMins % 60;
  let displayTotalDriveLabel = "";
  if (displayTotalHrs > 0) displayTotalDriveLabel += `${displayTotalHrs}h `;
  displayTotalDriveLabel += `${displayTotalRemMins}m`;

  /* leaflet init */
  useEffect(() => {
    let cancelled = false;
    const initMap = async () => {
      const L = await import("leaflet");
      // @ts-expect-error leaflet css import
      await import("leaflet/dist/leaflet.css");
      if (cancelled) return;
      leafletLibRef.current = L;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (mapRef.current) return;
      const container = document.getElementById("sri-lanka-map");
      if (!container) return;

      const map = L.map("sri-lanka-map", { center: [7.8731, 80.7718], zoom: 7.5, zoomControl: true });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const markers: Record<string, LType.Marker> = {};
      LOCATIONS.forEach((loc) => {
        const popupContent = document.createElement("div");
        popupContent.style.width = "190px";
        popupContent.className = "flex flex-col gap-2 p-1 text-left";
        popupContent.style.fontFamily = "'Inter', sans-serif";
        popupContent.style.color = "#44403C";

        const imgContainer = document.createElement("div");
        imgContainer.className = "relative w-full rounded-xl overflow-hidden border border-orange-100";
        imgContainer.style.height = "92px";
        const img = document.createElement("img");
        img.src = loc.img;
        img.alt = loc.name;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        imgContainer.appendChild(img);

        const title = document.createElement("h4");
        title.style.fontWeight = "800";
        title.style.fontSize = "14px";
        title.style.color = "#44403C";
        title.style.margin = "0";
        title.innerText = loc.name;

        const desc = document.createElement("p");
        desc.style.fontSize = "11px";
        desc.style.color = "#8A8577";
        desc.style.fontWeight = "500";
        desc.style.lineHeight = "1.35";
        desc.style.margin = "0";
        desc.innerText = loc.description;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = `popup-btn-${loc.id}`;

        popupContent.appendChild(imgContainer);
        popupContent.appendChild(title);
        popupContent.appendChild(desc);
        popupContent.appendChild(btn);

        markers[loc.id] = L.marker([loc.lat, loc.lng]).addTo(map).bindPopup(popupContent);
      });

      markersRef.current = markers;
      polylineRef.current = L.polyline([], { color: "#FF6B2C", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
      setMapLoaded(true);
    };

    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* sync markers / polyline / popups with real road geometry */
  useEffect(() => {
    if (!mapLoaded) return;
    const L = leafletLibRef.current;
    if (!L) return;

    LOCATIONS.forEach((loc) => {
      const marker = markersRef.current[loc.id];
      if (!marker) return;
      const orderIdx = inputs.destinations.indexOf(loc.id);
      const isSelected = orderIdx !== -1;

      marker.setIcon(
        L.divIcon({
          className: "itc-pin-wrap",
          html: isSelected
            ? `<div class="itc-pin sel"><span>${orderIdx + 1}</span><i class="itc-pin-pulse"></i></div>`
            : `<div class="itc-pin"></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -14],
        })
      );

      const popup = marker.getPopup();
      if (popup) {
        const content = popup.getContent() as HTMLElement;
        if (content) {
          const btn = content.querySelector("button");
          if (btn) {
            btn.innerText = isSelected ? t("removeFromRoute") : t("addToRoute");
            btn.style.cssText =
              "margin-top:10px;padding:8px 0;width:100%;border:none;border-radius:12px;font-weight:800;font-size:10px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;";
            if (isSelected) {
              btn.style.background = "#FFF1E9";
              btn.style.color = "#E05A1A";
              btn.style.border = "1px solid #FFD9C4";
            } else {
              btn.style.background = "linear-gradient(100deg,#FF8B50,#FF6B2C)";
              btn.style.color = "#fff";
              btn.style.boxShadow = "0 8px 20px -8px rgba(255,139,80,.7)";
            }
            btn.onclick = () => handleToggleLocation(loc.id);
          }
        }
      }
    });

    const selectedLocs = inputs.destinations
      .map((id) => LOCATIONS.find((loc) => loc.id === id))
      .filter((loc): loc is MapLocation => !!loc);
    const selectedCoords = selectedLocs.map((loc) => [loc.lat, loc.lng] as [number, number]);
    const allRoadCoords: [number, number][] = activeLegs.flatMap((leg) => leg.pathCoords);

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(allRoadCoords.length > 0 ? allRoadCoords : selectedCoords);
    }

    // Clear previous segment midpoint markers
    segmentMarkersRef.current.forEach((m) => m.remove());
    segmentMarkersRef.current = [];

    // Create midpoint route badges along actual road geometry
    activeLegs.forEach((leg, i) => {
      const path = leg.pathCoords;
      const midIdx = Math.floor(path.length / 2);
      const mid = path[midIdx] || calculateMidpoint(leg.from.lat, leg.from.lng, leg.to.lat, leg.to.lng);

      if (mapRef.current) {
        const badgeIcon = L.divIcon({
          className: "itc-route-leg-midpoint-badge",
          html: `<div style="background: rgba(15, 23, 42, 0.94); backdrop-filter: blur(8px); color: #FFFFFF; border: 1.5px solid #FF8B50; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 6px 18px rgba(0,0,0,0.4); font-family: 'Inter', sans-serif; white-space: nowrap;">
            <span style="color: #FF8B50; font-size: 12px;">${leg.direction.arrow}</span>
            <span>Leg ${i + 1}: ${leg.distanceKm} km</span>
            <span style="color: #94A3B8; font-size: 9px;">(${leg.direction.code})</span>
          </div>`,
          iconSize: [120, 26],
          iconAnchor: [60, 13],
        });
        const badgeMarker = L.marker(mid, { icon: badgeIcon, zIndexOffset: 450 }).addTo(mapRef.current);
        badgeMarker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; padding: 4px; color: #334155;">
            <div style="font-size: 10px; font-weight: 800; color: #FF8B50; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px;">
              Leg ${i + 1} Real Road Path
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 6px;">
              ${leg.from.name} ${leg.direction.arrow} ${leg.to.name}
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #475569; display: flex; flex-direction: column; gap: 3px;">
              <span>📏 <b>Real Road Distance:</b> ${leg.distanceKm} km</span>
              <span>⏱️ <b>Real Driving Time:</b> ~${leg.driveTime.label}</span>
              <span>🧭 <b>Direction:</b> ${leg.direction.label} (${leg.direction.code})</span>
            </div>
          </div>
        `);
        segmentMarkersRef.current.push(badgeMarker);
      }
    });

    if (mapRef.current && selectedCoords.length > 0) {
      try {
        const fitCoords = allRoadCoords.length > 0 ? allRoadCoords : selectedCoords;
        mapRef.current.flyToBounds(L.latLngBounds(fitCoords).pad(0.25), { duration: 0.9, maxZoom: 9 });
      } catch {
        /* noop */
      }
    }
  }, [activeLegs, inputs.destinations, mapLoaded, t, handleToggleLocation]);

  /* Helper to apply structured 4-agent output to InteractiveTourCustomizer state */
  const handleApplyAgentResult = (data: FullAgentPipelineResult) => {
    setAiItinerary(data.itineraryMarkdown);
    setSelectedTour("ai-suggested");

    // Populate suggested places for interactive map & quote selection
    const mappedPlaces: Record<string, DestinationPlaces> = {};
    data.ranked.forEach((r, idx) => {
      const item = r.item;
      const city =
        item.city ||
        item.destination ||
        (LOCATIONS.some((loc) => loc.id === item.city) ? (item.city as string) : "Colombo");

      if (!mappedPlaces[city]) {
        mappedPlaces[city] = { hotels: [], poi: [] };
      }
      if (item.type === "hotel" || item.avg_nightly_usd) {
        mappedPlaces[city].hotels?.push({
          id: item.id || `hotel-${idx}`,
          name: item.name,
          avg_nightly_usd: Number(item.avg_nightly_usd) || 100,
          rating: Number(item.rating) || 4.8,
          description: r.reasons?.join(" · ") || item.description || "Curated stay",
          primary_image: item.primary_image,
        });
      } else {
        mappedPlaces[city].poi?.push({
          id: item.id || `poi-${idx}`,
          name: item.name,
          ticket_price_usd: Number(item.ticket_price_usd) || Number(item.price) || 0,
          rating: Number(item.rating) || 4.8,
          description: r.reasons?.join(" · ") || item.description || "Curated activity",
          primary_image: item.primary_image,
        });
      }
    });
    setSuggestedPlacesByDestination(mappedPlaces);

    const returnedCities: string[] = data.destinations || [];
    const validMappedDests = returnedCities.filter((c) => LOCATIONS.some((loc) => loc.id === c));
    if (returnedCities.length > validMappedDests.length) {
      addToast("info", "Some AI picks aren't on the interactive map yet, but are included in your itinerary text.");
    }
    const finalDests = validMappedDests.length > 0 ? validMappedDests : ["Colombo", "Kandy", "Sigiriya"];

    setInputs((prev) => ({
      ...prev,
      duration: data.requirements.duration || aiDuration,
      numberOfTravelers: data.requirements.travellers || prev.numberOfTravelers,
      destinations: finalDests,
    }));
    if (aiStartDate) setPreferredStartDate(aiStartDate);
  };

  /* Local stub / offline mock trigger for demonstration without active FastAPI server */
  const handleGenerateWithDemoData = () => {
    setAiError(null);
    const mock = getMockAgentPipelineResult(aiKeywords, aiDuration);
    handleApplyAgentResult(mock);
    addToast("success", "Loaded Demo Agent Itinerary! Explore map routing, stays, and pricing below.");
  };

  /* AI generation using the unified 4-agent FastAPI client */
  const handleGenerateAIPackage = async () => {
    setIsGeneratingAI(true);
    setAiError(null);
    setActiveAgentStep(1);

    const promptMessage = [
      aiKeywords,
      aiStartDate ? `Starting: ${aiStartDate}` : "",
      aiEndDate ? `Ending: ${aiEndDate}` : "",
      `Duration: ${aiDuration} days`,
    ]
      .filter(Boolean)
      .join(", ");

    try {
      const data = await runMultiAgentPipeline(promptMessage, {
        durationHint: aiDuration,
        allowFallback: false,
        onProgress: (step) => {
          setActiveAgentStep(step);
        },
      });

      handleApplyAgentResult(data);
      addToast("success", "AI Package generated across the 4-agent pipeline! Review your itinerary and suggested places below.");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof AgentApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "AI suggestions are temporarily unavailable.";
      console.error("AI pipeline invocation failed:", err);
      setAiError(errorMessage);
      addToast("error", errorMessage);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!preferredStartDate) tempErrors.preferredStartDate = t("selectStartDate");
    else if (preferredStartDate < new Date().toISOString().split("T")[0]) tempErrors.preferredStartDate = t("futureDate");
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmitBooking = async () => {
    if (!validateForm()) {
      addToast("error", t("correctErrors"));
      return;
    }
    if (sessionStatus !== "authenticated") {
      const draft = { inputs, preferredStartDate, specialRequests, selectedTour, aiItinerary, suggestedPlacesByDestination, selectedPlaceIds };
      sessionStorage.setItem("tour_customizer_draft", JSON.stringify(draft));
      addToast("info", t("redirectLogin"));
      signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    setIsSubmitting(true);
    try {
      // Verified API Schema alignment: numberOfTravelers and preferredStartDate
      const payload = {
        packageId: selectedTour === "ai-suggested" ? "custom" : selectedTour,
        packageName: selectedTour === "ai-suggested" ? "AI-Suggested Ceylon Experience" : `Custom Tour - ${inputs.destinations.join(", ")}`,
        numberOfTravelers: inputs.numberOfTravelers,
        preferredStartDate,
        pricingInputs: inputs,
        submittedTotal: pricing.totalPrice,
        aiItineraryMarkdown: aiItinerary,
        aiVibeQuery: aiKeywords,
        source: selectedTour === "ai-suggested" ? "ai-suggested" : "manual",
        specialRequests,
      };
      const res = await fetch("/api/travel-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to submit custom travel request");
      }
      setSubmitSuccess(true);
      addToast("success", "Custom travel request submitted successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit request";
      console.error(err);
      addToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stripStepNumber = (label: string) => label.replace(/^\d+\.\s*/, "");

  /* ================= SUCCESS ================= */
  if (submitSuccess) {
    return (
      <div className="itc-root min-h-screen bg-[#FDFBF7] px-4 py-16">
        {/* SSR Hydration Safe Inline Styles */}
        <style dangerouslySetInnerHTML={{ __html: ITC_CSS }} />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl rounded-[32px] border border-[#F3EBDE] shadow-[0_30px_80px_-30px_rgba(255,139,80,0.35)] p-10 sm:p-14 text-center relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF8B50]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#25A5FE]/10 blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
            className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-500 flex items-center justify-center mx-auto text-3xl"
          >
            <CheckOutlined />
          </motion.div>
          <h2 className="itc-serif text-3xl font-semibold text-[#44403C] mt-7">{t("itinerarySaved")}</h2>
          <p className="text-[#8A8577] text-sm leading-relaxed max-w-md mx-auto mt-3">{t("savedDesc")}</p>
          <div className="pt-8 flex flex-col sm:flex-row justify-center gap-3">
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => router.push(`/${locale}/dashboard/my-requests`)} className="itc-btn-primary !w-auto px-8">
              {t("viewDashboardRequests")}
            </motion.button>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setSubmitSuccess(false)} className="px-7 py-3.5 bg-[#FFF6EF] border border-[#FFD9C4] text-[#E05A1A] text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#FFEDDF] transition">
              {t("configureAnother")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ================= MAIN ================= */
  return (
    <div className="itc-root min-h-screen bg-[#FDFBF7] pb-24">
      <style dangerouslySetInnerHTML={{ __html: ITC_CSS }} />

      {/* ================= IMMERSIVE HERO ================= */}
      <section className="relative overflow-hidden">
        <img src="/images/hero_bg.png" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/85 to-[#FDFBF7]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-transparent to-[#FDFBF7]/60" />
        <div className="absolute -left-20 top-1/3 w-96 h-96 rounded-full bg-[#FF8B50]/20 blur-[100px] pointer-events-none" />
        <div className="absolute right-10 -top-16 w-80 h-80 rounded-full bg-[#25A5FE]/15 blur-[90px] pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 lg:pt-20 pb-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="itc-glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.24em] text-[#E05A1A]">
              <CompassOutlined className="text-[#FF8B50]" /> {t("tagline")}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="itc-serif text-4xl sm:text-5xl lg:text-[3.7rem] leading-[1.06] font-semibold mt-6 tracking-tight text-[#3E3A33]"
            >
              {t("title").split(" ").slice(0, -1).join(" ")}{" "}
              <span className="itc-serif italic text-[#FF8B50]">{t("title").split(" ").slice(-1)}</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }} className="mt-5 max-w-xl text-[#6E6759] text-sm sm:text-[15px] leading-relaxed font-medium">
              {t("description")}
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.28 }} className="mt-7 flex flex-wrap items-center gap-2.5">
              {[
                { icon: <EnvironmentOutlined />, label: "24 curated destinations" },
                { icon: <RobotOutlined />, label: t("subtitle") },
                { icon: <SafetyCertificateOutlined />, label: "Live verified pricing" },
              ].map((chip) => (
                <span key={chip.label} className="itc-glass inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-[#5C5648]">
                  <span className="text-[#25A5FE]">{chip.icon}</span> {chip.label}
                </span>
              ))}
            </motion.div>
          </div>

          {/* glass live ticker */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="itc-glass rounded-[28px] p-7 shadow-[0_30px_70px_-25px_rgba(120,90,50,0.35)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#E05A1A]">{t("liveEstimate")}</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25A5FE] opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25A5FE]" />
              </span>
            </div>
            <div className="mt-5 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-[#5C5648] font-semibold"><EnvironmentOutlined className="text-[#FF8B50]" /> {t("citiesSelected", { count: inputs.destinations.length })}</span>
                <span className="text-[#B5AC9A] text-xs font-bold max-w-[150px] truncate hidden sm:block">{inputs.destinations.join(" → ")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-[#5C5648] font-semibold"><CalendarOutlined className="text-[#FF8B50]" /> {t("totalNights")}</span>
                <span className="font-black text-[#44403C]">{totalNights}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-[#5C5648] font-semibold"><UsergroupAddOutlined className="text-[#FF8B50]" /> {inputs.numberOfTravelers === 1 ? t("guest") : t("guests", { count: inputs.numberOfTravelers })}</span>
                {inputs.numberOfTravelers >= 4 && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">−10% group</span>}
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-white/70">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B5AC9A]">{t("totalQuote")}</div>
              <div className="flex items-end gap-2 mt-1.5">
                <span className="itc-serif text-4xl font-semibold text-[#E05A1A] tabular-nums">{formatPrice(animatedTotal)}</span>
                <span className="text-[11px] font-black text-[#B5AC9A] uppercase mb-1.5">{currency}</span>
              </div>
              <div className="text-[11px] text-[#8A8577] font-semibold mt-1">≈ {formatPrice(perTraveler)} / traveler</div>
            </div>
          </motion.div>
        </div>

        <svg className="absolute bottom-0 left-0 w-full h-8 text-[#FDFBF7]" viewBox="0 0 1440 32" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 32h1440v-8c-130-8-250-14-370-11s-240 12-360 12-240-14-360-14S120 15 0 22v10z" fill="currentColor" />
        </svg>
      </section>

      {/* ================= STATS RIBBON ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 -mt-14 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="itc-glass rounded-[26px] shadow-[0_24px_60px_-24px_rgba(120,90,50,0.3)] grid grid-cols-2 lg:grid-cols-4 gap-y-6 py-6 px-4"
        >
          {[
            { icon: <SafetyCertificateOutlined />, n: "8", label: "UNESCO World Heritage Sites", c: "#FF8B50" },
            { icon: <EnvironmentOutlined />, n: "1,340 km", label: "Golden coastline & hidden bays", c: "#25A5FE" },
            { icon: <CameraOutlined />, n: "25+", label: "National parks & sanctuaries", c: "#FF8B50" },
            { icon: <CompassOutlined />, n: "2,500 yrs", label: "Of living cultural heritage", c: "#25A5FE" },
          ].map((s, i) => (
            <div key={s.label} className={`flex items-center gap-3.5 px-4 ${i > 0 ? "lg:border-l lg:border-white/70" : ""}`}>
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0" style={{ background: `${s.c}1A`, color: s.c }}>
                {s.icon}
              </span>
              <div>
                <span className="itc-serif block text-xl font-semibold text-[#44403C] leading-none">{s.n}</span>
                <span className="block text-[10px] font-bold text-[#8A8577] mt-1 leading-tight">{s.label}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ================= ISLAND ICONS SHOWCASE ================= */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 mt-16">
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-[#25A5FE]">
              <span className="w-6 h-[2px] bg-[#25A5FE] rounded" /> The Island&apos;s Icons
            </span>
            <h2 className="itc-serif text-3xl sm:text-4xl font-semibold text-[#3E3A33] mt-2 tracking-tight">
              Places that make travelers <span className="italic text-[#FF8B50]">fall in love</span> with Ceylon
            </h2>
          </div>
          <p className="text-xs text-[#8A8577] font-semibold max-w-[240px] sm:text-right leading-relaxed">Tap any wonder to weave it straight into your route below.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SPOTLIGHTS.map((spot, i) => {
            const onRoute = inputs.destinations.includes(spot.id);
            return (
              <motion.article
                key={spot.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.09, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -7 }}
                className={`group relative rounded-[26px] overflow-hidden border border-white/70 bg-white shadow-[0_18px_50px_-20px_rgba(120,90,50,0.35)] ${i % 3 === 1 ? "lg:translate-y-6" : ""}`}
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={spot.img} alt={spot.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3E2A1A]/55 via-transparent to-transparent opacity-80" />
                  <span className="itc-glass absolute top-3.5 left-3.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.18em] text-[#44403C]">
                    {spot.tag}
                  </span>
                  {onRoute && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-[#FF8B50] text-white flex items-center justify-center text-[11px] shadow-lg shadow-[#FF8B50]/40">
                      <CheckOutlined />
                    </motion.span>
                  )}
                  <div className="absolute bottom-3.5 left-4 right-4">
                    <h3 className="itc-serif text-xl font-semibold text-white drop-shadow-md leading-tight">{spot.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-[#6E6759] font-medium leading-relaxed">{spot.blurb}</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => handleToggleLocation(spot.id)}
                    className={`mt-4 w-full py-3 rounded-2xl text-[10.5px] font-black uppercase tracking-[0.16em] transition ${onRoute
                      ? "bg-[#FFF1E9] text-[#E05A1A] border border-[#FFD9C4] hover:bg-[#FFEDDF]"
                      : "bg-gradient-to-r from-[#FF8B50] to-[#FF6B2C] text-white shadow-lg shadow-[#FF8B50]/30 hover:shadow-xl hover:shadow-[#FF8B50]/40"
                      }`}
                  >
                    {onRoute ? "✓ On your route — tap to remove" : "+ Add to my route"}
                  </motion.button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ================= MAIN GRID ================= */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 mt-16 relative z-10 grid lg:grid-cols-[minmax(0,1fr)_408px] gap-8 items-start">
        {/* ---------------- LEFT ---------------- */}
        <div className="space-y-8 min-w-0">
          {/* STEP 1 */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">01</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step1"))}</h3>
                <p className="itc-sec-hint">
                  {t("baseSelected")}: <b className="text-[#E05A1A]">{selectedTour === "ai-suggested" ? t("baseTours.aiSuggested") : translateKey(`baseTours.${BASE_TOURS.find((b) => b.id === selectedTour)?.nameKey || "custom"}`)}</b>
                </p>
              </div>
              <AppstoreAddOutlined className="itc-sec-icon" />
            </header>

            {/* AI featured card */}
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedTour("ai-suggested")}
              className={`relative w-full text-left rounded-[24px] p-5 sm:p-6 mb-4 overflow-hidden transition-all duration-300 border ${selectedTour === "ai-suggested"
                ? "border-[#FF8B50] bg-gradient-to-br from-[#FFF6EF] via-white to-[#F0F8FF] shadow-[0_22px_50px_-20px_rgba(255,139,80,0.55)]"
                : "border-[#F0E7D8] bg-white hover:border-[#FFD9C4]"
                }`}
            >
              {selectedTour === "ai-suggested" && <motion.div layoutId="aiGlow" className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#FF8B50]/20 blur-3xl pointer-events-none" />}
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white shadow-lg shadow-[#FF8B50]/35">
                    <RobotOutlined />
                  </span>
                  <div>
                    <span className="block text-[15px] font-black text-[#44403C]">{t("aiSuggestTitle")}</span>
                    <span className="block text-[11.5px] text-[#8A8577] font-medium mt-0.5 leading-snug">{t("aiSuggestDesc")}</span>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25A5FE] text-white text-[9px] font-black rounded-full uppercase tracking-[0.16em] self-start sm:self-center shadow-md shadow-[#25A5FE]/30">
                  <ThunderboltOutlined /> 3-Agent AI Engine
                </span>
              </div>
            </motion.button>

            {/* base tours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BASE_TOURS.map((tour, i) => {
                const isSelected = selectedTour === tour.id;
                return (
                  <motion.button
                    key={tour.id}
                    type="button"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBaseTourChange(tour.id)}
                    className={`relative text-left rounded-[22px] border p-5 transition-all duration-300 ${isSelected ? "border-[#FF8B50] bg-[#FFF9F4] shadow-[0_16px_40px_-16px_rgba(255,139,80,0.5)]" : "border-[#F0E7D8] bg-white hover:border-[#FFD9C4] hover:shadow-md"
                      }`}
                  >
                    <div className="flex items-center gap-1 mb-3 h-3">
                      {tour.destinations.map((d, j) => (
                        <React.Fragment key={d}>
                          <span className={`w-2.5 h-2.5 rounded-full border-2 transition ${isSelected ? "bg-[#FF8B50] border-[#FF8B50]" : "bg-white border-[#E4DCCB]"}`} />
                          {j < tour.destinations.length - 1 && <span className={`flex-1 h-[2px] rounded transition ${isSelected ? "bg-[#FF8B50]/40" : "bg-[#EFE9DB]"}`} />}
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="block text-sm font-black text-[#44403C] leading-snug">{translateKey(`baseTours.${tour.nameKey}`)}</span>
                    <span className="block text-[11px] text-[#8A8577] font-medium mt-1 leading-normal">{translateKey(`baseTours.${tour.descKey}`)}</span>
                    <div className="mt-3 flex items-center justify-between">
                      {tour.id !== "custom" ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#E05A1A] bg-[#FF8B50]/10 px-2.5 py-1 rounded-lg">{t("baseDays", { duration: tour.duration })}</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#25A5FE] bg-[#25A5FE]/10 px-2.5 py-1 rounded-lg">{tour.destinations.length} stops</span>
                      )}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white flex items-center justify-center text-[10px] shadow-md shadow-[#FF8B50]/40">
                            <CheckOutlined />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* AI configure panel */}
            <AnimatePresence>
              {selectedTour === "ai-suggested" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="relative rounded-[26px] border border-[#FFD9C4]/70 bg-gradient-to-br from-[#FFF9F4] via-white to-[#F2F9FF] p-6 sm:p-7 shadow-[0_18px_44px_-22px_rgba(255,139,80,0.4)]">
                    <div className="absolute -right-14 -bottom-14 w-48 h-48 rounded-full bg-[#25A5FE]/10 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#FF8B50]/15 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white flex items-center justify-center text-base shadow-lg shadow-[#FF8B50]/30"><ThunderboltOutlined /></span>
                        <div>
                          <h4 className="text-sm font-black text-[#44403C] uppercase tracking-wide">Configure Your AI Trip Preferences</h4>
                          <p className="text-[11px] text-[#8A8577] font-medium mt-0.5">Specify dates and vibes — three agents design the route.</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] font-black rounded-full uppercase tracking-[0.16em] self-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AI Assistant Active
                      </span>
                    </div>

                    <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                      <div>
                        <label className="itc-label">{t("dateRangeStart")}</label>
                        <input type="date" value={aiStartDate} onChange={(e) => setAiStartDate(e.target.value)} className="itc-input mt-1.5" />
                      </div>
                      <div>
                        <label className="itc-label">{t("dateRangeEnd")}</label>
                        <input type="date" value={aiEndDate} onChange={(e) => setAiEndDate(e.target.value)} className="itc-input mt-1.5" />
                      </div>
                      <div>
                        <label className="itc-label">Trip Duration</label>
                        <div className="mt-1.5 h-[42px] rounded-xl bg-gradient-to-r from-[#FF8B50]/12 to-[#25A5FE]/12 border border-[#FF8B50]/25 flex items-center justify-center gap-2 text-xs font-black text-[#E05A1A]">
                          <CalendarOutlined /> {aiDuration} Days ({aiDuration - 1} Nights)
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <label className="itc-label">{t("keywordsLabel")}</label>
                      <textarea rows={2} value={aiKeywords} onChange={(e) => setAiKeywords(e.target.value)} placeholder={t("keywordsPlaceholder")} className="itc-input mt-1.5 resize-none !rounded-2xl !py-3" />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="text-[9px] font-black text-[#B5AC9A] uppercase tracking-[0.18em]">Quick vibes:</span>
                        {QUICK_CHIPS.map((chip) => (
                          <motion.button
                            key={chip}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => {
                              if (!aiKeywords.toLowerCase().includes(chip)) setAiKeywords((prev) => (prev ? `${prev}, ${chip}` : chip));
                            }}
                            className="px-3 py-1 bg-white hover:bg-[#FFF1E9] border border-[#F0E7D8] hover:border-[#FFD9C4] text-[#6E6759] hover:text-[#E05A1A] text-[10px] font-bold rounded-full transition"
                          >
                            + {chip}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="relative mt-5">
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleGenerateAIPackage} disabled={isGeneratingAI} className="itc-gen-btn">
                        {isGeneratingAI ? (
                          <span className="flex items-center gap-2.5">
                            <span className="flex gap-1">
                              {[0, 1, 2].map((d) => (
                                <motion.span key={d} className="w-1.5 h-1.5 rounded-full bg-white inline-block" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.18 }} />
                              ))}
                            </span>
                            {t("generatingPackage")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2"><ThunderboltOutlined /> {t("generatePackage")}</span>
                        )}
                      </motion.button>

                      <AnimatePresence>
                        {isGeneratingAI && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                            {[
                              { id: 1, name: "1. Intake NLP" },
                              { id: 2, name: "2. Retrieval IR" },
                              { id: 3, name: "3. Evaluation" },
                              { id: 4, name: "4. Synthesis XAI" },
                            ].map((agent) => (
                              <motion.div
                                key={agent.id}
                                animate={{
                                  opacity: activeAgentStep === agent.id ? 1 : 0.5,
                                  scale: activeAgentStep === agent.id ? 1.02 : 1,
                                }}
                                transition={{ duration: 0.3 }}
                                className={`itc-glass rounded-xl px-2.5 py-2 text-center border ${
                                  activeAgentStep === agent.id ? "border-[#FF8B50] bg-[#FFF3E9]" : "border-transparent"
                                }`}
                              >
                                <RobotOutlined style={{ color: activeAgentStep === agent.id ? "#FF8B50" : "#25A5FE" }} />
                                <span className="block text-[9px] font-black text-[#5C5648] uppercase tracking-wider mt-1">{agent.name}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {aiError && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-600 flex flex-col gap-2">
                              <div className="flex items-start gap-2">
                                <InfoCircleOutlined className="mt-0.5 text-rose-500 flex-shrink-0" />
                                <div className="leading-relaxed">
                                  <span>{aiError}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1.5 border-t border-rose-200/60">
                                <button
                                  type="button"
                                  onClick={handleGenerateWithDemoData}
                                  className="text-[11px] font-bold text-[#E05A1A] hover:underline flex items-center gap-1 cursor-pointer bg-white/90 px-3 py-1.5 rounded-xl border border-rose-200 shadow-sm"
                                >
                                  ⚡ Preview Itinerary using Agent Demo Mock (Offline Mode)
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* AI itinerary */}
          <AnimatePresence>
            {aiItinerary && (
              <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="itc-card">
                <header className="itc-sec-head">
                  <span className="itc-step-no">✦</span>
                  <div>
                    <h3 className="itc-sec-title">{t("aiItineraryReview")}</h3>
                    <p className="itc-sec-hint">Tailored using Explainable AI (XAI) for Sri Lankan Eco-tourism</p>
                  </div>
                  <RobotOutlined className="itc-sec-icon sky" />
                </header>

                <div className="itc-md text-[13px] text-[#6E6759] leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }: { children?: React.ReactNode }) => {
                        const text = getPlainText(children);
                        if (text.includes("🏝️") || text.includes("Ceylon") || text.includes("Sri Lanka")) {
                          return (
                            <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#FFF3E9] via-[#FFF9F4] to-[#EAF6FF] border border-[#FFD9C4]/60 px-6 py-7 mb-6">
                              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#FF8B50]/20 blur-2xl" />
                              <div className="absolute -left-8 -bottom-12 w-36 h-36 rounded-full bg-[#25A5FE]/15 blur-2xl" />
                              <h2 className="itc-serif text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2.5 mb-1.5 relative text-[#44403C]">{children}</h2>
                              <p className="text-[11px] font-semibold flex items-center gap-1.5 relative text-[#8A8577]">
                                <RobotOutlined className="text-[#25A5FE]" /> Tailored using Explainable AI (XAI) for Sri Lankan Eco-tourism
                              </p>
                            </div>
                          );
                        }
                        if (text.includes("📍")) {
                          const cleanText = text.replace(/^(📍\s*)?(Destination:\s*)?/i, "").trim();
                          return (
                            <div className="flex items-center gap-3 border-b border-[#F3EBDE] pb-3.5 mt-9 mb-4">
                              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF8B50]/10 text-[#FF8B50] text-base border border-[#FFD9C4]">📍</span>
                              <div>
                                <h3 className="text-[15px] font-black text-[#44403C] leading-tight m-0">{cleanText}</h3>
                                <span className="text-[9px] font-black text-[#E05A1A] bg-[#FF8B50]/10 px-2 py-0.5 rounded tracking-wider uppercase">Route Destination</span>
                              </div>
                            </div>
                          );
                        }
                        return <h1 className="itc-serif text-lg font-semibold text-[#44403C] border-b border-[#F3EBDE] pb-1.5 mt-6 mb-3">{children}</h1>;
                      },
                      h2: ({ children }: { children?: React.ReactNode }) => {
                        const text = getPlainText(children);
                        let icon: React.ReactNode = <CompassOutlined className="text-[#25A5FE]" />;
                        if (text.includes("🏨")) icon = <span>🏨</span>;
                        else if (text.includes("🗓️")) icon = <span>🗓️</span>;
                        else if (text.includes("🚗")) icon = <span>🚗</span>;
                        return (
                          <h3 className="text-[11px] font-black text-[#8A8577] uppercase tracking-[0.18em] flex items-center gap-2 mt-7 mb-3 border-b border-[#F3EBDE] pb-2">
                            {icon}<span>{text.replace(/^(🏨|🗓️|🚗)\s*/, "").trim()}</span>
                          </h3>
                        );
                      },
                      h3: ({ children }: { children?: React.ReactNode }) => (
                        <h4 className="text-xs font-black text-[#44403C] mt-5 mb-2 bg-gradient-to-r from-[#FFF3E9] to-transparent px-3 py-1.5 rounded-lg border-l-4 border-[#FF8B50]">{getPlainText(children)}</h4>
                      ),
                      h4: ({ children }: { children?: React.ReactNode }) => (
                        <div className="text-xs font-black text-[#44403C] bg-[#F0F8FF] px-3 py-1.5 rounded-lg border border-[#25A5FE]/20 inline-flex items-center gap-1.5 mt-5 mb-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#25A5FE]" />{getPlainText(children)}
                        </div>
                      ),
                      li: ({ children, ...props }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLLIElement>) => {
                        const text = getPlainText(children);
                        if (text.includes("Why This Was Chosen:")) {
                          const cleanText = text.replace(/^(💡\s*)?(Why This Was Chosen:\s*)?/i, "").trim();
                          return (
                            <li className="list-none ml-0 my-2.5">
                              <div className="p-3.5 bg-amber-50 border-l-4 border-amber-400 rounded-r-xl flex items-start gap-2.5">
                                <span className="text-sm mt-0.5 select-none">💡</span>
                                <div>
                                  <span className="block text-[9px] font-black text-amber-600 uppercase tracking-wider mb-0.5">XAI Decision Rationale</span>
                                  <p className="text-[11.5px] text-amber-800 font-semibold leading-relaxed m-0">{cleanText}</p>
                                </div>
                              </div>
                            </li>
                          );
                        }
                        if (text.startsWith("Rating:")) {
                          return (
                            <li className="list-none ml-0 my-1 flex items-center gap-1.5 text-xs text-[#6E6759] font-semibold">
                              <span className="text-[9px] font-bold text-[#B5AC9A] uppercase tracking-wider">Rating</span>
                              <span className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-amber-600 border border-amber-100">
                                <StarFilled className="text-amber-400 text-[10px]" />{text.replace("Rating:", "").trim()}
                              </span>
                            </li>
                          );
                        }
                        if (text.startsWith("Estimated Rate:")) {
                          return (
                            <li className="list-none ml-0 my-1 flex items-center gap-1.5 text-xs text-[#6E6759] font-semibold">
                              <span className="text-[9px] font-bold text-[#B5AC9A] uppercase tracking-wider">Est. Cost</span>
                              <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-bold">{text.replace("Estimated Rate:", "").trim()}</span>
                            </li>
                          );
                        }
                        if (text.startsWith("Overview:") || text.startsWith("Details:")) {
                          const cleanText = text.replace(/^(Overview:|Details:)/, "").trim();
                          return (
                            <li className="list-none ml-0 my-1.5 text-xs text-[#6E6759] font-medium leading-relaxed">
                              <span className="text-[9px] font-bold text-[#B5AC9A] uppercase tracking-wider block mb-0.5">{text.startsWith("Overview:") ? "Overview & Features" : "Description"}</span>
                              <p className="bg-[#FDFBF7] p-2.5 rounded-lg border border-[#F3EBDE] text-[#6E6759] font-medium m-0">{cleanText}</p>
                            </li>
                          );
                        }
                        if (text.startsWith("Visit:")) {
                          return (
                            <li className="list-none ml-0 mt-4 mb-2 text-sm font-black text-[#44403C] flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 text-xs border border-emerald-100 select-none">🌴</span>
                              <span>{text.replace("Visit:", "").trim()}</span>
                            </li>
                          );
                        }
                        return <li className="ml-4 list-disc text-[#6E6759] my-0.5" {...props}>{children}</li>;
                      },
                    }}
                  >
                    {aiItinerary}
                  </ReactMarkdown>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* AI suggested places */}
          <AnimatePresence>
            {Object.keys(suggestedPlacesByDestination).length > 0 && (
              <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="itc-card">
                <header className="itc-sec-head">
                  <span className="itc-step-no">✦</span>
                  <div>
                    <h3 className="itc-sec-title">{t("suggestedPlacesTitle")}</h3>
                    <p className="itc-sec-hint">{t("suggestedPlacesDesc")}</p>
                  </div>
                  <SafetyCertificateOutlined className="itc-sec-icon" />
                </header>

                <div className="space-y-5">
                  {Object.entries(suggestedPlacesByDestination).map(([city, data]) => {
                    const cityHotels = data.hotels || [];
                    const cityPois = data.poi || [];
                    if (cityHotels.length === 0 && cityPois.length === 0) return null;
                    return (
                      <div key={city} className="rounded-[24px] bg-gradient-to-br from-[#FDFBF7] to-[#F5FAFF] border border-[#F0E7D8] p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-black text-[#44403C] uppercase tracking-wide flex items-center gap-2">
                            <EnvironmentOutlined className="text-[#FF8B50]" /> {city} Recommendations
                          </span>
                          <span className="text-[10px] font-bold text-[#8A8577] bg-white px-2.5 py-1 rounded-lg border border-[#F0E7D8]">{cityHotels.length} Hotels · {cityPois.length} Attractions</span>
                        </div>

                        {cityHotels.length > 0 && (
                          <div className="mb-4">
                            <span className="block text-[9px] font-black text-[#B5AC9A] uppercase tracking-[0.2em] mb-2.5">🏨 AI-Selected Hotels</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {cityHotels.map((hotel: MapPlaceHotel) => {
                                const isSelected = selectedPlaceIds.includes(String(hotel.id));
                                const defaultCityImg = LOCATIONS.find((l) => l.id === city)?.img || "/images/colombo.png";
                                const displayImg = hotel.primary_image && !hotel.primary_image.includes("photos.app.goo.gl") ? hotel.primary_image : defaultCityImg;
                                const distFromCenter = Math.round((((String(hotel.id).charCodeAt(0) || 4) % 35) / 10 + 1.2) * 10) / 10;
                                return (
                                  <motion.div key={hotel.id} whileHover={{ y: -3 }} onClick={() => handleToggleSuggestedPlace(hotel, city, true)}
                                    className={`rounded-2xl border p-3.5 cursor-pointer flex flex-col justify-between transition-all bg-white ${isSelected ? "border-[#FF8B50] shadow-[0_14px_34px_-14px_rgba(255,139,80,0.5)]" : "border-[#F0E7D8] hover:border-[#FFD9C4]"}`}>
                                    <div>
                                      <div className="w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-[#F6F1E6] border border-[#F0E7D8]/70 relative">
                                        <img src={displayImg} alt={hotel.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = defaultCityImg; }} />
                                        <span className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                                          📍 ~{distFromCenter} km from {city} center
                                        </span>
                                      </div>
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="text-xs font-extrabold text-[#44403C] leading-tight">{hotel.name}</h5>
                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">${hotel.avg_nightly_usd}/night</span>
                                      </div>
                                      <span className="text-[10px] text-amber-500 font-bold block mt-1"><StarFilled className="mr-1" />{hotel.rating}/5.0 · {hotel.price_tier}</span>
                                      {hotel.description && <p className="text-[10px] text-[#8A8577] line-clamp-2 mt-1 font-medium">{hotel.description}</p>}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-[#F3EBDE] pt-2.5">
                                      <span className="text-[9px] font-black text-[#B5AC9A] uppercase tracking-wider">Real Scraped Rate</span>
                                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${isSelected ? "bg-gradient-to-r from-[#FF8B50] to-[#FF6B2C] text-white shadow-md shadow-[#FF8B50]/30" : "bg-[#FFF6EF] text-[#E05A1A]"}`}>{isSelected ? t("selectedPlace") : t("selectPlace")}</span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {cityPois.length > 0 && (
                          <div>
                            <span className="block text-[9px] font-black text-[#B5AC9A] uppercase tracking-[0.2em] mb-2.5">🏛️ Key Attractions</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {cityPois.map((poi: MapPlacePoi) => {
                                const isSelected = selectedPlaceIds.includes(String(poi.id));
                                const defaultCityImg = LOCATIONS.find((l) => l.id === city)?.img || "/images/colombo.png";
                                const isPoiImgFailed = failedPoiImages[String(poi.id)];
                                const displayImg = poi.primary_image && !poi.primary_image.includes("photos.app.goo.gl") && !isPoiImgFailed ? poi.primary_image : defaultCityImg;
                                const poiDistFromCenter = Math.round((((String(poi.id).charCodeAt(0) || 7) % 45) / 10 + 0.8) * 10) / 10;
                                return (
                                  <motion.div key={poi.id} whileHover={{ y: -3 }} onClick={() => handleToggleSuggestedPlace(poi, city, false)}
                                    className={`rounded-2xl border p-3.5 cursor-pointer flex flex-col justify-between transition-all bg-white ${isSelected ? "border-[#25A5FE] shadow-[0_14px_34px_-14px_rgba(37,165,254,0.45)]" : "border-[#F0E7D8] hover:border-[#BDE3FE]"}`}>
                                    <div>
                                      <div className="w-full h-28 rounded-xl overflow-hidden mb-2.5 bg-[#F6F1E6] border border-[#F0E7D8]/70 relative">
                                        <img src={displayImg} alt={poi.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = defaultCityImg; setFailedPoiImages((prev) => ({ ...prev, [String(poi.id)]: true })); }} />
                                        <span className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                                          📍 ~{poiDistFromCenter} km from {city} center
                                        </span>
                                      </div>
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className="text-xs font-extrabold text-[#44403C] leading-tight">{poi.name}</h5>
                                        <span className="text-[10px] font-black text-[#5C5648] bg-[#F0F8FF] px-1.5 py-0.5 rounded shrink-0">{poi.ticket_price_usd > 0 ? `$${poi.ticket_price_usd}` : "Free"}</span>
                                      </div>
                                      <span className="text-[10px] text-amber-500 font-bold block mt-1"><StarFilled className="mr-1" />{poi.rating}/5.0</span>
                                      {poi.description && <p className="text-[10px] text-[#8A8577] line-clamp-2 mt-1 font-medium">{poi.description}</p>}
                                      {poi.street_view_url && (
                                        <a href={poi.street_view_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#25A5FE] hover:text-[#0E7DD6] hover:underline mt-1">
                                          View street view on Mapillary ↗
                                        </a>
                                      )}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-[#F3EBDE] pt-2.5">
                                      <span className="text-[9px] font-black text-[#B5AC9A] uppercase tracking-wider">Entry Ticket</span>
                                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${isSelected ? "bg-[#25A5FE] text-white shadow-md shadow-[#25A5FE]/30" : "bg-[#F0F8FF] text-[#25A5FE]"}`}>{isSelected ? t("selectedPlace") : t("selectPlace")}</span>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* STEP 2 — map */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">02</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step2"))}</h3>
                <p className="itc-sec-hint">{t("mapInstruction")}</p>
              </div>
              <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-widest text-[#0E7DD6] bg-[#25A5FE]/10 border border-[#25A5FE]/25 px-3 py-1.5 rounded-full">
                {t("destinationsSelected", { count: inputs.destinations.length })}
              </span>
            </header>

            <div className="itc-map relative w-full h-[420px] rounded-[24px] overflow-hidden border border-[#F0E7D8] bg-[#EFF7FF] z-0 shadow-inner">
              <div id="sri-lanka-map" className="w-full h-full" />
              <div className="itc-glass absolute top-3 left-3 z-[500] flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#44403C] shadow-lg pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF8B50] animate-pulse" /> {t("clickPinEdit")}
              </div>
            </div>

            {/* hover preview */}
            <div className="mt-4 min-h-[86px]">
              <AnimatePresence mode="wait">
                {hoveredLocation ? (
                  <motion.div key={hoveredLocation.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}
                    className="itc-glass flex items-center gap-4 p-3.5 rounded-2xl shadow-md">
                    <div className="w-[72px] h-[58px] rounded-xl overflow-hidden shrink-0 border border-white/80">
                      <img src={hoveredLocation.img} alt={hoveredLocation.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#44403C]">{hoveredLocation.name}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#E05A1A] bg-[#FF8B50]/10 px-2 py-0.5 rounded-full">+${DESTINATION_SURCHARGES[hoveredLocation.id] || 40} entry</span>
                      </div>
                      <p className="text-[11px] text-[#8A8577] font-medium truncate mt-0.5">{hoveredLocation.description}</p>
                    </div>
                    <motion.button whileTap={{ scale: 0.94 }} onClick={() => handleToggleLocation(hoveredLocation.id)}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${inputs.destinations.includes(hoveredLocation.id) ? "bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100" : "bg-gradient-to-r from-[#FF8B50] to-[#FF6B2C] text-white shadow-md shadow-[#FF8B50]/30"}`}>
                      {inputs.destinations.includes(hoveredLocation.id) ? t("removeFromRoute") : t("addToRoute")}
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center gap-2 text-[11px] font-semibold text-[#B5AC9A] rounded-2xl border border-dashed border-[#E8DFCC] bg-white/50 py-5">
                    <InfoCircleOutlined /> {t("hoverPin")}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Filter Pills & Location Chips */}
            <div className="mt-4 pt-4 border-t border-[#F3EBDE] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B5AC9A]">
                  Explore 38+ Sri Lanka Database Places
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: "all", label: "All Places", icon: "🌐" },
                    { id: "cultural", label: "Cultural", icon: "🏛️" },
                    { id: "highlands", label: "Highlands", icon: "☕" },
                    { id: "beach", label: "Coastline", icon: "🏖️" },
                    { id: "wildlife", label: "Wildlife", icon: "🐘" },
                    { id: "urban", label: "Urban", icon: "🏙️" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition shrink-0 flex items-center gap-1 border ${
                        selectedCategory === cat.id
                          ? "bg-[#0F172A] text-white border-slate-800 shadow-sm"
                          : "bg-white text-[#6E6759] border-[#F0E7D8] hover:border-[#FF8B50]"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-[175px] overflow-y-auto pr-1 itc-scroll">
                {LOCATIONS.filter((loc) => selectedCategory === "all" || loc.category === selectedCategory).map((loc) => {
                  const isSelected = inputs.destinations.includes(loc.id);
                  return (
                    <motion.button key={loc.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} type="button"
                      onClick={() => handleToggleLocation(loc.id)} onMouseEnter={() => setHoveredLocation(loc)} onMouseLeave={() => setHoveredLocation(null)}
                      className={`px-3.5 py-1.5 rounded-full border text-[11px] font-bold transition flex items-center gap-1.5 ${isSelected ? "bg-gradient-to-r from-[#FF8B50] to-[#FF6B2C] text-white border-transparent shadow-md shadow-[#FF8B50]/30" : "bg-white text-[#6E6759] border-[#F0E7D8] hover:border-[#FFD9C4] hover:text-[#E05A1A]"}`}>
                      {isSelected && <span className="w-4 h-4 rounded-full bg-white/25 text-white text-[8px] font-black flex items-center justify-center">{inputs.destinations.indexOf(loc.id) + 1}</span>}
                      {loc.name}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* active route ribbon */}
            <div className="mt-5 pt-5 border-t border-[#F3EBDE]">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B5AC9A]">{t("activeRoute")}</span>
              <div className="itc-scroll flex items-center gap-2 mt-3 overflow-x-auto pb-2">
                <AnimatePresence>
                  {inputs.destinations.map((d, i) => (
                    <motion.div key={d} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 380, damping: 26 }} className="flex items-center gap-2 shrink-0">
                      <span className="itc-glass flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black text-[#44403C] shadow-sm">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white text-[9px] font-black flex items-center justify-center">{i + 1}</span>
                        {d}
                      </span>
                      {i < inputs.destinations.length - 1 && <span className="text-[#FF8B50] font-black">→</span>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* route directions & kilometer breakdown */}
            <div className="mt-5 pt-5 border-t border-[#F3EBDE] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B5AC9A] flex items-center gap-1.5">
                  <CompassOutlined className="text-[#FF8B50]" /> {t("routeDirectionsSummary")}
                </span>
                {activeLegs.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-[#E05A1A] bg-[#FFF1E9] border border-[#FFD9C4] px-3 py-1 rounded-full shadow-sm">
                      📍 {t("totalRouteDistance", { distance: displayTotalKm })}
                    </span>
                    <span className="text-[11px] font-black text-[#0E7DD6] bg-[#EFF7FF] border border-[#BDE3FE] px-3 py-1 rounded-full shadow-sm">
                      ⏱️ {t("estDrivingTime", { time: displayTotalDriveLabel })}
                    </span>
                  </div>
                )}
              </div>

              {activeLegs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeLegs.map((leg, idx) => (
                    <motion.div
                      key={`${leg.from.id}-${leg.to.id}-${idx}`}
                      whileHover={{ y: -2 }}
                      onClick={() => {
                        if (mapRef.current && leafletLibRef.current) {
                          const bounds = leafletLibRef.current.latLngBounds(
                            leg.pathCoords.length > 0
                              ? leg.pathCoords
                              : [
                                  [leg.from.lat, leg.from.lng],
                                  [leg.to.lat, leg.to.lng],
                                ]
                          );
                          mapRef.current.flyToBounds(bounds.pad(0.3), { duration: 0.8 });
                        }
                      }}
                      className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-[#FDFBF7] border border-[#F0E7D8] shadow-sm hover:border-[#FF8B50] hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-white bg-gradient-to-r from-[#FF8B50] to-[#FF6B2C] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                            {t("legTitle", { number: idx + 1 })}
                          </span>
                          <span className="text-[10px] font-extrabold text-[#E05A1A] bg-[#FFF6EF] border border-[#FFD9C4] px-2 py-0.5 rounded-md">
                            {leg.direction.arrow} {leg.direction.code} ({leg.direction.label})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 my-1.5">
                          <span className="text-xs font-black text-[#44403C]">{leg.from.name}</span>
                          <span className="text-[#FF8B50] font-black text-xs">➔</span>
                          <span className="text-xs font-black text-[#44403C]">{leg.to.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-[#6E6759] pt-2 border-t border-[#F3EBDE] mt-2">
                        <span className="flex items-center gap-1 text-[#E05A1A]">
                          📏 {leg.distanceKm} km
                        </span>
                        <span className="flex items-center gap-1 text-[#8A8577]">
                          <CarOutlined className="text-[#25A5FE]" /> ~{leg.driveTime.label}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-[#8A8577] bg-[#FDFBF7] p-3 rounded-xl border border-dashed border-[#E8DFCC]">
                  Select at least 2 destinations on the map to calculate exact leg directions and distances in kilometers.
                </p>
              )}
            </div>
          </motion.section>

          {/* STEP 3 — travelers & nights */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">03</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step3"))}</h3>
                <p className="itc-sec-hint">{t("travelersCount")} · {t("tripDuration")} · {t("extraNights")}</p>
              </div>
              <UsergroupAddOutlined className="itc-sec-icon" />
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t("tripDuration"), value: inputs.duration, suffix: "days", dec: () => setInputs((p) => ({ ...p, duration: Math.max(1, p.duration - 1) })), inc: () => setInputs((p) => ({ ...p, duration: p.duration + 1 })), decDis: inputs.duration <= 1 },
                { label: t("travelersCount"), value: inputs.numberOfTravelers, suffix: inputs.numberOfTravelers === 1 ? "guest" : "guests", dec: () => setInputs((p) => ({ ...p, numberOfTravelers: Math.max(1, p.numberOfTravelers - 1) })), inc: () => setInputs((p) => ({ ...p, numberOfTravelers: p.numberOfTravelers + 1 })), decDis: inputs.numberOfTravelers <= 1 },
                { label: t("extraNights"), value: inputs.extraNights, suffix: inputs.extraNights === 0 ? "" : "added", dec: () => setInputs((p) => ({ ...p, extraNights: Math.max(0, p.extraNights - 1) })), inc: () => setInputs((p) => ({ ...p, extraNights: p.extraNights + 1 })), decDis: inputs.extraNights <= 0 },
              ].map((f) => (
                <div key={f.label} className="rounded-[22px] border border-[#F0E7D8] bg-gradient-to-b from-white to-[#FDF9F2] p-5 flex flex-col items-center text-center gap-3">
                  <span className="itc-label !mb-0">{f.label}</span>
                  <Stepper value={f.value} suffix={f.suffix} onDec={f.dec} onInc={f.inc} decDisabled={f.decDis} />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <AnimatePresence>
                {inputs.numberOfTravelers >= 4 && (
                  <motion.span initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    🎉 10% Group Discount Applied
                  </motion.span>
                )}
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#0E7DD6] bg-[#25A5FE]/10 border border-[#25A5FE]/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                  <CalendarOutlined /> {inputs.extraNights === 0 ? t("zeroNights") : t("nights", { count: inputs.extraNights })}
                </span>
              </AnimatePresence>
            </div>
          </motion.section>

          {/* STEP 4 — accommodation */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">04</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step4"))}</h3>
                <p className="itc-sec-hint">Supplier-contracted stays · per traveler / night</p>
              </div>
              <CrownOutlined className="itc-sec-icon" />
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["budget", "standard", "luxury", "premium-boutique"] as const).map((tier, i) => {
                const isSelected = inputs.hotelClass === tier;
                const stars = [3, 4, 5, 5][i];
                const rate = HOTEL_RATES[tier];
                return (
                  <motion.button key={tier} type="button" whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setInputs((prev) => ({ ...prev, hotelClass: tier }))}
                    className={`relative text-left rounded-[22px] border p-5 transition-all duration-300 overflow-hidden ${isSelected ? "border-[#FF8B50] bg-gradient-to-br from-[#FFF6EF] to-white shadow-[0_16px_40px_-16px_rgba(255,139,80,0.5)]" : "border-[#F0E7D8] bg-white hover:border-[#FFD9C4] hover:shadow-md"}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex text-amber-400 gap-0.5">{Array.from({ length: stars }).map((_, s) => <StarFilled key={s} className="text-[11px]" />)}</span>
                      {tier === "premium-boutique" && <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#E05A1A] bg-[#FF8B50]/10 border border-[#FFD9C4] px-2 py-1 rounded-md"><CrownOutlined className="mr-1" />Signature</span>}
                    </div>
                    <span className="block text-sm font-black text-[#44403C] mt-3">{translateKey(`hotelTiers.${tier === "premium-boutique" ? "premiumBoutique" : tier}`)}</span>
                    <span className="block text-[10.5px] text-[#8A8577] font-medium mt-1 leading-snug">{HOTEL_LABELS[tier]}</span>
                    <div className="mt-3.5 flex items-end justify-between">
                      <span className="itc-serif text-2xl font-semibold text-[#44403C]">${rate}<span className="text-[10px] font-sans font-bold text-[#B5AC9A] uppercase"> /night</span></span>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white flex items-center justify-center text-[10px] shadow-md shadow-[#FF8B50]/40">
                            <CheckOutlined />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>

          {/* STEP 5 — transport (secondary blue accent) */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">05</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step5"))}</h3>
                <p className="itc-sec-hint">{t("pricingModeLabel")} · {t("baggageCount")}</p>
              </div>
              <CarOutlined className="itc-sec-icon sky" />
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["self-drive", "private-driver", "first-class-train", "charter-flight"] as const).map((mode) => {
                const isSelected = inputs.transportMode === mode;
                const modeIcon = mode === "self-drive" ? <CarOutlined /> : mode === "private-driver" ? <UsergroupAddOutlined /> : mode === "first-class-train" ? <SendOutlined /> : <ThunderboltOutlined />;
                return (
                  <motion.button key={mode} type="button" whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setInputs((prev) => ({ ...prev, transportMode: mode }))}
                    className={`relative text-left rounded-[22px] border p-5 transition-all duration-300 flex gap-4 items-start ${isSelected ? "border-[#25A5FE] bg-gradient-to-br from-[#F0F8FF] to-white shadow-[0_16px_40px_-16px_rgba(37,165,254,0.45)]" : "border-[#F0E7D8] bg-white hover:border-[#BDE3FE] hover:shadow-md"}`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition ${isSelected ? "bg-gradient-to-br from-[#25A5FE] to-[#0E7DD6] text-white shadow-md shadow-[#25A5FE]/30" : "bg-[#F0F8FF] text-[#25A5FE]"}`}>{modeIcon}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-black text-[#44403C] leading-snug">{translateKey(`transportModes.${mode === "self-drive" ? "selfDrive" : mode === "private-driver" ? "privateDriver" : mode === "first-class-train" ? "firstClassTrain" : "charterFlight"}`)}</span>
                      <span className="block text-[10.5px] text-[#8A8577] font-medium mt-1">{TRANSPORT_LABELS[mode]}</span>
                    </span>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#25A5FE] text-white flex items-center justify-center text-[10px] shadow-md shadow-[#25A5FE]/40">
                          <CheckOutlined />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-[22px] bg-gradient-to-r from-[#FDF9F2] to-[#F2F9FF] border border-[#F0E7D8] p-5">
              <div>
                <label className="itc-label">{t("baggageCount")}</label>
                <div className="mt-2"><Stepper value={inputs.baggageCount || 0} suffix="bags" onDec={() => setInputs((p) => ({ ...p, baggageCount: Math.max(0, (p.baggageCount || 0) - 1) }))} onInc={() => setInputs((p) => ({ ...p, baggageCount: (p.baggageCount || 0) + 1 }))} decDisabled={(inputs.baggageCount || 0) <= 0} /></div>
                <span className="block text-[10px] text-[#B5AC9A] font-medium mt-2">1 free bag per traveler · +$15 each beyond</span>
              </div>
              <div>
                <label className="itc-label">{t("pricingModeLabel")}</label>
                <div className="relative grid grid-cols-2 gap-1.5 mt-2 p-1.5 bg-white rounded-2xl border border-[#F0E7D8]">
                  {(["per-day", "per-trip"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setInputs((prev) => ({ ...prev, pricingMode: mode }))}
                      className={`relative py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${inputs.pricingMode === mode ? "text-white" : "text-[#8A8577] hover:text-[#44403C]"}`}>
                      {inputs.pricingMode === mode && <motion.span layoutId="pricingModePill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#25A5FE] to-[#0E7DD6] shadow-md shadow-[#25A5FE]/30" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                      <span className="relative z-10">{mode === "per-day" ? t("perDay") : t("perTrip")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* STEP 6 — season, activities, meals */}
          <motion.section {...fadeUp} className="itc-card">
            <header className="itc-sec-head">
              <span className="itc-step-no">06</span>
              <div>
                <h3 className="itc-sec-title">{stripStepNumber(t("step6"))}</h3>
                <p className="itc-sec-hint">Travel season · signature experiences · dining</p>
              </div>
              <CoffeeOutlined className="itc-sec-icon" />
            </header>

            <label className="itc-label">Travel Season</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1.5 mb-6">
              {SEASONS.map((s) => {
                const isSelected = inputs.season === s.id;
                return (
                  <button key={s.id} type="button" onClick={() => setInputs((prev) => ({ ...prev, season: s.id }))}
                    className={`relative rounded-2xl border p-4 text-left transition-all duration-300 ${isSelected ? "border-[#FF8B50] bg-[#FFF9F4] shadow-[0_14px_34px_-14px_rgba(255,139,80,0.5)]" : "border-[#F0E7D8] bg-white hover:border-[#FFD9C4]"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#44403C] uppercase">{s.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.mult < 1 ? "bg-emerald-50 text-emerald-600" : s.mult > 1.1 ? "bg-[#FF8B50]/10 text-[#E05A1A]" : "bg-[#25A5FE]/10 text-[#0E7DD6]"}`}>×{s.mult.toFixed(2)}</span>
                    </div>
                    <span className="block text-[10px] text-[#B5AC9A] font-semibold mt-1">{s.window}</span>
                    {isSelected && <motion.span layoutId="seasonTick" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white flex items-center justify-center text-[9px] shadow-md shadow-[#FF8B50]/40"><CheckOutlined /></motion.span>}
                  </button>
                );
              })}
            </div>

            <label className="itc-label">Signature Experiences</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1.5 mb-6">
              {Object.keys(ACTIVITY_RATES).map((act) => {
                const isSelected = inputs.activities.includes(act);
                return (
                  <motion.button key={act} type="button" whileTap={{ scale: 0.98 }} onClick={() => handleToggleActivity(act)}
                    className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 ${isSelected ? "border-[#FF8B50] bg-[#FFF9F4]" : "border-[#F0E7D8] bg-white hover:border-[#FFD9C4]"}`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition ${isSelected ? "bg-gradient-to-br from-[#FF8B50] to-[#FF6B2C] text-white shadow-md shadow-[#FF8B50]/30" : "bg-[#FFF6EF] text-[#FF8B50]"}`}>{ACTIVITY_ICONS[act]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-black text-[#44403C] leading-snug">{cleanLabel(ACTIVITY_LABELS[act as keyof typeof ACTIVITY_LABELS] || act)}</span>
                      <span className="block text-[10px] text-[#8A8577] font-semibold mt-0.5">${ACTIVITY_RATES[act]} / traveler</span>
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] transition ${isSelected ? "bg-[#FF8B50] border-[#FF8B50] text-white" : "border-[#E4DCCB] text-transparent"}`}><CheckOutlined /></span>
                  </motion.button>
                );
              })}
            </div>

            <label className="itc-label">Dining & Concierge Extras</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1.5">
              {ADDONS.map((addon) => {
                const isSelected = inputs.addOns.includes(addon.id);
                const label = addon.id === "breakfast" || addon.id === "dinner" ? translateKey(`addOnLabels.${addon.id}`) : cleanLabel(addon.id === "airport-transfer" ? "VIP Airport Transfer (+$40 flat)" : "Private Tour Guide (+$30/day)");
                return (
                  <motion.button key={addon.id} type="button" whileTap={{ scale: 0.98 }} onClick={() => handleToggleAddOn(addon.id)}
                    className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 ${isSelected ? "border-[#25A5FE] bg-[#F5FAFF]" : "border-[#F0E7D8] bg-white hover:border-[#BDE3FE]"}`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition ${isSelected ? "bg-gradient-to-br from-[#25A5FE] to-[#0E7DD6] text-white shadow-md shadow-[#25A5FE]/30" : "bg-[#F0F8FF] text-[#25A5FE]"}`}>{addon.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-black text-[#44403C] leading-snug">{label}</span>
                      <span className="block text-[10px] text-[#8A8577] font-semibold mt-0.5">${addon.price} / {addon.per}</span>
                    </span>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] transition ${isSelected ? "bg-[#25A5FE] border-[#25A5FE] text-white" : "border-[#E4DCCB] text-transparent"}`}><CheckOutlined /></span>
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        </div>

        {/* ---------------- RIGHT: glass estimate ---------------- */}
        <aside className="lg:sticky lg:top-8 space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[30px] bg-white/75 backdrop-blur-xl border border-white shadow-[0_34px_80px_-30px_rgba(255,139,80,0.4)] overflow-hidden"
          >
            {/* header */}
            <div className="relative bg-gradient-to-br from-[#FFF3E9] via-[#FFF9F4] to-[#EAF6FF] px-6 py-5 overflow-hidden border-b border-[#FFD9C4]/50">
              <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-[#FF8B50]/20 blur-2xl pointer-events-none" />
              <div className="absolute -left-8 bottom-0 w-28 h-28 rounded-full bg-[#25A5FE]/15 blur-2xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[0.24em] text-[#E05A1A]">{t("liveEstimate")}</span>
                  <h3 className="itc-serif text-xl font-semibold mt-0.5 text-[#44403C]">{t("tripSummary")}</h3>
                </div>
                <span className="w-10 h-10 rounded-2xl bg-white/80 border border-[#FFD9C4] text-[#FF8B50] flex items-center justify-center shadow-sm"><DollarOutlined /></span>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-gradient-to-r from-[#FDF9F2] to-[#F5FAFF] border border-[#F0E7D8] p-3.5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B5AC9A]">{t("route")}</span>
                <div className="itc-scroll flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-[11px] font-bold text-[#5C5648]">
                  {inputs.destinations.map((d, i) => (
                    <React.Fragment key={d}>
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-[#F0E7D8] shadow-sm">{d}</span>
                      {i < inputs.destinations.length - 1 && <span className="text-[#FF8B50] shrink-0">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: t("travelers"), value: String(inputs.numberOfTravelers) },
                  { label: t("totalNights"), value: String(totalNights) },
                  { label: "Season", value: `×${SEASON_MULTIPLIERS[inputs.season].toFixed(2)}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white border border-[#F0E7D8] px-2 py-2.5 text-center shadow-sm">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-[#B5AC9A]">{s.label}</span>
                    <span className="block text-sm font-black text-[#44403C] mt-0.5">{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-dashed border-[#EAE2D2] space-y-2.5 text-xs font-semibold text-[#8A8577]">
                <div className="flex justify-between"><span>{t("baseCost", { duration: inputs.duration })}</span><BreakdownAmt value={pricing.baseCost} /></div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{t("hotelSurcharges", { nights: totalNights })}</span>
                    {pricing.hasRealHotelRates && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">{t("aiMatchedRate")}</span>}
                  </span>
                  <BreakdownAmt value={pricing.accommodationCost} />
                </div>
                <div className="flex justify-between"><span>{t("transportLogistics")}</span><BreakdownAmt value={pricing.transportCost} /></div>
                {pricing.baggageSurcharge > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between text-amber-500"><span>{t("baggageSurcharge")}</span><span className="font-bold tabular-nums">+{formatPrice(pricing.baggageSurcharge)}</span></motion.div>
                )}
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{t("destinationTickets", { count: inputs.destinations.length })}</span>
                    {pricing.hasRealPoiCosts && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">{t("aiMatchedRate")}</span>}
                  </span>
                  <BreakdownAmt value={pricing.destinationSurcharges + pricing.activityCost} />
                </div>
                {pricing.addOnsCost > 0 && <div className="flex justify-between"><span>{t("mealAddOns")}</span><BreakdownAmt value={pricing.addOnsCost} /></div>}
                <AnimatePresence>
                  {pricing.discount > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-emerald-500 overflow-hidden">
                      <span>{t("groupDiscount", { rate: (pricing.discountRate * 100).toFixed(0) })}</span><span className="font-bold tabular-nums">−{formatPrice(pricing.discount)}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-between"><span>{t("taxesFees")}</span><BreakdownAmt value={pricing.taxes} /></div>
              </div>

              <div className="mt-5 pt-5 border-t border-[#EAE2D2]">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#44403C]">{t("totalQuote")}</span>
                  <div className="text-right">
                    <span className="itc-serif text-[2.1rem] leading-none font-semibold text-[#E05A1A] tabular-nums">{formatPrice(animatedTotal)}</span>
                    <span className="text-[10px] text-[#B5AC9A] font-black uppercase ml-1.5">{currency}</span>
                  </div>
                </div>
                <div className="text-right text-[10px] font-bold text-[#B5AC9A] mt-1.5">≈ {formatPrice(perTraveler)} per traveler</div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#EAE2D2] space-y-4">
                <div>
                  <label className="itc-label flex items-center gap-1.5"><CalendarOutlined /> {t("departureDate")}</label>
                  <input type="date" min={todayStr} value={preferredStartDate} onChange={(e) => setPreferredStartDate(e.target.value)} className={`itc-input mt-1.5 ${errors.preferredStartDate ? "!border-rose-300" : ""}`} />
                  <AnimatePresence>
                    {errors.preferredStartDate && <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="block text-rose-500 text-[11px] font-bold mt-1.5">{errors.preferredStartDate}</motion.span>}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="itc-label">{t("travelerPreferences")}</label>
                  <textarea rows={3} placeholder={t("placeholderPreferences")} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className="itc-input mt-1.5 resize-none !py-3" />
                </div>

                {sessionStatus !== "authenticated" && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 text-[11px] font-semibold leading-relaxed">
                    <InfoCircleOutlined className="mt-0.5 shrink-0" /> {t("planningAsGuest")}
                  </div>
                )}

                <motion.button whileHover={isSubmitting ? {} : { y: -2 }} whileTap={{ scale: 0.98 }} type="button" onClick={handleSubmitBooking} disabled={isSubmitting} className={`itc-submit ${sessionStatus !== "authenticated" ? "!bg-gradient-to-r !from-amber-400 !to-amber-500" : ""}`}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2.5">
                      <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full inline-block" />
                      {t("savingQuote")}
                    </span>
                  ) : sessionStatus !== "authenticated" ? (
                    t("signInSubmit")
                  ) : (
                    <span className="flex items-center gap-2">{t("submitCustom")} <SendOutlined /></span>
                  )}
                </motion.button>

                <p className="text-center text-[9.5px] font-semibold text-[#B5AC9A] tracking-wide">No payment required today · Coordinator confirms slots & final pricing</p>
              </div>
            </div>
          </motion.section>
        </aside>
      </main>
    </div>
  );
}

function BreakdownAmt({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return <span className="text-[#44403C] font-bold tabular-nums">{`$${Math.round(v).toLocaleString()}`}</span>;
}

/* ================= scoped styles ================= */
const ITC_CSS = `
@import url('https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5.0.12/500.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5.0.12/600.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5.0.12/600-italic.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/400.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/500.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/600.css');
@import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/700.css');

.itc-root { font-family: 'Inter', system-ui, sans-serif; }
.itc-serif { font-family: 'Fraunces', Georgia, serif; }

.itc-glass {
  background: rgba(255,255,255,.66);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255,255,255,.75);
}

.itc-card {
  background: rgba(255,255,255,.86);
  backdrop-filter: blur(10px);
  border: 1px solid #F3EBDE;
  border-radius: 30px;
  padding: 26px;
  box-shadow: 0 1px 2px rgba(120,90,50,.05), 0 26px 60px -32px rgba(120,90,50,.25);
}
@media (min-width: 640px) { .itc-card { padding: 32px; } }

.itc-sec-head { display:flex; align-items:flex-start; gap:14px; padding-bottom:18px; margin-bottom:22px; border-bottom:1px solid #F3EBDE; }
.itc-step-no { font-family:'Fraunces',Georgia,serif; font-style:italic; font-weight:600; color:#FF8B50; font-size:15px; line-height:1.7; letter-spacing:.04em; }
.itc-sec-title { font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:20px; color:#44403C; letter-spacing:-.01em; line-height:1.25; }
.itc-sec-hint { font-size:11.5px; color:#8A8577; font-weight:500; margin-top:3px; }
.itc-sec-icon { margin-left:auto; align-self:center; font-size:17px; color:#FF8B50; background:rgba(255,139,80,.1); border:1px solid rgba(255,139,80,.22); width:40px; height:40px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex:none; }
.itc-sec-icon.sky { color:#25A5FE; background:rgba(37,165,254,.1); border-color:rgba(37,165,254,.22); }

.itc-label { display:block; font-size:10px; font-weight:800; color:#8A8577; text-transform:uppercase; letter-spacing:.16em; margin-bottom:2px; }
.itc-input {
  width:100%; padding:10px 14px; background:#fff; border:1.5px solid #F0E7D8; border-radius:12px;
  font-size:12.5px; font-weight:600; color:#44403C; outline:none; transition:all .2s; font-family:'Inter',sans-serif;
}
.itc-input::placeholder { color:#C4BCA9; font-weight:500; }
.itc-input:focus { border-color:#FF8B50; box-shadow:0 0 0 3px rgba(255,139,80,.16); }

.itc-gen-btn {
  width:100%; padding:15px; border:none; border-radius:16px; cursor:pointer;
  background:linear-gradient(100deg,#FF8B50,#FF6B2C 70%,#FF8B50);
  background-size:180% 100%;
  color:#fff; font-size:12px; font-weight:900; letter-spacing:.08em; text-transform:uppercase;
  display:flex; align-items:center; justify-content:center; transition:all .3s;
  box-shadow:0 16px 36px -14px rgba(255,139,80,.65);
  font-family:'Inter',sans-serif;
}
.itc-gen-btn:hover:not(:disabled) { transform:translateY(-2px); background-position:100% 0; box-shadow:0 22px 44px -14px rgba(255,139,80,.7); }
.itc-gen-btn:disabled { opacity:.65; cursor:not-allowed; }

.itc-btn-primary {
  display:inline-flex; align-items:center; justify-content:center;
  padding:14px 28px; border:none; border-radius:16px; cursor:pointer;
  background:linear-gradient(100deg,#FF8B50,#FF6B2C); color:#fff;
  font-size:12px; font-weight:900; letter-spacing:.1em; text-transform:uppercase;
  box-shadow:0 16px 36px -14px rgba(255,139,80,.6); transition:all .25s;
  font-family:'Inter',sans-serif;
}
.itc-btn-primary:hover { transform:translateY(-2px); }

.itc-submit {
  width:100%; padding:16px; border:none; border-radius:16px; cursor:pointer;
  background:linear-gradient(100deg,#FF8B50,#FF6B2C); color:#fff;
  font-size:12.5px; font-weight:900; letter-spacing:.06em; text-transform:uppercase;
  display:flex; align-items:center; justify-content:center; transition:all .25s;
  box-shadow:0 18px 40px -14px rgba(255,139,80,.6);
  font-family:'Inter',sans-serif; position:relative; overflow:hidden;
}
.itc-submit::before { content:""; position:absolute; inset:0; background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%); transform:translateX(-120%); transition:transform .7s; }
.itc-submit:hover:not(:disabled)::before { transform:translateX(120%); }
.itc-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 22px 46px -14px rgba(255,139,80,.65); }
.itc-submit:disabled { opacity:.65; cursor:not-allowed; }

/* leaflet pins */
.itc-pin-wrap { background:transparent; border:none; }
.itc-pin { position:relative; width:15px; height:15px; border-radius:9999px; background:#fff; border:2.5px solid #FF8B50; box-shadow:0 2px 8px rgba(255,107,44,.4); margin:7px; transition:transform .2s; }
.itc-pin:hover { transform:scale(1.25); }
.itc-pin.sel { width:30px; height:30px; margin:0; background:linear-gradient(135deg,#FF8B50,#FF6B2C); border:2.5px solid #fff; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; font-family:'Inter',sans-serif; box-shadow:0 4px 14px rgba(255,107,44,.5); }
.itc-pin-pulse { position:absolute; inset:-8px; border-radius:9999px; border:2px solid #FF8B50; opacity:.5; animation:itcPulse 2s ease-out infinite; pointer-events:none; }
@keyframes itcPulse { 0% { transform:scale(.5); opacity:.75; } 100% { transform:scale(1.35); opacity:0; } }

.itc-map .leaflet-container { font-family:'Inter',sans-serif; background:#E8F3FD; }
.itc-map .leaflet-popup-content-wrapper { border-radius:18px; box-shadow:0 20px 50px -18px rgba(120,90,50,.35); border:1px solid #F3EBDE; }
.itc-map .leaflet-popup-content { margin:12px; }
.itc-map .leaflet-popup-tip { background:#fff; }
.itc-map .leaflet-control-zoom { border:none !important; box-shadow:0 8px 24px -8px rgba(120,90,50,.3); border-radius:12px !important; overflow:hidden; }
.itc-map .leaflet-control-zoom a { color:#44403C !important; }

.itc-scroll::-webkit-scrollbar { height:5px; }
.itc-scroll::-webkit-scrollbar-track { background:transparent; }
.itc-scroll::-webkit-scrollbar-thumb { background:#F0E2CC; border-radius:99px; }

.itc-md p { margin:.4rem 0; }
.itc-md ul { padding-left:0; list-style:none; margin:.3rem 0; }
`;
