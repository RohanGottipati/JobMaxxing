"use client";

import Link from "next/link";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const mainNav = [
  { href: "/applications", icon: BriefcaseBusiness, label: "Applications" },
  { href: "/profile", icon: UserRound, label: "Profile" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/applications") {
      return pathname.startsWith("/applications");
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/applications">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">JobMaxxing</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Application tracker
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(({ href, icon: Icon, label }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>
                      <Icon aria-hidden className="size-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2">
          <SignOutButton className="w-full" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
