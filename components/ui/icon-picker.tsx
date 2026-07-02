"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
  forwardRef,
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Search, X, ChevronDown, Check, Sparkles } from "lucide-react";
import { getIconByName, ICON_LIST } from "@/lib/seo/helpers";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

type FlatIcon = {
  name: string;
  category: string;
};

const CELL_MIN_WIDTH = 76;

const IconPickerTrigger = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & {
    open: boolean;
    value: string;
    placeholder: string;
    icon: ReactNode;
  }
>(function IconPickerTrigger(
  { className, open, value, placeholder, icon, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="icon-picker-trigger"
      className={cn(
        "flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        open && "border-ring bg-accent/40",
        className
      )}
      {...props}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-primary">
        {icon}
      </span>

      <span className="min-w-0 flex-1 truncate text-left font-medium">
        {value || placeholder}
      </span>

      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
});

const IconPickerSearch = forwardRef<
  HTMLInputElement,
  ComponentProps<"input"> & {
    onClear: () => void;
  }
>(function IconPickerSearch({ className, value, onClear, ...props }, ref) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 shadow-sm",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        ref={ref}
        value={value}
        className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        placeholder="Search icons..."
        aria-label="Search icons"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
});

function IconPickerPanel({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Choose icon"
      className={cn(
        "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-0 max-w-[42rem] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl",
        "max-sm:fixed max-sm:inset-x-2 max-sm:bottom-2 max-sm:top-auto max-sm:w-auto max-sm:max-w-none max-sm:rounded-2xl",
        className
      )}
      {...props}
    />
  );
}

function IconPickerCell({ id, active, selected, name, onSelect, onFocusCell, children, }: { id: string; active: boolean; selected: boolean; name: string; onSelect: () => void; onFocusCell: () => void; children: ReactNode; }) {
  return (
    <button
      id={id}
      type="button"
      role="gridcell"
      aria-selected={selected}
      tabIndex={active ? 0 : -1}
      title={name}
      onFocus={onFocusCell}
      onMouseEnter={onFocusCell}
      onClick={onSelect}
      className={cn(
        "group relative flex aspect-square min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : active
            ? "border-border bg-accent text-foreground"
            : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
      )}
    >
      {selected ? (
        <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-2.5" />
        </span>
      ) : null}

      <span className="flex size-5 items-center justify-center">
        {children}
      </span>

      <span className="w-full truncate text-[11px] font-medium leading-tight">
        {name}
      </span>
    </button>
  );
}

export function IconPicker({
  value,
  onChange,
  className,
  placeholder = "Select icon",
  disabled = false,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeName, setActiveName] = useState("");
  const [SelectedIconComponent, setSelectedIconComponent] = useState(() => getIconByName(value));

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const previousValueRef = useRef(value);

  const gridId = useId();
  const titleId = useId();
  const optionPrefix = useId();

  useEffect(() => {
    if (previousValueRef.current !== value) {
      previousValueRef.current = value;
      setSelectedIconComponent(getIconByName(value));
    }
  }, [value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return ICON_LIST;

    return ICON_LIST.map((section) => ({
      ...section,
      icons: section.icons.filter((icon) =>
        icon.toLowerCase().includes(query)
      ),
    })).filter((section) => section.icons.length > 0);
  }, [search]);

  const flatIcons = useMemo<FlatIcon[]>(() => {
    return filtered.flatMap((section) =>
      section.icons.map((name) => ({
        name,
        category: section.category,
      }))
    );
  }, [filtered]);

  const activeIndex = useMemo(
    () => flatIcons.findIndex((item) => item.name === activeName),
    [flatIcons, activeName]
  );

  const selectedIndex = useMemo(
    () => flatIcons.findIndex((item) => item.name === value),
    [flatIcons, value]
  );

  const getColumnCount = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return 1;

    const firstSectionGrid = grid.querySelector("[data-icon-grid]") as HTMLDivElement | null;
    const width = firstSectionGrid?.clientWidth ?? grid.clientWidth;
    if (!width) return 1;

    return Math.max(1, Math.floor(width / CELL_MIN_WIDTH));
  }, []);

  const closePicker = useCallback((restoreFocus = false) => {
    setOpen(false);
    setSearch("");
    if (restoreFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setActiveName(name);
      closePicker(true);
    },
    [onChange, closePicker]
  );

  const move = useCallback(
    (nextIndex: number) => {
      if (!flatIcons.length) return;

      const safeIndex = Math.max(0, Math.min(nextIndex, flatIcons.length - 1));
      const next = flatIcons[safeIndex];
      if (!next) return;

      setActiveName(next.name);

      requestAnimationFrame(() => {
        const el = document.getElementById(`${optionPrefix}-${next.name}`);
        el?.focus();
        el?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    },
    [flatIcons, optionPrefix]
  );

  useEffect(() => {
    if (!open) return;

    if (value && selectedIndex >= 0) {
      setActiveName(value);
    } else if (flatIcons[0]) {
      setActiveName(flatIcons[0].name);
    } else {
      setActiveName("");
    }
  }, [open, value, selectedIndex, flatIcons]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) {
        closePicker(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker(true);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, closePicker]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      openPicker();
    }
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!flatIcons.length) return;

    const cols = getColumnCount();

    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(activeIndex >= 0 ? activeIndex + cols : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(activeIndex >= 0 ? activeIndex - cols : 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(activeIndex >= 0 ? activeIndex + 1 : 0);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(activeIndex >= 0 ? activeIndex - 1 : 0);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(flatIcons.length - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      handleSelect(flatIcons[activeIndex].name);
    }
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!flatIcons.length) return;

    const cols = getColumnCount();

    if (event.key === "ArrowRight") {
      event.preventDefault();
      move(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(activeIndex - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(activeIndex + cols);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(activeIndex - cols);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(flatIcons.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (activeIndex >= 0) {
        handleSelect(flatIcons[activeIndex].name);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePicker(true);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full min-w-0", className)}
      data-slot="icon-picker"
    >
      <IconPickerTrigger
        ref={triggerRef}
        open={open}
        value={value}
        placeholder={placeholder}
        icon={<SelectedIconComponent className="size-4" />}
        disabled={disabled}
        onClick={() => (open ? closePicker(false) : openPicker())}
        onKeyDown={onTriggerKeyDown}
        aria-expanded={open}
        aria-controls={gridId}
        aria-haspopup="dialog"
        aria-label={value ? `Selected icon ${value}` : placeholder}
      />

      {open ? (
        <IconPickerPanel aria-labelledby={titleId}>
          <div className="flex max-h-[min(85dvh,42rem)] flex-col">
            <div className="sticky top-0 z-10 border-b border-border bg-popover/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
              <div className="mb-3 flex items-start justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
                <div className="min-w-0">
                  <div
                    id={titleId}
                    className="text-sm font-semibold text-foreground"
                  >
                    Choose icon
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Search and select a responsive icon
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 shadow-sm max-sm:w-full">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
                    <SelectedIconComponent className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                    {value || "No icon selected"}
                  </div>
                </div>
              </div>

              <IconPickerSearch
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onClear={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
              />
            </div>

            <div className="overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                  <Sparkles className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    No icons found
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Try another search keyword.
                  </p>
                </div>
              ) : (
                <div
                  id={gridId}
                  ref={gridRef}
                  role="grid"
                  aria-label="Icon grid"
                  aria-rowcount={flatIcons.length}
                  className="space-y-4"
                  onKeyDown={onGridKeyDown}
                >
                  {filtered.map((section) => (
                    <section key={section.category} className="space-y-2">
                      <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {section.category}
                      </div>

                      <div
                        data-icon-grid
                        className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(84px,1fr))]"
                      >
                        {section.icons.map((name) => {
                          const Icon = getIconByName(name);
                          const selected = name === value;
                          const active = name === activeName;

                          return (
                            <IconPickerCell
                              key={name}
                              id={`${optionPrefix}-${name}`}
                              name={name}
                              active={active}
                              selected={selected}
                              onFocusCell={() => setActiveName(name)}
                              onSelect={() => handleSelect(name)}
                            >
                              <Icon className="size-5" />
                            </IconPickerCell>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Use arrow keys to move through icons and press Enter to select.
              </p>
            </div>
          </div>
        </IconPickerPanel>
      ) : null}
    </div>
  );
}