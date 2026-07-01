import { useAuthContext } from "@/contexts/AuthContext";

export function useUser() {
  const { user, profile, status } = useAuthContext();
  return { user, profile, status };
}
