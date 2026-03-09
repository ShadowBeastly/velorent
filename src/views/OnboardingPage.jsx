"use client";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrgContext";
import { supabase } from "../utils/supabase";
import SetupWizard from "../components/onboarding/SetupWizard";

export default function OnboardingPage() {
    const { user, signOut } = useAuth();
    const org = useOrganization();

    const handleComplete = async () => {
        // Reload org list so currentOrg is populated and AppShell exits onboarding
        await org.reload();
    };

    return (
        <div>
            <SetupWizard
                supabase={supabase}
                user={user}
                onComplete={handleComplete}
            />
            {/* Sign-out escape hatch */}
            <div className="fixed bottom-6 left-0 right-0 flex justify-center">
                <button
                    type="button"
                    onClick={() => signOut()}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                    Mit anderem Account anmelden
                </button>
            </div>
        </div>
    );
}
