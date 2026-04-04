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
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AppView>("splash");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [theme, setThemeState] = useState<"dark" | "light">(
    () => (localStorage.getItem("syncra_theme") as "dark" | "light") ?? "dark",
  );

  // Apply theme class on mount and change
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("syncra_theme", theme);
  }, [theme]);

  const setTheme = (t: "dark" | "light") => setThemeState(t);

  // Hard 3-second timeout from FIRST mount — prevents infinite "initializing" loops
  const authTimeoutScheduledRef = useRef(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (authTimeoutScheduledRef.current) return;
    authTimeoutScheduledRef.current = true;
    const t = setTimeout(() => setAuthTimedOut(true), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const identityStable = !isInitializing || authTimedOut;

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

  const profileEverLoadedRef = useRef(false);

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

  const profileIsFirstLoading = profileLoading && !profileEverLoadedRef.current;

  const businessId = userProfile?.businessId;
  const hasBusinessId = businessId !== undefined && businessId !== null;

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

  useEffect(() => {
    if (!identity && identityStable) {
      queryClient.removeQueries({ queryKey: ["userProfile"] });
      queryClient.removeQueries({ queryKey: ["business"] });
      localStorage.removeItem("syncra_role");
      setView("splash");
    }
  }, [identity, identityStable, queryClient]);

  const profileResolvedRef = useRef(false);
  const lastRoutedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (!identity) return;
    if (!identityStable) return;
    if (actorFetching || profileIsFirstLoading) return;

    if (userProfile) {
      profileResolvedRef.current = true;
      const targetView =
        userProfile.role === "owner" ? "owner-dashboard" : "salesman-floor";
      if (lastRoutedViewRef.current !== targetView) {
        lastRoutedViewRef.current = targetView;
        setView(targetView);
      }
    } else if (!profileResolvedRef.current) {
      if (lastRoutedViewRef.current !== "splash") {
        lastRoutedViewRef.current = "splash";
        setView("splash");
      }
    }
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

  const isLoadingProfile = identityStable
    ? !!identity && (actorFetching || profileIsFirstLoading)
    : true;

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
        theme,
        setTheme,
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
