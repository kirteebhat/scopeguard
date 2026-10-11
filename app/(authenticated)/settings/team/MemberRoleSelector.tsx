"use client";

import React, { useActionState, useState } from "react";
import { updateMemberRoleAction } from "@/app/actions/members";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { MemberRole } from "@/lib/data/auth-context";
import type { ActionState } from "@/app/actions/auth";

interface MemberRoleSelectorProps {
  targetUserId: string;
  currentRole: MemberRole;
  isCurrentUserOwner: boolean;
  isTargetOwner: boolean;
}

export function MemberRoleSelector({
  targetUserId,
  currentRole,
  isCurrentUserOwner,
  isTargetOwner,
}: MemberRoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<string>(currentRole);
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    updateMemberRoleAction,
    null
  );

  if (isTargetOwner) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="info">Owner</Badge>
        <span className="text-[11px] text-slate-500 italic">Primary Administrator</span>
      </div>
    );
  }

  if (!isCurrentUserOwner) {
    return (
      <Badge variant={currentRole === "manager" ? "warning" : "default"}>
        {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
      </Badge>
    );
  }

  const hasChanged = selectedRole !== currentRole;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <div className="w-32">
        <Select
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          disabled={isPending}
          className="py-1 px-2.5 text-xs h-8"
        >
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </Select>
      </div>

      {hasChanged && (
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="h-8 text-xs px-2.5 whitespace-nowrap"
          isLoading={isPending}
        >
          Save
        </Button>
      )}

      {state?.message && !state.success && (
        <span className="text-[11px] text-rose-600 font-medium">
          {state.message}
        </span>
      )}
    </form>
  );
}

