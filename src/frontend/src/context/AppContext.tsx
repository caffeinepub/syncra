import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Business, UserProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export type AppView =
  | "splash"
  | "owner-onboarding"
  | "salesman-activation"
  | "owner-dashboard"
  | "salesman-floor";

interface AppContextValue {
  view: AppView;
  setView: (v: AppView) => void;
  userProfile: UserProfile | null;
  business: Business | null;
  isLoadingProfile: boolean;
  refetchProfile: () => void;
  isOnline: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AppView>("splash");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // After 3 seconds we stop waiting for auth init regardless — prevents permanent hang
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInitializing && !authTimedOut) {
      authTimeoutRef.current = setTimeout(() => setAuthTimedOut(true), 3000);
    } else if (!isInitializing) {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      setAuthTimedOut(false);
    }
    return () => {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, [isInitializing, authTimedOut]);

  // Consider identity "stable" if auth is done OR we've timed out
  const identityStable = !isInitializing || authTimedOut;

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch user profile
  const {
    data: userProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useQuery<UserProfile | null>({
    queryKey: ["userProfile", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch business data
  const { data: business } = useQuery<Business | null>({
    queryKey: ["business", userProfile?.businessId?.toString()],
    queryFn: async () => {
      if (!actor || !userProfile?.businessId) return null;
      try {
        return await actor.getBusiness(userProfile.businessId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!userProfile?.businessId,
    staleTime: 30_000,
    retry: 1,
  });

  // When identity is lost (logout), clear cached profile/business
  useEffect(() => {
    if (!identity && identityStable) {
      queryClient.removeQueries({ queryKey: ["userProfile"] });
      queryClient.removeQueries({ queryKey: ["business"] });
      setView("splash");
    }
  }, [identity, identityStable, queryClient]);

  // Determine view based on auth + profile state
  useEffect(() => {
    if (!identity) return;
    if (!identityStable) return;
    // Still fetching actor or profile — wait
    if (actorFetching || profileLoading) return;

    if (!userProfile) {
      // Authenticated but no profile — stay on splash for role selection
      setView("splash");
      return;
    }

    localStorage.removeItem("syncra_role");
    if (userProfile.role === "owner") {
      setView("owner-dashboard");
    } else {
      setView("salesman-floor");
    }
  }, [identity, identityStable, userProfile, profileLoading, actorFetching]);

  const refetch = useCallback(() => {
    void refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["business"] });
  }, [refetchProfile, queryClient]);

  // Only show loading when identity is confirmed but we're still fetching data.
  // If auth is still initializing (but not timed out), show loading too — but never longer than 3s.
  const isLoadingProfile = identityStable
    ? !!identity && (actorFetching || profileLoading)
    : true; // still in first-time auth init window

  return (
    <AppContext.Provider
      value={{
        view,
        setView,
        userProfile: userProfile ?? null,
        business: business ?? null,
        isLoadingProfile,
        refetchProfile: refetch,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
