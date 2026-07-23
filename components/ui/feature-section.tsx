"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useImageUrl } from "@/components/image-cache-provider";

interface Feature {
  step: string;
  title?: string;
  content: string;
  image: string;
}

interface FeatureStepsProps {
  features: Feature[];
  className?: string;
  title?: string;
  autoPlayInterval?: number;
  imageHeight?: string;
}

export function FeatureSteps({
  features,
  className,
  title = "How to get Started",
  autoPlayInterval = 3000,
  imageHeight = "h-[400px]",
}: FeatureStepsProps) {
  const imgUrl = useImageUrl();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (progress < 100) {
        setProgress((prev) => prev + 100 / (autoPlayInterval / 100));
      } else {
        setCurrentFeature((prev) => (prev + 1) % features.length);
        setProgress(0);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [progress, features.length, autoPlayInterval]);

  return (
    <div className={cn("p-8 md:p-12 bg-background", className)}>
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-10 text-center font-lora text-foreground">
          {title}
        </h2>

        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div className="order-2 md:order-1 space-y-8 w-full">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-start gap-6 md:gap-8 cursor-pointer"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: index === currentFeature ? 1 : 0.3 }}
                transition={{ duration: 0.5 }}
                onClick={() => {
                  setCurrentFeature(index);
                  setProgress(0);
                }}
              >
                <motion.div
                  className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 shrink-0 font-ibm transition-all",
                    index === currentFeature
                      ? "bg-primary border-primary text-primary-foreground scale-110 shadow-sm"
                      : "bg-muted border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {index <= currentFeature ? (
                    <span className="text-sm md:text-base font-bold">✓</span>
                  ) : (
                    <span className="text-sm md:text-base font-semibold">{index + 1}</span>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-semibold font-lora text-foreground">
                    {feature.title || feature.step}
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg text-muted-foreground font-ibm leading-relaxed mt-1">
                    {feature.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div
            className={cn(
              "order-1 md:order-2 relative w-full max-w-[380px] md:max-w-[420px] aspect-square mx-auto overflow-hidden flex items-center justify-center"
            )}
            style={{ perspective: 1000 }}
          >
            {features.map((feature, index) => {
              const isActive = index === currentFeature;
              return (
                <motion.div
                  key={index}
                  className="absolute inset-0 flex items-center justify-center p-2"
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : (index < currentFeature ? -50 : 50),
                    rotateX: isActive ? 0 : (index < currentFeature ? 10 : -10),
                    zIndex: isActive ? 10 : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ pointerEvents: isActive ? "auto" : "none" }}
                >
                  <div className="relative w-full h-full aspect-square flex items-center justify-center p-3">
                    <Image
                      src={imgUrl(feature.image)}
                      alt={feature.step}
                      className="w-full h-full aspect-square object-contain transition-transform transform hover:scale-105 duration-700"
                      width={500}
                      height={500}
                      priority={index === 0}
                      decoding="async"
                      suppressHydrationWarning
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
