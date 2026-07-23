import type {
  BusinessReports,
  DailyOpsDashboard,
  FeeSnapshot,
} from "@/features/analytics/types";

export const EMPTY_FEES: FeeSnapshot = {
  feesThisMonthCents: 0,
  grossThisMonthCents: 0,
  netThisMonthCents: 0,
  effectiveFeeRatePercent: 0,
  byMethod: [],
};

const ZERO_MEMBERSHIPS = {
  active: 0,
  activeClients: 0,
  newThisMonth: 0,
  cancelled: 0,
  netGrowth: 0,
  atRisk: 0,
  expired: 0,
};

const ZERO_ATTENDANCE = {
  ratePercent: 0,
  missedSessions: 0,
  averageAttendance: 0,
};

const ZERO_PAYMENTS = {
  successful: 0,
  failed: 0,
  outstandingCents: 0,
  refunds: 0,
};

/** Zeroed business reports when live data is unavailable (not demo fixtures). */
export function emptyBusinessReports(
  message: string | null = null,
): BusinessReports {
  return {
    isDemo: false,
    unavailable: true,
    unavailableMessage: message,
    revenuePeriods: [],
    revenueChart: [],
    bookingPeriods: [],
    bookingsChart: [],
    memberships: ZERO_MEMBERSHIPS,
    attendance: ZERO_ATTENDANCE,
    capacity: [],
    averageCapacityPercent: 0,
    topPrograms: [],
    payments: ZERO_PAYMENTS,
    fees: EMPTY_FEES,
    activity: [],
    kpis: [],
  };
}

/** Zeroed daily ops when live data is unavailable (not demo fixtures). */
export function emptyDailyOpsDashboard(
  message: string | null = null,
): DailyOpsDashboard {
  return {
    isDemo: false,
    unavailable: true,
    unavailableMessage: message,
    health: [],
    overview: [],
    schedule: [],
    payments: [],
    signups: [],
    messages: [],
  };
}
