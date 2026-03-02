import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
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
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && !!identity,
    staleTime: 30_000,
  });

  // Fetch business data
  const { data: business } = useQuery<Business | null>({
    queryKey: ["business", userProfile?.businessId?.toString()],
    queryFn: async () => {
      if (!actor || !userProfile?.businessId) return null;
      return actor.getBusiness(userProfile.businessId);
    },
    enabled: !!actor && !!userProfile?.businessId,
    staleTime: 30_000,
  });

  // When identity is lost (logout), immediately clear cached profile/business
  useEffect(() => {
    if (!identity && !isInitializing) {
      queryClient.removeQueries({ queryKey: ["userProfile"] });
      queryClient.removeQueries({ queryKey: ["business"] });
      setView("splash");
    }
  }, [identity, isInitializing, queryClient]);

  // Determine view based on auth + profile state (only when authenticated)
  useEffect(() => {
    if (!identity || isInitializing || actorFetching) return;
    if (profileLoading) return;

    if (!userProfile) {
      // Authenticated but no profile — keep on splash for role selection
      setView("splash");
      return;
    }

    // Clear role hint — we now know role from backend
    localStorage.removeItem("syncra_role");
    if (userProfile.role === "owner") {
      setView("owner-dashboard");
    } else {
      setView("salesman-floor");
    }
  }, [identity, userProfile, profileLoading, isInitializing, actorFetching]);

  const refetch = useCallback(() => {
    void refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["business"] });
  }, [refetchProfile, queryClient]);

  const isLoadingProfile =
    isInitializing || actorFetching || (!!identity && profileLoading);

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
