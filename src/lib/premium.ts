import { UserProfile } from "./db";

/**
 * Checks if the current user profile has an active Premium, Pro, or Team subscription.
 */
export function isPremiumUser(profile: UserProfile | null | undefined): boolean {
  if (!profile || !profile.tier) return false;
  const tier = profile.tier.toLowerCase().trim();
  return tier === "pro" || tier === "team" || tier === "premium" || tier === "enterprise";
}

/**
 * Returns a standardized string of the user's tier.
 */
export function getUserTier(profile: UserProfile | null | undefined): "Free" | "Pro" | "Team" | "Premium" {
  if (!profile || !profile.tier) return "Free";
  const tier = profile.tier.toLowerCase().trim();
  if (tier === "team") return "Team";
  if (tier === "premium") return "Premium";
  if (tier === "pro") return "Pro";
  return "Free";
}
