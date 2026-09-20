import Link from "next/link";
import { PencilIcon } from "@heroicons/react/20/solid";
import type { ButtonHTMLAttributes } from "react";

type EditProps = { label: string; href?: string; onClick?: () => void; disabled?: boolean };

export function EditAction({ label, href, onClick, disabled }: EditProps) {
  const content = <><PencilIcon className="size-4" aria-hidden="true" /><span className="ui-tooltip" aria-hidden="true">{label}</span></>;
  return href
    ? <Link className="ui-icon-button ui-edit" href={href} aria-label={label}>{content}</Link>
    : <button type="button" className="ui-icon-button ui-edit" aria-label={label} onClick={onClick} disabled={disabled}>{content}</button>;
}

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger" }) {
  return <button type="button" {...props} className={`ui-button ui-button-${variant} ${className}`} />;
}
