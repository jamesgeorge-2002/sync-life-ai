import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  X,
  Users,
  Clock,
  Trash,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { getMeetings, addMeeting, deleteMeeting, Meeting } from "@/lib/db";
import { generateCalendarOptimizeAI } from "@/lib/gemini";
import { toast } from "sonner";
import { ActionDispatchBar } from "@/components/action-dispatch-bar";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGateModal } from "@/components/premium-gate-modal";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

const hours = Array.from({ length: 12 }, (_, i) => 7 + i);

const presetColors = [
  { name: "Blue (Default / Work)", value: "bg-primary/20 text-primary border-l-2 border-primary" },
  { name: "Purple (Personal / Study)", value: "bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-500" },
  { name: "Green (Focus / Shopping)", value: "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500" },
  { name: "Rose (Urgent / Health)", value: "bg-rose-500/20 text-rose-400 border-l-2 border-rose-500" },
];

function CalendarPage() {
  const { user: authUser } = useAuth();
  const { isPremium } = usePremium();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [events, setEvents] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  // Live time tracking
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute dynamic days for current or offset week
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const distToMon = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const baseMonday = new Date(today);
    baseMonday.setDate(today.getDate() + distToMon + weekOffset * 7);

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      const dateNum = d.getDate();
      const monthShort = d.toLocaleDateString("en-US", { month: "short" });
      return {
        label: `${dayNames[i]} ${dateNum}`,
        fullTitle: `${fullNames[i]}, ${monthShort} ${dateNum}`,
        dayName: dayNames[i],
        dateNum,
        monthShort,
        isToday,
        dayIndex: i,
        isoDate: d.toISOString().split("T")[0],
      };
    });
  }, [weekOffset, now]);

  // AI Calendar Focus Planner state
  const [aiCalendarPlan, setAiCalendarPlan] = useState<string | null>(null);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);

  // New Event Form State
  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const currentHour = Math.max(7, Math.min(18, now.getHours()));

  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDay, setEventDay] = useState(currentDayIndex);
  const [eventStart, setEventStart] = useState(currentHour);
  const [eventEnd, setEventEnd] = useState(Math.min(19, currentHour + 1));
  const [eventPeopleInput, setEventPeopleInput] = useState("");
  const [eventColor, setEventColor] = useState(presetColors[0].value);

  const fetchEvents = async () => {
    if (!authUser) return;
    try {
      const list = await getMeetings(authUser.uid);
      setEvents(list);
    } catch (err) {
      console.error("Failed to load meetings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [authUser]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !eventTitle.trim()) return;

    const people = eventPeopleInput
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const startH = Number(eventStart);
    const endH = Number(eventEnd);
    const formatH = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`;
    const timeStr = `${formatH(startH)} - ${formatH(endH)}`;

    try {
      await addMeeting(authUser.uid, {
        title: eventTitle.trim(),
        time: timeStr,
        people: people.length > 0 ? people : ["Personal"],
        day: Number(eventDay),
        start: startH,
        end: endH,
        color: eventColor,
        date: weekDays[Number(eventDay)]?.isoDate,
      });

      setEventTitle("");
      setEventPeopleInput("");
      setIsNewEventOpen(false);
      fetchEvents();
      toast.success(`Scheduled "${eventTitle}" for ${weekDays[Number(eventDay)]?.fullTitle}!`);
    } catch (err) {
      console.error("Failed to add meeting event", err);
      toast.error("Failed to schedule event.");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteMeeting(authUser.uid, id);
      fetchEvents();
      toast.success("Event deleted");
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  const formattedLiveDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedLiveTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const weekRangeTitle = `${weekDays[0].monthShort} ${weekDays[0].dateNum} – ${weekDays[6].monthShort} ${weekDays[6].dateNum}`;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing calendar schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl relative">
      <PremiumGateModal
        open={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
        featureName="AI Schedule Planner & Focus Optimizer"
        onUpgraded={fetchEvents}
      />
      <PageHeader
        title="Calendar"
        description={`${formattedLiveDate} • ${formattedLiveTime} • Live schedule with AI conflict optimization.`}
        icon={<CalendarIcon className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={isAiOptimizing}
              onClick={async () => {
                if (!isPremium) {
                  setIsPremiumModalOpen(true);
                  return;
                }
                setIsAiOptimizing(true);
                try {
                  const eventStrList = events.map(
                    (e) => `${weekDays[e.day || 0]?.label || "Day"}: ${e.title} (${e.start}:00 - ${e.end}:00)`
                  );
                  const res = await generateCalendarOptimizeAI(eventStrList);
                  setAiCalendarPlan(res);
                  toast.success("AI Focus Block Schedule generated!");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsAiOptimizing(false);
                }
              }}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md text-xs font-semibold"
            >
              <Sparkles className={`mr-1.5 h-3.5 w-3.5 ${isAiOptimizing ? "animate-spin" : ""}`} />
              {isAiOptimizing ? "Optimizing..." : "AI Schedule Planner"}
            </Button>
            <Button
              className="rounded-full bg-gradient-primary cursor-pointer text-xs"
              onClick={() => {
                setEventDay(currentDayIndex);
                setEventStart(currentHour);
                setEventEnd(Math.min(19, currentHour + 1));
                setIsNewEventOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />Schedule Event
            </Button>
          </div>
        }
      />

      {/* Week Navigation Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl glass p-3.5 border border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-muted/40 p-1 border border-border/40">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                weekOffset === 0
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="text-sm font-bold text-foreground ml-1">{weekRangeTitle}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">{formattedLiveTime}</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">{events.length} Events Synced</span>
        </div>
      </div>

      {/* AI Calendar Plan Result Box */}
      {aiCalendarPlan && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-lg relative animate-in fade-in-0 duration-300">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">AI Deep Work & Focus Block Recommendations</h3>
            </div>
            <button onClick={() => setAiCalendarPlan(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground bg-background/50 p-3 rounded-xl border border-white/10">
            {aiCalendarPlan}
          </div>
          <div className="mt-3">
            <ActionDispatchBar
              text={aiCalendarPlan}
              sourceTitle="AI Calendar Focus Block Plan"
              contextType="tasks"
              onUpdated={fetchEvents}
              showShopping={true}
              showCalendar={true}
              showTasks={true}
              showExpense={true}
              showNote={true}
              showHabit={true}
            />
          </div>
        </div>
      )}

      {/* Dynamic Weekly Calendar Grid */}
      <div className="glass overflow-hidden rounded-2xl border border-border/60">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border/60 bg-muted/30 text-xs font-medium">
          <div className="p-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider text-center">
            Time
          </div>
          {weekDays.map((d) => (
            <div
              key={d.dayIndex}
              className={`p-3 text-center border-l border-border/40 transition-colors ${
                d.isToday
                  ? "bg-primary/10 text-primary font-bold shadow-inner"
                  : "text-muted-foreground"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wider opacity-80">{d.dayName}</span>
              <span className={`inline-block mt-0.5 text-sm ${d.isToday ? "h-6 w-6 rounded-full bg-primary text-primary-foreground leading-6 font-bold mx-auto" : "font-semibold"}`}>
                {d.dateNum}
              </span>
            </div>
          ))}
        </div>

        <div className="relative grid grid-cols-[64px_repeat(7,1fr)]">
          <div>
            {hours.map((h) => (
              <div key={h} className="h-16 border-b border-border/40 pr-2 text-right text-[10px] text-muted-foreground pt-1">
                {h % 12 || 12}:00 {h < 12 ? "AM" : "PM"}
              </div>
            ))}
          </div>

          {weekDays.map((d, di) => (
            <div
              key={di}
              className={`relative border-l border-border/40 ${
                d.isToday ? "bg-primary/[0.02]" : ""
              }`}
            >
              {hours.map((h) => (
                <div key={h} className="h-16 border-b border-border/40" />
              ))}
              {events
                .filter((e) => e.day === di && e.start !== undefined)
                .map((e, i) => {
                  const sNum = typeof e.start === "number" ? e.start : parseInt(String(e.start), 10) || 9;
                  const eNum = typeof e.end === "number" ? e.end : parseInt(String(e.end), 10) || sNum + 1;
                  const startOffset = (sNum - 7) * 64 + 4;
                  const heightVal = Math.max(32, (eNum - sNum) * 64 - 8);
                  return (
                    <div
                      key={i}
                      style={{ top: startOffset, height: heightVal }}
                      className={
                        "absolute left-1 right-1 rounded-xl p-2 text-[11px] font-medium group transition-all shadow-sm " +
                        (e.color || presetColors[0].value)
                      }
                    >
                      <div className="flex justify-between items-start">
                        <span className="truncate font-semibold">{e.title}</span>
                        <button
                          onClick={() => handleDeleteEvent(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-foreground hover:text-red-500 transition-opacity cursor-pointer p-0.5 rounded"
                          title="Delete Event"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[10px] opacity-80 mt-0.5 truncate">{e.time}</p>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Events List */}
      <section className="mt-6 glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Upcoming Events & Meetings
          </h2>
          <span className="text-xs text-muted-foreground">{events.length} Scheduled</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No meetings or events scheduled yet. Click "Schedule Event" or use AI Planner to add sessions.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {events.map((m) => (
              <li key={m.id} className="rounded-xl border border-border/50 p-3.5 flex justify-between items-start group hover:bg-muted/40 transition-colors">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <p className="text-sm font-semibold">{m.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {weekDays[m.day || 0]?.dayName || "Day"} • {m.time}
                  </p>
                  {m.people && m.people.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.people.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-bold">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteEvent(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer p-1"
                  title="Delete event"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* New Event Dialog Modal */}
      {isNewEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-white/10">
            <button
              onClick={() => setIsNewEventOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <CalendarIcon className="h-5 w-5 text-primary" /> Schedule New Event
            </h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Event Title</label>
                <Input
                  required
                  placeholder="e.g. Acme Kickoff, Gym Workout, Deep Focus"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Day of Week</label>
                  <select
                    value={eventDay}
                    onChange={(e) => setEventDay(Number(e.target.value))}
                    className="w-full mt-1 rounded-xl border border-border/60 bg-background px-3 h-9 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {weekDays.map((d) => (
                      <option key={d.dayIndex} value={d.dayIndex}>
                        {d.fullTitle} {d.isToday ? "(Today)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Color / Category</label>
                  <select
                    value={eventColor}
                    onChange={(e) => setEventColor(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border/60 bg-background px-3 h-9 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {presetColors.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
                  <select
                    value={eventStart}
                    onChange={(e) => {
                      const sVal = Number(e.target.value);
                      setEventStart(sVal);
                      if (eventEnd <= sVal) {
                        setEventEnd(Math.min(19, sVal + 1));
                      }
                    }}
                    className="w-full mt-1 rounded-xl border border-border/60 bg-background px-3 h-9 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>
                        {h % 12 || 12}:00 {h < 12 ? "AM" : "PM"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                  <select
                    value={eventEnd}
                    onChange={(e) => setEventEnd(Number(e.target.value))}
                    className="w-full mt-1 rounded-xl border border-border/60 bg-background px-3 h-9 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    {Array.from({ length: 13 }, (_, i) => 8 + i)
                      .filter((h) => h > eventStart)
                      .map((h) => (
                        <option key={h} value={h}>
                          {h % 12 || 12}:00 {h < 12 ? "AM" : "PM"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Attendees / Tags (comma separated)
                </label>
                <Input
                  placeholder="e.g. Team, Marketing, Personal, Client"
                  value={eventPeopleInput}
                  onChange={(e) => setEventPeopleInput(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewEventOpen(false)}
                  className="rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary text-xs font-semibold cursor-pointer shadow-md">
                  Schedule Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}