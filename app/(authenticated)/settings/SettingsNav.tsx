"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Building, Users } from "lucide-react";

export function SettingsNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "General",
      href: "/settings",
      icon: Building,
      isActive: pathname === "/settings",
    },
    {
      name: "Team Members",
      href: "/settings/team",
      icon: Users,
      isActive: pathname === "/settings/team",
    },
  ];

  return (
    <nav className="flex space-x-1 border-b border-slate-200 pb-px" aria-label="Settings Tabs">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              item.isActive
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
            aria-current={item.isActive ? "page" : undefined}
          >
            <Icon className="w-4 h-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

