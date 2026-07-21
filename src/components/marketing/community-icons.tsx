import type { CommunityEventIcon } from "@/content/community";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

function HeartIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M24 41s-14-8.5-14-18.5C10 15 14.5 11 19.5 11c3 0 4.5 1.5 4.5 1.5S25.5 11 28.5 11C33.5 11 38 15 38 22.5 38 32.5 24 41 24 41z" />
    </svg>
  );
}

function MountainsIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 36 18 16l7 10 5-7 12 17H6z" />
      <path d="M24 26l4-5 8 11" />
    </svg>
  );
}

function DumbbellIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 18v12M14 16v16M34 16v16M38 18v12" />
      <path d="M14 24h20" />
      <path d="M8 21v6M40 21v6" />
    </svg>
  );
}

function ChurchIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M24 6v6M21 9h6" />
      <path d="M16 18h16v22H16z" />
      <path d="M12 40V28l12-10 12 10v12" />
      <path d="M22 40v-8h4v8" />
    </svg>
  );
}

function BowlingIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 10c0 2 1.5 3 1.5 5.5S16 20 16 22c0 4 3 7 8 7s8-3 8-7c0-2-1.5-4.5-1.5-6.5S32 10 32 10c-2 0-4 2-8 2s-6-2-8-2z" />
      <path d="M20 10v2M24 8v3M28 10v2" />
      <circle cx="34" cy="34" r="7" />
      <circle cx="32" cy="31" r="1" fill="currentColor" stroke="none" />
      <circle cx="35.5" cy="32.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="32.5" cy="35" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const icons = {
  heart: HeartIcon,
  mountains: MountainsIcon,
  dumbbell: DumbbellIcon,
  church: ChurchIcon,
  bowling: BowlingIcon,
} satisfies Record<CommunityEventIcon, (props: IconProps) => ReturnType<typeof HeartIcon>>;

export function CommunityEventIconMark({
  name,
  className,
}: {
  name: CommunityEventIcon;
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon className={cn("h-10 w-10 text-brand", className)} />;
}
