import { query } from "@/lib/db";

type ProfileTarget = {
  table: "patients" | "doctors" | "medicalists" | "users";
  idColumn: "user_id" | "id";
};

let ensureColumnsPromise: Promise<void> | null = null;

export function getProfileTarget(userType?: string | null): ProfileTarget | null {
  if (userType === "patient") return { table: "patients", idColumn: "user_id" };
  if (userType === "doctor") return { table: "doctors", idColumn: "user_id" };
  if (userType === "medicalist") return { table: "medicalists", idColumn: "user_id" };
  if (userType === "superadmin") return { table: "users", idColumn: "id" };
  return null;
}

export async function ensureProfileImageColumns(): Promise<void> {
  if (ensureColumnsPromise) {
    await ensureColumnsPromise;
    return;
  }

  ensureColumnsPromise = (async () => {
    await query("ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_image TEXT");
    await query("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image TEXT");
    await query("ALTER TABLE medicalists ADD COLUMN IF NOT EXISTS profile_image TEXT");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT");
  })();

  await ensureColumnsPromise;
}

