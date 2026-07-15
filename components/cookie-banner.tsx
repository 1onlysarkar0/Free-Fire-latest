"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      // Delay showing the banner slightly to let the page load
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    // Log consent timestamp or trigger analytics scripts here
    setIsVisible(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pb-20 sm:pb-6 pointer-events-none">
      <div className="mx-auto max-w-4xl bg-background border border-border shadow-lg rounded-xl p-6 pointer-events-auto flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 space-y-2 text-left">
          <h3 className="font-semibold text-lg">We value your privacy</h3>
          <p className="text-sm text-muted-foreground">
            We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience and analyze website traffic. By clicking &quot;Accept&quot;, you agree to our website&apos;s cookie use as described in our Privacy Policy.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Button variant="outline" onClick={rejectCookies} className="w-full sm:w-auto">
            Reject Non-Essential
          </Button>
          <Button onClick={acceptCookies} className="w-full sm:w-auto">
            Accept All Cookies
          </Button>
        </div>
        <button 
          onClick={rejectCookies}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
