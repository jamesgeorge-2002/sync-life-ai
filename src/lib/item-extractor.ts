/**
 * Smart Extractor Utility
 * Parses AI-generated text, meal plans, health advice, itineraries, and study plans
 * into structured items for Shopping List, Calendar, Tasks, Expenses, Notes, and Habits.
 */

export interface ExtractedShoppingItem {
  id: string;
  item: string;
  qty: string;
  checked: boolean;
}

export interface ExtractedCalendarEvent {
  title: string;
  day: number; // 0 = Mon, 1 = Tue, ..., 6 = Sun
  start: number; // 7..23 (hour)
  end: number;
  timeStr: string;
  location?: string;
  people?: string[];
  color: string;
}

export interface ExtractedTask {
  title: string;
  time: string;
  priority: "High" | "Medium" | "Low";
  list: string;
}

export interface ExtractedExpense {
  name: string;
  amount: number;
  cat: string;
  date: string;
}

export interface ExtractedHabit {
  name: string;
  target: number;
  color: string;
}

/**
 * Extracts shopping and ingredient items from any markdown or AI text.
 */
export function extractShoppingItems(text: string): ExtractedShoppingItem[] {
  if (!text) return [];

  const lines = text.split("\n");
  const extracted: ExtractedShoppingItem[] = [];
  const seen = new Set<string>();

  let isInsideShoppingSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect section headers
    const lower = line.toLowerCase();
    if (
      lower.includes("grocery") ||
      lower.includes("shopping") ||
      lower.includes("ingredients") ||
      lower.includes("items to buy") ||
      lower.includes("packing list") ||
      lower.includes("materials") ||
      lower.includes("supplies")
    ) {
      isInsideShoppingSection = true;
      continue;
    }

    // Skip general markdown headers if they are purely section titles
    if (/^#{1,4}\s+/.test(line) && !line.includes(":") && !line.includes("-")) {
      if (!lower.includes("grocery") && !lower.includes("ingredient") && !lower.includes("shopping")) {
        // Leaving grocery section if a new unrelated major header starts
        if (lower.includes("instructions") || lower.includes("directions") || lower.includes("summary") || lower.includes("timeline")) {
          isInsideShoppingSection = false;
        }
      }
      continue;
    }

    // Check if line looks like a list item: `- `, `* `, `• `, `1. `, `[ ] `
    const isBullet = /^[-*•–—]\s+|^\d+[\.\)]\s+|^-?\s*\[[ xX]?\]\s+/.test(line);

    if (isBullet || isInsideShoppingSection) {
      // Clean leading bullet marks and bold formatting
      let cleanLine = line
        .replace(/^[-*•–—]\s+/, "")
        .replace(/^\d+[\.\)]\s+/, "")
        .replace(/^\[[ xX]?\]\s+/, "")
        .replace(/\*\*/g, "")
        .trim();

      // Skip lines that are obvious category labels (e.g. "Produce:", "Dairy & Proteins:")
      if (/^[A-Za-z\s&]+:$/.test(cleanLine) && cleanLine.length < 30) {
        continue;
      }

      if (cleanLine.length < 2 || cleanLine.startsWith("###") || cleanLine.startsWith("Phase ")) {
        continue;
      }

      // Parse item and quantity
      let item = cleanLine;
      let qty = "1";

      // Pattern 1: `Item: Quantity` or `Item - Quantity`
      if (cleanLine.includes(":") && !cleanLine.startsWith("http")) {
        const parts = cleanLine.split(":");
        if (parts.length === 2 && parts[0].length < 40) {
          item = parts[0].trim();
          qty = parts[1].trim() || "1";
        }
      } else if (cleanLine.includes(" - ") || cleanLine.includes(" — ")) {
        const parts = cleanLine.split(/\s+[-—]\s+/);
        if (parts.length === 2 && parts[0].length < 40) {
          item = parts[0].trim();
          qty = parts[1].trim() || "1";
        }
      } else if (/\(([^)]+)\)/.test(cleanLine)) {
        // Pattern 2: `Item (Quantity)`
        const match = cleanLine.match(/^([^(]+)\(([^)]+)\)/);
        if (match) {
          item = match[1].trim();
          qty = match[2].trim();
        }
      } else {
        // Pattern 3: `Quantity Item` (e.g. `2 cups Brown Rice`, `500g Chicken`, `3 Avocados`)
        const qtyMatch = cleanLine.match(/^(\d+(?:\.\d+)?(?:\s*(?:cups?|tbsp|tsp|g|kg|lbs?|oz|ml|l|pieces?|pcs?|packs?|cans?|bottles?|bunch|heads?))?)\s+(.+)$/i);
        if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
          qty = qtyMatch[1].trim();
          item = qtyMatch[2].trim();
        }
      }

      // Final cleanups
      item = item.replace(/^[-:,.\s]+|[-:,.\s]+$/g, "").trim();
      qty = qty.replace(/^[-:,.\s]+|[-:,.\s]+$/g, "").trim() || "1";

      // Discard long narrative sentences that are not grocery items
      if (item.length > 55 || item.split(" ").length > 8) {
        continue;
      }

      const key = item.toLowerCase();
      if (!seen.has(key) && item.length >= 2) {
        seen.add(key);
        extracted.push({
          id: `ext-${Date.now()}-${extracted.length}`,
          item,
          qty,
          checked: true,
        });
      }
    }
  }

  // Fallback defaults if text was narrative
  if (extracted.length === 0) {
    // Look for comma separated items in a sentence
    const match = text.match(/(?:buy|groceries|ingredients|shopping list|need)[:\s]+([^.\n]+)/i);
    if (match && match[1]) {
      const parts = match[1].split(/,| and /);
      for (const p of parts) {
        const trimmed = p.trim().replace(/\*\*/g, "");
        if (trimmed.length > 2 && trimmed.length < 40) {
          extracted.push({
            id: `ext-${Date.now()}-${extracted.length}`,
            item: trimmed,
            qty: "1",
            checked: true,
          });
        }
      }
    }
  }

  return extracted;
}

/**
 * Extracts smart calendar scheduling recommendations from text
 */
export function extractCalendarSuggestion(
  text: string,
  contextType: "shopping" | "health" | "assistant" | "travel" | "study" | "tasks" | "goals" | "habits" | "expenses" | "general" = "general",
  fallbackTitle?: string
): ExtractedCalendarEvent {
  const lower = (text || "").toLowerCase();
  const now = new Date();
  const todayDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 = Mon, 6 = Sun

  let title = fallbackTitle || "Scheduled Activity";
  let day = todayDay;
  let start = 10;
  let end = 11;
  let color = "bg-primary/20 text-primary";
  let location = "Local";
  let people = ["Personal"];

  if (contextType === "shopping" || lower.includes("grocery") || lower.includes("meal prep") || lower.includes("diet")) {
    title = fallbackTitle || "Grocery Shopping & Meal Prep";
    day = 5; // Saturday
    start = 10;
    end = 12;
    color = "bg-emerald-500/20 text-emerald-600";
    location = "Supermarket / Kitchen";
    people = ["Shopping & Cooking"];
  } else if (contextType === "health" || lower.includes("doctor") || lower.includes("symptom") || lower.includes("cardio") || lower.includes("workout")) {
    title = fallbackTitle || (lower.includes("doctor") || lower.includes("clinic") ? "Doctor / Health Checkup" : "Cardio & Fitness Session");
    day = 2; // Wednesday
    start = 9;
    end = 10;
    color = "bg-rose-500/20 text-rose-500";
    location = lower.includes("doctor") ? "Health Clinic" : "Gym / Outdoors";
    people = ["Wellness"];
  } else if (contextType === "study" || lower.includes("quiz") || lower.includes("exam") || lower.includes("course") || lower.includes("flashcard")) {
    title = fallbackTitle || "Deep Study & Flashcard Review";
    day = 1; // Tuesday
    start = 19;
    end = 21;
    color = "bg-indigo-500/20 text-indigo-500";
    location = "Study Desk / Library";
    people = ["Study Time"];
  } else if (contextType === "travel" || lower.includes("flight") || lower.includes("trip") || lower.includes("hotel") || lower.includes("itinerary")) {
    title = fallbackTitle || "Trip Departure & Exploration";
    day = 4; // Friday
    start = 8;
    end = 16;
    color = "bg-blue-500/20 text-blue-500";
    location = "Airport / Destination";
    people = ["Travel"];
  } else if (contextType === "tasks" || contextType === "goals" || contextType === "habits") {
    title = fallbackTitle || "Deep Work & Milestone Sprint";
    day = 0; // Monday
    start = 14;
    end = 16;
    color = "bg-amber-500/20 text-amber-500";
    location = "Workspace";
    people = ["Focus Block"];
  } else if (contextType === "expenses") {
    title = fallbackTitle || "Monthly Budget & Financial Audit";
    day = 6; // Sunday
    start = 17;
    end = 18;
    color = "bg-emerald-500/20 text-emerald-500";
    location = "Finance Dashboard";
    people = ["Finance Review"];
  }

  // Format time string
  const formatH = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const displayH = h % 12 || 12;
    return `${displayH < 10 ? "0" + displayH : displayH}:00 ${period}`;
  };

  return {
    title,
    day,
    start,
    end,
    timeStr: `${formatH(start)} - ${formatH(end)}`,
    location,
    people,
    color,
  };
}

/**
 * Extracts action tasks from text
 */
export function extractTaskSuggestion(
  text: string,
  contextType: string = "Personal",
  fallbackTitle?: string
): ExtractedTask {
  const lower = (text || "").toLowerCase();
  let list = "Personal";
  let priority: "High" | "Medium" | "Low" = "Medium";
  let time = "Today";

  if (contextType === "shopping" || lower.includes("grocery")) {
    list = "Shopping";
    time = "This Weekend";
  } else if (contextType === "health" || lower.includes("health") || lower.includes("doctor")) {
    list = "Health";
    priority = "High";
    time = "Today";
  } else if (contextType === "study" || lower.includes("study")) {
    list = "Study";
    time = "Tomorrow";
  } else if (contextType === "travel" || lower.includes("trip")) {
    list = "Travel";
    priority = "High";
    time = "Before Trip";
  } else if (contextType === "expenses" || lower.includes("budget")) {
    list = "Finance";
    time = "This Month";
  }

  const firstLine = text ? text.split("\n")[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(0, 60) : "";
  const title = fallbackTitle || (firstLine ? `Follow up: ${firstLine}` : "AI Recommended Action Step");

  return {
    title,
    time,
    priority,
    list,
  };
}

/**
 * Extracts expense suggestion
 */
export function extractExpenseSuggestion(
  text: string,
  contextType: string = "Food",
  fallbackName?: string
): ExtractedExpense {
  const lower = (text || "").toLowerCase();
  let cat = "Food";
  let amount = 45;
  let name = fallbackName || "AI Planned Purchase";

  if (contextType === "shopping" || lower.includes("meal") || lower.includes("grocery")) {
    cat = "Food";
    amount = 65;
    name = fallbackName || "Weekly Grocery Run for AI Meal Plan";
  } else if (contextType === "health" || lower.includes("health") || lower.includes("doctor")) {
    cat = "Health";
    amount = 50;
    name = fallbackName || "Health Consultation / Vitamins";
  } else if (contextType === "travel" || lower.includes("travel") || lower.includes("flight")) {
    cat = "Travel";
    amount = 250;
    name = fallbackName || "Trip Activity & Booking Expense";
  } else if (contextType === "study" || lower.includes("study") || lower.includes("course")) {
    cat = "Education";
    amount = 35;
    name = fallbackName || "Study Books & Exam Materials";
  }

  // Search for currency numbers in text
  const currencyMatch = text.match(/[\$€£₹]\s*(\d+(?:\.\d{2})?)/);
  if (currencyMatch && currencyMatch[1]) {
    amount = parseFloat(currencyMatch[1]);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return {
    name,
    amount,
    cat,
    date: todayStr,
  };
}

export interface ExtractedTrip {
  city: string;
  dates: string;
  status: "Booked" | "Planning" | "Upcoming";
  flight: string;
  hotel: string;
}

/**
 * Extracts travel trip details from itinerary text
 */
export function extractTripSuggestion(
  text: string,
  destinationQuery?: string
): ExtractedTrip {
  let city = (destinationQuery || "").replace(/^trip to:?\s*/i, "").replace(/^ai travel:?\s*/i, "").trim() || "Tokyo, Japan";
  let dates = "Upcoming (3 Days)";
  let status: "Booked" | "Planning" | "Upcoming" = "Planning";
  let flight = "Flight Planning";
  let hotel = "Hotel Planning";

  // Look for destination / city in title or text
  const destMatch = text.match(/(?:itinerary for|destination|trip to|explore|travel to)[:\s]+["']?([^.\n,#"'\n]+(?:,\s*[^.\n,#"'\n]+)?)["']?/i);
  if (destMatch && destMatch[1] && (!destinationQuery || city === "Tokyo, Japan")) {
    city = destMatch[1].replace(/[*#]/g, "").trim();
  }

  // Look for dates / duration
  const daysMatch = text.match(/(\d+[- ]day|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:\s*[-–]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* )?\d{1,2})?)/i);
  if (daysMatch && daysMatch[1]) {
    dates = daysMatch[1].trim();
  }

  // Look for flight details
  const flightMatch = text.match(/(?:flight|airline)[:\s]+([^\n.,#]+)/i);
  if (flightMatch && flightMatch[1]) {
    flight = flightMatch[1].replace(/[*#]/g, "").trim();
  }

  // Look for hotel / accommodation
  const hotelMatch = text.match(/(?:hotel|stay|accommodation|lodging)[:\s]+([^\n.,#]+)/i);
  if (hotelMatch && hotelMatch[1]) {
    hotel = hotelMatch[1].replace(/[*#]/g, "").trim();
  }

  return {
    city,
    dates,
    status,
    flight,
    hotel,
  };
}

export interface ExtractedCourse {
  title: string;
  subject: string;
  progress: number;
  next: string;
}

/**
 * Extracts course details from study text
 */
export function extractCourseSuggestion(text: string, fallbackTitle?: string): ExtractedCourse {
  let title = fallbackTitle || "Software Architecture & System Design";
  let subject = "Computer Science";
  let progress = 10;
  let next = "Module 1: Fundamentals & Core Concepts";

  const topicMatch = text.match(/(?:quiz|study guide|flashcards for|course|topic)[:\s]+([^\n.,#]+)/i);
  if (topicMatch && topicMatch[1]) {
    title = topicMatch[1].replace(/[*#]/g, "").trim();
  }

  return {
    title,
    subject,
    progress,
    next,
  };
}

