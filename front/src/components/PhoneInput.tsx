"use client";

function formatPhone(raw: string): string {
  // Extract only digits
  const digits = raw.replace(/\D/g, "");

  // Strip country prefix to get local 9 digits
  let local = digits;
  if (local.startsWith("380")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  local = local.slice(0, 9);

  // Build mask: +380 (XX) XXX-XX-XX
  if (local.length === 0) return "+380 ";
  if (local.length <= 2) return `+380 (${local}`;
  if (local.length <= 5) return `+380 (${local.slice(0, 2)}) ${local.slice(2)}`;
  if (local.length <= 7) return `+380 (${local.slice(0, 2)}) ${local.slice(2, 5)}-${local.slice(5)}`;
  if (local.length <= 9) return `+380 (${local.slice(0, 2)}) ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7)}`;
  return `+380 (${local.slice(0, 2)}) ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7, 9)}`;
}

export default function PhoneInput({
  value,
  onChange,
  className,
  required,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      onFocus={(e) => {
        if (!e.target.value) onChange("+380 ");
      }}
      className={className}
      required={required}
      autoFocus={autoFocus}
      placeholder="+380 (XX) XXX-XX-XX"
    />
  );
}
