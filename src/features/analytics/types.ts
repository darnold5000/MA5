export type HealthStatus = "good" | "watch" | "alert";

export type HealthMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: HealthStatus;
};

export type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  href: string;
};

export type ScheduleRow = {
  id: string;
  time: string;
  title: string;
  coach: string;
  booked: number;
  capacity: number;
  href: string;
};

export type PaymentRow = {
  id: string;
  clientName: string;
  amountCents: number;
  status: "paid" | "failed" | "refunded" | "pending";
  when: string;
  product: string;
};

export type SignupRow = {
  id: string;
  clientName: string;
  plan: string;
  when: string;
};

export type MessageRow = {
  id: string;
  from: string;
  preview: string;
  when: string;
  unread: boolean;
};

export type MetricTone =
  | "default"
  | "positive"
  | "negative"
  | "warning"
  | "muted";

export type PeriodMetric = {
  id: string;
  label: string;
  value: string;
  note?: string;
  tone?: MetricTone;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type MembershipSnapshot = {
  active: number;
  newThisMonth: number;
  cancelled: number;
  netGrowth: number;
  atRisk: number;
  expired: number;
};

export type AttendanceSnapshot = {
  ratePercent: number;
  missedSessions: number;
  averageAttendance: number;
};

export type CapacityRow = {
  id: string;
  label: string;
  booked: number;
  capacity: number;
};

export type ProgramPopularity = {
  id: string;
  name: string;
  members: number;
  changePercent: number;
};

export type ActivityItem = {
  id: string;
  text: string;
  when: string;
};

export type PaymentSnapshot = {
  successful: number;
  failed: number;
  outstandingCents: number;
  refunds: number;
};

export type FeeMethodRow = {
  method: string;
  feeCents: number;
  grossCents: number;
  effectiveRatePercent: number;
};

export type FeeSnapshot = {
  feesThisMonthCents: number;
  grossThisMonthCents: number;
  netThisMonthCents: number;
  effectiveFeeRatePercent: number;
  byMethod: FeeMethodRow[];
};

export type DailyOpsDashboard = {
  isDemo?: boolean;
  health: HealthMetric[];
  overview: OverviewMetric[];
  schedule: ScheduleRow[];
  payments: PaymentRow[];
  signups: SignupRow[];
  messages: MessageRow[];
};

export type BusinessReports = {
  isDemo?: boolean;
  revenuePeriods: PeriodMetric[];
  revenueChart: ChartPoint[];
  bookingPeriods: PeriodMetric[];
  bookingsChart: ChartPoint[];
  memberships: MembershipSnapshot;
  attendance: AttendanceSnapshot;
  capacity: CapacityRow[];
  averageCapacityPercent: number;
  topPrograms: ProgramPopularity[];
  payments: PaymentSnapshot;
  fees: FeeSnapshot;
  activity: ActivityItem[];
  kpis: PeriodMetric[];
};
