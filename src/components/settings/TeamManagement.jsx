"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Shield, Crown, Trash2, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useOrganization } from "../../context/OrgContext";
import { useToast } from "../ui/Toast";

const ROLE_CONFIG = {
    owner:  { label: "Eigentümer", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", Icon: Crown },
    admin:  { label: "Admin",      color: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400",   Icon: Shield },
    member: { label: "Mitglied",   color: "bg-slate-100  text-slate-700  dark:bg-slate-700     dark:text-slate-300",  Icon: Users },
    viewer: { label: "Betrachter", color: "bg-gray-100   text-gray-600   dark:bg-gray-800     dark:text-gray-400",   Icon: Users },
};

const STATUS_LABEL = { active: "Aktiv", invited: "Eingeladen", disabled: "Deaktiviert" };

function RoleBadge({ role }) {
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.member;
    const Icon = cfg.Icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

export default function TeamManagement() {
    const { darkMode } = useApp();
    const { user } = useAuth();
    const org = useOrganization();
    const { addToast } = useToast();

    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [inviting, setInviting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const orgId = org.currentOrg?.id;
    const currentUserRole = org.currentOrg?.userRole;
    const canManage = currentUserRole === "owner" || currentUserRole === "admin";

    const loadMembers = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("organization_members")
            .select(`
                id,
                user_id,
                role,
                status,
                invited_email,
                invited_at,
                joined_at,
                profile:profiles(id, full_name, email)
            `)
            .eq("organization_id", orgId)
            .neq("status", "disabled")
            .order("joined_at", { ascending: true });

        if (error) {
            console.error("Failed to load team members:", error);
            addToast("Fehler beim Laden der Teammitglieder.", "error");
        } else {
            setMembers(data || []);
        }
        setLoading(false);
    }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadMembers(); }, [loadMembers]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setInviting(true);
        try {
            const { error } = await supabase.from("organization_members").insert({
                organization_id: orgId,
                role: inviteRole,
                status: "invited",
                invited_email: inviteEmail.trim().toLowerCase(),
                invited_at: new Date().toISOString(),
            });

            if (error) {
                if (error.code === "23505") {
                    addToast("Diese E-Mail-Adresse ist bereits eingeladen oder Mitglied.", "error");
                } else {
                    throw error;
                }
            } else {
                addToast(`Einladung an ${inviteEmail} gesendet!`, "success");
                setInviteEmail("");
                setInviteRole("member");
                await loadMembers();
            }
        } catch (err) {
            console.error("Invite error:", err);
            addToast("Fehler beim Einladen des Mitglieds.", "error");
        } finally {
            setInviting(false);
        }
    };

    const handleRoleChange = async (memberId, newRole) => {
        // Guard: cannot demote the last owner
        if (newRole !== "owner") {
            const owners = members.filter(m => m.role === "owner");
            const targetMember = members.find(m => m.id === memberId);
            if (targetMember?.role === "owner" && owners.length <= 1) {
                addToast("Es muss mindestens ein Eigentümer im Team bleiben.", "error");
                return;
            }
        }

        setUpdatingId(memberId);
        const { error } = await supabase
            .from("organization_members")
            .update({ role: newRole })
            .eq("id", memberId)
            .eq("organization_id", orgId);

        if (error) {
            addToast("Fehler beim Ändern der Rolle.", "error");
        } else {
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            addToast("Rolle erfolgreich geändert.", "success");
        }
        setUpdatingId(null);
    };

    const handleRemove = async (memberId) => {
        const targetMember = members.find(m => m.id === memberId);

        // Guard: cannot remove the last owner
        if (targetMember?.role === "owner") {
            const owners = members.filter(m => m.role === "owner");
            if (owners.length <= 1) {
                addToast("Der letzte Eigentümer kann nicht entfernt werden.", "error");
                return;
            }
        }

        setRemovingId(memberId);
        const { error } = await supabase
            .from("organization_members")
            .update({ status: "disabled" })
            .eq("id", memberId)
            .eq("organization_id", orgId);

        if (error) {
            addToast("Fehler beim Entfernen des Mitglieds.", "error");
        } else {
            setMembers(prev => prev.filter(m => m.id !== memberId));
            addToast("Mitglied wurde entfernt.", "success");
        }
        setRemovingId(null);
    };

    const cardStyle = darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200";
    const inputStyle = `w-full px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;
    const selectStyle = `px-3 py-2 rounded-lg border outline-none ${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`;
    const mutedText = darkMode ? "text-slate-400" : "text-slate-500";

    return (
        <div className={`rounded-2xl border p-6 ${cardStyle}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Team-Verwaltung</h3>
                    <p className={`text-sm ${mutedText}`}>Mitglieder einladen und Rollen verwalten</p>
                </div>
            </div>

            {/* Invite Form — only owners/admins */}
            {canManage && (
                <form onSubmit={handleInvite} className={`flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-xl ${darkMode ? "bg-slate-800" : "bg-slate-50"}`}>
                    <div className="flex-1">
                        <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                            E-Mail-Adresse
                        </label>
                        <input
                            type="email"
                            required
                            placeholder="kollege@beispiel.de"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                            className={inputStyle}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                            Rolle
                        </label>
                        <select
                            value={inviteRole}
                            onChange={e => setInviteRole(e.target.value)}
                            className={selectStyle}
                        >
                            <option value="admin">Admin</option>
                            <option value="member">Mitglied</option>
                            <option value="viewer">Betrachter</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={inviting || !inviteEmail.trim()}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2 disabled:opacity-50"
                        >
                            {inviting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            Einladen
                        </button>
                    </div>
                </form>
            )}

            {/* Members List */}
            {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Lade Teammitglieder…</span>
                </div>
            ) : members.length === 0 ? (
                <p className={`text-sm text-center py-8 ${mutedText}`}>Noch keine Teammitglieder.</p>
            ) : (
                <div className="space-y-2">
                    {members.map(member => {
                        const isMe = member.user_id === user?.id;
                        const displayName = member.profile?.full_name || member.invited_email || member.profile?.email || "—";
                        const displayEmail = member.profile?.email || member.invited_email || "";
                        const joinedDate = member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString("de-DE")
                            : member.invited_at
                                ? `Eingeladen ${new Date(member.invited_at).toLocaleDateString("de-DE")}`
                                : null;
                        const isUpdating = updatingId === member.id;
                        const isRemoving = removingId === member.id;

                        return (
                            <div
                                key={member.id}
                                className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"} transition-colors`}
                            >
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium text-sm flex-shrink-0">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>

                                {/* Name + email + joined */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm truncate">{displayName}</span>
                                        {isMe && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                                Du
                                            </span>
                                        )}
                                        <RoleBadge role={member.role} />
                                        {member.status === "invited" && (
                                            <span className="text-xs text-amber-500 font-medium">• {STATUS_LABEL.invited}</span>
                                        )}
                                    </div>
                                    <div className={`text-xs truncate ${mutedText}`}>
                                        {displayEmail}
                                        {joinedDate && <span className="ml-2 opacity-70">{joinedDate}</span>}
                                    </div>
                                </div>

                                {/* Role Selector + Remove — only for owners/admins, not for self */}
                                {canManage && !isMe && (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="relative">
                                            <select
                                                value={member.role}
                                                disabled={isUpdating || !canManage}
                                                onChange={e => handleRoleChange(member.id, e.target.value)}
                                                className={`appearance-none pl-2 pr-6 py-1 rounded-lg text-xs border outline-none cursor-pointer ${
                                                    darkMode
                                                        ? "bg-slate-800 border-slate-700 text-slate-200"
                                                        : "bg-white border-slate-200 text-slate-700"
                                                } disabled:opacity-50`}
                                            >
                                                {/* Only owners can assign owner role */}
                                                {currentUserRole === "owner" && (
                                                    <option value="owner">Eigentümer</option>
                                                )}
                                                <option value="admin">Admin</option>
                                                <option value="member">Mitglied</option>
                                                <option value="viewer">Betrachter</option>
                                            </select>
                                            {isUpdating ? (
                                                <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-slate-400 pointer-events-none" />
                                            ) : (
                                                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemove(member.id)}
                                            disabled={isRemoving}
                                            title="Mitglied entfernen"
                                            className={`p-1.5 rounded-lg transition-colors ${
                                                darkMode
                                                    ? "hover:bg-rose-900/40 text-slate-500 hover:text-rose-400"
                                                    : "hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                                            } disabled:opacity-50`}
                                        >
                                            {isRemoving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Permission note */}
            {!canManage && (
                <p className={`text-xs mt-4 ${mutedText}`}>
                    Nur Eigentümer und Admins können Mitglieder einladen oder Rollen ändern.
                </p>
            )}
        </div>
    );
}
