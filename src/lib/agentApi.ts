/**
 * Unified Agentic AI Client
 * Connects to the FastAPI backend microservices for Agent 1, 2, 3, and 4.
 *
 * Contract:
 * - POST {NEXT_PUBLIC_AGENT_API_URL}/agent1/process
 * - POST {NEXT_PUBLIC_AGENT_API_URL}/agent2/search
 * - POST {NEXT_PUBLIC_AGENT_API_URL}/agent3/evaluate
 * - POST {NEXT_PUBLIC_AGENT_API_URL}/agent4/generate
 */

const DEFAULT_API_URL = "http://localhost:8000";

export function getAgentApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AGENT_API_URL?.trim().replace(/\/+$/, "") ||
    DEFAULT_API_URL
  );
}

/* ================= TYPES ================= */

export interface Agent1Request {
  message: string;
}

export interface Agent1Response {
  destination: string;
  duration: number;
  travellers: number;
  budget: number;
  interests: string[];
}

export interface Agent2Request {
  destination: string;
  duration: number;
  travellers: number;
  budget: number;
  interests: string[];
}

export interface RetrievedItem {
  id?: string | number;
  name: string;
  city?: string;
  destination?: string;
  type?: "hotel" | "attraction" | "restaurant" | "activity" | string;
  price?: number;
  avg_nightly_usd?: number;
  ticket_price_usd?: number;
  rating?: number;
  description?: string;
  primary_image?: string;
  [key: string]: unknown;
}

export interface Agent2Response {
  hotels: RetrievedItem[];
  attractions: RetrievedItem[];
  restaurants: RetrievedItem[];
  activities: RetrievedItem[];
}

export interface Agent3Request {
  requirements: Agent1Response;
  retrieved: Agent2Response;
}

export interface RankedItem {
  item: RetrievedItem;
  score: number;
  reasons: string[];
}

export interface Agent3Response {
  ranked: RankedItem[];
}

export interface Agent4Request {
  requirements: Agent1Response;
  ranked: RankedItem[];
}

export interface ItineraryDayItem {
  time?: string;
  title?: string;
  name?: string;
  type?: string;
  location?: string;
  city?: string;
  description?: string;
  cost?: number;
  reason?: string;
  [key: string]: unknown;
}

export interface ItineraryDay {
  day: number;
  title?: string;
  destination?: string;
  items: (string | ItineraryDayItem)[];
}

export interface Agent4Response {
  itinerary: ItineraryDay[];
  explanations: Record<string, unknown>;
}

export interface FullAgentPipelineResult {
  requirements: Agent1Response;
  retrieved: Agent2Response;
  ranked: RankedItem[];
  itinerary: ItineraryDay[];
  explanations: Record<string, unknown>;
  itineraryMarkdown: string;
  destinations: string[];
}

/* ================= ERROR HANDLING ================= */

export class AgentApiError extends Error {
  endpoint: string;
  status?: number;
  details?: unknown;

  constructor(message: string, endpoint: string, status?: number, details?: unknown) {
    super(message);
    this.name = "AgentApiError";
    this.endpoint = endpoint;
    this.status = status;
    this.details = details;
  }
}

/**
 * CORS-friendly fetch helper (credentials not required).
 */
async function postAgent<TRequest, TResponse>(
  endpointPath: string,
  body: TRequest,
  timeoutMs = 60000
): Promise<TResponse> {
  const baseUrl = getAgentApiBaseUrl();
  const url = `${baseUrl}${endpointPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit", // CORS-friendly, no cookies/credentials required
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData: unknown;
      try {
        errorData = await res.json();
      } catch {
        errorData = await res.text();
      }
      throw new AgentApiError(
        `Agent API error (${res.status}) on ${endpointPath}: ${
          typeof errorData === "object" && errorData && "detail" in errorData
            ? (errorData as { detail: string }).detail
            : res.statusText
        }`,
        endpointPath,
        res.status,
        errorData
      );
    }

    return (await res.json()) as TResponse;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof AgentApiError) {
      throw err;
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("AbortError") || (err as { name?: string }).name === "AbortError") {
      throw new AgentApiError(
        `Request to ${endpointPath} timed out after ${timeoutMs / 1000}s.`,
        endpointPath,
        504
      );
    }

    throw new AgentApiError(
      `Unable to connect to Agent API at ${baseUrl}${endpointPath}. Please ensure the FastAPI backend is running. (${errorMsg})`,
      endpointPath,
      503,
      err
    );
  }
}

/* ================= INDIVIDUAL AGENT CLIENTS ================= */

/**
 * Agent 1: Travel Intake & NLP Parser
 * Extracts structured constraints from user natural language prompt.
 */
export async function agent1Process(body: Agent1Request): Promise<Agent1Response> {
  return postAgent<Agent1Request, Agent1Response>("/agent1/process", body);
}

/**
 * Agent 2: Travel Research & Information Retrieval
 * Retrieves relevant hotels, attractions, restaurants, and activities based on extracted constraints.
 */
export async function agent2Search(body: Agent2Request): Promise<Agent2Response> {
  return postAgent<Agent2Request, Agent2Response>("/agent2/search", body);
}

/**
 * Agent 3: Personalization, Constraints & Feasibility Evaluator
 * Evaluates retrieved candidates against budget, distance, ratings, and ranks them with explainability reasons.
 */
export async function agent3Evaluate(body: Agent3Request): Promise<Agent3Response> {
  return postAgent<Agent3Request, Agent3Response>("/agent3/evaluate", body);
}

/**
 * Agent 4: Itinerary Synthesis & XAI Generator
 * Generates day-by-day itinerary and transparent reasoning explanations.
 */
export async function agent4Generate(body: Agent4Request): Promise<Agent4Response> {
  return postAgent<Agent4Request, Agent4Response>("/agent4/generate", body);
}

/* ================= MARKDOWN GENERATOR ================= */

/**
 * Formats structured Agent 4 output into rich Markdown for display in InteractiveTourCustomizer.
 */
export function formatAgentItineraryMarkdown(
  req: Agent1Response,
  ranked: RankedItem[],
  agent4: Agent4Response
): string {
  const destName = req.destination || "Sri Lanka";
  const duration = req.duration || (agent4.itinerary ? agent4.itinerary.length : 5);
  const travellers = req.travellers || 2;
  const budget = req.budget ? `$${req.budget.toLocaleString()}` : "Tailored";

  let md = `# 🏝️ Ceylon Travel Plan: ${destName} (${duration} Days)\n\n`;
  md += `**Travelers:** ${travellers} | **Budget:** ${budget} | **Interests:** ${
    req.interests && req.interests.length > 0 ? req.interests.join(", ") : "Scenic, Cultural, Wildlife"
  }\n\n`;

  md += `## 📍 Route Destinations\n`;
  md += `Selected Gateway & Loop: **${destName}**\n\n`;

  if (agent4.itinerary && agent4.itinerary.length > 0) {
    md += `## 🗓️ Day-by-Day Schedule\n\n`;
    agent4.itinerary.forEach((dayPlan) => {
      const dayTitle = dayPlan.title || (dayPlan.destination ? `Explore ${dayPlan.destination}` : `Day ${dayPlan.day} Highlights`);
      md += `### 🗓️ Day ${dayPlan.day}: ${dayTitle}\n`;
      if (Array.isArray(dayPlan.items)) {
        dayPlan.items.forEach((item) => {
          if (typeof item === "string") {
            md += `- ${item}\n`;
          } else if (item && typeof item === "object") {
            const name = item.title || item.name || "Activity";
            const time = item.time ? `**${item.time}** - ` : "";
            const desc = item.description ? ` (${item.description})` : "";
            md += `- ${time}${name}${desc}\n`;
            if (item.reason) {
              md += `  * 💡 Why This Was Chosen: ${item.reason}\n`;
            }
          }
        });
      }
      md += `\n`;
    });
  }

  if (ranked && ranked.length > 0) {
    md += `## 🏨 Curated Stays & Experiences\n\n`;
    const topRanked = ranked.slice(0, 6);
    topRanked.forEach((r) => {
      const itemName = r.item.name;
      const typeLabel = r.item.type ? `[${r.item.type.toUpperCase()}]` : "";
      const priceLabel = r.item.price || r.item.avg_nightly_usd ? ` - $${r.item.price || r.item.avg_nightly_usd}/night` : "";
      md += `### ${typeLabel} ${itemName}${priceLabel}\n`;
      if (r.reasons && r.reasons.length > 0) {
        md += `- 💡 Why This Was Chosen: ${r.reasons.join(" · ")}\n`;
      }
      if (r.item.description) {
        md += `- ${r.item.description}\n`;
      }
      md += `\n`;
    });
  }

  return md;
}

/* ================= STUB / LOCAL MOCK FALLBACK ================= */

/**
 * Creates realistic mock output adhering to the 4-agent contract.
 * Used for development testing or graceful offline fallback when the FastAPI server is not yet up.
 */
export function getMockAgentPipelineResult(message: string, durationHint = 5): FullAgentPipelineResult {
  const req: Agent1Response = {
    destination: "Colombo, Kandy, Sigiriya, Galle",
    duration: durationHint || 5,
    travellers: 2,
    budget: 1800,
    interests: ["Ancient Heritage", "Wildlife", "Scenic Tea Country", "Coastal Beaches"],
  };

  const retrieved: Agent2Response = {
    hotels: [
      { id: "h1", name: "Cinnamon Citadel Kandy", city: "Kandy", avg_nightly_usd: 110, rating: 4.8, description: "Riverfront retreat surrounded by tropical hills." },
      { id: "h2", name: "Water Garden Sigiriya", city: "Sigiriya", avg_nightly_usd: 160, rating: 4.9, description: "Luxury villas with panoramic views of the Lion Rock." },
      { id: "h3", name: "Fort Bazaar Galle", city: "Galle", avg_nightly_usd: 140, rating: 4.7, description: "Boutique merchant home in the heart of Galle Fort." },
    ],
    attractions: [
      { id: "a1", name: "Sigiriya Rock Citadel", city: "Sigiriya", ticket_price_usd: 36, rating: 4.9, description: "UNESCO 5th-century ancient citadel with royal water gardens." },
      { id: "a2", name: "Temple of the Sacred Tooth Relic", city: "Kandy", ticket_price_usd: 15, rating: 4.8, description: "Historic Buddhist temple housing the sacred tooth relic." },
      { id: "a3", name: "Galle Dutch Fort Ramparts", city: "Galle", ticket_price_usd: 0, rating: 4.8, description: "Colonial ramparts, lighthouse, and oceanfront promenade." },
    ],
    restaurants: [
      { id: "r1", name: "The Empire Cafe Kandy", city: "Kandy", price: 20, description: "Historic colonial cafe offering organic tea and local curries." },
      { id: "r2", name: "A Minute by Tuk Tuk Galle", city: "Galle", price: 30, description: "Oceanview dining inside the Dutch Hospital complex." },
    ],
    activities: [
      { id: "ac1", name: "Scenic Kandy to Nuwara Eliya Observation Train", city: "Kandy", ticket_price_usd: 25, description: "World-renowned mountain railway through tea estates." },
      { id: "ac2", name: "Minneriya Elephant Gathering Safari", city: "Sigiriya", ticket_price_usd: 65, description: "Jeep safari witnessing herds of wild Asian elephants." },
    ],
  };

  const ranked: RankedItem[] = [
    {
      item: retrieved.hotels[1],
      score: 0.95,
      reasons: ["Top-rated luxury stay within 15 minutes of Lion Rock", "Matches nature & tranquility interest"],
    },
    {
      item: retrieved.attractions[0],
      score: 0.98,
      reasons: ["Must-see UNESCO world heritage site", "Optimal morning climate for climbing"],
    },
    {
      item: retrieved.attractions[1],
      score: 0.92,
      reasons: ["Key cultural anchor in Kandy", "Aligns with heritage query"],
    },
    {
      item: retrieved.hotels[0],
      score: 0.89,
      reasons: ["Riverfront location with excellent guest satisfaction", "Balanced pricing"],
    },
    {
      item: retrieved.activities[1],
      score: 0.88,
      reasons: ["High elephant density during dry reservoir season", "Verified ethical tour provider"],
    },
    {
      item: retrieved.attractions[2],
      score: 0.86,
      reasons: ["Free exploration, sunset viewing over Indian Ocean", "Walkable historical site"],
    },
  ];

  const itinerary: ItineraryDay[] = [
    {
      day: 1,
      title: "Arrival in Colombo & Cultural Transition to Kandy",
      destination: "Colombo & Kandy",
      items: [
        { time: "09:00 AM", title: "Arrival at Bandaranaike Airport (CMB)", description: "Meet private driver escort" },
        { time: "01:30 PM", title: "Check-in at Cinnamon Citadel Kandy", description: "Freshen up with Mahaweli river views", reason: "Convenient access to Kandy city center" },
        { time: "04:30 PM", title: "Temple of the Sacred Tooth Relic", description: "Evening Pooja ceremony", reason: "Atmospheric evening drumming ceremony" },
      ],
    },
    {
      day: 2,
      title: "Ancient Citadel & Royal Gardens of Sigiriya",
      destination: "Sigiriya",
      items: [
        { time: "07:00 AM", title: "Sigiriya Lion Rock Citadel Hike", description: "Climb the 1,200 steps before the midday heat", reason: "Avoid crowds and peak sun exposure" },
        { time: "01:00 PM", title: "Lunch at Traditional Village Retreat", description: "Authentic clay-pot rice and curry" },
        { time: "03:30 PM", title: "Minneriya National Park Elephant Safari", description: "Open 4x4 jeep safari", reason: "Best wild elephant encounters in South Asia" },
      ],
    },
    {
      day: 3,
      title: "Tea Country Highlands & Waterfalls",
      destination: "Nuwara Eliya & Ella",
      items: [
        { time: "08:30 AM", title: "Scenic Hill Country Train Journey", description: "Iconic blue train through tea trails", reason: "Top scenic railway route worldwide" },
        { time: "02:00 PM", title: "Tea Factory Guided Tasting", description: "Learn orthodox processing and sample single-origin Pekoe" },
        { time: "05:00 PM", title: "Nine Arch Bridge Sunset Viewpoint", description: "Watch locomotives traverse the stone viaduct" },
      ],
    },
    {
      day: 4,
      title: "Southern Heritage & Ocean Breeze in Galle",
      destination: "Galle Fort",
      items: [
        { time: "10:00 AM", title: "Scenic Southern Coastal Drive", description: "En route views of stilt fishermen" },
        { time: "02:00 PM", title: "Check-in at Fort Bazaar Galle", description: "Boutique merchant stay" },
        { time: "05:00 PM", title: "Walking Tour of Galle Dutch Fort Ramparts", description: "Sunset over the Indian Ocean", reason: "Cobblestone charm and architectural preservation" },
      ],
    },
    {
      day: 5,
      title: "Coastal Relaxation & Airport Departure",
      destination: "Bentota / Colombo",
      items: [
        { time: "09:00 AM", title: "Bentota Golden Beach Stroll or River Safari", description: "Mangrove river exploration" },
        { time: "01:00 PM", title: "Colombo Souvenir & Ceylon Spice Shopping", description: "Artisan crafts at Barefoot or Laksala" },
        { time: "05:00 PM", title: "Transfer to Airport for Departure", description: "VIP private dropoff" },
      ],
    },
  ];

  const explanations = {
    intakeSummary: `Processed prompt "${message}": extracted 4 destinations, 5-day duration, and constraints.`,
    retrievalSummary: "Retrieved 3 hotels, 3 attractions, 2 dining venues, and 2 outdoor activities.",
    evaluationSummary: "Ranked candidates prioritizing cultural proximity, traveler safety, and high ratings.",
  };

  const itineraryMarkdown = formatAgentItineraryMarkdown(req, ranked, { itinerary, explanations });

  return {
    requirements: req,
    retrieved,
    ranked,
    itinerary,
    explanations,
    itineraryMarkdown,
    destinations: ["Colombo", "Kandy", "Sigiriya", "Galle"],
  };
}

/* ================= FULL PIPELINE ORCHESTRATOR ================= */

export type PipelineStepCallback = (step: 1 | 2 | 3 | 4, name: string) => void;

/**
 * Runs the complete 4-agent pipeline sequentially:
 * 1. POST /agent1/process
 * 2. POST /agent2/search
 * 3. POST /agent3/evaluate
 * 4. POST /agent4/generate
 *
 * If the backend is not running, and allowFallback is true, returns a high-fidelity mock response.
 */
export async function runMultiAgentPipeline(
  message: string,
  options?: {
    onProgress?: PipelineStepCallback;
    allowFallback?: boolean;
    durationHint?: number;
  }
): Promise<FullAgentPipelineResult> {
  const { onProgress, allowFallback = false, durationHint = 5 } = options || {};

  try {
    // Step 1: Agent 1 - Intake & NLP
    onProgress?.(1, "Intake Agent: Extracting travel constraints & parameters...");
    const req = await agent1Process({ message });

    // Step 2: Agent 2 - Information Retrieval
    onProgress?.(2, "Retrieval Agent: Searching hotels, attractions, & activities...");
    const retrieved = await agent2Search({
      destination: req.destination,
      duration: req.duration,
      travellers: req.travellers,
      budget: req.budget,
      interests: req.interests,
    });

    // Step 3: Agent 3 - Ranking & Feasibility Evaluation
    onProgress?.(3, "Evaluation Agent: Ranking recommendations & checking constraints...");
    const evalResult = await agent3Evaluate({
      requirements: req,
      retrieved,
    });

    // Step 4: Agent 4 - Itinerary Synthesis & Explanation
    onProgress?.(4, "Explainer Agent: Synthesizing day-by-day itinerary & XAI justifications...");
    const genResult = await agent4Generate({
      requirements: req,
      ranked: evalResult.ranked,
    });

    const itineraryMarkdown = formatAgentItineraryMarkdown(req, evalResult.ranked, genResult);

    // Extract destination list for map highlighting
    const parsedDests = req.destination
      .split(/[,;&|]/)
      .map((d) => d.trim())
      .filter(Boolean);

    return {
      requirements: req,
      retrieved,
      ranked: evalResult.ranked,
      itinerary: genResult.itinerary,
      explanations: genResult.explanations,
      itineraryMarkdown,
      destinations: parsedDests.length > 0 ? parsedDests : ["Colombo", "Kandy"],
    };
  } catch (err: unknown) {
    if (allowFallback) {
      console.warn("Backend unavailable, using local agent fallback pipeline:", err);
      return getMockAgentPipelineResult(message, durationHint);
    }
    throw err;
  }
}
