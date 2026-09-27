"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { dropdownPosition, typeaheadIndex } from "@/lib/filter-dropdown";
import type { FilterOption } from "@/lib/collection-filters";

type Props = {
  label: string; emptyLabel: string; value: string; options: FilterOption[];
  renderOption?: (option: FilterOption, location: "trigger" | "option") => ReactNode;
  disabled?: boolean; className?: string; onChange: (value: string) => void;
};

export function FilterDropdown({ label, emptyLabel, value, options, disabled, className = "", onChange, renderOption }: Props) {
  const choices = [{ value: "", label: emptyLabel },
    ...(value && !options.some(option => option.value === value) ? [{ value, label: "Nedostupná volba" }] : []), ...options];
  const selected = Math.max(0, choices.findIndex(option => option.value === value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState<ReturnType<typeof dropdownPosition>>();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", time: 0 });
  const listId = useId();
  const activeIndex = Math.min(active, choices.length - 1);

  const measure = useCallback(() => {
    if (!trigger.current) return;
    const viewport = window.visualViewport;
    const next = dropdownPosition(trigger.current.getBoundingClientRect(), {
      left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0,
      width: viewport?.width || window.innerWidth, height: viewport?.height || window.innerHeight,
      layoutHeight: window.innerHeight,
    }, list.current ? list.current.scrollHeight + 2 : choices.length * 36 + 10);
    setPosition(previous => previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, [choices.length]);

  useLayoutEffect(() => { if (open) measure(); }, [open, measure]);

  function show(index = selected) {
    if (disabled) return;
    measure();
    setActive(index);
    setOpen(true);
  }
  function choose(index: number) {
    if (disabled) return;
    setOpen(false);
    trigger.current?.focus();
    if (choices[index].value !== value) onChange(choices[index].value);
  }

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!trigger.current?.contains(event.target as Node) && !list.current?.contains(event.target as Node)) setOpen(false);
    }
    function scroll(event: Event) {
      if (!list.current?.contains(event.target as Node)) setOpen(false);
    }
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", measure);
    window.addEventListener("popstate", close);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", measure);
      window.removeEventListener("popstate", close);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", close);
    };
  }, [open, measure]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = list.current;
    const option = document.getElementById(`${listId}-${activeIndex}`);
    if (!panel || !option) return;
    const bounds = panel.getBoundingClientRect(), item = option.getBoundingClientRect();
    // Scroll only this list; scrollIntoView can also move the page/sticky navigation.
    if (item.top < bounds.top + 4) panel.scrollTop -= bounds.top + 4 - item.top;
    else if (item.bottom > bounds.bottom - 4) panel.scrollTop += item.bottom - bounds.bottom + 4;
  }, [open, activeIndex, listId, position]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || event.ctrlKey || event.metaKey) return;
    const last = choices.length - 1;
    if (event.key === "Escape") { if (open) event.preventDefault(); setOpen(false); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex); else show();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(event.key)) {
      event.preventDefault();
      const current = open ? activeIndex : selected;
      const index = event.key === "Home" ? 0 : event.key === "End" ? last :
        Math.max(0, Math.min(last, current + (event.key === "PageDown" ? 10 : event.key === "PageUp" ? -10 : !open ? 0 : event.key === "ArrowDown" ? 1 : -1)));
      show(index);
      return;
    }
    if (event.key.length === 1 && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      typed.current = { text: now - typed.current.time < 750 ? typed.current.text + event.key : event.key, time: now };
      show(typeaheadIndex(choices.map(option => option.label), typed.current.text, open ? activeIndex : selected));
    }
  }

  return <div className={`min-w-32 flex-[1_1_8rem] sm:flex-none ${className}`}>
    <button ref={trigger} type="button" role="combobox" aria-label={label} title={`${label}: ${choices[selected].label}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined} aria-disabled={!!disabled}
      className={`flex min-h-10 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${disabled ? "cursor-wait opacity-55" : "hover:border-accent"} ${open ? "border-accent bg-accent-soft" : "border-control bg-surface"}`}
      onClick={() => { if (!disabled) { if (open) setOpen(false); else show(); } }}
      onBlur={() => setOpen(false)} onKeyDown={onKeyDown}>
      <span className="min-w-0 flex-1 truncate">{renderOption ? renderOption(choices[selected], "trigger") : choices[selected].label}</span>
      <ChevronDownIcon className={`size-4 shrink-0 text-secondary ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open && position && createPortal(<div ref={list} id={listId} role="listbox" aria-label={label}
      style={{ ...position, scrollbarWidth: "thin", scrollbarColor: "var(--control-border) transparent" }}
      className="fixed z-[70] overflow-y-auto overscroll-contain rounded-lg border border-divider bg-surface p-1 shadow-lg"
      onMouseDown={event => event.preventDefault()}>
      {choices.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option" aria-label={option.label} title={option.label} aria-selected={option.value === value}
        className={`flex min-h-9 cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm [overflow-wrap:anywhere] ${index === activeIndex ? "bg-muted" : ""} ${option.value === value ? "font-medium text-accent" : "text-foreground"}`}
        onPointerMove={event => { if (event.pointerType === "mouse") setActive(index); }} onClick={() => choose(index)}>
        <span className="min-w-0 flex-1">{renderOption ? renderOption(option, "option") : option.label}</span>
        {option.value === value && <CheckIcon className="size-4 shrink-0" aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </div>;
}
