import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Plane, MapPin, Calendar, Plus, X, Trash, Sparkles, FileText, CheckCircle2, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getTrips, addTrip, deleteTrip, Trip } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateTravelItineraryAI } from "@/lib/gemini";
import { extractTripSuggestion } from "@/lib/item-extractor";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";

export const Route = createFileRoute("/app/travel")({ component: TravelPage });

function TravelPage() {
  const { user: authUser } = useAuth();
  const { isPremium, refreshProfile } = usePremium();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // AI Travel Itinerary state
  const [aiTravelPlan, setAiTravelPlan] = useState<string | null>(null);
  const [aiDestination, setAiDestination] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiPlannerModalOpen, setIsAiPlannerModalOpen] = useState(false);
  const [inputDestination, setInputDestination] = useState("Tokyo, Japan");
  const [inputDays, setInputDays] = useState(3);
  const [isAddingTripFromAI, setIsAddingTripFromAI] = useState(false);

  // New trip modal state
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [tripCity, setTripCity] = useState("");
  const [tripDates, setTripDates] = useState("");
  const [tripStatus, setTripStatus] = useState<"Booked" | "Planning" | "Upcoming">("Planning");
  const [tripFlight, setTripFlight] = useState("");
  const [tripHotel, setTripHotel] = useState("");

  const fetchTrips = async () => {
    if (!authUser) return;
    try {
      const list = await getTrips(authUser.uid);
      setTrips(list);
    } catch (err) {
      console.error("Failed to load trips", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [authUser]);

  const handleGenerateAiItinerary = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPremium) {
      setIsAiPlannerModalOpen(false);
      setPremiumModalOpen(true);
      return;
    }
    if (!inputDestination.trim()) return;

    const dest = inputDestination.trim();
    setAiDestination(dest);
    setIsAiGenerating(true);
    setIsAiPlannerModalOpen(false);

    try {
      const res = await generateTravelItineraryAI(dest, Number(inputDays) || 3);
      setAiTravelPlan(res);
      toast.success(`AI Travel Itinerary generated for "${dest}"!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate travel itinerary.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDirectAddAiTripToPage = async () => {
    if (!authUser || !aiTravelPlan) return;
    setIsAddingTripFromAI(true);
    try {
      const extracted = extractTripSuggestion(aiTravelPlan, aiDestination || inputDestination);
      await addTrip(authUser.uid, {
        city: extracted.city,
        dates: extracted.dates,
        status: extracted.status,
        flight: extracted.flight,
        hotel: extracted.hotel,
      });
      toast.success(`✈️ Trip to "${extracted.city}" added to Travel page!`);
      await fetchTrips();
    } catch (err) {
      console.error("Failed to add trip", err);
      toast.error("Failed to save trip to Travel page.");
    } finally {
      setIsAddingTripFromAI(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !tripCity.trim() || !tripDates.trim()) return;

    try {
      await addTrip(authUser.uid, {
        city: tripCity,
        dates: tripDates,
        status: tripStatus,
        flight: tripFlight || "N/A",
        hotel: tripHotel || "N/A",
      });
      setTripCity("");
      setTripDates("");
      setTripStatus("Planning");
      setTripFlight("");
      setTripHotel("");
      setIsNewTripOpen(false);
      fetchTrips();
    } catch (err) {
      console.error("Failed to create trip", err);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this trip itinerary?")) return;
    try {
      await deleteTrip(authUser.uid, id);
      fetchTrips();
    } catch (err) {
      console.error("Failed to delete trip", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing travel plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative">
      <PageHeader
        title="Travel"
        description="Itineraries, bookings and packing checklists."
        icon={<Plane className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              disabled={isAiGenerating}
              onClick={() => {
                if (!isPremium) {
                  setPremiumModalOpen(true);
                  return;
                }
                if (trips[0]?.city) setInputDestination(trips[0].city);
                setIsAiPlannerModalOpen(true);
              }}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md text-xs"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiGenerating ? "animate-spin" : ""}`} />
              {isAiGenerating ? "Generating..." : "AI Itinerary Planner"}
            </Button>
            <Button className="rounded-full bg-gradient-primary cursor-pointer text-xs" onClick={() => setIsNewTripOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />New trip
            </Button>
          </div>
        }
      />

      {/* AI Travel Plan Result Box */}
      {aiTravelPlan && (
        <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-500/20 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 grid place-items-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">AI Travel Itinerary & Packing Guide</h3>
                <p className="text-[11px] text-muted-foreground">
                  Destination: <span className="font-semibold text-blue-400">{aiDestination || inputDestination}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleDirectAddAiTripToPage}
                disabled={isAddingTripFromAI}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer text-xs font-semibold h-8 px-4 shadow-md flex items-center gap-1.5"
              >
                <Plane className="h-3.5 w-3.5" />
                <span>{isAddingTripFromAI ? "Adding..." : "+ Add to Travel Page"}</span>
              </Button>
              <button
                onClick={() => setAiTravelPlan(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-4 rounded-xl border border-white/10 max-h-96 overflow-y-auto scrollbar-thin">
            {aiTravelPlan}
          </div>

          <div className="mt-3">
            <ActionDispatchBar
              text={aiTravelPlan}
              sourceTitle={aiDestination ? `Trip to ${aiDestination}` : "AI Travel Itinerary"}
              contextType="travel"
              onUpdated={fetchTrips}
              showTrip={true}
              showShopping={true}
              showCalendar={true}
              showTasks={true}
              showExpense={true}
              showNote={true}
            />
          </div>
        </div>
      )}

      {/* Trips Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <div key={t.id} className="glass rounded-2xl overflow-hidden relative group border border-white/5 shadow-md">
            <div className="h-32 bg-gradient-primary relative" />
            <button
              onClick={() => handleDeleteTrip(t.id)}
              className="absolute right-4 top-4 text-white bg-black/45 backdrop-blur-md rounded-full p-2 hover:text-red-500 hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-white/10"
            >
              <Trash className="h-4 w-4" />
            </button>
            <div className="p-6">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                {t.status}
              </span>
              <h3 className="mt-2.5 text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {t.city}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {t.dates}
              </p>
              <p className="mt-3.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                Flight <span className="font-semibold text-foreground">{t.flight}</span> ·{" "}
                <span className="font-semibold text-foreground">{t.hotel}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Planner Modal */}
      {isAiPlannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-white/10">
            <button
              onClick={() => setIsAiPlannerModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 grid place-items-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">AI Travel Itinerary Planner</h3>
                <p className="text-xs text-muted-foreground">Generate comprehensive schedules, dining, & packing list.</p>
              </div>
            </div>

            <form onSubmit={handleGenerateAiItinerary} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Destination City & Country</label>
                <Input
                  required
                  placeholder="e.g. Tokyo, Japan / Paris, France / Bali, Indonesia"
                  value={inputDestination}
                  onChange={(e) => setInputDestination(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Trip Duration (Days)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setInputDays(d)}
                      className={`py-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer ${
                        inputDays === d
                          ? "bg-blue-600 text-white border-blue-500 shadow"
                          : "bg-muted/30 hover:bg-muted border-border/60 text-muted-foreground"
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAiPlannerModalOpen(false)}
                  className="rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!inputDestination.trim()}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-md"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Generate AI Itinerary
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Trip Overlay Modal */}
      {isNewTripOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsNewTripOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Plane className="h-5 w-5 text-primary" /> Create New Trip
            </h3>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">City & Country</label>
                <Input
                  required
                  placeholder="e.g. Tokyo, Japan"
                  value={tripCity}
                  onChange={(e) => setTripCity(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Dates</label>
                <Input
                  required
                  placeholder="e.g. Dec 12 – Dec 22"
                  value={tripDates}
                  onChange={(e) => setTripDates(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Status</label>
                  <select
                    value={tripStatus}
                    onChange={(e) => setTripStatus(e.target.value as any)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Booked">Booked</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Flight Details</label>
                  <Input
                    placeholder="e.g. NH 007"
                    value={tripFlight}
                    onChange={(e) => setTripFlight(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Hotel / Lodging</label>
                <Input
                  placeholder="e.g. Park Hyatt"
                  value={tripHotel}
                  onChange={(e) => setTripHotel(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsNewTripOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Create Trip
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Premium Gate Modal */}
      <PremiumGateModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="AI Travel Itinerary Planner"
        onUpgraded={() => {
          refreshProfile();
          fetchTrips();
        }}
      />
    </div>
  );
}