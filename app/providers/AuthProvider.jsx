"use client";

// app/providers/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getUser } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const requestVersion = useRef(0);

    const refreshUser = useCallback(async () => {
        const version = ++requestVersion.current;
        try {
            const fetchedUser = await getUser();

            if (!fetchedUser || fetchedUser.error) {
                if (version === requestVersion.current) setUser({
                    email: null,
                    verified: false,
                    plan: "free"
                })
            } else {
                if (version === requestVersion.current) setUser(fetchedUser);
                return fetchedUser;
            }
        } catch {
            // Navigation and the public overview must remain usable when the
            // account endpoint is temporarily unavailable.
            if (version === requestVersion.current) setUser({
                email: null,
                verified: false,
                plan: "free"
            })
        }
        return null;
    }, []);

    const isGuestUser = useMemo(() => {
        return user && user.email === null;
    }, [user]);

    const isFreeUser = useMemo(() => {
        return user && user.verified === true;
    }, [user])

    const isPaidUser = useMemo(() => {
        return user && user.plan === "premium";
    }, [user]);

    // Plus features are included in Pro
    const isPlusUser = useMemo(() => {
        return user && (user.plan === "plus" || user.plan === "premium");
    }, [user]);

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isGuestUser, isPaidUser, isPlusUser, refreshUser, isFreeUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
