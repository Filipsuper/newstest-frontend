"use client";

// app/providers/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getUser, fetchPersonalFeed } from '../utils/api';
import { personalFeedCache, personalFeedScope } from '../utils/personalFeedCache';
import { prefetchPersonalQuotes } from '../utils/personalCompanyQuotes';
import { getCompanies } from '../utils/companies';
import { PERSONAL_PREVIEW_QUERY } from '../utils/personalPreview';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [accountError, setAccountError] = useState(null);
    const [accountLoading, setAccountLoading] = useState(true);
    const requestVersion = useRef(0);

    const refreshUser = useCallback(async () => {
        const version = ++requestVersion.current;
        setAccountLoading(true);
        try {
            const fetchedUser = await getUser();
            if (version === requestVersion.current) {
                personalFeedCache.setUser(fetchedUser);
                setUser(fetchedUser);
                setAccountError(null);
            }
            return fetchedUser.email ? fetchedUser : null;
        } catch (error) {
            // Keep the last known account and mounted drafts on transient errors.
            // An unknown account is not evidence that the reader is signed out.
            if (version === requestVersion.current) setAccountError(error);
        } finally {
            if (version === requestVersion.current) setAccountLoading(false);
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

    const prefetchScope = personalFeedScope(user);
    useEffect(() => {
        if (!user?.email || accountError) return;
        const controller = new AbortController();
        let started = false;
        function prefetch() {
            if (started || document.visibilityState === 'hidden') return;
            started = true;
            if (user.watchlist?.length) {
                void getCompanies();
                void prefetchPersonalQuotes(user.watchlist, { signal: controller.signal });
            }
            if (user.watchlist?.length)
                void fetchPersonalFeed({ user, ...PERSONAL_PREVIEW_QUERY, signal: controller.signal });
        }
        prefetch();
        document.addEventListener('visibilitychange', prefetch);
        return () => { controller.abort(); document.removeEventListener('visibilitychange', prefetch); };
    }, [prefetchScope, accountError]);

    useEffect(() => {
        if (user?.trial?.status !== "active" || !Number.isFinite(user.trial.endsAt)) return;
        const timer = setTimeout(refreshUser, Math.max(1000, user.trial.endsAt - Date.now() + 100));
        const visible = () => { if (document.visibilityState === "visible") refreshUser(); };
        document.addEventListener("visibilitychange", visible);
        return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
    }, [user?.trial?.status, user?.trial?.endsAt, refreshUser]);

    return (
        <AuthContext.Provider value={{ user, accountError, accountLoading, isGuestUser, isPaidUser, isPlusUser, refreshUser, isFreeUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}
