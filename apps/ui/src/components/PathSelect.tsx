import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';

interface PathSelectProps {
  onBack: () => void;
  onChooseDirect: () => void;
  onChooseGuided: () => void;
  language: 'zh' | 'en';
  theme: 'light' | 'dark';
}

export function PathSelect({ onBack, onChooseDirect, onChooseGuided, language, theme }: PathSelectProps) {
  const isDark = theme === 'dark';
  const t = {
    zh: {
      step: "PATH",
      title: "选择你的路径",
      direct: "已有目标岗位",
      guided: "没有目标岗位，需要推荐",
    },
    en: {
      step: "PATH",
      title: "Choose Your Path",
      direct: "I already have a target role",
      guided: "No target role, I need recommendations",
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-transparent p-4 relative overflow-hidden font-sans perspective-1000 ${isDark ? 'text-gray-100' : 'text-[#1F1F1F]'}`}>
      {/* Navigation - Left */}
      <div className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-30">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-14 h-14 border transition-all duration-300 group
             ${isDark 
                ? 'bg-[#1A1A1A] border-white/20 shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:bg-[#222] text-gray-300' 
                : 'bg-[#E0E5EC] border-white/50 shadow-[6px_6px_12px_#A3A7AE,-6px_-6px_12px_#FFFFFF] hover:shadow-[inset_6px_6px_12px_#A3A7AE,inset_-6px_-6px_12px_#FFFFFF] hover:scale-100 text-gray-600'
             }
          `}
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </Button>
      </div>

      <div className="w-full max-w-none relative flex flex-col items-center justify-center z-20 gap-10">
        <div className="flex items-center gap-4">
          <span className={`text-xs font-bold tracking-wide uppercase drop-shadow-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t[language].step}</span>
          <h2 className={`text-lg font-bold drop-shadow-sm ${isDark ? 'text-white' : 'text-[#1F1F1F]'}`}>{t[language].title}</h2>
        </div>

        <div className="relative max-w-none max-h-none mt-4" style={{ width: '700px', height: '700px' }}>
          {/* Taiji line motif with entry animation */}
          <motion.div
            initial={{ scale: 0, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 360, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"}
                strokeWidth="2"
              />
              <path
                d="M100,14 A43,43 0 0 1 100,100 A43,43 0 0 0 100,186"
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)"}
                strokeWidth="2"
              />
              <circle
                cx="100"
                cy="57"
                r="6"
                fill={isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"}
              />
              <circle
                cx="100"
                cy="143"
                r="6"
                fill={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"}
              />
            </svg>
            <motion.div
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-6 rounded-full border ${isDark ? 'border-white/10' : 'border-black/10'}`}
            />
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.6 }}
            className="absolute inset-0 pointer-events-none"
          >
            <Button
              onClick={onChooseDirect}
              style={{ top: '28.5%', left: '50%', transform: 'translate(-50%, -50%)' }}
              className={`absolute w-[200px] h-[52px] text-xs md:text-sm font-medium text-center leading-tight transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 group pointer-events-auto
                ${isDark 
                  ? 'bg-white text-black border border-white/20 hover:bg-gray-200 rounded-none' 
                  : 'bg-[#222224] text-white border border-white/10 rounded-lg'
                }
              `}
            >
              <span className="relative z-10">{t[language].direct}</span>
            </Button>
            <Button
              onClick={onChooseGuided}
              variant="outline"
              style={{ top: '71.5%', left: '50%', transform: 'translate(-50%, -50%)' }}
              className={`absolute w-[220px] h-[52px] text-xs md:text-sm text-center leading-tight shadow-sm backdrop-blur-sm transition-all font-medium pointer-events-auto
                ${isDark 
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-none' 
                  : 'bg-white/50 border-white/60 text-[#2D2D2D] hover:bg-white rounded-lg'
                }
              `}
            >
              {t[language].guided}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
