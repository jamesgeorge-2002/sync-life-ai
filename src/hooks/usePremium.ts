import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, UserProfile } from "@/lib/db";
import { isPremiumUser, getUserTier } from "@/lib/premium";

export function usePremium() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } catch (err) {
      console.error("Failed to load user profile in usePremium", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [user]);

  return {
    profile,
    isPremium: isPremiumUser(profile),
    tier: getUserTier(profile),
    loading,
    refreshProfile,
  };
}
