import { useQuery } from "@tanstack/react-query";
import { fetchAuthenticatedProfile } from "./use-profile-api";
import { queryKeys } from "@/common/lib/query-keys";

/** The currently authenticated user's profile. */
export function useProfile() {
  const query = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchAuthenticatedProfile,
  });
  return { profile: query.data ?? null, isLoading: query.isLoading };
}
