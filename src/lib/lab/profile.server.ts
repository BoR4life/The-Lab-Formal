import { getSql } from "@/lib/db";

/** Server only. Never import this module from a client component. */
const ADMIN_EMAIL = "brad@bundleofrays.com";

export type LabProfile = {
  firstName: string;
  email: string;
  role: "learner" | "admin";
};

export async function loadProfile(userId: string): Promise<LabProfile> {
  const sql = await getSql();
  const rows = await sql<{ name: string; email: string }>`
    select name, email from "user" where id = ${userId}
  `;
  const authUser = rows[0];
  if (!authUser) throw new Error("No account for this session");
  const firstName = authUser.name.trim().split(/\s+/)[0] || authUser.name;
  const role = authUser.email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "learner";
  await sql`
    insert into users (id, first_name, email, role)
    values (${userId}, ${firstName}, ${authUser.email}, ${role})
    on conflict (id) do update set
      first_name = excluded.first_name,
      email = excluded.email,
      role = excluded.role
  `;
  return { firstName, email: authUser.email, role };
}
