"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  BriefcaseBusiness,
  Files,
  Home,
  LogOut,
  PanelLeftClose,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Brand, BrandMark } from "@/components/layout/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", icon: Home, label: "Home", matches: ["/dashboard"] },
  {
    href: "/applications",
    icon: BriefcaseBusiness,
    label: "Applications",
    matches: ["/applications"],
  },
  {
    href: "/resumes",
    icon: Files,
    label: "Documents",
    matches: ["/resumes", "/cover-letters", "/latex"],
  },
] as const;

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "JM"
  );
}

export function AppSidebar({
  user,
}: {
  user: { email: string | null; name: string };
}) {
  const pathname = usePathname();
  const { isMobile, state, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const maxwellHref = pathname.startsWith("/maxwell")
    ? "/maxwell"
    : `/maxwell?from=${encodeURIComponent(pathname)}`;

  function isActive(matches: readonly string[]) {
    return matches.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border">
      <SidebarHeader className="gap-0 p-0">
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between gap-2 px-4",
          )}
        >
          {!collapsed ? <Brand href="/dashboard" /> : null}
          <SidebarTrigger className="shrink-0 text-sidebar-foreground/55">
            {collapsed ? <BrandMark /> : <PanelLeftClose aria-hidden />}
          </SidebarTrigger>
        </div>

        <div
          className={cn(
            "border-b border-sidebar-border py-3",
            collapsed ? "px-2" : "px-3",
          )}
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Add application"
                className={cn(
                  "h-9 rounded-md bg-primary px-3 text-primary-foreground shadow-[0_1px_1px_rgb(41_40_36/0.08)] hover:bg-primary/90 hover:text-primary-foreground",
                  collapsed && "justify-center gap-0 px-0",
                )}
              >
                <Link href="/applications?compose=new" onClick={() => setOpenMobile(false)}>
                  <Plus aria-hidden />
                  <span>Add application</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed && "items-center")}>
              {navigation.map(({ href, icon: Icon, label, matches }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(matches)}
                    tooltip={label}
                    className="relative h-9 gap-2.5 rounded-md px-2.5 text-[0.84rem] font-medium text-sidebar-foreground/65 before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:rounded-r before:bg-primary before:opacity-0 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:opacity-100"
                  >
                    <Link href={href} onClick={() => setOpenMobile(false)}>
                      <Icon aria-hidden className="size-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/maxwell")}
                  tooltip="Maxwell"
                  className="relative h-9 gap-2.5 rounded-md px-2.5 text-[0.84rem] font-medium text-sidebar-foreground/65 before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:rounded-r before:bg-primary before:opacity-0 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:opacity-100"
                >
                  <Link href={maxwellHref} onClick={() => setOpenMobile(false)}>
                    <Sparkles aria-hidden className="size-4" />
                    <span>Maxwell</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2.5">
        <SidebarMenu className={cn(collapsed && "items-center")}>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user.name}
                  className="h-12 rounded-md data-open:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback className="rounded-md bg-primary text-[0.7rem] font-semibold text-primary-foreground">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/55">
                      {user.email}
                    </span>
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" onClick={() => setOpenMobile(false)}>
                    <UserRound aria-hidden /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/documentation" onClick={() => setOpenMobile(false)}>
                    <BookOpenText aria-hidden /> Help
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-1">
                  <SignOutButton className="w-full text-destructive hover:text-destructive">
                    <LogOut aria-hidden />
                  </SignOutButton>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
