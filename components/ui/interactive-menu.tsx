"use client";

import React, { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Calendar, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconComponentType = React.ElementType<{ className?: string }>;

export interface InteractiveMenuItem {
  label: string;
  icon: IconComponentType;
  href?: string;
  exact?: boolean;
  onClick?: () => void;
  renderWrapper?: (children: ReactNode, item: InteractiveMenuItem, isActive: boolean) => ReactNode;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  accentColor?: string;
  className?: string;
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "home", icon: Home, href: "/dashboard" },
  { label: "strategy", icon: Briefcase },
  { label: "period", icon: Calendar },
  { label: "security", icon: Shield },
  { label: "settings", icon: Settings },
];

const defaultAccentColor = "var(--primary)";

export const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  accentColor,
  className,
}) => {
  const pathname = usePathname();

  const finalItems = useMemo(() => {
    const isValid = items && Array.isArray(items) && items.length >= 2 && items.length <= 5;
    if (!isValid) {
      console.warn("InteractiveMenu: 'items' prop is invalid or missing. Using default items.", items);
      return defaultItems;
    }
    return items;
  }, [items]);

  const activeIndexFromPath = useMemo(() => {
    const idx = finalItems.findIndex((item) => {
      if (!item.href) return false;
      return item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
    return idx !== -1 ? idx : 0;
  }, [pathname, finalItems]);

  const [activeIndex, setActiveIndex] = useState(activeIndexFromPath);

  useEffect(() => {
    setActiveIndex(activeIndexFromPath);
  }, [activeIndexFromPath]);

  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const setLineWidth = () => {
      const activeItemElement = itemRefs.current[activeIndex];
      const activeTextElement = textRefs.current[activeIndex];

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth;
        activeItemElement.style.setProperty("--lineWidth", `${textWidth}px`);
      }
    };

    setLineWidth();

    window.addEventListener("resize", setLineWidth);
    return () => {
      window.removeEventListener("resize", setLineWidth);
    };
  }, [activeIndex, finalItems]);

  const handleItemClick = (index: number, item: InteractiveMenuItem) => {
    setActiveIndex(index);
    if (item.onClick) {
      item.onClick();
    }
  };

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor;
    return { "--component-active-color": activeColor } as React.CSSProperties;
  }, [accentColor]);

  return (
    <nav className={cn("menu", className)} role="navigation" style={navStyle}>
      {finalItems.map((item, index) => {
        const isActive = index === activeIndex;
        const isTextActive = isActive;

        const IconComponent = item.icon;

        const buttonElement = (
          <button
            key={item.label}
            type="button"
            className={`menu__item ${isActive ? "active" : ""}`}
            onClick={() => handleItemClick(index, item)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            style={{ "--lineWidth": "0px" } as React.CSSProperties}
          >
            <div className="menu__icon">
              <IconComponent className="h-5 w-5 shrink-0" />
            </div>
            <strong
              className={`menu__text ${isTextActive ? "active" : ""}`}
              ref={(el) => {
                textRefs.current[index] = el;
              }}
            >
              {item.label}
            </strong>
          </button>
        );

        if (item.renderWrapper) {
          return (
            <React.Fragment key={item.label}>
              {item.renderWrapper(buttonElement, item, isActive)}
            </React.Fragment>
          );
        }

        if (item.href) {
          return (
            <Link key={item.label} href={item.href} prefetch={true} className="flex-1 min-w-0 flex justify-center">
              {buttonElement}
            </Link>
          );
        }

        return buttonElement;
      })}
    </nav>
  );
};
