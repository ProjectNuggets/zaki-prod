import { useEffect, useRef, type ComponentType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2SettingsNavItem = {
  href: string;
  label: ReactNode;
  meta?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "warn" | "danger";
  group?: ReactNode;
};

export function V2SettingsNav({
  eyebrow,
  title,
  items,
  ariaLabel,
  className,
  activeHref,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  items: readonly V2SettingsNavItem[];
  ariaLabel: string;
  className?: string;
  activeHref?: string;
}) {
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const activeLink = navRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    if (typeof activeLink?.scrollIntoView === "function") {
      activeLink.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeHref]);

  return (
    <aside className={cn("v2-settings-nav", className)}>
      <div className="v2-settings-nav__head">
        <div>{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <nav ref={navRef} aria-label={ariaLabel} className="v2-settings-nav__list">
        {items.map(({ href, label, meta, icon: Icon, tone = "default", group }, index) => {
          const isActive = activeHref === href;
          const previousGroup = index > 0 ? items[index - 1]?.group : null;
          const showGroup = group != null && group !== previousGroup;
          return (
            <div key={href} className="v2-settings-nav__item">
              {showGroup ? <div className="v2-settings-nav__group">{group}</div> : null}
              <a
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(isActive && "is-active", tone !== "default" && `is-${tone}`)}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{label}</span>
                {meta != null ? <small>{meta}</small> : null}
              </a>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function V2SettingsBlock({
  title,
  meta,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className={cn("v2-settings-block", className)} {...props}>
      <div className="v2-settings-block__head">
        <h2>{title}</h2>
        {meta != null ? <span>{meta}</span> : null}
      </div>
      <div className="v2-settings-block__body">{children}</div>
    </section>
  );
}

export function V2SettingsRow({
  name,
  description,
  children,
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  name: ReactNode;
  description?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={cn(
        "v2-settings-row",
        tone !== "default" && `v2-settings-row--${tone}`,
        className
      )}
      {...props}
    >
      <div className="v2-settings-row__label">
        <div>{name}</div>
        {description != null ? <p>{description}</p> : null}
      </div>
      <div className="v2-settings-row__control">{children}</div>
    </div>
  );
}

/**
 * A settings row whose action is intentionally not wired because no real
 * backend/BFF route exists yet (or it is operator-managed). It renders the
 * label, optional description, a badge, and a human-readable reason, and is
 * marked disabled for assistive tech. This is the canonical way to keep
 * /settings truthful instead of inventing UI from the mockup.
 */
export function GatedRow({
  name,
  description,
  reason,
  badge,
}: {
  name: ReactNode;
  description?: ReactNode;
  reason: ReactNode;
  badge?: string;
}) {
  return (
    <div
      className="v2-settings-row v2-settings-row--gated"
      data-gated="true"
      aria-disabled="true"
    >
      <div className="v2-settings-row__label">
        <div>{name}</div>
        {description != null ? <p>{description}</p> : null}
      </div>
      <div className="v2-settings-row__control v2-settings-row__control--gated">
        <span className="v2-settings-gated__badge">{badge ?? "Gated"}</span>
        <span className="v2-settings-gated__reason">{reason}</span>
      </div>
    </div>
  );
}
