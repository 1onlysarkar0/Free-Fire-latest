"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";

interface UPIQRProps {
  upiId: string;
  upiName: string;
  size?: number;
}

export function UPIQR({ upiId, upiName, size = 200 }: UPIQRProps) {
  const [copied, setCopied] = useState(false);

  const upiUrl = useMemo(() => {
    if (!upiId) return "";
    const name = encodeURIComponent(upiName || "1onlysarkar");
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${name}&cu=INR`;
  }, [upiId, upiName]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  }

  if (!upiId) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-[1.25rem] bg-accent/45 px-5 text-center"
        style={{ width: size, height: size }}
      >
        <p className="text-sm font-semibold text-foreground">Payment unavailable</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          UPI details are not configured right now.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex justify-center rounded-[1.25rem] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_24px_rgba(16,24,40,0.06)]">
        <QRCodeSVG
          value={upiUrl}
          size={size}
          bgColor="#ffffff"
          fgColor="#111111"
          level="M"
          includeMargin={false}
        />
      </div>

      <div className="flex w-full max-w-[320px] items-center justify-between gap-3 rounded-[1rem] bg-accent/55 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            UPI ID
          </p>
          <span className="mt-1 block truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground select-all [font-family:var(--font-body)]">
            {upiId}
          </span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          aria-label={copied ? "UPI ID copied" : "Copy UPI ID"}
          title={copied ? "Copied" : "Copy UPI ID"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {copied ? (
            <Check className="h-4 w-4 text-foreground" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}