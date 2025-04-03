import { Account, Client, Databases } from "appwrite";

export function createClient() {
  const client = new Client();
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const account = new Account(client);
  const databases = new Databases(client);

  return {
    client,
    account,
    databases,
  };
}
