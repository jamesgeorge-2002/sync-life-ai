import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: any;
  updatedAt: any;
  role: "user" | "admin";
  seeded?: boolean;
  tier?: string;
  aiChatTimestamps?: string[];
  // Dashboard stats
  lifeBalance?: number;
  focusHours?: number;
  lifeScore?: number;
  wellnessScore?: number;
  aiActionsCount?: number;
  budgetTarget?: number;
  baseNetWorth?: number;
  twoFactorEnabled?: boolean;
  phoneNumber?: string;
}

export interface Task {
  id: string;
  title: string;
  time: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  list: string;
  date?: string;
  createdAt?: any;
  completedAt?: any;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tag: string;
  updated: string;
  updatedAt?: any;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  target: number;
  done: number;
  color: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  progress: number;
}

export interface Expense {
  id: string;
  name: string;
  cat: string;
  amount: number;
  date: string;
  createdAt?: any;
}

export interface Meeting {
  id: string;
  title: string;
  time?: string;
  people?: string[];
  date?: string;
  day?: number;
  start?: number | string;
  end?: number | string;
  duration?: string;
  type?: string;
  location?: string;
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  type: string;
}

export interface UserNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  tag: string;
  createdAt?: any;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  type: string;
  updated: string;
  fileData?: string;
  fileUrl?: string;
  createdAt?: any;
}

export interface HealthMetrics {
  water: string;
  waterPct: number;
  sleep: string;
  sleepPct: number;
  steps: string;
  stepsPct: number;
  heart: string;
  heartPct: number;
  // Vitals details
  restingHr?: string;
  sleepAvg?: string;
  stepsNum?: string;
  calories?: string;
  workout?: string;
  bedtime?: string;
  aiInsight?: string;
  sleepHistory?: { d: string; h: number }[];
  // Gadgetbridge open-source wearable integration
  gadgetbridgeDevice?: string;
  gadgetbridgeConnected?: boolean;
  gadgetbridgeLastSync?: string;
}

export interface MoodLog {
  id: string;
  week: string;
  mood: number;
  note?: string;
  tags?: string[];
  date?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: any;
}

export interface ProductivityLog {
  id: string;
  day: string;
  score: number;
  focus: number;
}

export interface AIRecommendation {
  title: string;
  text: string;
}

export interface Trip {
  id: string;
  city: string;
  dates: string;
  status: "Booked" | "Planning" | "Upcoming";
  flight: string;
  hotel: string;
  createdAt?: any;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  progress: number;
  next: string;
  createdAt?: any;
}

export interface ShoppingItem {
  id: string;
  item: string;
  qty: string;
  done: boolean;
  createdAt?: any;
}

export interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  createdAt?: any;
}

/**
 * Creates or updates a user document in the "users" collection.
 */
export async function createUserProfileDocument(uid: string, data: Partial<UserProfile>) {
  if (!uid) return null;

  const userRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const { email, displayName, photoURL } = data;
      const createdAt = serverTimestamp();

      await setDoc(userRef, {
        uid,
        email: email || "",
        displayName: displayName || "",
        photoURL: photoURL || "",
        createdAt,
        updatedAt: createdAt,
        role: "user",
        seeded: true,
        tier: "Free",
        aiChatTimestamps: [],
        lifeBalance: 0,
        focusHours: 0,
        lifeScore: 0,
        wellnessScore: 0,
        aiActionsCount: 0,
        budgetTarget: 0,
        baseNetWorth: 0,
      });
    }
  } catch (error) {
    console.error("Error creating user profile document:", error);
  }

  return userRef;
}

/**
 * Fetch a user profile document by uid.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  return null;
}

/**
 * Update an existing user profile document.
 */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  if (!uid) return;

  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile", error);
  }
}

/* ==========================================================================
   Tasks Collection Helpers (with Automated Daily Rollover & Purge)
   ========================================================================== */

/**
 * Checks if a task date string or timestamp is before today's start of day.
 */
export function isTaskFromPreviousDay(taskDate?: string, createdAt?: any): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  if (taskDate) {
    const parts = taskDate.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setHours(0, 0, 0, 0);
      if (!isNaN(d.getTime())) {
        return d.getTime() < todayStart;
      }
    }
  }

  if (createdAt) {
    let d: Date | null = null;
    if (typeof createdAt.toDate === "function") {
      d = createdAt.toDate();
    } else if (createdAt instanceof Date) {
      d = createdAt;
    } else if (typeof createdAt === "number" || typeof createdAt === "string") {
      d = new Date(createdAt);
    }

    if (d && !isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d.getTime() < todayStart;
    }
  }

  return false;
}

export async function getTasks(uid: string): Promise<Task[]> {
  const colRef = collection(db, "users", uid, "tasks");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  const rawList = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Task[];

  const toDeleteIds: string[] = [];
  const activeTasks: Task[] = [];

  for (const t of rawList) {
    const isPrevDay = isTaskFromPreviousDay(t.date, t.createdAt);

    if (t.done && isPrevDay) {
      // Completed on a previous day -> automatically clear & delete
      toDeleteIds.push(t.id);
    } else {
      // Unfinished task (rolled over from yesterday or earlier) OR task created today -> keep active
      activeTasks.push(t);
    }
  }

  // Asynchronously purge previous day completed tasks from Firestore in batch
  if (toDeleteIds.length > 0) {
    (async () => {
      try {
        const batch = writeBatch(db);
        toDeleteIds.forEach((id) => {
          batch.delete(doc(db, "users", uid, "tasks", id));
        });
        await batch.commit();
      } catch (err) {
        console.error("Error auto-purging previous day completed tasks:", err);
      }
    })();
  }

  return activeTasks;
}

export async function addTask(uid: string, task: Omit<Task, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "tasks");
  const todayStr = new Date().toISOString().split("T")[0];
  const docRef = await addDoc(colRef, {
    ...task,
    date: task.date || todayStr,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTask(uid: string, id: string, data: Partial<Task>): Promise<void> {
  const docRef = doc(db, "users", uid, "tasks", id);
  const updates: any = { ...data };
  if (data.done === true) {
    updates.completedAt = serverTimestamp();
  } else if (data.done === false) {
    updates.completedAt = null;
  }
  await updateDoc(docRef, updates);
}

export async function deleteTask(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "tasks", id);
  await deleteDoc(docRef);
}

export async function clearCompletedTasks(uid: string): Promise<number> {
  const colRef = collection(db, "users", uid, "tasks");
  const snap = await getDocs(colRef);
  const doneDocs = snap.docs.filter((d) => d.data().done === true);
  if (doneDocs.length === 0) return 0;

  const batch = writeBatch(db);
  doneDocs.forEach((d) => {
    batch.delete(doc(db, "users", uid, "tasks", d.id));
  });
  await batch.commit();
  return doneDocs.length;
}

/* ==========================================================================
   Notes Collection Helpers
   ========================================================================== */

export async function getNotes(uid: string): Promise<Note[]> {
  const colRef = collection(db, "users", uid, "notes");
  const q = query(colRef, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Note[];
}

export async function addNote(uid: string, note: Omit<Note, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "notes");
  const docRef = await addDoc(colRef, {
    ...note,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateNote(uid: string, id: string, data: Partial<Note>): Promise<void> {
  const docRef = doc(db, "users", uid, "notes", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNote(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "notes", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Habits Collection Helpers
   ========================================================================== */

export async function getHabits(uid: string): Promise<Habit[]> {
  const colRef = collection(db, "users", uid, "habits");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Habit[];
}

export async function addHabit(uid: string, habit: Omit<Habit, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "habits");
  const docRef = await addDoc(colRef, habit);
  return docRef.id;
}

export async function updateHabit(uid: string, id: string, data: Partial<Habit>): Promise<void> {
  const docRef = doc(db, "users", uid, "habits", id);
  await updateDoc(docRef, data);
}

export async function deleteHabit(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "habits", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Goals Collection Helpers
   ========================================================================== */

export async function getGoals(uid: string): Promise<Goal[]> {
  const colRef = collection(db, "users", uid, "goals");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Goal[];
}

export async function addGoal(uid: string, goal: Omit<Goal, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "goals");
  const docRef = await addDoc(colRef, goal);
  return docRef.id;
}

export async function updateGoal(uid: string, id: string, data: Partial<Goal>): Promise<void> {
  const docRef = doc(db, "users", uid, "goals", id);
  await updateDoc(docRef, data);
}

export async function deleteGoal(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "goals", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Expenses Collection Helpers
   ========================================================================== */

export async function getExpenses(uid: string): Promise<Expense[]> {
  const colRef = collection(db, "users", uid, "expenses");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Expense[];
}

export async function addExpense(uid: string, expense: Omit<Expense, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "expenses");
  const docRef = await addDoc(colRef, {
    ...expense,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteExpense(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "expenses", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Meetings Collection Helpers
   ========================================================================== */

export async function getMeetings(uid: string): Promise<Meeting[]> {
  const colRef = collection(db, "users", uid, "meetings");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Meeting[];
}

export async function addMeeting(uid: string, meeting: Omit<Meeting, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "meetings");
  const docRef = await addDoc(colRef, meeting);
  return docRef.id;
}

export async function deleteMeeting(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "meetings", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Contacts Collection Helpers
   ========================================================================== */

export async function getContacts(uid: string): Promise<Contact[]> {
  const colRef = collection(db, "users", uid, "contacts");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Contact[];
}

export async function addContact(uid: string, contact: Omit<Contact, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "contacts");
  const docRef = await addDoc(colRef, contact);
  return docRef.id;
}

export async function deleteContact(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "contacts", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Documents Collection Helpers
   ========================================================================== */

export async function getDocuments(uid: string): Promise<Document[]> {
  const colRef = collection(db, "users", uid, "documents");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Document[];
}

export async function addDocument(uid: string, document: Omit<Document, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "documents");
  const docRef = await addDoc(colRef, document);
  return docRef.id;
}

export async function deleteDocument(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "documents", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Health, Mood & Productivity Helpers
   ========================================================================== */

export async function getHealthMetrics(uid: string): Promise<HealthMetrics | null> {
  const docRef = doc(db, "users", uid, "health", "current");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as HealthMetrics;
  }
  return null;
}

export async function updateHealthMetrics(
  uid: string,
  data: Partial<HealthMetrics>,
): Promise<void> {
  const docRef = doc(db, "users", uid, "health", "current");
  await setDoc(docRef, data, { merge: true });
}

export async function getMoodLogs(uid: string): Promise<MoodLog[]> {
  const colRef = collection(db, "users", uid, "mood");
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as MoodLog[];
}

export async function addMoodLog(uid: string, moodLog: Omit<MoodLog, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "mood");
  const docRef = await addDoc(colRef, moodLog);
  return docRef.id;
}

export async function getMoodPatterns(uid: string): Promise<string[]> {
  const docRef = doc(db, "users", uid, "mood", "patterns");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().patterns as string[];
  }
  return [];
}

export async function getProductivityLogs(uid: string): Promise<ProductivityLog[]> {
  const colRef = collection(db, "users", uid, "productivity");
  const snap = await getDocs(colRef);
  const list = snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ProductivityLog[];
  // Sort properly if needed
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return list.sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
}

export async function getAIRecommendation(uid: string): Promise<AIRecommendation | null> {
  const docRef = doc(db, "users", uid, "recommendations", "today");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as AIRecommendation;
  }
  return null;
}

/* ==========================================================================
   Chat History Helpers
   ========================================================================== */

export async function getChatMessages(uid: string): Promise<ChatMessage[]> {
  const colRef = collection(db, "users", uid, "chat");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ChatMessage[];
}

export async function addChatMessage(uid: string, message: ChatMessage): Promise<string> {
  const colRef = collection(db, "users", uid, "chat");
  const docRef = await addDoc(colRef, {
    ...message,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function clearChatHistory(uid: string): Promise<void> {
  const colRef = collection(db, "users", uid, "chat");
  const snap = await getDocs(colRef);
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, "users", uid, "chat", docSnap.id));
  }
}

/* ==========================================================================
   Travel Collection Helpers
   ========================================================================== */

export async function getTrips(uid: string): Promise<Trip[]> {
  const colRef = collection(db, "users", uid, "trips");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Trip[];
}

export async function addTrip(uid: string, trip: Omit<Trip, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "trips");
  const docRef = await addDoc(colRef, {
    ...trip,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTrip(uid: string, id: string, data: Partial<Trip>): Promise<void> {
  const docRef = doc(db, "users", uid, "trips", id);
  await updateDoc(docRef, data);
}

export async function deleteTrip(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "trips", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Study Collection Helpers
   ========================================================================== */

export async function getCourses(uid: string): Promise<Course[]> {
  const colRef = collection(db, "users", uid, "courses");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Course[];
}

export async function addCourse(uid: string, course: Omit<Course, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "courses");
  const docRef = await addDoc(colRef, {
    ...course,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCourse(uid: string, id: string, data: Partial<Course>): Promise<void> {
  const docRef = doc(db, "users", uid, "courses", id);
  await updateDoc(docRef, data);
}

export async function deleteCourse(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "courses", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Shopping Collection Helpers
   ========================================================================== */

export async function getShoppingList(uid: string): Promise<ShoppingItem[]> {
  const colRef = collection(db, "users", uid, "shopping");
  const q = query(colRef, orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ShoppingItem[];
}

export async function addShoppingItem(
  uid: string,
  item: Omit<ShoppingItem, "id">,
): Promise<string> {
  const colRef = collection(db, "users", uid, "shopping");
  const docRef = await addDoc(colRef, {
    ...item,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function addShoppingItemsBatch(
  uid: string,
  items: Array<{ item: string; qty: string; done?: boolean }>,
): Promise<void> {
  if (!uid || items.length === 0) return;
  const colRef = collection(db, "users", uid, "shopping");
  const batch = writeBatch(db);
  for (const it of items) {
    const newDoc = doc(colRef);
    batch.set(newDoc, {
      item: it.item,
      qty: it.qty || "1",
      done: it.done || false,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function updateShoppingItem(
  uid: string,
  id: string,
  data: Partial<ShoppingItem>,
): Promise<void> {
  const docRef = doc(db, "users", uid, "shopping", id);
  await updateDoc(docRef, data);
}

export async function deleteShoppingItem(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "shopping", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Reports Collection Helpers
   ========================================================================== */

export async function getReports(uid: string): Promise<Report[]> {
  const colRef = collection(db, "users", uid, "reports");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Report[];
}

export async function addReport(uid: string, report: Omit<Report, "id">): Promise<string> {
  const colRef = collection(db, "users", uid, "reports");
  const docRef = await addDoc(colRef, {
    ...report,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteReport(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "reports", id);
  await deleteDoc(docRef);
}

/* ==========================================================================
   Database Seeding Helper (Mock Data Seeding for New Users)
   ========================================================================== */

export async function seedUserMockData(uid: string, force = false): Promise<boolean> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return false;
  }

  if (userSnap.data()?.seeded && !force) {
    return false;
  }

  console.log("Initializing baseline metrics and seeding transactions for user:", uid);

  // If force reset, clear all collections first
  if (force) {
    try {
      const expensesCol = collection(db, "users", uid, "expenses");
      const snap = await getDocs(expensesCol);
      const deleteBatch = writeBatch(db);
      snap.docs.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
      console.log("Cleared existing transactions for user:", uid);

      const meetingsCol = collection(db, "users", uid, "meetings");
      const meetingsSnap = await getDocs(meetingsCol);
      const deleteMeetingsBatch = writeBatch(db);
      meetingsSnap.docs.forEach((docSnap) => {
        deleteMeetingsBatch.delete(docSnap.ref);
      });
      await deleteMeetingsBatch.commit();
      console.log("Cleared existing meetings for user:", uid);

      const notificationsCol = collection(db, "users", uid, "notifications");
      const notificationsSnap = await getDocs(notificationsCol);
      const deleteNotificationsBatch = writeBatch(db);
      notificationsSnap.docs.forEach((docSnap) => {
        deleteNotificationsBatch.delete(docSnap.ref);
      });
      await deleteNotificationsBatch.commit();
      console.log("Cleared existing notifications for user:", uid);
    } catch (err) {
      console.error("Error clearing existing collections during reset:", err);
    }
  }

  const batch = writeBatch(db);

  // 1. Seed User Profile stats
  batch.update(userRef, {
    lifeBalance: 7.8,
    focusHours: 5.6,
    lifeScore: 8.4,
    wellnessScore: 7.9,
    aiActionsCount: 128,
    budgetTarget: 4200,
    baseNetWorth: 45000,
    seeded: true,
  });

  // 2. Seed Health Metrics
  const healthRef = doc(db, "users", uid, "health", "current");
  batch.set(healthRef, {
    water: "1.4 / 2 L",
    waterPct: 70,
    sleep: "7h 12m",
    sleepPct: 90,
    steps: "6,842 / 10k",
    stepsPct: 68,
    heart: "68 bpm",
    heartPct: 80,
    restingHr: "62 bpm",
    sleepAvg: "7.4h",
    stepsNum: "8,214",
    calories: "1,840 kcal · P 140g / C 210g / F 55g",
    workout: "Upper body — 55 min · 8 exercises",
    bedtime: "Bedtime target 10:45 PM",
    aiInsight: "Your vitals are stable. Consistent sleep and hydration are driving better athletic scores.",
    gadgetbridgeDevice: "Smartwatch / Fitness Tracker (Mi Band / Amazfit)",
    gadgetbridgeConnected: true,
    gadgetbridgeLastSync: "Just now",
    sleepHistory: [
      { d: "M", h: 7.2 },
      { d: "T", h: 6.8 },
      { d: "W", h: 7.5 },
      { d: "T", h: 8.1 },
      { d: "F", h: 6.4 },
      { d: "S", h: 9.0 },
      { d: "S", h: 7.9 },
    ],
  });

  // 3. Seed Expenses & Income spanning the last 6 months dynamically
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const dynamicExpenses = [
    // Month 0 (current month)
    { name: "Monthly Salary", cat: "Income", amount: 6300, offsetMonths: 0, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -150, offsetMonths: 0, day: 2 }, // wait! original budget had Spent $3000, let's keep total Spent around $3000
    { name: "Apartment Rent Contribution", cat: "Housing", amount: -1500, offsetMonths: 0, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -450, offsetMonths: 0, day: 5 },
    { name: "Electricity Bill", cat: "Housing", amount: -150, offsetMonths: 0, day: 10 },
    { name: "Gas & Transport", cat: "Transport", amount: -120, offsetMonths: 0, day: 12 },
    { name: "Dinner & Drinks", cat: "Fun", amount: -180, offsetMonths: 0, day: 15 },
    { name: "Health Insurance", cat: "Health", amount: -200, offsetMonths: 0, day: 18 },
    { name: "Online Shopping", cat: "Fun", amount: -400, offsetMonths: 0, day: 22 },

    // Month -1
    { name: "Monthly Salary", cat: "Income", amount: 6300, offsetMonths: 1, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -1500, offsetMonths: 1, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -480, offsetMonths: 1, day: 6 },
    { name: "Broadband Internet", cat: "Housing", amount: -80, offsetMonths: 1, day: 12 },
    { name: "Concert Ticket", cat: "Fun", amount: -150, offsetMonths: 1, day: 18 },
    { name: "Pharmacy", cat: "Health", amount: -45, offsetMonths: 1, day: 22 },
    { name: "Dinner Out", cat: "Fun", amount: -1845, offsetMonths: 1, day: 25 }, // total spent $4100 to match Oct expense

    // Month -2
    { name: "Monthly Salary", cat: "Income", amount: 5800, offsetMonths: 2, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -1500, offsetMonths: 2, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -420, offsetMonths: 2, day: 5 },
    { name: "Gas & Transport", cat: "Transport", amount: -110, offsetMonths: 2, day: 10 },
    { name: "New Running Shoes", cat: "Health", amount: -130, offsetMonths: 2, day: 15 },
    { name: "Gadgets Store", cat: "Fun", amount: -1740, offsetMonths: 2, day: 20 }, // total spent $3900 to match Sep expense

    // Month -3
    { name: "Monthly Salary", cat: "Income", amount: 6100, offsetMonths: 3, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -1500, offsetMonths: 3, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -460, offsetMonths: 3, day: 7 },
    { name: "Weekend Getaway", cat: "Fun", amount: -600, offsetMonths: 3, day: 15 },
    { name: "Shopping Mall", cat: "Fun", amount: -840, offsetMonths: 3, day: 20 }, // total spent $3400 to match Aug expense

    // Month -4
    { name: "Monthly Salary", cat: "Income", amount: 5400, offsetMonths: 4, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -1500, offsetMonths: 4, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -400, offsetMonths: 4, day: 5 },
    { name: "Streaming Services", cat: "Fun", amount: -50, offsetMonths: 4, day: 12 },
    { name: "Car Maintenance", cat: "Transport", amount: -1650, offsetMonths: 4, day: 15 }, // total spent $3600 to match Jul expense

    // Month -5
    { name: "Monthly Salary", cat: "Income", amount: 5400, offsetMonths: 5, day: 1 },
    { name: "Apartment Rent", cat: "Housing", amount: -1500, offsetMonths: 5, day: 2 },
    { name: "Grocery Store", cat: "Food", amount: -380, offsetMonths: 5, day: 8 },
    { name: "Dentist Appointment", cat: "Health", amount: -180, offsetMonths: 5, day: 14 },
    { name: "Fun Activities", cat: "Fun", amount: -1040, offsetMonths: 5, day: 20 }, // total spent $3100 to match Jun expense
  ];

  dynamicExpenses.forEach((item) => {
    const d = new Date();
    d.setMonth(d.getMonth() - item.offsetMonths);
    d.setDate(item.day);

    const expRef = doc(collection(db, "users", uid, "expenses"));
    batch.set(expRef, {
      name: item.name,
      cat: item.cat,
      amount: item.amount,
      date: formatDate(d),
      createdAt: d,
    });
  });

  // 4. Seed dynamic calendar events (meetings) starting within 1 hour
  const nowTime = new Date();
  const jsDay = nowTime.getDay();
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const currentHour = nowTime.getHours();
  const startHour = currentHour >= 23 ? 23 : currentHour + 1;
  const endHour = Math.min(24, startHour + 1);

  const meetingRef = doc(collection(db, "users", uid, "meetings"));
  batch.set(meetingRef, {
    title: "Project Standup",
    time: `${startHour % 12 || 12}:00 ${startHour < 12 ? "AM" : "PM"} - ${endHour % 12 || 12}:00 ${endHour < 12 ? "AM" : "PM"}`,
    people: ["Sarah", "John"],
    day: currentDayIndex,
    start: startHour,
    end: endHour,
    color: "bg-primary/20 text-primary",
  });

  // 5. Seed Tasks
  const defaultTasks = [
    { title: "Complete Q3 Strategic Plan Review", time: "10:00 AM", priority: "High", done: false, list: "Work" },
    { title: "Schedule annual wellness & heart health checkup", time: "02:00 PM", priority: "Medium", done: false, list: "Health" },
    { title: "Review AI RAG engine document index", time: "04:30 PM", priority: "High", done: true, list: "Projects" },
    { title: "Rebalance index fund portfolio", time: "06:00 PM", priority: "Low", done: false, list: "Finance" },
  ];
  defaultTasks.forEach((t) => {
    const taskRef = doc(collection(db, "users", uid, "tasks"));
    batch.set(taskRef, { ...t, createdAt: new Date() });
  });

  // 6. Seed Notes
  const defaultNotes = [
    { title: "Productivity Systems 2026", content: "Key focus: Deep work blocks (9am - 12pm). Minimize notifications, automate weekly reports via Gemini RAG.", tag: "Work", updated: "Today" },
    { title: "Health & Fitness Strategy", content: "Target 8,000+ daily steps via Gadgetbridge BLE sync. Hydrate 2L daily. Consistent sleep schedule.", tag: "Health", updated: "Yesterday" },
  ];
  defaultNotes.forEach((n) => {
    const noteRef = doc(collection(db, "users", uid, "notes"));
    batch.set(noteRef, { ...n, updatedAt: new Date() });
  });

  // 7. Seed Habits
  const defaultHabits = [
    { name: "Morning Meditation", streak: 12, target: 15, done: 1, color: "emerald" },
    { name: "Read 20 Pages", streak: 8, target: 10, done: 1, color: "blue" },
    { name: "10k Steps Daily", streak: 5, target: 7, done: 0, color: "amber" },
  ];
  defaultHabits.forEach((h) => {
    const habitRef = doc(collection(db, "users", uid, "habits"));
    batch.set(habitRef, h);
  });

  // 8. Seed Goals
  const defaultGoals = [
    { title: "Financial Freedom Fund", category: "Finance", progress: 75 },
    { title: "Marathon Preparation", category: "Health", progress: 60 },
    { title: "Master AI Engineering", category: "Career", progress: 85 },
  ];
  defaultGoals.forEach((g) => {
    const goalRef = doc(collection(db, "users", uid, "goals"));
    batch.set(goalRef, g);
  });

  // 9. Seed Trips
  const defaultTrips = [
    { city: "Tokyo & Kyoto, Japan", dates: "Nov 14 - Nov 22, 2026", status: "Booked", flight: "JL-062", hotel: "Grand Hyatt Tokyo" },
    { city: "Zurich, Switzerland", dates: "Dec 10 - Dec 18, 2026", status: "Planning", flight: "LX-018", hotel: "The Dolder Grand" },
  ];
  defaultTrips.forEach((trip) => {
    const tripRef = doc(collection(db, "users", uid, "trips"));
    batch.set(tripRef, { ...trip, createdAt: new Date() });
  });

  // 10. Seed Study Courses
  const defaultCourses = [
    { title: "Advanced AI & LLM Systems", subject: "Tech", progress: 80, next: "Lesson 7: RAG Vector Stores" },
    { title: "Financial Modeling & Valuations", subject: "Finance", progress: 55, next: "Module 4: DCF Analysis" },
  ];
  defaultCourses.forEach((course) => {
    const courseRef = doc(collection(db, "users", uid, "courses"));
    batch.set(courseRef, { ...course, createdAt: new Date() });
  });

  // 11. Seed Shopping Items
  const defaultShopping = [
    { item: "Ergonomic Standing Desk Chair", qty: "1 unit", done: false },
    { item: "High-protein Organic Snacks", qty: "2 packs", done: true },
    { item: "Noise-Canceling Headphones", qty: "1 pair", done: false },
  ];
  defaultShopping.forEach((s) => {
    const shopRef = doc(collection(db, "users", uid, "shopping"));
    batch.set(shopRef, { ...s, createdAt: new Date() });
  });

  // 12. Seed Document Vault Items
  const defaultDocs = [
    { name: "Health Insurance Policy 2026.pdf", size: "1.2 MB", type: "PDF", updated: "Today" },
    { name: "Identity & Passport Scan.pdf", size: "850 KB", type: "PDF", updated: "Yesterday" },
    { name: "Quarterly Investment Summary.pdf", size: "2.4 MB", type: "PDF", updated: "3 days ago" },
  ];
  defaultDocs.forEach((d) => {
    const docVaultRef = doc(collection(db, "users", uid, "documents"));
    batch.set(docVaultRef, { ...d, createdAt: new Date() });
  });

  // 13. Seed User Notifications
  const defaultNotifications = [
    { title: "Welcome to LIFE-SYNC AI!", description: "Your personalized lifestyle dashboard is ready.", time: "Just now", tag: "System" },
    { title: "Financial Goal Update", description: "Monthly expenses have been calculated from Oct metrics.", time: "2 hours ago", tag: "Finance" },
    { title: "AI Assistant Insight", description: "Vitals dashboard synced with standard wellness scores.", time: "5 hours ago", tag: "AI" },
  ];

  defaultNotifications.forEach((n, idx) => {
    const notifRef = doc(collection(db, "users", uid, "notifications"));
    const createdAtDate = new Date();
    createdAtDate.setMinutes(createdAtDate.getMinutes() - idx * 10);
    batch.set(notifRef, {
      title: n.title,
      description: n.description,
      time: n.time,
      tag: n.tag,
      createdAt: createdAtDate,
    });
  });

  await batch.commit();
  console.log("User workspace database initialized successfully with baseline metrics, mock transactions, tasks, notes, habits, goals, trips, courses, shopping, documents, and notifications.");
  return true;
}

export async function getNotifications(uid: string): Promise<UserNotification[]> {
  try {
    const colRef = collection(db, "users", uid, "notifications");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || "",
        description: data.description || "",
        time: data.time || "",
        tag: data.tag || "",
        createdAt: data.createdAt,
      } as UserNotification;
    });
  } catch (err) {
    console.error("Failed to get notifications", err);
    return [];
  }
}

export async function addNotification(
  uid: string,
  notification: Omit<UserNotification, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, "users", uid, "notifications");
  const docRef = await addDoc(colRef, {
    ...notification,
    createdAt: new Date(),
  });
  return docRef.id;
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  const docRef = doc(db, "users", uid, "notifications", id);
  await deleteDoc(docRef);
}

/**
 * Clears all personal data and subcollections for a user, resetting their account to a clean slate.
 */
export async function clearAllUserData(uid: string): Promise<boolean> {
  if (!uid) return false;

  const subcollections = [
    "expenses",
    "meetings",
    "tasks",
    "notes",
    "habits",
    "goals",
    "trips",
    "courses",
    "shopping",
    "documents",
    "notifications",
    "contacts",
    "mood",
    "productivity",
    "reports",
    "chat_messages",
  ];

  try {
    for (const sub of subcollections) {
      const colRef = collection(db, "users", uid, sub);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
    }

    // Delete health document
    const healthDoc = doc(db, "users", uid, "health", "current");
    await deleteDoc(healthDoc).catch(() => {});

    // Reset user profile stats to 0
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      seeded: true,
      lifeBalance: 0,
      focusHours: 0,
      lifeScore: 0,
      wellnessScore: 0,
      aiActionsCount: 0,
      budgetTarget: 0,
      baseNetWorth: 0,
      updatedAt: serverTimestamp(),
    });

    console.log("All personal workspace data cleared successfully for user:", uid);
    return true;
  } catch (err) {
    console.error("Error clearing user data:", err);
    throw err;
  }
}
