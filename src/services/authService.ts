import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}/auth/callback`,
    extraParams: { prompt: "select_account" },
  });
  return result;
}

export async function signOut() {
  return supabase.auth.signOut();
}
