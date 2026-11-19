import { createContext, useCallback, useMemo, useState } from "react";
import { storage } from "../utils/storage";
import { STORAGE_KEYS } from "../utils/constants";

export const PreferencesContext = createContext(null);

// Hard constraints: maxBudget, sameCategoryOnly, organicOnly, dietaryRestrictions. Soft: preferredBrands.
export const DEFAULT_PREFERENCES = { maxBudget: null, sameCategoryOnly: true, organicOnly: false, dietaryRestrictions: [], preferredBrands: [] };

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => ({ ...DEFAULT_PREFERENCES, ...storage.get(STORAGE_KEYS.PREFERENCES, {}) }));

  const savePreferences = useCallback((next) => {
    const merged = { ...DEFAULT_PREFERENCES, ...next };
    storage.set(STORAGE_KEYS.PREFERENCES, merged);
    setPreferences(merged);
  }, []);
  const resetPreferences = useCallback(() => {
    storage.remove(STORAGE_KEYS.PREFERENCES);
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(() => ({ preferences, savePreferences, resetPreferences }), [preferences, savePreferences, resetPreferences]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};
