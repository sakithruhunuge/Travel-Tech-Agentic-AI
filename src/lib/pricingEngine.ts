export interface SelectedRealPrices {
  hotelNightlyRateByDestination?: Record<string, number>;
  poiCostsUsd?: number[];
}

export interface PricingInputs {
  duration: number;
  numberOfTravelers: number;
  destinations: string[];
  hotelClass: "budget" | "standard" | "luxury" | "premium-boutique";
  transportMode: "self-drive" | "private-driver" | "first-class-train" | "charter-flight";
  season: "off-peak" | "shoulder" | "peak";
  activities: string[];
  extraNights: number;
  addOns: string[];
  baggageCount?: number;
  pricingMode?: "per-day" | "per-trip";
  selectedRealPrices?: SelectedRealPrices;
}

export interface PricingBreakdown {
  baseCost: number;
  accommodationCost: number;
  transportCost: number;
  baggageSurcharge: number;
  destinationSurcharges: number;
  activityCost: number;
  addOnsCost: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  taxes: number;
  totalPrice: number;
  hasRealHotelRates?: boolean;
  hasRealPoiCosts?: boolean;
}

export const HOTEL_RATES = {
  budget: 30, // $30 per night per traveler
  standard: 60, // $60 per night per traveler
  luxury: 120, // $120 per night per traveler
  "premium-boutique": 200, // $200 per night per traveler
};

export const HOTEL_LABELS = {
  budget: "Budget Fallback Hotel (+$30/night per traveler)",
  standard: "Standard Hotel (+$60/night per traveler)",
  luxury: "Luxury Hotel (+$120/night per traveler)",
  "premium-boutique": "Premium Boutique Villa (+$200/night per traveler)",
};

export const TRANSPORT_FLAT_DAILY = {
  "self-drive": 30,
  "private-driver": 75,
  "first-class-train": 0,
  "charter-flight": 0,
};

export const TRANSPORT_PER_PERSON_FLAT = {
  "self-drive": 0,
  "private-driver": 0,
  "first-class-train": 20,
  "charter-flight": 500,
};

export const TRANSPORT_LABELS = {
  "self-drive": "Self-Drive Car (+$30/day flat)",
  "private-driver": "Private Car & Local Driver (+$75/day flat)",
  "first-class-train": "First Class Observation Rail (+$20/traveler)",
  "charter-flight": "Helicopter / Charter Flight (+$500/traveler)",
};

export const BAGGAGE_RATE = 15; // $15 per extra bag beyond allowance
export const BAGGAGE_FREE_ALLOWANCE_PER_TRAVELER = 1;
export const BAGGAGE_LABEL = "Extra Baggage Handling (+$15/bag beyond 1 free bag per traveler)";

export const DESTINATION_SURCHARGES: Record<string, number> = {
  Sigiriya: 80,
  Galle: 80,
  "Nuwara Eliya": 80,
  Colombo: 40,
  Bentota: 40,
  Mirissa: 40,
  Kandy: 40,
  Yala: 60,
  Dambulla: 60,
  Ella: 60,
  Trincomalee: 70,
  Jaffna: 85,
  Anuradhapura: 60,
  Polonnaruwa: 60,
  "Arugam Bay": 75,
  Negombo: 35,
  Hikkaduwa: 40,
  Tangalle: 50,
  Udawalawe: 55,
  Pasikuda: 65,
  Wilpattu: 60,
  Weligama: 45,
  Unawatuna: 45,
  Matara: 45,
};

export const SEASON_MULTIPLIERS = {
  "off-peak": 0.85,
  shoulder: 1.05,
  peak: 1.25,
};

export const SEASON_LABELS = {
  "off-peak": "Off-Peak Season (0.85x Multiplier)",
  shoulder: "Shoulder Season (1.05x Multiplier)",
  peak: "Peak Season (1.25x Multiplier)",
};

export const ACTIVITY_RATES: Record<string, number> = {
  "yala-safari": 60,
  "surf-lessons": 40,
  "sigiriya-hike": 30,
  "cooking-class": 25,
};

export const ACTIVITY_LABELS = {
  "yala-safari": "Yala Wildlife Jeep Safari (+$60/traveler)",
  "surf-lessons": "Weligama Bay Surf Lesson (+$40/traveler)",
  "sigiriya-hike": "Guided Sunset Climb of Sigiriya (+$30/traveler)",
  "cooking-class": "Traditional Sri Lankan Cooking Class (+$25/traveler)",
};

export const ADDON_RATES: Record<string, number> = {
  breakfast: 15,
  dinner: 25,
  "airport-transfer": 40,
  guide: 30,
};

export const ADDON_LABELS = {
  breakfast: "Daily Gourmet Breakfast (+$15/day per traveler)",
  dinner: "Curated Dinner Experience (+$25/day per traveler)",
  "airport-transfer": "VIP Airport Transfer (+$40 flat)",
  guide: "Private Tour Guide (+$30/day)",
};

export function calculateTripPricing(inputs: PricingInputs): PricingBreakdown {
  const {
    duration,
    numberOfTravelers,
    destinations,
    hotelClass,
    transportMode,
    season,
    activities,
    extraNights,
    addOns,
    baggageCount = 0,
    pricingMode = "per-day",
    selectedRealPrices,
  } = inputs;

  const totalNights = Math.max(1, duration + extraNights);
  const seasonMultiplier = SEASON_MULTIPLIERS[season] || 1.0;

  // 1. Base Cost ($150 base per traveler)
  const baseCost = Math.round(150 * numberOfTravelers * seasonMultiplier);

  // 2. Accommodation Cost (Real Scraped Rate vs. Static Tier Estimate)
  const realHotelMap = selectedRealPrices?.hotelNightlyRateByDestination || {};
  const activeDests = destinations.length > 0 ? destinations : ["Colombo"];
  
  let accommodationCost = 0;
  let hasRealHotelRates = false;

  const baseNightsPerCity = Math.floor(totalNights / activeDests.length);
  const remNights = totalNights % activeDests.length;

  activeDests.forEach((dest, idx) => {
    const cityNights = baseNightsPerCity + (idx < remNights ? 1 : 0);
    const realRate = realHotelMap[dest];
    
    if (typeof realRate === "number" && realRate > 0) {
      hasRealHotelRates = true;
      accommodationCost += realRate * numberOfTravelers * cityNights * seasonMultiplier;
    } else {
      const fallbackRate = HOTEL_RATES[hotelClass] || HOTEL_RATES.standard;
      accommodationCost += fallbackRate * numberOfTravelers * cityNights * seasonMultiplier;
    }
  });

  accommodationCost = Math.round(accommodationCost);

  // 3. Transport Cost
  const dailyFlat = TRANSPORT_FLAT_DAILY[transportMode] || 0;
  const perPersonFlat = TRANSPORT_PER_PERSON_FLAT[transportMode] || 0;

  const transportCost = pricingMode === "per-trip"
    ? Math.round(dailyFlat + perPersonFlat * numberOfTravelers)
    : Math.round(dailyFlat * totalNights + perPersonFlat * numberOfTravelers);

  // 4. Baggage Surcharge
  const freeAllowance = numberOfTravelers * BAGGAGE_FREE_ALLOWANCE_PER_TRAVELER;
  const extraBags = Math.max(0, baggageCount - freeAllowance);
  const baggageSurcharge = extraBags * BAGGAGE_RATE;

  // 5. Destination Surcharges (Per traveler)
  let destinationSurcharges = 0;
  destinations.forEach((dest) => {
    const surcharge = DESTINATION_SURCHARGES[dest] || 40;
    destinationSurcharges += surcharge * numberOfTravelers;
  });
  destinationSurcharges = Math.round(destinationSurcharges);

  // 6. Activities & POI Ticket Costs
  let activityCost = 0;
  activities.forEach((act) => {
    const rate = ACTIVITY_RATES[act] || 0;
    activityCost += rate * numberOfTravelers;
  });

  let hasRealPoiCosts = false;
  if (selectedRealPrices?.poiCostsUsd && selectedRealPrices.poiCostsUsd.length > 0) {
    hasRealPoiCosts = true;
    const realPoiTotal = selectedRealPrices.poiCostsUsd.reduce((sum, cost) => sum + cost, 0);
    activityCost += realPoiTotal * numberOfTravelers;
  }
  activityCost = Math.round(activityCost);

  // 7. Add-Ons Cost
  let addOnsCost = 0;
  addOns.forEach((addon) => {
    if (addon === "breakfast" || addon === "dinner") {
      const rate = ADDON_RATES[addon] || 0;
      addOnsCost += rate * numberOfTravelers * totalNights;
    } else if (addon === "guide") {
      const rate = ADDON_RATES[addon] || 0;
      addOnsCost += rate * totalNights;
    } else if (addon === "airport-transfer") {
      const rate = ADDON_RATES[addon] || 0;
      addOnsCost += rate;
    }
  });
  addOnsCost = Math.round(addOnsCost);

  // 8. Subtotal
  const subtotal = Math.round(
    baseCost + accommodationCost + transportCost + baggageSurcharge + destinationSurcharges + activityCost + addOnsCost
  );

  // 9. Group Discount (10% off for 4+ travelers)
  let discountRate = 0;
  if (numberOfTravelers >= 4) {
    discountRate = 0.10;
  }
  const discount = Math.round(subtotal * discountRate);

  // 10. Taxes (12% on discounted subtotal)
  const taxableAmount = subtotal - discount;
  const taxes = Math.round(taxableAmount * 0.12);

  // 11. Grand Total Price
  const totalPrice = Math.round(taxableAmount + taxes);

  return {
    baseCost,
    accommodationCost,
    transportCost,
    baggageSurcharge,
    destinationSurcharges,
    activityCost,
    addOnsCost,
    subtotal,
    discountRate,
    discount,
    taxes,
    totalPrice,
    hasRealHotelRates,
    hasRealPoiCosts,
  };
}
