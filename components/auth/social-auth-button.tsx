import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GoogleIcon } from "./google-icon";

interface SocialAuthButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  provider: "google";
  label?: string;
}

export function SocialAuthButton({ 
  onClick, 
  loading, 
  disabled, 
  provider,
  label 
}: SocialAuthButtonProps) {
  const Icon = provider === "google" ? GoogleIcon : null;
  const defaultLabel = provider === "google" ? "Continue with Google" : `Continue with ${provider}`;

  return (
    <Button
      variant="outline"
      className="w-full h-11 font-ibm font-semibold"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Spinner className="mr-2 h-4 w-4" />
      ) : (
        Icon && <div className="mr-2"><Icon /></div>
      )}
      {label || defaultLabel}
    </Button>
  );
}
