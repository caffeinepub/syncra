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
      // Clear the timer but do NOT reset authTimedOut — resetting it
      // causes the timer to fire again on the next isInitializing flicker.
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
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

  // Track if profile has ever loaded (to distinguish first-load from background refetch)
  const profileEverLoadedRef = useRef(false);

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
        const result = await actor.getCallerUserProfile();
        profileEverLoadedRef.current = true;
        return result;
      } catch {
        profileEverLoadedRef.current = true;
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Suppress background-refetch flicker: only count as "loading" when it's
  // the very first fetch (profileLoading=true means no cached data yet).
  const profileIsFirstLoading = profileLoading && !profileEverLoadedRef.current;

  // bigint 0n is falsy — use explicit null/undefined check
  const businessId = userProfile?.businessId;
  const hasBusinessId = businessId !== undefined && businessId !== null;

  // Fetch business data
  const { data: business } = useQuery<Business | null>({
    queryKey: ["business", businessId?.toString()],
    queryFn: async () => {
      if (!actor || !hasBusinessId) return null;
      try {
        return await actor.getBusiness(businessId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && hasBusinessId,
    staleTime: 30_000,
    retry: 1,
  });

  // When identity is lost (logout), clear cached profile/business and saved role
  useEffect(() => {
    if (!identity && identityStable) {
      queryClient.removeQueries({ queryKey: ["userProfile"] });
      queryClient.removeQueries({ queryKey: ["business"] });
      localStorage.removeItem("syncra_role");
      setView("splash");
    }
  }, [identity, identityStable, queryClient]);

  // Track whether we've successfully resolved the profile at least once
  const profileResolvedRef = useRef(false);
  // Track last routed view to avoid redundant setView calls
  const lastRoutedViewRef = useRef<string | null>(null);

  // Determine view based on auth + profile state
  useEffect(() => {
    if (!identity) return;
    if (!identityStable) return;
    // Still fetching actor or profile for the first time — wait
    if (actorFetching || profileIsFirstLoading) return;

    if (userProfile) {
      // Profile confirmed — mark resolved and navigate
      profileResolvedRef.current = true;
      const targetView =
        userProfile.role === "owner" ? "owner-dashboard" : "salesman-floor";
      // Only call setView if we haven't already routed here — prevents re-render loops
      if (lastRoutedViewRef.current !== targetView) {
        lastRoutedViewRef.current = targetView;
        setView(targetView);
      }
    } else if (!profileResolvedRef.current) {
      // Profile query returned null and we've never resolved one —
      // this is a genuinely new user. Stay on splash for role selection.
      if (lastRoutedViewRef.current !== "splash") {
        lastRoutedViewRef.current = "splash";
        setView("splash");
      }
    }
    // If profileResolvedRef.current is true but userProfile is transiently null
    // (e.g., query re-fired), do NOT redirect back to splash.
  }, [
    identity,
    identityStable,
    userProfile,
    profileIsFirstLoading,
    actorFetching,
  ]);

  const refetch = useCallback(() => {
    void refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["business"] });
  }, [refetchProfile, queryClient]);

  // Only show loading when identity is confirmed but we're still fetching data for the FIRST time.
  // Background refetches (after profileEverLoadedRef is true) don't block the UI.
  // If auth is still initializing (but not timed out), show loading too — but never longer than 3s.
  const isLoadingProfile = identityStable
    ? !!identity && (actorFetching || profileIsFirstLoading)
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
