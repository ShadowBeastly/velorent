"use client";
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useProvideAuth() {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                const { data: { user: validatedUser } } = await supabase.auth.getUser();
                if (validatedUser) {
                    setSession(session);
                    setUser(validatedUser);
                    loadProfile(validatedUser.id);
                } else {
                    setSession(null);
                    setUser(null);
                    setLoading(false);
                }
            } else {
                setSession(null);
                setUser(null);
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
            else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
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
            }

            setProfile(data);
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

    const signUp = async (email, password, firstName, lastName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: `${firstName} ${lastName}`.trim()
                }
            }
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.removeItem("currentOrgId");
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    return {
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut
    };
}
