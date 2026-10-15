"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import {
  Button,
  Input,
  Textarea,
  Select,
  FormField,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogFooter,
  useToast,
  Skeleton,
  EmptyState,
  ErrorState,
  Spinner,
  PageHeader,
} from "@/components/ui";
import { AppShell } from "@/components/layout";
import {
  Plus,
  Trash2,
  Send,
  Download,
  FolderPlus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function DevComponentsPage() {
  // Strictly excluded from production builds
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell pageTitle="Component System Gallery">
      <DevGalleryContent />
    </AppShell>
  );
}

function DevGalleryContent() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectValue, setSelectValue] = useState("hourly");

  const toggleLoading = () => {
    setButtonLoading(true);
    setTimeout(() => {
      setButtonLoading(false);
      toast({
        title: "Action Finished",
        description: "Button loading simulation completed.",
        variant: "info",
      });
    }, 1500);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Page Header Component */}
      <PageHeader
        title="Design System & UI Component Gallery"
        description="Verified accessible primitives complying with WCAG AA contrast standards. Zero decorative gradients or unhandled interactions."
        badge={<Badge variant="info">Dev-Only Preview</Badge>}
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => {
              toast({
                title: "Gallery Refreshed",
                description: "All interactive states are active.",
                variant: "success",
              });
            }}
          >
            Refresh
          </Button>
        }
      />

      {/* 1. BUTTONS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          1. Buttons & Variants
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() =>
              toast({
                title: "Primary Clicked",
                description: "Primary action triggered.",
                variant: "success",
              })
            }
          >
            Primary Button
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: "Secondary Clicked",
                description: "Secondary action triggered.",
                variant: "info",
              })
            }
          >
            Secondary
          </Button>

          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() =>
              toast({
                title: "Download Initiated",
                description: "Outline button with icon clicked.",
                variant: "info",
              })
            }
          >
            Outline with Icon
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              toast({
                title: "Ghost Action",
                description: "Subtle ghost button clicked.",
                variant: "default",
              })
            }
          >
            Ghost
          </Button>

          <Button
            variant="danger"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() =>
              toast({
                title: "Destructive Action",
                description: "Danger button action acknowledged.",
                variant: "error",
              })
            }
          >
            Danger
          </Button>

          <Button
            variant="primary"
            isLoading={buttonLoading}
            onClick={toggleLoading}
          >
            {buttonLoading ? "Saving..." : "Click to Test Loading"}
          </Button>

          <Button variant="primary" disabled>
            Disabled Primary
          </Button>
        </div>

        {/* Sizes */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              toast({ title: "Small button clicked", variant: "default" })
            }
          >
            Small (sm)
          </Button>
          <Button
            size="md"
            variant="outline"
            onClick={() =>
              toast({ title: "Medium button clicked", variant: "default" })
            }
          >
            Medium (md)
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() =>
              toast({ title: "Large button clicked", variant: "default" })
            }
          >
            Large (lg)
          </Button>
        </div>
      </section>

      {/* 2. STATUS BADGES */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          2. Badges & Lifecycle Status Variants
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="draft" showIcon>
            Draft (Editable)
          </Badge>
          <Badge variant="pending" showIcon>
            Pending Approval (14d Token Active)
          </Badge>
          <Badge variant="approved" showIcon>
            Approved (Locked Snapshot)
          </Badge>
          <Badge variant="rejected" showIcon>
            Rejected (Terminal)
          </Badge>
          <Badge variant="withdrawn" showIcon>
            Withdrawn (Revoked)
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="info" showIcon>
            Information
          </Badge>
          <Badge variant="success" showIcon>
            Verified Success
          </Badge>
          <Badge variant="warning" showIcon>
            Notice Warning
          </Badge>
          <Badge variant="error" showIcon>
            Validation Error
          </Badge>
        </div>
      </section>

      {/* 3. FORM FIELDS & INPUTS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          3. Form Controls & Validation States
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <FormField
            label="Project Name"
            required
            hint="Enter the client contract title"
          >
            <Input
              placeholder="e.g. Acme Mobile App v2"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </FormField>

          <FormField
            label="Hourly Rate"
            required
            hint="Stored deterministically in integer minor units"
          >
            <Input
              prefixElement="₹"
              suffixElement="/hr"
              placeholder="1,500"
              defaultValue="1500"
            />
          </FormField>

          <FormField
            label="Pricing Method"
            required
            hint="Select the billing model for this change proposal"
          >
            <Select
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { label: "Hourly (Time & Materials)", value: "hourly" },
                { label: "Fixed Lump Sum", value: "fixed" },
              ]}
            />
          </FormField>

          <FormField
            label="Proposed Completion Date"
            error="Proposed deadline cannot be prior to the project start date."
          >
            <Input type="date" defaultValue="2026-01-01" hasError />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Change Request Scope Details"
              required
              hint="Describe exact deliverables added or altered for client review."
            >
              <Textarea
                placeholder="Detailed scope narrative visible to the client on the approval link..."
                defaultValue="Implementation of native biometric authentication (Face ID / Fingerprint) for iOS and Android builds."
              />
            </FormField>
          </div>
        </div>
      </section>

      {/* 4. CARDS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          4. Cards & Information Containers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Baseline Contract Summary</CardTitle>
                <Badge variant="approved">Contract Active</Badge>
              </div>
              <CardDescription>
                Initial agreed baseline before incremental change orders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500">Contract Value:</span>
                <span className="font-semibold text-slate-900">₹4,50,000.00</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500">Agreed Deadline:</span>
                <span className="font-semibold text-slate-900">15 Nov 2026</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-slate-500">Contract Currency:</span>
                <span className="font-semibold text-slate-900">INR (₹)</span>
              </div>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-slate-500">
                Client: Global Retail Corp
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Opening Project Settings",
                    variant: "info",
                  })
                }
              >
                View Contract
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Approved Scope Expansion</CardTitle>
                <Badge variant="success" showIcon>
                  Snapshot Rollup
                </Badge>
              </div>
              <CardDescription>
                Aggregated solely from immutable approved versions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500">Approved Extras:</span>
                <span className="font-semibold text-emerald-700">
                  +₹62,500.00
                </span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-500">Revised Total Budget:</span>
                <span className="font-bold text-slate-900">₹5,12,500.00</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-slate-500">Revised Deadline:</span>
                <span className="font-semibold text-indigo-700">
                  28 Nov 2026 (+13 days)
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-slate-500">2 Approved Changes</span>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() =>
                  toast({
                    title: "New Draft Action",
                    description: "Ready to draft change request.",
                    variant: "success",
                  })
                }
              >
                New Request
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 5. TABLE COMPONENT */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          5. Responsive Table (Mobile Cards / Desktop Grid)
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Change Request</TableHead>
              <TableHead>Deliverable</TableHead>
              <TableHead>Estimated Cost</TableHead>
              <TableHead>Deadline Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold text-slate-900">
                CR-001: Biometric Login
              </TableCell>
              <TableCell>Auth Flow</TableCell>
              <TableCell className="font-medium text-slate-900">
                ₹18,750.00
              </TableCell>
              <TableCell>+3 days</TableCell>
              <TableCell>
                <Badge variant="approved" showIcon>
                  Approved
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Inspecting CR-001",
                      description: "Opening change details.",
                      variant: "info",
                    })
                  }
                >
                  View
                </Button>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-semibold text-slate-900">
                CR-002: CSV Export Feature
              </TableCell>
              <TableCell>Reporting</TableCell>
              <TableCell className="font-medium text-slate-900">
                ₹15,000.00
              </TableCell>
              <TableCell>+2 days</TableCell>
              <TableCell>
                <Badge variant="pending" showIcon>
                  Pending
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                  onClick={() =>
                    toast({
                      title: "Copying Link",
                      description: "Approval bearer link copied.",
                      variant: "success",
                    })
                  }
                >
                  Copy Link
                </Button>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="font-semibold text-slate-900">
                CR-003: Custom Dashboard Filter
              </TableCell>
              <TableCell>Analytics</TableCell>
              <TableCell className="font-medium text-slate-900">
                ₹22,500.00
              </TableCell>
              <TableCell>+5 days</TableCell>
              <TableCell>
                <Badge variant="draft" showIcon>
                  Draft
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toast({
                      title: "Editing Draft",
                      description: "Opening draft editor.",
                      variant: "info",
                    })
                  }
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* 6. MODALS / DIALOGS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          6. Accessible Dialog & Focus Trap
        </h2>
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            onClick={() => setIsDialogOpen(true)}
            leftIcon={<ExternalLink className="w-4 h-4" />}
          >
            Open Test Dialog (Focus Trap & ESC Dismiss)
          </Button>
          <span className="text-xs text-slate-500">
            Press Tab to test trapped focus, or press Escape to close.
          </span>
        </div>

        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Publish Change Proposal"
          description="Are you sure you want to snapshot and publish Version 1 of this proposal?"
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Publishing generates an immutable version snapshot and creates a
              14-day client approval bearer link.
            </p>
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
              <strong>Notice:</strong> No email is dispatched automatically in
              MVP. You will receive a copyable link to share directly with your
              client.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsDialogOpen(false);
                toast({
                  title: "Proposal Published!",
                  description: "Approval token generated successfully.",
                  variant: "success",
                });
              }}
            >
              Confirm & Generate Link
            </Button>
          </DialogFooter>
        </Dialog>
      </section>

      {/* 7. TOAST NOTIFICATIONS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          7. Interactive Toast Notifications
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Client Approved Proposal",
                description: "Proposal CR-001 was approved by John Client.",
                variant: "success",
              })
            }
          >
            Trigger Success Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Approval Link Expired",
                description: "The 14-day token has elapsed. Re-issue to continue.",
                variant: "error",
              })
            }
          >
            Trigger Error Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Active Token Revoked",
                description: "Proposal was moved back to draft for revision.",
                variant: "warning",
              })
            }
          >
            Trigger Warning Toast
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: "Link Copied to Clipboard",
                description: "Public client URL ready to share.",
                variant: "info",
              })
            }
          >
            Trigger Info Toast
          </Button>
        </div>
      </section>

      {/* 8. SKELETONS & SPINNERS */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          8. Loading States (Skeletons & Spinners)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs text-slate-500 font-medium">Spinner Sizes</span>
            <div className="flex items-center gap-4 text-indigo-600">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* 9. EMPTY & ERROR STATES */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
          9. Empty & Error State Patterns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmptyState
            title="No change requests drafted yet"
            description="When out-of-scope work arises during a project, draft a request here to model its cost and timeline impact."
            action={
              <Button
                variant="primary"
                leftIcon={<FolderPlus className="w-4 h-4" />}
                onClick={() =>
                  toast({
                    title: "Draft action clicked",
                    variant: "info",
                  })
                }
              >
                Create First Change Request
              </Button>
            }
          />

          <ErrorState
            title="Unable to load project metrics"
            message="Database query timed out while aggregating approved snapshots. Check your network connection."
            onRetry={() =>
              toast({
                title: "Retrying connection...",
                variant: "default",
              })
            }
          />
        </div>
      </section>
    </div>
  );
}

