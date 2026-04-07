import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Shield, Building2, Loader2, Trash2, UserPlus, Search, Plus, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserRole {
  id: string;
  role: AppRole;
  venue_id: string | null;
}

interface UserWithRoles {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: UserRole[];
}

interface Venue {
  id: string;
  name: string;
}

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; desc: string }> = {
  superadmin: { label: "Super Admin", color: "bg-destructive/10 text-destructive", desc: "Akses penuh semua data" },
  admin: { label: "Admin", color: "bg-primary/10 text-primary", desc: "Kelola kiosk, template, pricing" },
  venue: { label: "Pemilik Venue", color: "bg-blue-500/10 text-blue-400", desc: "Akses data venue sendiri" },
  partner: { label: "Partner / Booth Buyer", color: "bg-green-500/10 text-green-400", desc: "Lihat revenue split" },
  operator: { label: "Operator", color: "bg-yellow-500/10 text-yellow-400", desc: "Operasikan kiosk" },
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("operator");
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Silakan login terlebih dahulu"); return; }

      // Fetch users from edge function
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Failed to fetch users");
      }

      const rawUsers: any[] = await resp.json();

      // Fetch all roles
      const { data: rolesData } = await supabase.from("user_roles").select("*");
      setAllRoles(rolesData || []);

      // Fetch venues
      const { data: venueData } = await supabase.from("venues").select("id, name").eq("is_active", true);
      setVenues(venueData || []);

      // Group roles by user
      const rolesByUser: Record<string, UserRole[]> = {};
      (rolesData || []).forEach((r: any) => {
        if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
        rolesByUser[r.user_id].push({ id: r.id, role: r.role, venue_id: r.venue_id });
      });

      const merged: UserWithRoles[] = rawUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rolesByUser[u.id] || [],
      }));

      setUsers(merged);
    } catch (e: any) {
      toast.error("Gagal memuat user", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssignRole = async (userId: string) => {
    setSaving(true);
    try {
      const needsVenue = ["venue", "partner"].includes(selectedRole);

      if (needsVenue && selectedVenues.length === 0) {
        toast.error("Pilih minimal satu venue");
        setSaving(false);
        return;
      }

      if (needsVenue) {
        // Create one role entry per venue
        const existingRoles = users.find(u => u.id === userId)?.roles || [];
        
        for (const venueId of selectedVenues) {
          // Check if this exact role+venue combo already exists
          const exists = existingRoles.find(r => r.role === selectedRole && r.venue_id === venueId);
          if (!exists) {
            const { error } = await supabase.from("user_roles").insert({
              user_id: userId,
              role: selectedRole,
              venue_id: venueId,
            });
            if (error) throw error;
          }
        }
      } else {
        // Non-venue role: check if already exists
        const existingRoles = users.find(u => u.id === userId)?.roles || [];
        const exists = existingRoles.find(r => r.role === selectedRole);
        if (!exists) {
          const { error } = await supabase.from("user_roles").insert({
            user_id: userId,
            role: selectedRole,
            venue_id: null,
          });
          if (error) throw error;
        } else {
          toast.info("Role sudah ada");
        }
      }

      toast.success(`Role ${ROLE_CONFIG[selectedRole].label} berhasil diberikan!`);
      setAssigningUserId(null);
      setSelectedRole("operator");
      setSelectedVenues([]);
      fetchData();
    } catch (e: any) {
      toast.error("Gagal assign role", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      toast.success("Role berhasil dihapus");
      fetchData();
    } catch (e: any) {
      toast.error("Gagal hapus role", { description: e.message });
    }
  };

  const toggleVenueSelection = (venueId: string) => {
    setSelectedVenues(prev =>
      prev.includes(venueId) ? prev.filter(v => v !== venueId) : [...prev, venueId]
    );
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Manajemen User & Role
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign role ke user — satu user bisa punya beberapa venue
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {users.length} user terdaftar
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari email user..."
          className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(ROLE_CONFIG) as [AppRole, typeof ROLE_CONFIG[AppRole]][]).map(([key, config]) => (
          <div key={key} className={`text-xs px-3 py-1.5 rounded-full font-medium ${config.color}`}>
            {config.label}
          </div>
        ))}
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filtered.map((user) => {
          const isAssigning = assigningUserId === user.id;

          return (
            <div key={user.id} className="border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{user.email}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{user.id.slice(0, 8)}...</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Login terakhir: {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                      : "Belum pernah"}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isAssigning) {
                      setAssigningUserId(null);
                      setSelectedVenues([]);
                    } else {
                      setAssigningUserId(user.id);
                      setSelectedRole("operator");
                      setSelectedVenues([]);
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 ${
                    isAssigning
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  } transition-colors`}
                >
                  {isAssigning ? (
                    <><X className="w-3 h-3" /> Tutup</>
                  ) : (
                    <><Plus className="w-3 h-3" /> Tambah Role</>
                  )}
                </button>
              </div>

              {/* Current roles */}
              {user.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.roles.map((r) => {
                    const config = ROLE_CONFIG[r.role];
                    const venue = venues.find(v => v.id === r.venue_id);
                    return (
                      <div key={r.id} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${config.color}`}>
                        {config.label}
                        {venue && (
                          <span className="opacity-70 flex items-center gap-0.5">
                            <Building2 className="w-3 h-3" /> {venue.name}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveRole(r.id)}
                          className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                          title="Hapus role ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {user.roles.length === 0 && !isAssigning && (
                <div className="mt-2 text-xs text-muted-foreground italic">Belum ada role</div>
              )}

              {/* Assign form */}
              {isAssigning && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Role</label>
                      <select
                        value={selectedRole}
                        onChange={(e) => {
                          setSelectedRole(e.target.value as AppRole);
                          setSelectedVenues([]);
                        }}
                        className="text-xs bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {(Object.entries(ROLE_CONFIG) as [AppRole, typeof ROLE_CONFIG[AppRole]][]).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Multi-venue selector for venue/partner roles */}
                  {["venue", "partner"].includes(selectedRole) && (
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">
                        Pilih Venue (bisa lebih dari satu)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {venues.map(v => {
                          const isSelected = selectedVenues.includes(v.id);
                          // Check if already assigned
                          const alreadyAssigned = user.roles.some(r => r.role === selectedRole && r.venue_id === v.id);
                          return (
                            <button
                              key={v.id}
                              onClick={() => !alreadyAssigned && toggleVenueSelection(v.id)}
                              disabled={alreadyAssigned}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                                alreadyAssigned
                                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                                  : isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted text-foreground hover:border-primary/50"
                              }`}
                            >
                              <Building2 className="w-3 h-3" />
                              {v.name}
                              {alreadyAssigned && <span className="text-[10px]">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      {selectedVenues.length > 0 && (
                        <p className="text-[10px] text-primary mt-1">{selectedVenues.length} venue dipilih</p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAssignRole(user.id)}
                      disabled={saving}
                      className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      Assign Role
                    </button>
                    <button
                      onClick={() => { setAssigningUserId(null); setSelectedVenues([]); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {search ? "Tidak ada user yang cocok" : "Belum ada user terdaftar"}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
