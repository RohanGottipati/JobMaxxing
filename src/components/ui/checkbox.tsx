"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

function Checkbox({
  checked,
  onCheckedChange,
  id,
  className,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-transparent text-primary-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:border-primary aria-checked:bg-primary",
        className,
      )}
      {...props}
    >
      {checked ? <Check aria-hidden className="size-3" strokeWidth={3} /> : null}
    </button>
  );
}

export { Checkbox };
