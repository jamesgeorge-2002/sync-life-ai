import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Calendar as CalendarIcon,
  CheckCircle2,
  DollarSign,
  FileText,
  Flame,
  Plus,
  Trash2,
  X,
  Clock,
  Sparkles,
  MapPin,
  Users,
  Tag,
  Check,
  Plane,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  addShoppingItemsBatch,
  addShoppingItem,
  addMeeting,
  addTask,
  addExpense,
  addNote,
  addHabit,
  addGoal,
  addTrip,
  addCourse,
} from "@/lib/db";
import {
  extractShoppingItems,
  extractCalendarSuggestion,
  extractTaskSuggestion,
  extractExpenseSuggestion,
  extractTripSuggestion,
  extractCourseSuggestion,
  ExtractedShoppingItem,
} from "@/lib/item-extractor";
import { toast } from "sonner";

export type ModalTab = "shopping" | "calendar" | "tasks" | "expenses" | "notes" | "habits" | "travel" | "study";

interface UniversalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: ModalTab;
  textContext?: string;
  contextType?: "shopping" | "health" | "assistant" | "travel" | "study" | "tasks" | "goals" | "habits" | "expenses" | "general";
  defaultTitle?: string;
  onSuccess?: () => void;
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const calendarColors = [
  { label: "Green (Shopping / Health)", value: "bg-emerald-500/20 text-emerald-600" },
  { label: "Blue (Travel / Work)", value: "bg-blue-500/20 text-blue-500" },
  { label: "Purple (Study / Personal)", value: "bg-indigo-500/20 text-indigo-500" },
  { label: "Rose (Doctor / Urgent)", value: "bg-rose-500/20 text-rose-500" },
  { label: "Amber (Focus / Tasks)", value: "bg-amber-500/20 text-amber-500" },
];

export function UniversalAddModal({
  isOpen,
  onClose,
  defaultTab,
  textContext = "",
  contextType = "general",
  defaultTitle,
  onSuccess,
}: UniversalAddModalProps) {
  const { user: authUser } = useAuth();
  
  // Smart default tab based on contextType if defaultTab is not provided
  const resolvedDefaultTab: ModalTab = defaultTab || (
    contextType === "travel" ? "travel" :
    contextType === "study" ? "study" :
    contextType === "shopping" ? "shopping" :
    contextType === "health" ? "calendar" :
    contextType === "expenses" ? "expenses" :
    contextType === "tasks" ? "tasks" :
    contextType === "habits" ? "habits" :
    "shopping"
  );

  const [activeTab, setActiveTab] = useState<ModalTab>(resolvedDefaultTab);

  // Shopping Items State
  const [shoppingItems, setShoppingItems] = useState<ExtractedShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [isSavingShopping, setIsSavingShopping] = useState(false);

  // Calendar State (Fix Time)
  const [calTitle, setCalTitle] = useState("");
  const [calDay, setCalDay] = useState(5); // Saturday default for shopping
  const [calStartHour, setCalStartHour] = useState(10);
  const [calEndHour, setCalEndHour] = useState(11);
  const [calLocation, setCalLocation] = useState("Supermarket / Home");
  const [calPeople, setCalPeople] = useState("Shopping & Prep");
  const [calColor, setCalColor] = useState(calendarColors[0].value);
  const [isSavingCal, setIsSavingCal] = useState(false);

  // Task State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskList, setTaskList] = useState("Shopping");
  const [taskPriority, setTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [taskTime, setTaskTime] = useState("This Weekend");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Expense State
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("50");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Note State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteTag, setNoteTag] = useState("General");
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Habit State
  const [habitName, setHabitName] = useState("");
  const [habitTarget, setHabitTarget] = useState(7);
  const [habitColor, setHabitColor] = useState("bg-emerald-500");
  const [isSavingHabit, setIsSavingHabit] = useState(false);

  // Travel Trip State
  const [tripCity, setTripCity] = useState("");
  const [tripDates, setTripDates] = useState("");
  const [tripStatus, setTripStatus] = useState<"Booked" | "Planning" | "Upcoming">("Planning");
  const [tripFlight, setTripFlight] = useState("Flight Planning");
  const [tripHotel, setTripHotel] = useState("Hotel Planning");
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  // Study Course State
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSubject, setCourseSubject] = useState("CS");
  const [courseProgress, setCourseProgress] = useState(0);
  const [courseNext, setCourseNext] = useState("");
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Populate data when modal opens or text changes
  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(resolvedDefaultTab);

    // 1. Extract Shopping Items
    const extracted = extractShoppingItems(textContext);
    if (extracted.length > 0) {
      setShoppingItems(extracted);
    } else {
      setShoppingItems([
        { id: "1", item: defaultTitle ? `Ingredients for ${defaultTitle}` : "Fresh Groceries", qty: "1 pack", checked: true },
      ]);
    }

    // 2. Extract Calendar Scheduling
    const calSugg = extractCalendarSuggestion(textContext, contextType, defaultTitle);
    setCalTitle(calSugg.title);
    setCalDay(calSugg.day);
    setCalStartHour(calSugg.start);
    setCalEndHour(calSugg.end);
    setCalLocation(calSugg.location || "Local");
    setCalPeople(calSugg.people?.[0] || "Personal");
    setCalColor(calSugg.color);

    // 3. Extract Tasks
    const taskSugg = extractTaskSuggestion(textContext, contextType, defaultTitle);
    setTaskTitle(taskSugg.title);
    setTaskList(taskSugg.list);
    setTaskPriority(taskSugg.priority);
    setTaskTime(taskSugg.time);

    // 4. Extract Expense
    const expSugg = extractExpenseSuggestion(textContext, contextType, defaultTitle);
    setExpenseName(expSugg.name);
    setExpenseAmount(expSugg.amount.toString());
    setExpenseCategory(expSugg.cat);
    setExpenseDate(expSugg.date);

    // 5. Note state
    const firstLine = textContext ? textContext.split("\n")[0].replace(/^#+\s*/, "").slice(0, 50) : "";
    setNoteTitle(defaultTitle || (firstLine ? `Summary: ${firstLine}` : "Saved Plan"));
    setNoteTag(contextType === "shopping" ? "Food" : contextType === "health" ? "Health" : contextType === "travel" ? "Travel" : contextType === "study" ? "Study" : "AI Assistant");
    setNoteContent(textContext);

    // 6. Habit state
    setHabitName(defaultTitle ? `Daily: ${defaultTitle}` : "Daily Wellness Habit");

    // 7. Travel Trip state
    const tripSugg = extractTripSuggestion(textContext, defaultTitle);
    setTripCity(tripSugg.city);
    setTripDates(tripSugg.dates);
    setTripStatus(tripSugg.status);
    setTripFlight(tripSugg.flight);
    setTripHotel(tripSugg.hotel);

    // 8. Study Course state
    const courseSugg = extractCourseSuggestion(textContext, defaultTitle);
    setCourseTitle(courseSugg.title);
    setCourseSubject(courseSugg.subject);
    setCourseProgress(courseSugg.progress);
    setCourseNext(courseSugg.next);
  }, [isOpen, textContext, defaultTab, contextType, defaultTitle]);

  if (!isOpen) return null;

  // Format Hour Helper
  const formatHour = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const displayH = h % 12 || 12;
    return `${displayH < 10 ? "0" + displayH : displayH}:00 ${period}`;
  };

  /* ---------------- Handlers ---------------- */

  // 1. Save Shopping Items Batch
  const handleSaveShoppingList = async () => {
    if (!authUser) return;
    const selected = shoppingItems.filter((i) => i.checked && i.item.trim().length > 0);
    if (selected.length === 0) {
      toast.error("Please select at least one item to add to the shopping list.");
      return;
    }

    setIsSavingShopping(true);
    try {
      await addShoppingItemsBatch(
        authUser.uid,
        selected.map((i) => ({
          item: i.item.trim(),
          qty: i.qty.trim() || "1",
          done: false,
        }))
      );
      toast.success(`Added ${selected.length} items to your Shopping List!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to batch add shopping items", err);
      toast.error("Failed to add items to shopping list.");
    } finally {
      setIsSavingShopping(false);
    }
  };

  // 2. Save Calendar Event with Fixed Time
  const handleSaveCalendarEvent = async () => {
    if (!authUser || !calTitle.trim()) {
      toast.error("Please provide an event title.");
      return;
    }

    setIsSavingCal(true);
    try {
      const timeStr = `${formatHour(calStartHour)} - ${formatHour(calEndHour)}`;
      await addMeeting(authUser.uid, {
        title: calTitle.trim(),
        day: Number(calDay),
        start: Number(calStartHour),
        end: Number(calEndHour),
        time: timeStr,
        location: calLocation.trim() || "Local",
        people: [calPeople.trim() || "Personal"],
        color: calColor,
      });

      toast.success(`Scheduled "${calTitle}" for ${dayNames[calDay]} at ${formatHour(calStartHour)}!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add calendar meeting", err);
      toast.error("Failed to schedule event in calendar.");
    } finally {
      setIsSavingCal(false);
    }
  };

  // 3. Save Task
  const handleSaveTask = async () => {
    if (!authUser || !taskTitle.trim()) return;
    setIsSavingTask(true);
    try {
      await addTask(authUser.uid, {
        title: taskTitle.trim(),
        list: taskList,
        priority: taskPriority,
        time: taskTime,
        done: false,
      });
      toast.success(`Task "${taskTitle}" added to ${taskList} list!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add task", err);
      toast.error("Failed to add task.");
    } finally {
      setIsSavingTask(false);
    }
  };

  // 4. Save Expense
  const handleSaveExpense = async () => {
    if (!authUser || !expenseName.trim()) return;
    setIsSavingExpense(true);
    try {
      await addExpense(authUser.uid, {
        name: expenseName.trim(),
        amount: parseFloat(expenseAmount) || 0,
        cat: expenseCategory,
        date: expenseDate,
      });
      toast.success(`Logged $${expenseAmount} expense for "${expenseName}"!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add expense", err);
      toast.error("Failed to save expense.");
    } finally {
      setIsSavingExpense(false);
    }
  };

  // 5. Save Note
  const handleSaveNote = async () => {
    if (!authUser || !noteTitle.trim()) return;
    setIsSavingNote(true);
    try {
      await addNote(authUser.uid, {
        title: noteTitle.trim(),
        content: noteContent || "",
        tag: noteTag,
        updated: "Just now",
      });
      toast.success(`Saved "${noteTitle}" to Notes!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add note", err);
      toast.error("Failed to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // 6. Save Habit
  const handleSaveHabit = async () => {
    if (!authUser || !habitName.trim()) return;
    setIsSavingHabit(true);
    try {
      await addHabit(authUser.uid, {
        name: habitName.trim(),
        streak: 0,
        target: Number(habitTarget) || 7,
        done: 0,
        color: habitColor,
      });
      toast.success(`Habit "${habitName}" added to tracker!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add habit", err);
      toast.error("Failed to save habit.");
    } finally {
      setIsSavingHabit(false);
    }
  };

  // 7. Save Travel Trip
  const handleSaveTrip = async () => {
    if (!authUser || !tripCity.trim()) {
      toast.error("Please enter a destination city.");
      return;
    }
    setIsSavingTrip(true);
    try {
      await addTrip(authUser.uid, {
        city: tripCity.trim(),
        dates: tripDates.trim() || "Upcoming",
        status: tripStatus,
        flight: tripFlight.trim() || "N/A",
        hotel: tripHotel.trim() || "N/A",
      });
      toast.success(`Trip to "${tripCity}" added to Travel page!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add trip", err);
      toast.error("Failed to add trip to travel page.");
    } finally {
      setIsSavingTrip(false);
    }
  };

  // 8. Save Study Course
  const handleSaveCourse = async () => {
    if (!authUser || !courseTitle.trim()) {
      toast.error("Please enter a course title.");
      return;
    }
    setIsSavingCourse(true);
    try {
      await addCourse(authUser.uid, {
        title: courseTitle.trim(),
        subject: courseSubject.trim() || "CS",
        progress: Number(courseProgress) || 0,
        next: courseNext.trim() || "Module 1",
      });
      toast.success(`Course "${courseTitle}" added to Study Hub!`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to add course", err);
      toast.error("Failed to save course.");
    } finally {
      setIsSavingCourse(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Sync to Concerned Module</h3>
              <p className="text-xs text-muted-foreground">
                Add directly to Travel, Study Hub, Shopping List, Calendar (fix time), Tasks, Expenses, Notes, or Habits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border/50 bg-background/50 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("travel")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "travel"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Plane className="h-3.5 w-3.5" />
            <span>Travel Trip</span>
          </button>

          <button
            onClick={() => setActiveTab("study")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "study"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Study Course</span>
          </button>

          <button
            onClick={() => setActiveTab("shopping")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "shopping"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Shopping List ({shoppingItems.filter((i) => i.checked).length})</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "calendar"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>Calendar & Fix Time</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "tasks"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab("expenses")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "expenses"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "notes"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Note</span>
          </button>

          <button
            onClick={() => setActiveTab("habits")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "habits"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Habit</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: SHOPPING LIST BATCH ADD */}
          {activeTab === "shopping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <ShoppingBag className="h-4 w-4 text-emerald-400" />
                    Review & Add Items to Shopping List
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Items & ingredients parsed from this plan. Select which ones you want to buy.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShoppingItems((prev) => prev.map((i) => ({ ...i, checked: true })))}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <button
                    onClick={() => setShoppingItems((prev) => prev.map((i) => ({ ...i, checked: false })))}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {shoppingItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
                      item.checked
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-muted/20 border-border/40 opacity-60"
                    }`}
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(c) => {
                        setShoppingItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, checked: Boolean(c) } : it))
                        );
                      }}
                      className="cursor-pointer"
                    />
                    <Input
                      value={item.item}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShoppingItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, item: val } : it))
                        );
                      }}
                      placeholder="Item name"
                      className="h-8 text-xs flex-1 bg-background/60"
                    />
                    <Input
                      value={item.qty}
                      onChange={(e) => {
                        const val = e.target.value;
                        setShoppingItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, qty: val } : it))
                        );
                      }}
                      placeholder="Qty (e.g. 500g, 2 pcs)"
                      className="h-8 text-xs w-28 bg-background/60"
                    />
                    <button
                      onClick={() => setShoppingItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Item Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="+ Add extra item to buy..."
                  className="h-8 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemName.trim()) {
                      e.preventDefault();
                      setShoppingItems((prev) => [
                        ...prev,
                        { id: `custom-${Date.now()}`, item: newItemName.trim(), qty: newItemQty.trim() || "1", checked: true },
                      ]);
                      setNewItemName("");
                      setNewItemQty("1");
                    }
                  }}
                />
                <Input
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="Qty"
                  className="h-8 text-xs w-24"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs rounded-lg cursor-pointer"
                  onClick={() => {
                    if (!newItemName.trim()) return;
                    setShoppingItems((prev) => [
                      ...prev,
                      { id: `custom-${Date.now()}`, item: newItemName.trim(), qty: newItemQty.trim() || "1", checked: true },
                    ]);
                    setNewItemName("");
                    setNewItemQty("1");
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Adding to <strong className="text-foreground font-semibold">Shopping List</strong> database
                </p>
                <Button
                  onClick={handleSaveShoppingList}
                  disabled={isSavingShopping || shoppingItems.filter((i) => i.checked).length === 0}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <ShoppingBag className="mr-1.5 h-4 w-4" />
                  {isSavingShopping
                    ? "Adding..."
                    : `Add ${shoppingItems.filter((i) => i.checked).length} Items to Shopping List`}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: CALENDAR WITH FIX TIME */}
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <CalendarIcon className="h-4 w-4 text-blue-400" />
                  Schedule Event & Fix Exact Time in Calendar
                </h4>
                <p className="text-xs text-muted-foreground">
                  Pick the day, starting time, duration, and details to lock this session on your weekly calendar schedule.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Event Title */}
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Event Title</label>
                  <Input
                    value={calTitle}
                    onChange={(e) => setCalTitle(e.target.value)}
                    placeholder="e.g. Grocery Shopping for Meal Prep, Cardio, Doctor Visit"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Day of Week Selector */}
                <div>
                  <label className="font-semibold text-foreground mb-1.5 block">Select Day of Week</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {dayNames.map((name, dIdx) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setCalDay(dIdx)}
                        className={`py-2 px-1 rounded-xl text-center font-medium transition-all cursor-pointer text-xs border ${
                          calDay === dIdx
                            ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold scale-[1.02]"
                            : "bg-muted/30 hover:bg-muted border-border/60 text-muted-foreground"
                        }`}
                      >
                        <span className="block text-[10px] uppercase tracking-wider">{name.slice(0, 3)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Range Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Start Time
                    </label>
                    <select
                      value={calStartHour}
                      onChange={(e) => {
                        const startVal = Number(e.target.value);
                        setCalStartHour(startVal);
                        if (calEndHour <= startVal) {
                          setCalEndHour(Math.min(23, startVal + 1));
                        }
                      }}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => 7 + i).map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" /> End Time
                    </label>
                    <select
                      value={calEndHour}
                      onChange={(e) => setCalEndHour(Number(e.target.value))}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => 8 + i)
                        .filter((h) => h > calStartHour)
                        .map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Location and Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location / Store
                    </label>
                    <Input
                      value={calLocation}
                      onChange={(e) => setCalLocation(e.target.value)}
                      placeholder="e.g. Whole Foods / Kitchen / Clinic"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Color Theme
                    </label>
                    <select
                      value={calColor}
                      onChange={(e) => setCalColor(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {calendarColors.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Scheduled for: <strong className="text-primary">{dayNames[calDay]} ({formatHour(calStartHour)} - {formatHour(calEndHour)})</strong>
                </p>
                <Button
                  onClick={handleSaveCalendarEvent}
                  disabled={isSavingCal || !calTitle.trim()}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <CalendarIcon className="mr-1.5 h-4 w-4" />
                  {isSavingCal ? "Scheduling..." : "Add to Calendar"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Add Action Item to Tasks
                </h4>
                <p className="text-xs text-muted-foreground">
                  Add concrete actionable steps to your Tasks database and priority kanban.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Task Description</label>
                  <Input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Buy ingredients for high-protein meal prep"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Category List</label>
                    <select
                      value={taskList}
                      onChange={(e) => setTaskList(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {["Shopping", "Health", "Personal", "Work", "Study", "Travel", "Projects"].map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="High">🔴 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🟢 Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Due Time</label>
                    <Input
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      placeholder="e.g. Today, This Weekend, Next Week"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Target list: <strong className="text-foreground">{taskList}</strong>
                </p>
                <Button
                  onClick={handleSaveTask}
                  disabled={isSavingTask || !taskTitle.trim()}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {isSavingTask ? "Saving..." : "Add to Tasks"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Log Planned Expense or Budget
                </h4>
                <p className="text-xs text-muted-foreground">
                  Record estimated costs (groceries, consultation, travel booking, courses) into your Expense tracker.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Expense Name</label>
                  <Input
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="e.g. Weekly Groceries for Meal Prep"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Amount ($)</label>
                    <Input
                      type="number"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="50"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Category</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      {["Food", "Health", "Shopping", "Travel", "Education", "Utilities", "Entertainment", "General"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Date</label>
                    <Input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Estimated budget: <strong className="text-emerald-500 font-bold">${expenseAmount || "0"}</strong>
                </p>
                <Button
                  onClick={handleSaveExpense}
                  disabled={isSavingExpense || !expenseName.trim()}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <DollarSign className="mr-1.5 h-4 w-4" />
                  {isSavingExpense ? "Saving..." : "Log Expense"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 5: NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Save as Document / Note
                </h4>
                <p className="text-xs text-muted-foreground">
                  Archive the entire plan and instructions into your permanent Notes vault.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-foreground mb-1 block">Note Title</label>
                    <Input
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Note title"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Category Tag</label>
                    <Input
                      value={noteTag}
                      onChange={(e) => setNoteTag(e.target.value)}
                      placeholder="Food, Health, Travel..."
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-foreground mb-1 block">Note Content</label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={6}
                    className="w-full rounded-2xl border border-border/60 bg-background/50 p-3 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none scrollbar-thin"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Tag: <strong className="text-foreground">{noteTag}</strong>
                </p>
                <Button
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !noteTitle.trim()}
                  className="rounded-full bg-purple-600 hover:bg-purple-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  {isSavingNote ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 6: HABITS */}
          {activeTab === "habits" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Flame className="h-4 w-4 text-rose-400" />
                  Track as Daily Routine / Habit
                </h4>
                <p className="text-xs text-muted-foreground">
                  Turn healthy suggestions (e.g. daily water, cooking meals, cardio, reading) into trackable streaks.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground mb-1 block">Habit Name</label>
                  <Input
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    placeholder="e.g. Prep Healthy High-Protein Lunch"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Weekly Target Days</label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={habitTarget}
                      onChange={(e) => setHabitTarget(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Color Theme</label>
                    <select
                      value={habitColor}
                      onChange={(e) => setHabitColor(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="bg-emerald-500">🟢 Emerald Green</option>
                      <option value="bg-blue-500">🔵 Sapphire Blue</option>
                      <option value="bg-purple-500">🟣 Purple</option>
                      <option value="bg-rose-500">🔴 Rose Red</option>
                      <option value="bg-amber-500">🟡 Amber</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Target: <strong className="text-foreground">{habitTarget} days/week</strong>
                </p>
                <Button
                  onClick={handleSaveHabit}
                  disabled={isSavingHabit || !habitName.trim()}
                  className="rounded-full bg-rose-600 hover:bg-rose-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <Flame className="mr-1.5 h-4 w-4" />
                  {isSavingHabit ? "Saving..." : "Add Habit"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 7: TRAVEL TRIP */}
          {activeTab === "travel" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <Plane className="h-4 w-4 text-blue-400" />
                  Save Itinerary to Travel Page
                </h4>
                <p className="text-xs text-muted-foreground">
                  Review and save this trip destination and details directly into your Travel cards.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">City & Country</label>
                    <Input
                      value={tripCity}
                      onChange={(e) => setTripCity(e.target.value)}
                      placeholder="e.g. Tokyo, Japan"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Trip Dates / Duration</label>
                    <Input
                      value={tripDates}
                      onChange={(e) => setTripDates(e.target.value)}
                      placeholder="e.g. Dec 12 – Dec 22 (3 Days)"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Status</label>
                    <select
                      value={tripStatus}
                      onChange={(e) => setTripStatus(e.target.value as any)}
                      className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option value="Planning">Planning</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Booked">Booked</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Flight / Transit</label>
                    <Input
                      value={tripFlight}
                      onChange={(e) => setTripFlight(e.target.value)}
                      placeholder="e.g. NH 007 / Flight Planning"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Hotel / Lodging</label>
                    <Input
                      value={tripHotel}
                      onChange={(e) => setTripHotel(e.target.value)}
                      placeholder="e.g. Park Hyatt / Hotel Planning"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Saving to <strong className="text-foreground">Travel Page</strong> trips collection
                </p>
                <Button
                  onClick={handleSaveTrip}
                  disabled={isSavingTrip || !tripCity.trim()}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <Plane className="mr-1.5 h-4 w-4" />
                  {isSavingTrip ? "Saving..." : "Add to Travel Page"}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 8: STUDY COURSE */}
          {activeTab === "study" && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-border/40">
                <h4 className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                  <GraduationCap className="h-4 w-4 text-indigo-400" />
                  Add Course to Study Hub
                </h4>
                <p className="text-xs text-muted-foreground">
                  Save this topic and roadmap as a tracked course in your Study Hub.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Course Title</label>
                    <Input
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder="e.g. Software Architecture & Design"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Subject / Category</label>
                    <Input
                      value={courseSubject}
                      onChange={(e) => setCourseSubject(e.target.value)}
                      placeholder="e.g. CS, AI, Math, Business"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Next Lesson / Milestone</label>
                    <Input
                      value={courseNext}
                      onChange={(e) => setCourseNext(e.target.value)}
                      placeholder="e.g. Module 1: Core Fundamentals"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-foreground mb-1 block">Initial Progress (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={courseProgress}
                      onChange={(e) => setCourseProgress(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  Saving to <strong className="text-foreground">Study Hub</strong>
                </p>
                <Button
                  onClick={handleSaveCourse}
                  disabled={isSavingCourse || !courseTitle.trim()}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer px-6 shadow-md text-xs font-semibold"
                >
                  <GraduationCap className="mr-1.5 h-4 w-4" />
                  {isSavingCourse ? "Saving..." : "Add to Study Hub"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
