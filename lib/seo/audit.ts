export interface SeoCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
  severity: "critical" | "warning" | "info";
}

export interface SeoAuditResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: SeoCheck[];
  criticalIssues: string[];
  warnings: string[];
  suggestions: string[];
}

export function auditSeo(pageId: string, seo: {
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  structuredDataJson: string | null;
  schemaType?: string | null;
}): SeoAuditResult {
  const checks: SeoCheck[] = [];

  const checkLength = (str: string | null | undefined, min: number, max: number) => {
    if (!str) return false;
    return str.length >= min && str.length <= max;
  };

  // 1. Meta Title
  const titlePresent = !!seo.metaTitle?.trim();
  const titleLengthOk = checkLength(seo.metaTitle, 30, 60);
  checks.push({
    name: "Meta Title Present",
    passed: titlePresent,
    score: titlePresent ? 15 : 0,
    maxScore: 15,
    message: titlePresent ? "Meta title is set." : "Meta title is missing.",
    severity: "critical",
  });
  checks.push({
    name: "Meta Title Length (30-60)",
    passed: titleLengthOk,
    score: titleLengthOk ? 10 : 0,
    maxScore: 10,
    message: titleLengthOk 
      ? "Title length is optimal." 
      : seo.metaTitle 
        ? `Title length (${seo.metaTitle.length} chars) is outside optimal range of 30-60.` 
        : "Title is missing.",
    severity: "warning",
  });

  // 2. Meta Description
  const descPresent = !!seo.metaDescription?.trim();
  const descLengthOk = checkLength(seo.metaDescription, 120, 160);
  checks.push({
    name: "Meta Description Present",
    passed: descPresent,
    score: descPresent ? 15 : 0,
    maxScore: 15,
    message: descPresent ? "Meta description is set." : "Meta description is missing.",
    severity: "critical",
  });
  checks.push({
    name: "Meta Description Length (120-160)",
    passed: descLengthOk,
    score: descLengthOk ? 10 : 0,
    maxScore: 10,
    message: descLengthOk 
      ? "Description length is optimal." 
      : seo.metaDescription 
        ? `Description length (${seo.metaDescription.length} chars) is outside optimal range of 120-160.` 
        : "Description is missing.",
    severity: "warning",
  });

  // 3. Open Graph
  const ogTitlePresent = !!seo.ogTitle?.trim();
  checks.push({
    name: "Open Graph Title Present",
    passed: ogTitlePresent,
    score: ogTitlePresent ? 10 : 0,
    maxScore: 10,
    message: ogTitlePresent ? "OG Title is set." : "OG Title is missing (falls back to meta title).",
    severity: "warning",
  });

  const ogDescPresent = !!seo.ogDescription?.trim();
  checks.push({
    name: "Open Graph Description Present",
    passed: ogDescPresent,
    score: ogDescPresent ? 10 : 0,
    maxScore: 10,
    message: ogDescPresent ? "OG Description is set." : "OG Description is missing (falls back to meta desc).",
    severity: "warning",
  });

  const ogImagePresent = !!seo.ogImage?.trim();
  checks.push({
    name: "Open Graph Image Set",
    passed: ogImagePresent,
    score: ogImagePresent ? 15 : 0,
    maxScore: 15,
    message: ogImagePresent ? "OG Image is configured." : "OG Image is missing.",
    severity: "critical",
  });

  // 4. Canonical URL
  const canonicalPresent = !!seo.canonicalUrl?.trim() && (seo.canonicalUrl.startsWith("http://") || seo.canonicalUrl.startsWith("https://"));
  checks.push({
    name: "Canonical URL Valid",
    passed: canonicalPresent,
    score: canonicalPresent ? 10 : 0,
    maxScore: 10,
    message: canonicalPresent ? "Canonical URL is valid." : "Canonical URL is missing or invalid.",
    severity: "critical",
  });

  // 5. Robots
  const robotsPresent = !!seo.robots?.trim();
  checks.push({
    name: "Robots Directive Set",
    passed: robotsPresent,
    score: robotsPresent ? 5 : 0,
    maxScore: 5,
    message: robotsPresent ? `Robots rule is: ${seo.robots}` : "Robots rule is missing.",
    severity: "warning",
  });

  // 6. Schema/Structured Data
  let schemaValid = false;
  let schemaMsg = "Structured data JSON is missing.";
  if (seo.structuredDataJson?.trim()) {
    try {
      JSON.parse(seo.structuredDataJson);
      schemaValid = true;
      schemaMsg = "Structured data JSON is valid.";
    } catch {
      schemaMsg = "Structured data has invalid JSON syntax.";
    }
  }
  checks.push({
    name: "Structured Data Valid",
    passed: schemaValid,
    score: schemaValid ? 10 : 0,
    maxScore: 10,
    message: schemaMsg,
    severity: "critical",
  });

  // Calculate score
  const actualScoreEarned = checks.reduce((acc, c) => acc + c.score, 0);
  const totalMaxPossible = checks.reduce((acc, c) => acc + c.maxScore, 0);
  const finalScore = Math.min(100, Math.max(0, Math.round((actualScoreEarned / totalMaxPossible) * 100)));

  let grade: "A" | "B" | "C" | "D" | "F" = "F";
  if (finalScore >= 90) grade = "A";
  else if (finalScore >= 80) grade = "B";
  else if (finalScore >= 70) grade = "C";
  else if (finalScore >= 50) grade = "D";

  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  checks.forEach((c) => {
    if (!c.passed) {
      if (c.severity === "critical") {
        criticalIssues.push(c.message);
      } else if (c.severity === "warning") {
        warnings.push(c.message);
      } else {
        suggestions.push(c.message);
      }
    }
  });

  return {
    score: finalScore,
    grade,
    checks,
    criticalIssues,
    warnings,
    suggestions,
  };
}
