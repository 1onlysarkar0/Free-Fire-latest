import { AvatarDisplay } from "./avatar-display";
import { Marquee } from "./marquee";

interface LogoItem {
  src?: string | null;
  alt: string;
  username?: string | null;
}

interface LogoCloudProps {
  logos: LogoItem[];
}

export function LogoCloud({ logos }: LogoCloudProps) {
  if (!logos || logos.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
        No active players currently online
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden">
      <Marquee className="max-w-full [--duration:40s]" pauseOnHover repeat={3}>
        {logos.map((logo, idx) => (
          <div
            key={`${logo.alt}-${idx}`}
            className="inline-flex items-center gap-3 px-4 py-2 shrink-0"
          >
            <AvatarDisplay
              image={logo.src}
              name={logo.alt}
              className="h-8 w-8 shrink-0"
            />
            <span className="text-sm font-semibold tracking-tight text-foreground font-ibm">
              {logo.username || logo.alt}
            </span>
          </div>
        ))}
      </Marquee>
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l" />
    </div>
  );
}
