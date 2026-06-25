import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import FooterSection from "@/components/homepage/footer";

export default function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-ibm">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        {/* Decorative Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-[150px] leading-none font-black text-transparent bg-clip-text bg-gradient-to-br from-primary/60 to-primary/90 font-inter drop-shadow-sm select-none">
            404
          </h1>
          <h2 className="text-3xl font-bold text-foreground mt-6 font-inter tracking-tight">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mt-4 mb-8">
            Oops! The page you&apos;re looking for doesn&apos;t exist, has been moved, or is temporarily unavailable.
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-transform hover:-translate-y-0.5 px-8">
            <Link href="/" prefetch={true}>Return to Homepage</Link>
          </Button>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}

