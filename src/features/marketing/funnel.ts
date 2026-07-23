export type FunnelTimestamps = {
  leadCreatedAt: string | null;
  invitedAt: string | null;
  invitationAcceptedAt: string | null;
  memberActivatedAt: string | null;
};

export type FunnelReport = {
  leadsCreated: number;
  invitationsSent: number;
  invitationsAccepted: number;
  membersActivated: number;
  /** Average days from lead created → invitation sent */
  avgDaysLeadToInvite: number | null;
  /** Average days from lead created → conversion (accepted/activated) */
  avgDaysLeadToConversion: number | null;
  stages: { label: string; value: number }[];
};

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return (b - a) / (1000 * 60 * 60 * 24);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export type FunnelLeadRow = {
  created_at: string;
  invited_at: string | null;
  converted_at: string | null;
  status: string;
  converted_profile_id: string | null;
};

export type FunnelProfileRow = {
  id: string;
  invited_at: string | null;
  invitation_accepted_at: string | null;
  created_at: string;
  active?: boolean;
  client_status?: string | null;
  lead_id: string | null;
};

function isActivatedMember(profile: FunnelProfileRow): boolean {
  if (profile.client_status) {
    return profile.client_status === "active";
  }
  return Boolean(
    profile.active && (profile.invitation_accepted_at || profile.lead_id),
  );
}

/**
 * Pure funnel aggregation for dashboard + tests.
 */
export function buildFunnelReport(
  leads: FunnelLeadRow[],
  profiles: FunnelProfileRow[],
): FunnelReport {
  const leadsCreated = leads.length;
  const invitationsSent = leads.filter((l) => Boolean(l.invited_at)).length;
  const invitationsAccepted = profiles.filter((p) =>
    Boolean(p.invitation_accepted_at),
  ).length;
  const membersActivated = profiles.filter(isActivatedMember).length;

  const leadToInviteDays: number[] = [];
  const leadToConvertDays: number[] = [];

  for (const lead of leads) {
    if (lead.invited_at) {
      leadToInviteDays.push(daysBetween(lead.created_at, lead.invited_at));
    }
    const convertAt = lead.converted_at;
    if (convertAt) {
      leadToConvertDays.push(daysBetween(lead.created_at, convertAt));
    } else if (lead.converted_profile_id) {
      const profile = profiles.find((p) => p.id === lead.converted_profile_id);
      const accepted = profile?.invitation_accepted_at;
      if (accepted) {
        leadToConvertDays.push(daysBetween(lead.created_at, accepted));
      }
    }
  }

  return {
    leadsCreated,
    invitationsSent,
    invitationsAccepted,
    membersActivated,
    avgDaysLeadToInvite: average(leadToInviteDays),
    avgDaysLeadToConversion: average(leadToConvertDays),
    stages: [
      { label: "Lead created", value: leadsCreated },
      { label: "Invitation sent", value: invitationsSent },
      { label: "Invitation accepted", value: invitationsAccepted },
      { label: "Member activated", value: membersActivated },
    ],
  };
}
