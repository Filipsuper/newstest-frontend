// app/providers/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState, useMemo, use } from 'react';
import { getUser } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const refreshUser = async () => {

        const fetchedUser = await getUser();

        if (fetchedUser.error || fetchedUser === null) {
            setUser({
                email: null,
                verified: false,
                plan: "free"
            })
        } else {
            setUser(fetchedUser);
        }
    }

    const isGuestUser = useMemo(() => {
        return user && user.email === null;
    }, [user]);

    const isFreeUser = useMemo(() => {
        return user && user.verified === true;
    }, [user])

    const isPaidUser = useMemo(() => {
        return user && user.plan === "premium";
    }, [user]);

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isGuestUser, isPaidUser, refreshUser, isFreeUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}