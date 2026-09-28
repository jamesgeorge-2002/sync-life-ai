import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Bell, Calendar, Wallet, Heart, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getMeetings, getNotifications, Meeting, UserNotification } from "@/lib/db";

export const Route = createFileRoute("/app/notifications")({ component: NotificationsPage });

function NotificationsPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dbNotifications, setDbNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        const [meetingsList, notificationsList] = await Promise.all([
          getMeetings(user.uid),
          getNotifications(user.uid),
        ]);
        setMeetings(meetingsList);
        setDbNotifications(notificationsList);
      } catch (err) {
        console.error("Failed to fetch notification data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  const getIconForTag = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "ai":
      case "sparkles":
        return Sparkles;
      case "finance":
      case "wallet":
        return Wallet;
      case "health":
      case "heart":
        return Heart;
      case "system":
      case "bell":
      case "reminder":
      default:
        return Bell;
    }
  };

  const getDynamicNotifications = () => {
    // Map database notifications to notification structure
    const list = dbNotifications.map((n) => ({
      i: getIconForTag(n.tag),
      t: n.title,
      d: n.description,
      tag: n.tag,
      timeLabel: n.time,
    }));
    
    // Process meetings starting in the next 1 hour
    const now = new Date();
    const jsDay = now.getDay();
    const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, ..., Sun=6
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    meetings.forEach((meeting) => {
      if (meeting.day === currentDayIndex && meeting.start !== undefined) {
        const startHour = typeof meeting.start === "number" ? meeting.start : parseInt(String(meeting.start), 10) || 9;
        const endHour = typeof meeting.end === "number" ? meeting.end : parseInt(String(meeting.end), 10) || (startHour + 1);
        const diffMinutes = (startHour * 60) - (currentHour * 60 + currentMinute);
        
        // If starting in less than 60 minutes
        if (diffMinutes > 0 && diffMinutes <= 60) {
          list.push({
            i: Calendar,
            t: `${meeting.title} starts in ${diffMinutes} minutes`,
            d: `${meeting.title} starts in ${diffMinutes} minutes`,
            tag: "Calendar",
            timeLabel: `${diffMinutes} min`,
          });
        } else if (diffMinutes <= 0 && (endHour * 60) > (currentHour * 60 + currentMinute)) {
          // If event is currently in progress
          list.push({
            i: Calendar,
            t: `${meeting.title} is in progress`,
            d: `${meeting.title} is currently in progress`,
            tag: "Calendar",
            timeLabel: "Now",
          });
        }
      }
    });

    return list;
  };

  const notifications = getDynamicNotifications();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" icon={<Bell className="h-5 w-5" />} description="Smart alerts, prioritized by AI." />
      {notifications.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
          No notifications at this time.
        </div>
      ) : (
        <ul className="glass rounded-2xl divide-y divide-border/50 p-2">
          {notifications.map((n, i) => (
            <li key={i} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <n.i className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.t}</p>
                <p className="text-xs text-muted-foreground">{n.tag} · {n.timeLabel}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}