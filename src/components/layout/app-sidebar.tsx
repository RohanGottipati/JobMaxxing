"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  BriefcaseBusiness,
  ChevronUp,
  FilePlus2,
  Files,
  FileText,
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
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/applications", icon: BriefcaseBusiness, label: "Applications" },
  { href: "/resumes", icon: Files, label: "My Resumes" },
  { href: "/cover-letters", icon: FileText, label: "My Cover Letters" },
  { href: "/documentation", icon: BookOpenText, label: "Documentation" },
  { href: "/profile", icon: UserRound, label: "User Profile" },
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderItems(items: typeof navigation) {
    return items.map(({ href, icon: Icon, label }) => (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton
          asChild
          isActive={isActive(href)}
          tooltip={label}
          className="relative h-9 gap-2.5 rounded-md px-2.5 text-[0.84rem] font-medium text-sidebar-foreground/65 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-primary before:opacity-0 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:opacity-100"
        >
          <Link href={href} onClick={() => setOpenMobile(false)}>
            <Icon aria-hidden className="size-4" />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  }

  const maxwellHref = pathname.startsWith("/maxwell")
    ? "/maxwell"
    : `/maxwell?from=${encodeURIComponent(pathname)}`;

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border">
      <SidebarHeader className="gap-0 p-0">
        <div className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center px-2" : "justify-between gap-2 px-4")}>
          {!collapsed ? <Brand href="/dashboard" /> : null}
          <SidebarTrigger className="shrink-0 text-sidebar-foreground/55">
            {collapsed ? <BrandMark /> : <PanelLeftClose aria-hidden />}
          </SidebarTrigger>
        </div>

        <SidebarMenu className={cn("border-b border-sidebar-border py-3", collapsed ? "items-center px-2" : "px-3")}>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Create new"
                  className={cn("h-9 rounded-md bg-primary px-3 text-primary-foreground shadow-[0_1px_1px_rgb(41_40_36/0.08)] hover:bg-primary/90 hover:text-primary-foreground", collapsed && "justify-center gap-0 px-0")}
                >
                  <Plus aria-hidden />
                  {!collapsed ? <span className="font-semibold">Create New</span> : null}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>Create</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/applications/new" onClick={() => setOpenMobile(false)}>
                      <BriefcaseBusiness aria-hidden /> Application
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/resumes/new" onClick={() => setOpenMobile(false)}>
                      <Files aria-hidden /> Master resume
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/resumes/versions/new" onClick={() => setOpenMobile(false)}>
                      <FilePlus2 aria-hidden /> Tailored resume
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/cover-letters/new" onClick={() => setOpenMobile(false)}>
                      <FileText aria-hidden /> Cover letter
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={cn(collapsed && "items-center")}>
              {renderItems(navigation)}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/maxwell")}
                  tooltip="Maxwell"
                  className="relative h-9 gap-2.5 rounded-md px-2.5 text-[0.84rem] font-medium text-sidebar-foreground/65 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r before:bg-primary before:opacity-0 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:opacity-100"
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
                  <ChevronUp aria-hidden className="ml-auto text-sidebar-foreground/55" />
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
                  <Link href="/profile" onClick={() => setOpenMobile(false)}><UserRound aria-hidden /> User profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/documentation" onClick={() => setOpenMobile(false)}><BookOpenText aria-hidden /> Documentation</Link>
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
