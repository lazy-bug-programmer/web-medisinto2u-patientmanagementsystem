"use server";

import {
  createAdminClient,
  createSessionClient,
} from "@/lib/appwrite/server";
import { uuidv4 } from "@/lib/guid";
import { cookies } from "next/headers";

export async function signUpUser(
  email: string,
  password: string,
  confirmPassword: string
) {
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const client = await createAdminClient();
    await client.account.create(uuidv4(), email, password);
    return { message: "Account created successfully" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err) {
      switch (err.type) {
        case "user_already_exists":
          return { error: "User already exists" };
      }
    }
    return { error: "Create account failed" };
  }
}

export async function logoutUser() {
  try {
    const client = await createSessionClient();
    const sessionId = ((await cookies()).get("user-session-id"));
    (await cookies()).delete("user-session");
    (await cookies()).delete("user-session-id");
    await client.account.deleteSession(sessionId!.value);
    return { message: "Logout successful" };
  } catch {
    return { error: "Logout failed" };
  }
}
