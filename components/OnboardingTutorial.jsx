"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n-client";

export default function OnboardingTutorial() {
  const { t } = useLang();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already seen the tutorial
    const hasSeenTutorial = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenTutorial) {
      // Show tutorial after a short delay
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const steps = [
    {
      icon: "🏪",
      titleKey: "onboarding_step1_title",
      descKey: "onboarding_step1_desc",
    },
    {
      icon: "🔍",
      titleKey: "onboarding_step2_title",
      descKey: "onboarding_step2_desc",
    },
    {
      icon: "❤️",
      titleKey: "onboarding_step3_title",
      descKey: "onboarding_step3_desc",
    },
    {
      icon: "💬",
      titleKey: "onboarding_step4_title",
      descKey: "onboarding_step4_desc",
    },
    {
      icon: "✨",
      titleKey: "onboarding_step5_title",
      descKey: "onboarding_step5_desc",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-black"
                  : index < currentStep
                  ? "w-2 bg-black/40"
                  : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-6xl text-center mb-4">{step.icon}</div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center mb-3">
          {t[step.titleKey] || step.titleKey}
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
          {t[step.descKey] || step.descKey}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 py-3 px-4 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t.onboarding_back || "Назад"}
            </button>
          )}
          
          <button
            onClick={handleSkip}
            className="flex-1 py-3 px-4 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t.onboarding_skip || "Пропустить"}
          </button>

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            {currentStep === steps.length - 1
              ? t.onboarding_start || "Начать!"
              : t.onboarding_next || "Далее"}
          </button>
        </div>
      </div>
    </div>
  );
}
