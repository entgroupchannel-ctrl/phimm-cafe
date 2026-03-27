import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// POS shared service account — used to get "authenticated" role in Supabase
const POS_SERVICE_EMAIL = "therdpoom@entgroup.co.th";
const POS_SERVICE_PASSWORD = "Irawin2026;";

interface StaffInfo {
  id: string;
  name: string;
  nickname: string;
  roleId: string;
  roleName: string;
  roleLabel: string;
}

interface AuthContextType {
  staff: StaffInfo | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore Supabase auth session + staff info
  useEffect(() => {
    async function restoreSession() {
      try {
        // Check if Supabase has an active auth session
        const { data: { session } } = await supabase.auth.getSession();

        // Restore staff info from sessionStorage
        const saved = sessionStorage.getItem("pos_staff");
        if (saved && session) {
          // Both Supabase session and staff info exist — fully restored
          const parsed = JSON.parse(saved);
          setStaff(parsed.staff);
          setPermissions(parsed.permissions);
        } else if (saved && !session) {
          // Staff info exists but Supabase session expired — re-auth silently
          const { error } = await supabase.auth.signInWithPassword({
            email: POS_SERVICE_EMAIL,
            password: POS_SERVICE_PASSWORD,
          });
          if (!error) {
            const parsed = JSON.parse(saved);
            setStaff(parsed.staff);
            setPermissions(parsed.permissions);
          } else {
            // Cannot restore — clear and show login
            sessionStorage.removeItem("pos_staff");
          }
        }
        // If no saved staff → show login screen (default)
      } catch {
        // Ignore errors during restore
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const saveSession = (staffInfo: StaffInfo, perms: string[]) => {
    setStaff(staffInfo);
    setPermissions(perms);
    sessionStorage.setItem("pos_staff", JSON.stringify({
      staff: staffInfo,
      permissions: perms,
    }));
  };

  const loginWithPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Step 1: Verify PIN via RPC (works as anon)
      const { data, error } = await supabase.rpc("verify_pin", { input_pin: pin });

      if (error) return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
      if (!data || (data as any[]).length === 0) return { success: false, error: "PIN ไม่ถูกต้อง" };

      // Step 2: Sign in to Supabase Auth as service account
      // This changes the client from "anon" to "authenticated"
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: POS_SERVICE_EMAIL,
        password: POS_SERVICE_PASSWORD,
      });

      if (authError) {
        console.error("[Auth] Service account sign-in failed:", authError.message);
        return { success: false, error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแล" };
      }

      // Step 3: Extract staff info from PIN verification result
      const row = (data as any[])[0];
      const staffInfo: StaffInfo = {
        id: row.staff_id,
        name: row.staff_name,
        nickname: row.staff_nickname,
        roleId: row.role_id,
        roleName: row.role_name,
        roleLabel: row.role_label,
      };

      // Step 4: Get role permissions
      const { data: perms } = await supabase.rpc("get_role_permissions", {
        p_role_id: row.role_id,
      });
      const permList = (perms as string[]) || [];

      // Step 5: Save session
      saveSession(staffInfo, permList);
      return { success: true };
    } catch (err) {
      console.error("[Auth] PIN login error:", err);
      return { success: false, error: "เกิดข้อผิดพลาด" };
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) return { success: false, error: "Email หรือ Password ไม่ถูกต้อง" };

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, nickname, role_id, roles(name, label)")
        .eq("auth_uid", authData.user.id)
        .eq("is_active", true)
        .single();

      if (!staffData) return { success: false, error: "ไม่พบข้อมูลพนักงาน" };

      const staffInfo: StaffInfo = {
        id: staffData.id,
        name: staffData.name,
        nickname: staffData.nickname || "",
        roleId: staffData.role_id,
        roleName: (staffData.roles as any)?.name || "",
        roleLabel: (staffData.roles as any)?.label || "",
      };

      const { data: perms } = await supabase.rpc("get_role_permissions", {
        p_role_id: staffData.role_id,
      });
      saveSession(staffInfo, (perms as string[]) || []);
      return { success: true };
    } catch {
      return { success: false, error: "เกิดข้อผิดพลาด" };
    }
  };

  const logout = () => {
    setStaff(null);
    setPermissions([]);
    sessionStorage.removeItem("pos_staff");
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      staff,
      permissions,
      isAuthenticated: !!staff,
      isLoading,
      loginWithPin,
      loginWithEmail,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
