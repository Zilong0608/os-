import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Landing } from './components/Landing';
import { PersonaBuilder } from './components/PersonaBuilder';
import { PersonaDetails } from './components/PersonaDetails';
import { JobRecommendations } from './components/JobRecommendations';
import { JobSearch } from './components/JobSearch';
import { ResumeGeneration } from './components/ResumeGeneration';
import { PathSelect } from './components/PathSelect';
import { TechBackground } from './components/TechBackground';
import { PopCat } from './components/PopCat';
import { StepProgress } from './components/StepProgress';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Define the steps of the application flow
type Step = 'landing' | 'path' | 'builder' | 'details' | 'recommendations' | 'search' | 'generation';
type Theme = 'light' | 'dark';
type PathMode = 'direct' | 'guided' | null;

export default function App() {
  const [step, setStep] = useState<Step>('landing');
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [theme, setTheme] = useState<Theme>('light');
  const [pathMode, setPathMode] = useState<PathMode>(null);
  const [builderMode, setBuilderMode] = useState<PathMode>(null);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Step Calculation Logic
  const getStepNumber = (s: Step) => {
      if (pathMode === 'direct') {
        switch (s) {
          case 'search': return 1;
          case 'builder': return 2;
          case 'generation': return 3;
          default: return 0;
        }
      }
      switch(s) {
          case 'builder': return 1;
          case 'details': return 1; // Part of builder flow
          case 'recommendations': return 2;
          case 'search': return 3;
          case 'generation': return 4;
          default: return 0;
      }
  };

  const currentStepNumber = getStepNumber(step);
  const isDark = theme === 'dark';
  const progressSteps = pathMode === 'direct'
    ? [
        { id: 1, label: "SEARCH", fullLabel: "TARGET SEARCH" },
        { id: 2, label: "INIT", fullLabel: "PERSONA BUILDER" },
        { id: 3, label: "GENERATE", fullLabel: "RESUME COMPILE" },
      ]
    : [
        { id: 1, label: "INIT", fullLabel: "PERSONA BUILDER" },
        { id: 2, label: "ANALYSIS", fullLabel: "JOB ANALYSIS" },
        { id: 3, label: "SEARCH", fullLabel: "MARKET SCAN" },
        { id: 4, label: "GENERATE", fullLabel: "RESUME COMPILE" },
      ];

  // Navigation handlers
  const handleStart = () => setStep('path');
  
  const handleBackToLanding = () => {
    setStep('landing');
    setPathMode(null);
    setBuilderMode(null);
    // 可选：清空所有数据以重新开始
    // 如果用户想保留数据，注释掉下面这行
    // setSelectedJob('');
  };
  
  const handleBuilderBack = () => {
    if (builderMode === 'direct') {
      setStep('search');
      return;
    }
    setStep('landing');
  };
  const handleBuilderNext = () => {
    if (builderMode === 'direct') {
      setStep('generation');
      return;
    }
    setStep('recommendations'); // Go to Step 2
  };

  // const handleDetailsBack = () => setStep('builder'); // Merged into builder
  // const handleDetailsNext = () => setStep('recommendations'); // Merged into builder
  
  const handleRecommendationsBack = () => setStep('builder');
  const handleRecommendationsNext = () => setStep('search'); // Go to Step 3
  
  const handleJobSelect = (jobTitle: string) => {
    setSelectedJob(jobTitle);
    setStep('search');
  };
  
  const handleSearchBack = () => {
    if (pathMode === 'direct') {
      setStep('path');
      return;
    }
    setStep('recommendations');
  };
  const handleSearchNext = () => {
    if (pathMode === 'direct') {
      setBuilderMode('direct');
      setStep('builder');
      return;
    }
    setStep('generation'); // Go to Step 4
  };
  
  const handleGenerationBack = () => {
    if (pathMode === 'direct') {
      setStep('builder');
      return;
    }
    setStep('search');
  };
  const handleGenerationNext = () => {
    // End of flow, maybe reset
    setStep('landing');
    setSelectedJob('');
    setPathMode(null);
    setBuilderMode(null);
  };

  // Enhanced transition config for "Silky Smooth" feel
  // Using custom bezier for "snappy start, slow settling" feel (Apple-like)
  const pageVariants = {
    initial: { 
      opacity: 0, 
      x: '30%', 
      scale: 0.95,
      filter: 'blur(8px)'
    },
    animate: { 
      opacity: 1, 
      x: '0%', 
      scale: 1,
      filter: 'blur(0px)'
    },
    exit: { 
      opacity: 0, 
      x: '-10%', // Parallax exit (slower)
      scale: 1.05,
      filter: 'blur(4px)'
    }
  };
  
  // Custom transition physics
  const pageTransition = { 
    duration: 0.65, 
    ease: [0.16, 1, 0.3, 1] // Custom cubic-bezier for "silky" feel
  };

  return (
    <ErrorBoundary>
    <AppProvider>
    {/* Removed the global bg color transition since TechBackground handles it now. */}
    {/* The bg color here is just a fallback for the very bottom layer. */}
    <div className={`w-full h-screen overflow-hidden font-sans relative ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#EBEBF0]'}`}>
      {/* Persistent Background Layer - Stays static during transitions */}
      <TechBackground theme={theme} />
      
      {/* Content Layer - Transitions happen here */}
      <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Note: We need pointer-events-none on the wrapper but pointer-events-auto on children to allow interaction */}
          <AnimatePresence mode="wait">
            {step === 'landing' && (
              <motion.div
                key="landing"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <Landing 
                    onStart={handleStart} 
                    language={language} 
                    onToggleLanguage={toggleLanguage} 
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />
              </motion.div>
            )}

            {step === 'path' && (
              <motion.div
                key="path"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <PathSelect
                  onBack={handleBackToLanding}
                  onChooseDirect={() => {
                    setPathMode('direct');
                    setBuilderMode('direct');
                    setStep('search');
                  }}
                  onChooseGuided={() => {
                    setPathMode('guided');
                    setBuilderMode('guided');
                    setStep('builder');
                  }}
                  language={language}
                  theme={theme}
                />
              </motion.div>
            )}

            {step === 'builder' && (
              <motion.div
                key="builder"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <PersonaBuilder 
                    onBack={handleBuilderBack} 
                    onNext={handleBuilderNext} 
                    language={language} 
                    theme={theme}
                    stepOverride={builderMode === 'direct' ? 2 : undefined}
                />
              </motion.div>
            )}

            {step === 'details' && (
              <motion.div
                key="details"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <PersonaDetails onBack={() => {}} onNext={() => {}} theme={theme} />
              </motion.div>
            )}

            {step === 'recommendations' && (
              <motion.div
                key="recommendations"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <JobRecommendations 
                  onBack={handleRecommendationsBack} 
                  onNext={handleRecommendationsNext} 
                  onSelectJob={handleJobSelect}
                  language={language}
                  theme={theme}
                />
              </motion.div>
            )}

            {step === 'search' && (
              <motion.div
                key="search"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <JobSearch 
                  onBack={handleSearchBack} 
                  onNext={handleSearchNext} 
                  initialSearchTerm={selectedJob}
                  language={language}
                  theme={theme}
                  stepOverride={pathMode === 'direct' ? 1 : undefined}
                />
              </motion.div>
            )}

            {step === 'generation' && (
              <motion.div
                key="generation"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="w-full h-full pointer-events-auto"
              >
                <ResumeGeneration 
                    onBack={handleGenerationBack} 
                    onNext={handleGenerationNext} 
                    language={language} 
                    theme={theme}
                    stepOverride={pathMode === 'direct' ? 3 : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      {/* --- GLOBAL OVERLAYS --- */}
      
      {/* 1. PopCat - Persistent Bottom Left Accessory */}
      <div className="absolute bottom-0 left-6 md:left-12 z-50 pointer-events-none">
          {/* Wrapper for positioning, component handles pointer-events-auto */}
          <PopCat isDark={isDark} />
      </div>

      {/* 2. Step Progress - Only visible in Steps 1-4 */}
      <AnimatePresence>
        {currentStepNumber > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
            >
                <StepProgress currentStep={currentStepNumber} theme={theme} steps={progressSteps} />
            </motion.div>
        )}
      </AnimatePresence>

    </div>
    </AppProvider>
    </ErrorBoundary>
  );
}
