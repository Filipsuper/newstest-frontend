// app/providers/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getUser } from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    const refreshUser = async () => {

        const fetchedUser = await getUser();

        if (fetchedUser) {
            setUser(fetchedUser);
        } else {
            setUser({
                email: null,
                verified: true,
                plan: "free"
            })
        }
    }

    const isGuestUser = useMemo(() => {
        return user && user.email === null;
    }, [user]);

    const isPaidUser = useMemo(() => {
        return user && user.plan === "premium";
    }, [user]);

    useEffect(() => {
        refreshUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, isGuestUser, isPaidUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    return useContext(AuthContext);
}