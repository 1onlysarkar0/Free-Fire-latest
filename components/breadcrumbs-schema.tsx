"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { generateBreadcrumbs } from "@/lib/schema/breadcrumbs";

export function BreadcrumbsSchema() {
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  
  if (!pathname || pathname === "/") return null;

  const breadcrumbs = generateBreadcrumbs(pathname, baseUrl);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
    />
  );
}
