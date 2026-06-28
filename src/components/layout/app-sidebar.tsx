"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainNav = [
  { href: "/dashboard", label: "Home" },
  { href: "/applications", label: "Applications" },
  { href: "/applications/new", label: "Add role" },
] as const;

const resourceNav = [
  { href: "/applications", label: "Pipeline view" },
  { href: "/dashboard", label: "Status overview" },
] as const;

type AppSidebarProps = {
  isPreview?: boolean;
};

export function AppSidebar({ isPreview }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (href === "/applications") {
      return (
        pathname === "/applications" ||
        (pathname.startsWith("/applications/") &&
          !pathname.endsWith("/new") &&
          !pathname.endsWith("/edit"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
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
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(({ href, label }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>{label}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourceNav.map(({ href, label }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>{label}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {isPreview ? (
          <p className="px-2 text-xs text-muted-foreground">Preview mode</p>
        ) : null}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>Settings</SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2">
          <SignOutButton className="w-full" />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
