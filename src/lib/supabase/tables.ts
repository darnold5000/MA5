export const MA5_TABLES = {
  profiles: "ma5_profiles",
  userRoles: "ma5_user_roles",
  notifications: "ma5_notifications",
  classTypes: "ma5_class_types",
  products: "ma5_products",
  sessions: "ma5_sessions",
  bookings: "ma5_bookings",
  memberships: "ma5_memberships",
} as const;

export type Ma5TableName = (typeof MA5_TABLES)[keyof typeof MA5_TABLES];
