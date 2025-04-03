"use server";

import * as sdk from "node-appwrite";
import { cookies } from "next/headers";

export async function createClient() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const account = new sdk.Account(client);
  const avatar = new sdk.Avatars(client);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  return {
    client,
    account,
    avatar,
    users,
    databases,
  };
}

export async function createSessionClient() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const account = new sdk.Account(client);
  const avatar = new sdk.Avatars(client);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  const session = (await cookies()).get("user-session");
  if (!session || !session.value) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    client,
    account,
    avatar,
    users,
    databases,
  };
}

export async function createAdminClient() {
  const client = new sdk.Client();
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_PRIVATE_APPWRITE_KEY!);

  const account = new sdk.Account(client);
  const avatar = new sdk.Avatars(client);
  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  return {
    client,
    account,
    avatar,
    users,
    databases,
  };
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch {
    return null;
  }
}
