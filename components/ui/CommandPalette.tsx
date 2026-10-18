"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  PlusCircle,
  Sun,
  Moon,
  Laptop,
  Search,
  ExternalLink,
} from "lucide-react";

export interface CommandPaletteProject {
  id: string;
  name: string;
  client_name?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects?: CommandPaletteProject[];
}

export function CommandPalette({
  open,
  onOpenChange,
  projects = [],
}: CommandPaletteProps) {
  const router = useRouter();

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const runAction = useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange]
  );

  const setTheme = useCallback((theme: "light" | "dark" | "system") => {
    if (theme === "system") {
      localStorage.removeItem("scopeguard-theme");
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      localStorage.setItem("scopeguard-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  if (!open) return null;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      overlayClassName="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      contentClassName="fixed left-1/2 top-1/4 z-50 -translate-x-1/2 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3.5">
        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
        <Command.Input
          placeholder="Type a command or search..."
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
        <Command.Empty className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No results found.
        </Command.Empty>

        {/* Navigation Group */}
        <Command.Group
          heading="Navigation"
          className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:space-y-1"
        >
          <Command.Item
            onSelect={() => runAction(() => router.push("/dashboard"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400 group-data-[selected=true]:text-indigo-600" />
            <span>Dashboard</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => router.push("/projects"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <FolderKanban className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Projects</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => router.push("/settings/team"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <Users className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Team & Workspace</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => router.push("/settings"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Workspace Settings</span>
          </Command.Item>
        </Command.Group>

        {/* Quick Actions Group */}
        <Command.Group
          heading="Quick Actions"
          className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:space-y-1"
        >
          <Command.Item
            onSelect={() => runAction(() => router.push("/projects/new"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <PlusCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Create New Project</span>
          </Command.Item>
        </Command.Group>

        {/* Projects (if available) */}
        {projects.length > 0 && (
          <Command.Group
            heading="Jump to Project"
            className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:space-y-1"
          >
            {projects.map((p) => (
              <Command.Item
                key={p.id}
                onSelect={() => runAction(() => router.push(`/projects/${p.id}`))}
                className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.client_name && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      ({p.client_name})
                    </span>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Theme Switching Group */}
        <Command.Group
          heading="Preferences"
          className="mt-2 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 [&_[cmdk-group-items]]:space-y-1"
        >
          <Command.Item
            onSelect={() => runAction(() => setTheme("light"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <Sun className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Switch to Light Theme</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => setTheme("dark"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <Moon className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Switch to Dark Theme</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => setTheme("system"))}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/50 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-400"
          >
            <Laptop className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Use System Theme</span>
          </Command.Item>
        </Command.Group>
      </Command.List>

      {/* Footer Instructions */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>Navigation:</span>
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
            ↑
          </kbd>
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
            ↓
          </kbd>
          <span>Select:</span>
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
            ↵
          </kbd>
        </div>
        <div>
          <span>Press</span>{" "}
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
            ?
          </kbd>{" "}
          <span>for shortcuts</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
