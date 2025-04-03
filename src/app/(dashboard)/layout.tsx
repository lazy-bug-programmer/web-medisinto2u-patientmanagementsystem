"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { createClient } from "@/lib/appwrite/client";
import { Models } from "appwrite";
import { logoutUser } from "@/lib/appwrite/actions/auth.action";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const client = createClient();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(
    null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const user = await getLoggedInUser();
      setUser(user);
    };

    getUser();

    const unsubscribe = client.client.subscribe(`account`, (response) => {
      if (response.events.includes("users.*.sessions.*.create")) {
        client.account.get().then(
          (user) => setUser(user),
          () => setUser(null)
        );
      }

      if (response.events.includes("users.*.sessions.*.delete")) {
        setUser(null);
      }
    });

    // Close sidebar when changing routes on mobile
    setSidebarOpen(false);

    return () => {
      unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      try {
        await client.account.deleteSession("current");
      } catch {}

      await logoutUser();
      toast.success("Logged out successfully");
      router.push("/login");
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setDropdownOpen(false);
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    if (!user || !user.name) return "?";
    return user.name.charAt(0).toUpperCase();
  };

  // Check if the current path matches the link
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex flex-1 items-center gap-2">
          {/* Hamburger menu for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <h1 className="text-xl font-semibold">Patient Management System</h1>
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground"
          >
            {getUserInitial()}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-lg z-20 border">
              {user && (
                <>
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    {user.name || user.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-1 relative">
        {/* Mobile overlay - only shows when sidebar is open on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={handleOverlayClick}
            aria-hidden="true"
          />
        )}

        {/* Sidebar - visible on desktop, toggle on mobile */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-20 mt-16 w-64 border-r bg-muted/40 transition-transform duration-300 ease-in-out md:static md:mt-0 md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="bg-white flex h-full flex-col gap-2 p-4">
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h2 className="pl-4 font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close Menu</span>
              </Button>
            </div>
            <div
              className={cn(
                "flex h-12 items-center rounded-md px-4",
                isActive("/dashboard") && !pathname.includes("/dashboard/")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Link href="/dashboard" className="w-full font-medium">
                Dashboard
              </Link>
            </div>
            <div
              className={cn(
                "flex h-12 items-center rounded-md px-4",
                isActive("/dashboard/patients")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Link href="/dashboard/patients" className="w-full font-medium">
                Patients
              </Link>
            </div>
            <div
              className={cn(
                "flex h-12 items-center rounded-md px-4",
                isActive("/dashboard/appointments")
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Link
                href="/dashboard/appointments"
                className="w-full font-medium"
              >
                Appointments
              </Link>
            </div>
          </div>
        </aside>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
