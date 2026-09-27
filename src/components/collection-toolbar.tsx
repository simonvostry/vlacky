"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const ToolbarContext = createContext<{
  target: HTMLDivElement | null;
  setTarget: (element: HTMLDivElement | null) => void;
} | null>(null);

/** Pages retain ownership of authorized filter data; only the controls move into Nav. */
export function CollectionToolbarProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return <ToolbarContext.Provider value={{ target, setTarget }}>{children}</ToolbarContext.Provider>;
}

export function CollectionToolbarSlot() {
  const toolbar = useContext(ToolbarContext);
  return <div ref={toolbar?.setTarget} className="order-4 min-w-0 w-full empty:hidden 2xl:order-2 2xl:ml-auto 2xl:w-auto" />;
}

export function CollectionToolbar({ children }: { children: ReactNode }) {
  const toolbar = useContext(ToolbarContext);
  return toolbar?.target ? createPortal(children, toolbar.target) : null;
}
