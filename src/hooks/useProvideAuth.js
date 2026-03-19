"use client";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useProvideAuth() {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        let mounted = true;
        let initialized = false;

        // Initialize immediately from localStorage — no network call needed.
        // This prevents infinite loading when onAuthStateChange is delayed
        // (e.g. Supabase refreshing an expired token in the background).
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted || initialized) return;
            initialized = true;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            initialized = true;
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await loadProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const loadProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error loading profile:", error);
                // Don't overwrite existing profile on transient errors
            } else {
                setProfile(data ?? null);
            }
        } catch (err) {
            console.error("Profile load error:", err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: (fullName || "").trim()
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } finally {
            localStorage.removeItem("currentOrgId");
            setUser(null);
            setSession(null);
            setProfile(null);
        }
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login?mode=update-password`
        });
        if (error) throw error;
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    };

    return {
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword
    };
}
