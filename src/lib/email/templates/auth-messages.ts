import type { TenantEmailSettings } from "../types";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there";
}

function footerLine(settings: TenantEmailSettings): string {
  const support = settings.supportEmail?.trim();
  if (support) {
    return `If you were not expecting this, you can ignore this email or contact us at ${support}.`;
  }
  return "If you were not expecting this, you can ignore this email.";
}

export function renderInviteEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const intro = `${brand} has invited you to the member platform.`;
  const instruction =
    "Use the secure link below to set your password and activate your account.";
  const cta = `Activate your ${brand} account`;
  const footer = footerLine(args.settings);

  return {
    subject: `You've been invited to ${brand}`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p>${escapeHtml(instruction)}</p>`,
      `<p><a href="${args.actionLink}">${escapeHtml(cta)}</a></p>`,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [name, "", intro, "", instruction, "", args.actionLink, "", footer].join(
      "\n",
    ),
  };
}

export function renderPasswordResetEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const intro = `Use this secure link to set or update your password for ${brand}.`;
  const footer = footerLine(args.settings);

  return {
    subject: `Reset your ${brand} password`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p><a href="${args.actionLink}">Continue to ${escapeHtml(brand)}</a></p>`,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [name, "", intro, "", args.actionLink, "", footer].join("\n"),
  };
}

export function renderMagicLinkEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const intro = `Sign in to ${brand} using the secure link below.`;
  const footer = footerLine(args.settings);

  return {
    subject: `Sign in to ${brand}`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p><a href="${args.actionLink}">Sign in</a></p>`,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [name, "", intro, "", args.actionLink, "", footer].join("\n"),
  };
}

export function renderCoachInviteEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const intro = `${brand} has invited you to join as a coach on the member platform.`;
  const instruction =
    "Use the secure link below to set your password and access coach tools.";
  const footer = footerLine(args.settings);

  return {
    subject: `Coach invitation — ${brand}`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      `<p>${escapeHtml(instruction)}</p>`,
      `<p><a href="${args.actionLink}">Accept coach invitation</a></p>`,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [
      name,
      "",
      intro,
      "",
      instruction,
      "",
      args.actionLink,
      "",
      footer,
    ].join("\n"),
  };
}

export function renderWelcomeEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink?: string | null;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const intro = `Welcome to ${brand}. Your account is ready.`;
  const footer = footerLine(args.settings);
  const linkBlock = args.actionLink
    ? `<p><a href="${args.actionLink}">Open ${escapeHtml(brand)}</a></p>`
    : "";

  return {
    subject: `Welcome to ${brand}`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      linkBlock,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [
      name,
      "",
      intro,
      "",
      args.actionLink ?? "",
      "",
      footer,
    ].join("\n"),
  };
}

export function renderWelcomeBackEmail(args: {
  settings: TenantEmailSettings;
  fullName: string;
  actionLink: string;
}): { subject: string; html: string; text: string } {
  const name = firstName(args.fullName);
  const brand = args.settings.brandName;
  const footer = footerLine(args.settings);

  return {
    subject: `Welcome back to ${brand}`,
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>Your ${escapeHtml(brand)} member portal access has been restored.</p>`,
      `<p>You can sign in with your existing password, or use the secure link below to set a new one.</p>`,
      `<p><a href="${args.actionLink}">Continue to ${escapeHtml(brand)}</a></p>`,
      `<p>${escapeHtml(footer)}</p>`,
    ].join(""),
    text: [
      name,
      "",
      `Your ${brand} member portal access has been restored.`,
      "",
      "You can sign in with your existing password, or use the secure link below to set a new one:",
      "",
      args.actionLink,
      "",
      footer,
    ].join("\n"),
  };
}
