export const MA5_TABLES = {
  profiles: "ma5_profiles",
  userRoles: "ma5_user_roles",
  notifications: "ma5_notifications",
} as const;

export type Ma5TableName = (typeof MA5_TABLES)[keyof typeof MA5_TABLES];
