"use client";

import React, { useState, useTransition } from "react";
import { type DeliverableItem, type DeliverableStatus } from "@/lib/data/deliverables";
import {
  createDeliverableAction,
  updateDeliverableAction,
  deleteDeliverableAction,
} from "@/app/actions/deliverables";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Plus, Trash2, Edit2, Layers, AlertCircle, CheckCircle2 } from "lucide-react";

interface DeliverablesManagerProps {
  projectId: string;
  initialDeliverables: DeliverableItem[];
  canManage: boolean;
}

export function DeliverablesManager({
  projectId,
  initialDeliverables,
  canManage,
}: DeliverablesManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // New deliverable inputs
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<DeliverableItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<DeliverableStatus>("pending");

  // Delete dialog state
  const [deletingItem, setDeletingItem] = useState<DeliverableItem | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim().length < 2) return;

    setMessage(null);
    const formData = new FormData();
    formData.append("title", newTitle);
    if (newDesc) formData.append("description", newDesc);

    startTransition(async () => {
      const res = await createDeliverableAction(projectId, null, formData);
      if (res.success) {
        setNewTitle("");
        setNewDesc("");
        setMessage({ text: "Deliverable added successfully.", isError: false });
      } else {
        setMessage({ text: res.message || "Failed to add deliverable.", isError: true });
      }
    });
  };

  const openEdit = (item: DeliverableItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditStatus(item.status);
  };

  const handleUpdate = () => {
    if (!editingItem || editTitle.trim().length < 2) return;

    setMessage(null);
    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("description", editDesc);
    formData.append("status", editStatus);

    startTransition(async () => {
      const res = await updateDeliverableAction(editingItem.id, projectId, null, formData);
      if (res.success) {
        setEditingItem(null);
        setMessage({ text: "Deliverable updated successfully.", isError: false });
      } else {
        setMessage({ text: res.message || "Failed to update deliverable.", isError: true });
      }
    });
  };

  const handleDelete = () => {
    if (!deletingItem) return;

    setMessage(null);
    startTransition(async () => {
      const res = await deleteDeliverableAction(deletingItem.id, projectId);
      if (res.success) {
        setDeletingItem(null);
        setMessage({ text: "Deliverable removed successfully.", isError: false });
      } else {
        setMessage({ text: res.message || "Failed to remove deliverable.", isError: true });
      }
    });
  };

  const getStatusBadge = (status: DeliverableStatus) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="default">Cancelled</Badge>;
      case "pending":
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Project Deliverables
        </CardTitle>
        <CardDescription className="text-xs">
          Manage milestones, feature commitments, and deliverable completion states.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            role={message.isError ? "alert" : "status"}
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              message.isError
                ? "bg-rose-50 border border-rose-200 text-rose-800"
                : "bg-emerald-50 border border-emerald-200 text-emerald-800"
            }`}
          >
            {message.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Add Deliverable Form (Managers / Owners Only) */}
        {canManage && (
          <form
            onSubmit={handleCreate}
            className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
          >
            <span className="text-xs font-semibold text-slate-800 block">Add New Deliverable</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Title (e.g. User Authentication)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={isPending}
                id="deliverableTitleInput"
                aria-label="New deliverable title"
                required
              />
              <Input
                placeholder="Description or scope notes (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                disabled={isPending}
                id="deliverableDescInput"
                aria-label="New deliverable description"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                isLoading={isPending}
                disabled={isPending || newTitle.trim().length < 2}
                id="saveDeliverableButton"
              >
                Add Deliverable
              </Button>
            </div>
          </form>
        )}

        {/* Deliverables List */}
        {initialDeliverables.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No deliverables exist for this project yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {initialDeliverables.map((del) => (
              <div
                key={del.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{del.title}</span>
                    {getStatusBadge(del.status)}
                  </div>
                  {del.description && (
                    <p className="text-slate-500 text-[11px] mt-0.5">{del.description}</p>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(del)}
                      className="text-slate-600 hover:text-slate-900 h-8 px-2"
                      aria-label={`Edit ${del.title}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingItem(del)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                      aria-label={`Delete ${del.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Deliverable Dialog */}
      <Dialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Deliverable"
        description="Update the deliverable title, description, or completion status."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label htmlFor="editDeliverableTitleInput" className="text-xs font-medium text-slate-700 block mb-1">
              Title
            </label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              disabled={isPending}
              id="editDeliverableTitleInput"
            />
          </div>
          <div>
            <label htmlFor="editDeliverableDescInput" className="text-xs font-medium text-slate-700 block mb-1">
              Description
            </label>
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              disabled={isPending}
              id="editDeliverableDescInput"
            />
          </div>
          <div>
            <label htmlFor="editDeliverableStatusSelect" className="text-xs font-medium text-slate-700 block mb-1">
              Status
            </label>
            <Select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as DeliverableStatus)}
              disabled={isPending}
              id="editDeliverableStatusSelect"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setEditingItem(null)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            isLoading={isPending}
            disabled={isPending || editTitle.trim().length < 2}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Deliverable Confirmation Dialog */}
      <Dialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        title="Remove Deliverable"
        description={`Are you sure you want to remove "${deletingItem?.title}"? This action cannot be undone.`}
      >
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDeletingItem(null)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isPending}
            disabled={isPending}
            id="confirmDeleteDeliverableButton"
          >
            Remove Deliverable
          </Button>
        </DialogFooter>
      </Dialog>
    </Card>
  );
}
