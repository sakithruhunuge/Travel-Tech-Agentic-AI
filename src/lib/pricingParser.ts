export interface PricingMetrics {
  baseCost: number;
  accommodationCost: number;
  transportCost: number;
  destinationSurcharges: number;
  activityCost: number;
  addOnsCost: number;
  customCharges: number;
  additionalTaxes: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  taxes: number;
  totalPrice: number;
  paymentStatus: "UNPAID" | "PAID";
}

const DEFAULT_METRICS: PricingMetrics = {
  baseCost: 0,
  accommodationCost: 0,
  transportCost: 0,
  destinationSurcharges: 0,
  activityCost: 0,
  addOnsCost: 0,
  customCharges: 0,
  additionalTaxes: 0,
  subtotal: 0,
  discountRate: 0,
  discount: 0,
  taxes: 0,
  totalPrice: 0,
  paymentStatus: "UNPAID",
};

/**
 * Parses the embedded json block and user notes out of specialRequests markdown.
 */
export function parseRequestPricing(markdown: string = ""): {
  metrics: PricingMetrics;
  notes: string;
  isCustomCalc: boolean;
} {
  const result = {
    metrics: { ...DEFAULT_METRICS },
    notes: markdown || "",
    isCustomCalc: false,
  };

  if (!markdown) return result;

  // 1. Search for JSON block match
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = markdown.match(jsonBlockRegex);

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      result.metrics = { ...DEFAULT_METRICS, ...parsed };
      result.isCustomCalc = true;

      // Extract the original user notes (removing the JSON block and headers)
      let cleanedNotes = markdown.replace(jsonBlockRegex, "").trim();
      cleanedNotes = cleanedNotes.replace(/### 🌟 Custom Calculator Specifications[\s\S]*?### 💵 Invoice Cost Breakdown[\s\S]*?(?=### 📝|$)/i, "");
      cleanedNotes = cleanedNotes.replace(/### 💵 Invoice Cost Breakdown[\s\S]*?(?=### 📝|$)/i, "");
      cleanedNotes = cleanedNotes.replace(/### 📝 Traveler Special Requests\s*/i, "");
      result.notes = cleanedNotes.trim();
      return result;
    } catch (e) {
      console.warn("Failed to parse embedded JSON pricing block:", e);
    }
  }

  // 2. Regex Fallback Parser for older Markdown formats
  const matchVal = (regex: RegExp) => {
    const m = markdown.match(regex);
    if (m && m[1]) {
      return parseFloat(m[1].replace(/,/g, ""));
    }
    return 0;
  };

  if (markdown.includes("Invoice Cost Breakdown") || markdown.includes("Invoice Breakdown")) {
    result.isCustomCalc = true;
    result.metrics.baseCost = matchVal(/Base Cost:\s*\$([0-9,]+)/i);
    result.metrics.accommodationCost = matchVal(/Accommodation Surcharge:\s*\$([0-9,]+)/i);
    result.metrics.transportCost = matchVal(/Transportation Cost:\s*\$([0-9,]+)/i);
    result.metrics.destinationSurcharges = matchVal(/Destination Tickets & Entry Surcharges:\s*\$([0-9,]+)/i);
    result.metrics.activityCost = matchVal(/Selected Excursions Cost:\s*\$([0-9,]+)/i);
    result.metrics.addOnsCost = matchVal(/Custom Add-ons Cost:\s*\$([0-9,]+)/i);
    result.metrics.customCharges = matchVal(/Custom Agency Fee:\s*\$([0-9,]+)/i);
    result.metrics.subtotal = matchVal(/Subtotal:\s*\$([0-9,]+)/i);
    result.metrics.discount = matchVal(/Group size discount:\s*-\$([0-9,]+)/i);
    result.metrics.taxes = matchVal(/Local Taxes & Fees.*:\s*\$([0-9,]+)/i);
    result.metrics.totalPrice = matchVal(/Grand Total:\s*\$([0-9,]+)/i);
    result.metrics.paymentStatus = markdown.includes("Payment Status: PAID") ? "PAID" : "UNPAID";

    // Clean human notes
    let cleaned = markdown;
    cleaned = cleaned.replace(/### 🌟 Custom Calculator Specifications[\s\S]*?### 💵 Invoice Cost Breakdown[\s\S]*?(?=### 📝|$)/i, "");
    cleaned = cleaned.replace(/### 💵 Invoice Cost Breakdown[\s\S]*?(?=### 📝|$)/i, "");
    cleaned = cleaned.replace(/### 📝 Traveler Special Requests\s*/i, "");
    result.notes = cleaned.trim();
  }

  return result;
}

/**
 * Re-calculates totals and formats the updated metrics + notes as markdown with an embedded JSON block.
 */
export function updateRequestPricing(
  markdown: string = "",
  updates: {
    customCharges?: number;
    additionalTaxes?: number;
    paymentStatus?: "UNPAID" | "PAID";
  }
): string {
  // Parse existing data
  const { metrics, notes } = parseRequestPricing(markdown);

  // Apply updates
  if (updates.customCharges !== undefined) {
    metrics.customCharges = Math.max(0, updates.customCharges);
  }
  if (updates.additionalTaxes !== undefined) {
    metrics.additionalTaxes = Math.max(0, updates.additionalTaxes);
  }
  if (updates.paymentStatus !== undefined) {
    metrics.paymentStatus = updates.paymentStatus;
  }

  // Recalculate Subtotal, Taxes, and Grand Total
  metrics.subtotal =
    metrics.baseCost +
    metrics.accommodationCost +
    metrics.transportCost +
    metrics.destinationSurcharges +
    metrics.activityCost +
    metrics.addOnsCost +
    metrics.customCharges;

  const taxableAmount = metrics.subtotal - metrics.discount;
  metrics.taxes = Math.round(taxableAmount * 0.12) + metrics.additionalTaxes;
  metrics.totalPrice = taxableAmount + metrics.taxes;

  // Format into Markdown (Visual Spec + Embedded JSON metadata block)
  const jsonBlock = `\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\``;

  // Reconstruct specifications in readable format
  const specText = markdown.match(/### 🌟 Custom Calculator Specifications[\s\S]*?(?=### 💵|$)/i);
  const specsSection = specText ? specText[0].trim() : "### 🌟 Custom Calculator Specifications\n- *Custom Itinerary*";

  const updatedPricingMarkdown = `${specsSection}

### 💵 Invoice Cost Breakdown
- **Base Cost**: $${metrics.baseCost.toLocaleString()}
- **Accommodation Surcharge**: $${metrics.accommodationCost.toLocaleString()}
- **Transportation Cost**: $${metrics.transportCost.toLocaleString()}
- **Destination Tickets & Entry Surcharges**: $${metrics.destinationSurcharges.toLocaleString()}
- **Selected Excursions Cost**: $${metrics.activityCost.toLocaleString()}
- **Custom Add-ons Cost**: $${metrics.addOnsCost.toLocaleString()}
- **Custom Agency Fee**: $${metrics.customCharges.toLocaleString()}
- **Subtotal**: $${metrics.subtotal.toLocaleString()}
- **Group size discount**: -$${metrics.discount.toLocaleString()}
- **Local Taxes & Fees (12% + $${metrics.additionalTaxes.toLocaleString()})**: $${metrics.taxes.toLocaleString()}
- **Grand Total**: $${metrics.totalPrice.toLocaleString()} USD
- **Payment Status**: ${metrics.paymentStatus}

### 📦 Metadata Store
${jsonBlock}`;

  return `${updatedPricingMarkdown}\n\n### 📝 Traveler Special Requests\n${notes || "None"}`;
}

export function parseSpecifications(markdown: string = ""): {
  duration?: string;
  extraNights?: string;
  destinations?: string;
  hotelTier?: string;
  transportMode?: string;
  season?: string;
  excursions?: string;
  addOns?: string;
} {
  const result: any = {};
  if (!markdown) return result;
  
  const specSection = markdown.match(/### 🌟 Custom Calculator Specifications([\s\S]*?)(?=### 💵|$)/i);
  if (!specSection) return result;
  
  const content = specSection[1];
  
  const matchVal = (key: string) => {
    // Regex matches the bold key followed by a colon and returns text up to the next bullet point or line break
    const regex = new RegExp(`-\\s*\\*\\*${key}\\*\\*:\\s*([^\\n\\r*-]+)`, 'i');
    const m = content.match(regex);
    return m ? m[1].trim() : undefined;
  };
  
  result.duration = matchVal("Duration");
  result.extraNights = matchVal("Extra Nights");
  result.destinations = matchVal("Selected Destinations");
  result.hotelTier = matchVal("Hotel Tier") || matchVal("Hotel");
  result.transportMode = matchVal("Transport Mode") || matchVal("Transport");
  result.season = matchVal("Travel Season") || matchVal("Season");
  result.excursions = matchVal("Custom Excursions") || matchVal("Excursions");
  result.addOns = matchVal("Selected Add-ons") || matchVal("Add-ons");
  
  return result;
}
