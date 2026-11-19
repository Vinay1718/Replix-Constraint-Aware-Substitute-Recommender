import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePreferences } from "../hooks/usePreferences";
import { preferenceService } from "../services";

// Loads the user's saved preferences after login; clears local ones on logout.
const PreferencesSync = () => {
  const { isAuthenticated } = useAuth();
  const { savePreferences, resetPreferences } = usePreferences();

  useEffect(() => {
    if (!isAuthenticated) { resetPreferences(); return; }
    let cancelled = false;
    preferenceService.get().then((saved) => { if (!cancelled && saved) savePreferences(saved); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, savePreferences, resetPreferences]);

  return null;
};
export default PreferencesSync;
