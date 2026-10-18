"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Keyboard } from "lucide-react";

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_SECTIONS = [
  {
    title: "Global Navigation",
    shortcuts: [
      { keys: ["G", "D"], description: "Go to Dashboard" },
      { keys: ["G", "P"], description: "Go to Projects" },
      { keys: ["G", "T"], description: "Go to Team Settings" },
      { keys: ["G", "S"], description: "Go to Workspace Settings" },
    ],
  },
  {
    title: "Command & Search",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open Command Palette (or Ctrl+K)" },
      { keys: ["?"], description: "Show Keyboard Shortcuts Modal" },
      { keys: ["ESC"], description: "Close modal / Cancel action" },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const router = useRouter();
  const [gPressed, setGPressed] = useState(false);

  // Global shortcut listeners (e.g., "?" and "G then X" sequence)
  useEffect(() => {
    let gTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // '?' toggles shortcut modal
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }

      // ESC closes modal
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
        return;
      }

      // Two-key navigation: "g" followed by key
      if (!open && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === "g" && !gPressed) {
          setGPressed(true);
          if (gTimeout) clearTimeout(gTimeout);
          gTimeout = setTimeout(() => setGPressed(false), 1200);
          return;
        }

        if (gPressed) {
          setGPressed(false);
          if (gTimeout) clearTimeout(gTimeout);

          switch (e.key.toLowerCase()) {
            case "d":
              e.preventDefault();
              router.push("/dashboard");
              break;
            case "p":
              e.preventDefault();
              router.push("/projects");
              break;
            case "t":
              e.preventDefault();
              router.push("/settings/team");
              break;
            case "s":
              e.preventDefault();
              router.push("/settings");
              break;
            default:
              break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [open, onOpenChange, gPressed, router]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="shortcuts-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speed up your workflow across ScopeGuard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close shortcuts modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="mt-4 space-y-5">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[24px] text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
          Press <kbd className="font-semibold text-slate-600 dark:text-slate-300">ESC</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
}
