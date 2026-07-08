"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { MultiStepForm } from "@/components/ui/multi-step-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Trophy,
  Gamepad2,
  Users2,
  CalendarDays,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TournamentResult {
  id: string;
  name: string;
  type: string;
  gameMode: string;
  teamFormat: string;
  startTime: string;
  status: string;
  joiningFee: number;
  prizePool: number;
  totalSlots: number;
  maps: string;
}

interface Props {
  userId: string | null;
  userName: string;
  userGameName: string;
}

const TEAM_FORMAT_LABEL: Record<string, string> = {
  solo: "Solo",
  duo: "Duo",
  squad: "Squad",
};

const GAME_MODE_LABEL: Record<string, string> = {
  battle_royale: "Battle Royale",
  clash_squad: "Clash Squad",
  lone_wolf: "Lone Wolf",
};

const STATUS_BADGE: Record<string, string> = {
  UPCOMING: "badge badge-muted",
  ACTIVE: "badge badge-success",
  ROOM_REVEALED: "badge badge-warning",
  LIVE: "badge badge-error",
  COMPLETED: "badge badge-muted",
  FINISHED: "badge badge-muted",
};

const TOTAL_STEPS = 4;

export default function CheaterReportClient({ userId, userName, userGameName }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reportId, setReportId] = useState<string>("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Form fields
  const [reportedUid, setReportedUid] = useState("");
  const [reportedDate, setReportedDate] = useState(""); // "YYYY-MM-DD"
  const [reportedTime, setReportedTime] = useState("12:00");
  const [selectedTournament, setSelectedTournament] = useState<TournamentResult | null>(null);
  const [description, setDescription] = useState("");

  // Tournament search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TournamentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  };

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!reportedUid.trim()) {
        newErrors.reportedUid = "Please enter the cheater's UID";
      } else if (!/^\d+$/.test(reportedUid.trim())) {
        newErrors.reportedUid = "UID must contain only digits";
      } else if (reportedUid.trim().length < 5) {
        newErrors.reportedUid = "UID must be at least 5 digits";
      } else if (reportedUid.trim().length > 20) {
        newErrors.reportedUid = "UID must be at most 20 digits";
      }
    }

    if (currentStep === 2) {
      if (!reportedDate) {
        newErrors.reportedDate = "Please select the date of the incident";
      }
      if (!reportedTime) {
        newErrors.reportedTime = "Please select the time of the incident";
      }
    }

    if (currentStep === 4) {
      if (!description.trim()) {
        newErrors.description = "Please provide a description";
      } else if (description.trim().length < 30) {
        newErrors.description = "Description must be at least 30 characters";
      } else if (description.trim().length > 2000) {
        newErrors.description = "Description must be at most 2000 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, reportedUid, reportedDate, reportedTime, description]);

  const handleNext = useCallback(async () => {
    if (!validateStep()) return;

    if (currentStep === TOTAL_STEPS) {
      if (!userId) {
        setShowLoginDialog(true);
        return;
      }
      // Submit
      setIsSubmitting(true);
      try {
        const dateTimeStr = `${reportedDate}T${reportedTime}:00`;
        const res = await fetch("/api/cheater-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportedUid: reportedUid.trim(),
            reportedAt: dateTimeStr,
            tournamentId: selectedTournament?.id ?? null,
            description: description.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to submit report");
          return;
        }
        setReportId(data.reportId ?? "");
        setIsSuccess(true);
      } catch {
        toast.error("Network error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setCurrentStep((s) => s + 1);
  }, [currentStep, validateStep, reportedUid, reportedDate, reportedTime, selectedTournament, description, userId]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  const handleSearch = useCallback(async () => {
    if (!reportedDate) {
      toast.error("Please select a date first");
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ date: reportedDate });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/cheater-report/tournaments?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to search tournaments");
        setSearchResults([]);
        return;
      }
      setSearchResults(data.data ?? []);
    } catch {
      toast.error("Failed to search tournaments");
    } finally {
      setIsSearching(false);
    }
  }, [reportedDate, searchQuery]);

  const stepTitles = [
    "Enter Cheater's UID",
    "When Did It Happen?",
    "Which Tournament?",
    "Describe the Incident",
  ];

  const stepDescriptions = [
    "Enter the in-game Free Fire UID of the player you want to report.",
    "Select the date and approximate time when the cheating occurred.",
    "Search for and select the tournament where the incident happened. This step is optional.",
    "Provide a clear, detailed description of the cheating behavior you witnessed.",
  ];

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md mx-auto text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mx-auto">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold font-lora text-foreground">Report Submitted!</h1>
            <p className="text-muted-foreground font-ibm text-sm leading-relaxed">
              Your cheater report has been submitted successfully. Our team will review it and take appropriate action.
              You will be notified with updates.
            </p>
            {reportId && (
              <p className="text-xs text-muted-foreground/70 font-mono mt-2">
                Report ID: {reportId}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="font-ibm"
              onClick={() => {
                setIsSuccess(false);
                setCurrentStep(1);
                setReportedUid("");
                setReportedDate("");
                setReportedTime("12:00");
                setSelectedTournament(null);
                setDescription("");
                setSearchResults([]);
                setHasSearched(false);
              }}
            >
              Submit Another Report
            </Button>
            <Button asChild className="font-ibm">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        {/* Page Header */}
        <div className="max-w-2xl mb-10 mx-auto text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/8 px-3 py-1.5 mb-4">
            <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive font-ibm">Report a Cheater</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-lora text-foreground leading-tight">
            Report Unfair Play
          </h1>
          <p className="mt-3 text-muted-foreground font-ibm text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Help us maintain fair competition. Submit detailed reports of cheating, hacking, or unfair play.
            {userGameName && (
              <span className="text-foreground/70"> Reporting as <strong className="text-foreground">{userGameName || userName}</strong>.</span>
            )}
          </p>
        </div>

        {/* Multi-step form */}
        <MultiStepForm
          className="mx-auto"
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          title={stepTitles[currentStep - 1]}
          description={stepDescriptions[currentStep - 1]}
          onBack={handleBack}
          onNext={handleNext}
          nextButtonText={currentStep === TOTAL_STEPS ? "Submit Report" : "Next Step"}
          isLoading={isSubmitting}
          size="lg"
          footerContent={
            <span className="text-xs text-muted-foreground">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
          }
        >
          {/* ─── Step 1: Cheater UID ─── */}
          {currentStep === 1 && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="reported-uid" className="font-ibm font-semibold text-sm">
                  Cheater&apos;s Free Fire UID <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="reported-uid"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 1234567890"
                    value={reportedUid}
                    onChange={(e) => {
                      setReportedUid(e.target.value);
                      clearError("reportedUid");
                    }}
                    className={cn(
                      "font-mono text-base h-12",
                      errors.reportedUid && "ring-2 ring-destructive/50"
                    )}
                    aria-describedby="uid-help uid-error"
                    maxLength={20}
                  />
                </div>
                {errors.reportedUid ? (
                  <p id="uid-error" className="flex items-center gap-1.5 text-xs text-destructive font-ibm">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {errors.reportedUid}
                  </p>
                ) : (
                  <p id="uid-help" className="text-xs text-muted-foreground font-ibm">
                    You can find a player&apos;s UID in their in-game profile page.
                  </p>
                )}
              </div>

              {/* Info card */}
              <div className="card-inset p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold font-ibm text-foreground">How to find a UID</p>
                    <p className="text-xs text-muted-foreground font-ibm leading-relaxed">
                      Open Free Fire → Visit the player&apos;s profile → Their numeric UID is shown below their name.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 2: Date & Time ─── */}
          {currentStep === 2 && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incident-date" className="font-ibm font-semibold text-sm flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    Date of Incident <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="incident-date"
                    type="date"
                    value={reportedDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      setReportedDate(e.target.value);
                      clearError("reportedDate");
                      // Reset tournament selection if date changes
                      setSelectedTournament(null);
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className={cn(
                      "h-12 font-ibm",
                      errors.reportedDate && "ring-2 ring-destructive/50"
                    )}
                    aria-describedby="date-error"
                  />
                  {errors.reportedDate && (
                    <p id="date-error" className="flex items-center gap-1.5 text-xs text-destructive font-ibm">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.reportedDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-time" className="font-ibm font-semibold text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Approximate Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="incident-time"
                    type="time"
                    value={reportedTime}
                    onChange={(e) => {
                      setReportedTime(e.target.value);
                      clearError("reportedTime");
                    }}
                    className={cn(
                      "h-12 font-ibm",
                      errors.reportedTime && "ring-2 ring-destructive/50"
                    )}
                    aria-describedby="time-error"
                  />
                  {errors.reportedTime && (
                    <p id="time-error" className="flex items-center gap-1.5 text-xs text-destructive font-ibm">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.reportedTime}
                    </p>
                  )}
                </div>
              </div>

              {reportedDate && reportedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-inset p-4 rounded-xl"
                >
                  <p className="text-sm font-ibm text-foreground">
                    <span className="text-muted-foreground">Incident time: </span>
                    <strong>
                      {format(new Date(`${reportedDate}T${reportedTime}`), "PPp")}
                    </strong>
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* ─── Step 3: Tournament Selection ─── */}
          {currentStep === 3 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs font-ibm text-muted-foreground bg-accent/50 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>This step is optional. You can skip if the incident was not in a specific tournament.</span>
              </div>

              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="tournament-search"
                    placeholder="Search by name, mode, or format…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9 h-11 font-ibm"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!reportedDate || isSearching}
                  className="h-11 px-5 shrink-0 font-ibm"
                  aria-label="Search tournaments"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-1.5" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {reportedDate && (
                <p className="text-xs text-muted-foreground font-ibm">
                  Searching tournaments on <strong>{format(new Date(reportedDate + "T12:00"), "PPP")}</strong>
                </p>
              )}

              {/* Selected tournament */}
              {selectedTournament && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-success text-[10px]">Selected</span>
                    </div>
                    <p className="font-semibold font-ibm text-foreground text-sm truncate">{selectedTournament.name}</p>
                    <p className="text-xs text-muted-foreground font-ibm mt-0.5">
                      {GAME_MODE_LABEL[selectedTournament.gameMode] ?? selectedTournament.gameMode} ·{" "}
                      {TEAM_FORMAT_LABEL[selectedTournament.teamFormat] ?? selectedTournament.teamFormat}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setSelectedTournament(null)}
                    aria-label="Remove selected tournament"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {/* Search results */}
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!isSearching && hasSearched && searchResults.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <Trophy className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground font-ibm">No tournaments found on this date.</p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTournament(t)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3.5 transition-all duration-150 group",
                        selectedTournament?.id === t.id
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 bg-card hover:border-primary/30 hover:bg-accent/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold font-ibm text-foreground text-sm truncate max-w-[200px]">
                              {t.name}
                            </p>
                            <span className={cn(STATUS_BADGE[t.status] ?? "badge badge-muted", "text-[10px]")}>
                              {t.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-ibm">
                              <Gamepad2 className="w-3 h-3" />
                              {GAME_MODE_LABEL[t.gameMode] ?? t.gameMode}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-ibm">
                              <Users2 className="w-3 h-3" />
                              {TEAM_FORMAT_LABEL[t.teamFormat] ?? t.teamFormat}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-ibm">
                              <Clock className="w-3 h-3" />
                              {format(new Date(t.startTime), "h:mm a")}
                            </span>
                          </div>
                        </div>
                        {selectedTournament?.id === t.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 4: Description ─── */}
          {currentStep === 4 && (
            <div className="space-y-5 py-2">
              {/* Summary card */}
              <div className="card-inset p-4 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-ibm">Report Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm">Reported UID</p>
                    <p className="text-sm font-mono font-bold text-foreground">{reportedUid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-ibm">Incident Time</p>
                    <p className="text-sm font-ibm font-medium text-foreground">
                      {reportedDate && reportedTime
                        ? format(new Date(`${reportedDate}T${reportedTime}`), "PPp")
                        : "—"}
                    </p>
                  </div>
                  {selectedTournament && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground font-ibm">Tournament</p>
                      <p className="text-sm font-ibm font-medium text-foreground flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-primary" />
                        {selectedTournament.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-ibm font-semibold text-sm">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe exactly what happened — what cheats did you observe, when during the match, any other evidence..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    clearError("description");
                  }}
                  rows={6}
                  maxLength={2000}
                  className={cn(
                    "font-ibm text-sm resize-none",
                    errors.description && "ring-2 ring-destructive/50"
                  )}
                  aria-describedby="desc-error desc-count"
                />
                <div className="flex items-center justify-between">
                  {errors.description ? (
                    <p id="desc-error" className="flex items-center gap-1.5 text-xs text-destructive font-ibm">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-ibm">
                      Minimum 30 characters. Be as specific as possible.
                    </p>
                  )}
                  <span
                    id="desc-count"
                    className={cn(
                      "text-xs font-ibm shrink-0",
                      description.length > 1800 ? "text-warning" : "text-muted-foreground"
                    )}
                  >
                    {description.length}/2000
                  </span>
                </div>
              </div>
            </div>
          )}
        </MultiStepForm>
      </div>

      {/* Guest Login Required Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="font-lora flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Login Required
            </DialogTitle>
            <DialogDescription className="font-ibm">
              You must be logged in to submit a cheater report. Please sign in or create an account to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowLoginDialog(false)} className="font-ibm">
              Cancel
            </Button>
            <Button asChild className="font-ibm">
              <Link href="/sign-in?returnTo=/cheater-report">
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="font-ibm">
              <Link href="/sign-up">
                Create Account
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
