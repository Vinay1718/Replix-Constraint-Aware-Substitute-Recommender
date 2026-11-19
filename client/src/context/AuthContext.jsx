import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import authService from "../services/authService";
import { storage } from "../utils/storage";
import { AUTH_EVENTS, STORAGE_KEYS } from "../utils/constants";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => ({ user: storage.get(STORAGE_KEYS.USER), token: storage.get(STORAGE_KEYS.TOKEN) }));

  const startSession = useCallback(({ user, token }) => {
    storage.set(STORAGE_KEYS.USER, user);
    storage.set(STORAGE_KEYS.TOKEN, token);
    setSession({ user, token });
    return user;
  }, []);

  const login = useCallback(async (credentials) => startSession(await authService.login(credentials)), [startSession]);
  const register = useCallback(async (data) => startSession(await authService.register(data)), [startSession]);

  const logout = useCallback(() => {
    storage.remove(STORAGE_KEYS.USER);
    storage.remove(STORAGE_KEYS.TOKEN);
    setSession({ user: null, token: null });
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => { logout(); toast.error("Your session expired. Please log in again."); };
    window.addEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
    return () => window.removeEventListener(AUTH_EVENTS.UNAUTHORIZED, handleUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      isAuthenticated: Boolean(session.token && session.user),
      isAdmin: session.user?.role === "admin",
      login, register, logout,
    }),
    [session, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
