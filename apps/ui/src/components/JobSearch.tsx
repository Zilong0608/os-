import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, FileOutput, Loader2, FileSearch, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion } from 'motion/react';
import { streamJobs, Job, fetchJD, matchProfileToJD } from '../services/api';
import { useApp } from '../context/AppContext';

interface JobSearchProps {
  onBack: () => void;
  onNext: () => void;
  initialSearchTerm?: string;
  language: 'zh' | 'en';
  theme: 'light' | 'dark';
  stepOverride?: number;
}

export function JobSearch({ onBack, onNext, initialSearchTerm = '', language, theme, stepOverride }: JobSearchProps) {
  const { sessionId, setSelectedJob, jobs: globalJobs, setJobs: setGlobalJobs, profile, setJDData, setMatchData } = useApp();
  const cleanupRef = useRef<(() => void) | null>(null);
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [matchingJobId, setMatchingJobId] = useState<string | null>(null);

  const extractDescriptionLines = (text: string): string[] => {
    if (!text) return [];
    const cleaned = text.replace(/<[^>]+>/g, ' ');
    return cleaned
      .split(/(?:\r?\n|\u2022|\*|;)/)
      .map((line) => line.trim())
      .filter((line) => line.length > 4);
  };

  const enrichJD = (rawJD: any, job: Job) => {
    const merged = { ...(rawJD || {}) };
    const fallbackLines = extractDescriptionLines(job.description || '');
    if (!merged.description && job.description) {
      merged.description = job.description;
    }
    if ((!merged.responsibilities || merged.responsibilities.length === 0) && fallbackLines.length) {
      merged.responsibilities = fallbackLines.slice(0, 60);
    }
    if ((!merged.requirements || merged.requirements.length === 0) && fallbackLines.length) {
      merged.requirements = fallbackLines.slice(0, 60);
    }
    if ((!merged.keywords || merged.keywords.length === 0) && job.keywords && job.keywords.length) {
      merged.keywords = job.keywords;
    }
    if (!merged.title) merged.title = job.title;
    if (!merged.company) merged.company = job.company;
    if (!merged.location) merged.location = job.location;
    return merged;
  };
  
  const t = {
    zh: {
      step3: "STEP 3",
      title: "精准职位检索",
      jobTitle: "职位标题",
      keywords: "地区",
      region: "国家",
      selectRegion: "选择地区",
      resultsCount: "结果数量",
      searching: "搜索中...",
      startSearch: "开始搜索",
      continueSearch: "继续搜索",
      stop: "停止",
      searchComplete: "搜索完成 ✓",
      jobShown: "(已显示 1 个职位)",
      searchingPlatform: "正在各大平台搜索职位...",
      openLink: "打开链接",
      generateResume: "生成简历"
    },
    en: {
      step3: "STEP 3",
      title: "Precision Job Search",
      jobTitle: "Job Title",
      keywords: "Region",
      region: "Country",
      selectRegion: "Select Region",
      resultsCount: "Result Count",
      searching: "Searching...",
      startSearch: "Start Search",
      continueSearch: "Continue Search",
      stop: "Stop",
      searchComplete: "Search Complete ✓",
      jobShown: "(1 job shown)",
      searchingPlatform: "Searching jobs on major platforms...",
      openLink: "Open Link",
      generateResume: "Generate Resume"
    }
  };
  const [isSearching, setIsSearching] = useState(false);
  const [hasResults, setHasResults] = useState(globalJobs.length > 0);
  const [jobTitle, setJobTitle] = useState(initialSearchTerm || '');
  const [region, setRegion] = useState('Sydney');
  const [country, setCountry] = useState('AU');
  const [resultCount, setResultCount] = useState(10);
  const [progress, setProgress] = useState({ delivered: 0, requested: 0 });

  const jobs = globalJobs;
  const setJobs = setGlobalJobs;

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Update local state if prop changes (e.g. if user goes back and re-selects)
  useEffect(() => {
    if (initialSearchTerm) {
      const englishPart = initialSearchTerm.replace(/[\u4e00-\u9fa5]/g, '').trim(); 
      setJobTitle(englishPart || initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const handleSearch = () => {
    // Clear previous search stream
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    setIsSearching(true);
    setJobs([]);
    setHasResults(false);
    setProgress({ delivered: 0, requested: 0 });
    
    cleanupRef.current = streamJobs({
      sessionId,
      titles: [jobTitle],
      keywords: [],
      locations: [
        [region, country].filter(Boolean).join(', ') || region || country,
      ],
      limit: resultCount,
      onJob: (job) => {
        setJobs((prev) => [...prev, job]);
      },
      onProgress: (delivered, requested) => {
        setProgress({ delivered, requested });
      },
      onEnd: () => {
        setIsSearching(false);
        setHasResults(true);
      },
      onError: (error) => {
        console.error('Search error:', error);
        setIsSearching(false);
      },
    });
  };

  const handleStop = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsSearching(false);
  };

  const handleJobSelect = async (job: Job) => {
    setSelectedJob(job);
    
    // 有profile时自动分析和匹配
    if (profile) {
      const jobUrl = job.jd_url || job.url;
      if (jobUrl) {
        try {
          // 自动获取JD数据和匹配
          const jdData = await fetchJD(jobUrl, {
            render: true,
            description: job.description,
            title: job.title,
            company: job.company,
            location: job.location,
          });
          const enrichedJD = enrichJD(jdData, job);
          setJDData(enrichedJD);
          
          const matchResult = await matchProfileToJD(profile, enrichedJD);
          setMatchData(matchResult);
        } catch (error) {
          console.error('Auto-analyze failed:', error);
          // 即使失败也继续导航
        }
      }
    }
    
    onNext();
  };

  // 分析JD
  const handleAnalyzeJD = async (job: Job) => {
    const jobUrl = job.jd_url || job.url;
    if (!jobUrl) {
      alert(language === 'zh' ? '没有职位链接' : 'No job URL available');
      return;
    }

    setAnalyzingJobId(job.id || job.hash);
    try {
      const jdData = await fetchJD(jobUrl, {
        render: true,
        description: job.description,
        title: job.title,
        company: job.company,
        location: job.location,
      });
      setJDData(enrichJD(jdData, job));
      alert(language === 'zh' ? 'JD 分析完成！' : 'JD Analysis Complete!');
    } catch (error: any) {
      console.error('Analyze JD error:', error);
      alert(language === 'zh' ? `分析失败: ${error.message}` : `Analysis failed: ${error.message}`);
    } finally {
      setAnalyzingJobId(null);
    }
  };

  // 智能匹配
  const handleSmartMatch = async (job: Job) => {
    if (!profile) {
      alert(language === 'zh' ? '请先完成画像构建' : 'Please complete persona building first');
      return;
    }

    const jobUrl = job.jd_url || job.url;
    if (!jobUrl) {
      alert(language === 'zh' ? '没有职位链接' : 'No job URL available');
      return;
    }

    setMatchingJobId(job.id || job.hash);
    try {
      // 先获取JD数据
      const jdData = await fetchJD(jobUrl, {
        render: true,
        description: job.description,
        title: job.title,
        company: job.company,
        location: job.location,
      });
      const enrichedJD = enrichJD(jdData, job);
      setJDData(enrichedJD);
      
      // 再进行匹配
      const matchResult = await matchProfileToJD(profile, enrichedJD);
      setMatchData(matchResult);
      
      alert(language === 'zh' ? `匹配完成！匹配度: ${matchResult.score}%` : `Match Complete! Score: ${matchResult.score}%`);
    } catch (error: any) {
      console.error('Smart match error:', error);
      alert(language === 'zh' ? `匹配失败: ${error.message}` : `Match failed: ${error.message}`);
    } finally {
      setMatchingJobId(null);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-transparent p-4 relative overflow-hidden font-sans perspective-1000 ${isDark ? 'text-gray-100' : 'text-[#1F1F1F]'}`}>
       
       {/* --- GEOMETRIC LINES OVERLAY --- */}

       {/* ------------------------------------------ */}

       {/* Background Header */}
       <div className="absolute top-14 md:top-6 left-0 right-0 text-center z-10 pointer-events-none">
        <h2 className={`text-2xl font-serif italic drop-shadow-sm tracking-tight ${isDark ? 'text-gray-200' : 'text-[#1A1A1A]'}`}>MirrorCareer</h2>
        <p className={`text-[10px] tracking-[0.3em] uppercase font-semibold ${isDark ? 'text-gray-400 opacity-60' : 'text-[#444] opacity-70'}`}>CVfoR1</p>
      </div>

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

      {/* Main Content */}
      <div className="w-full max-w-4xl relative flex justify-center z-20 items-center md:items-end">
         {/* Ghost Card - Previous Step (Step 2) */}
         <div className={`absolute left-4 top-1/2 -translate-y-1/2 -translate-x-full w-full max-w-2xl h-[70vh] backdrop-blur-xl rounded-2xl shadow-xl border opacity-40 scale-90 hidden lg:block pointer-events-none -mr-32 transform -rotate-3 mix-blend-soft-light
             ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-white/30'}
         `}>
           <div className="p-6 space-y-4 opacity-30">
             <div className="h-6 bg-gray-400/20 rounded w-1/3"></div>
             <div className="space-y-4">
               <div className="h-20 bg-gray-400/20 rounded w-full"></div>
               <div className="h-20 bg-gray-400/20 rounded w-full"></div>
             </div>
           </div>
        </div>
        
        {/* Ghost Card - Next Step (Step 4) */}
        <div className={`absolute right-4 top-1/2 -translate-y-1/2 translate-x-full w-full max-w-2xl h-[70vh] backdrop-blur-xl rounded-2xl shadow-xl border opacity-40 scale-90 hidden lg:block pointer-events-none -ml-32 transform rotate-3 mix-blend-soft-light
             ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/20 border-white/30'}
        `}>
           <div className="p-6 space-y-4 opacity-30">
             <div className="h-6 bg-gray-400/20 rounded w-1/4"></div>
             <div className="space-y-2">
               <div className="h-full bg-gray-400/20 rounded w-full flex-1"></div>
             </div>
           </div>
        </div>

        {/* REFLECTION UNDER THE CARD */}
        <div className={`absolute bottom-[-40px] left-4 right-4 h-16 blur-2xl rounded-[50%] scale-x-90 z-0 ${isDark ? 'bg-white/5' : 'bg-black/20'}`}></div>

        {/* MAIN CARD CONTAINER - Spring Animation */}
        <motion.div
           initial={{ opacity: 0, y: 40, scale: 0.95 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -40, scale: 0.95 }}
           transition={{ type: "spring", damping: 25, stiffness: 300 }}
           className="w-full max-w-2xl z-20 mx-4 h-[75vh] flex flex-col"
        >
          <Card className={`w-full h-full backdrop-blur-2xl border-0 flex flex-col relative overflow-hidden group transition-colors duration-500
              ${isDark 
                 ? 'bg-black/40 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.1)] rounded-none' 
                 : 'bg-white/60 shadow-[0_30px_60px_-10px_rgba(30,30,35,0.15),inset_0_0_0_1px_rgba(255,255,255,0.4)] rounded-3xl'
              }
          `}>
          
          {/* Tech Line Corners for Dark Mode */}
          {isDark && (
              <>
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/30 z-50"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/30 z-50"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/30 z-50"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/30 z-50"></div>
                  
                  {/* Tech Grid Background for Card */}
                  <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              </>
          )}

          {/* 1. Glossy Edge Highlight (Top) */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-50 opacity-80"></div>
          
          {/* 2. Glass Shine (Diagonal) */}
          <div className={`absolute inset-0 bg-gradient-to-tr pointer-events-none z-10 opacity-30 group-hover:opacity-40 transition-opacity duration-1000
             ${isDark ? 'from-white/5 via-white/10 to-transparent' : 'from-white/5 via-white/20 to-transparent'}
          `}></div>

          <CardHeader className={`flex flex-row items-center justify-between border-b pb-4 shrink-0 z-20 relative backdrop-blur-sm
               ${isDark ? 'bg-black/20 border-white/10' : 'bg-white/30 border-gray-200/40'}
          `}>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-bold tracking-wide uppercase drop-shadow-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stepOverride ? `STEP ${stepOverride}` : t[language].step3}</span>
            <CardTitle className={`text-lg font-bold drop-shadow-sm ${isDark ? 'text-white' : 'text-[#1F1F1F]'}`}>{t[language].title}</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-5 md:p-8 pt-6 md:pt-8 flex-1 overflow-y-auto space-y-6 md:space-y-8 no-scrollbar z-10 relative">
          
          {/* Search Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].jobTitle}</label>
                <div className="relative group/input">
                  <div className={`absolute -inset-0.5 rounded-lg blur opacity-30 group-hover/input:opacity-60 transition duration-500
                      ${isDark ? 'bg-white/20' : 'bg-gradient-to-r from-gray-200 to-gray-300'}
                  `}></div>
                  <Input 
                    value={jobTitle} 
                    onChange={(e) => setJobTitle(e.target.value)}
                    className={`relative border-0 focus:ring-0 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] h-10 transition-all
                        ${isDark 
                           ? 'bg-black/40 text-white placeholder:text-gray-500 focus:bg-black/60 rounded-none' 
                           : 'bg-white/80 focus:bg-white rounded-lg'
                        }
                    `} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-semibold ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].keywords}</label>
                <div className="relative group/input">
                  <div className={`absolute -inset-0.5 rounded-lg blur opacity-30 group-hover/input:opacity-60 transition duration-500
                      ${isDark ? 'bg-white/20' : 'bg-gradient-to-r from-gray-200 to-gray-300'}
                  `}></div>
                  <Input 
                    value={region} 
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder={language === 'zh' ? '如：Sydney' : 'e.g., Sydney'}
                    className={`relative border-0 focus:ring-0 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] h-10 transition-all
                        ${isDark 
                           ? 'bg-black/40 text-white placeholder:text-gray-500 focus:bg-black/60 rounded-none' 
                           : 'bg-white/80 focus:bg-white rounded-lg'
                        }
                    `} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-semibold ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].region}</label>
                <Input 
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`border-0 focus:ring-0 text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] h-10
                      ${isDark ? 'bg-black/40 text-white rounded-none' : 'bg-white/80 rounded-lg'}
                  `}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{t[language].resultsCount}</label>
                <Input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={resultCount} 
                  onChange={(e) => setResultCount(parseInt(e.target.value) || 1)}
                  className={`border-0 focus:ring-0 text-center shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05)] h-10
                      ${isDark ? 'bg-black/40 text-white focus:bg-black/60 rounded-none' : 'bg-white/80 rounded-lg'}
                  `} 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              {/* MIRROR TECH HUD BUTTON */}
              <Button 
                onClick={handleSearch}
                className={`relative overflow-hidden text-white border px-8 h-11 text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 group
                   ${isDark 
                      ? 'bg-white text-black border-white/20 hover:bg-gray-200 rounded-none' 
                      : 'bg-[#222224] border-white/10 rounded-lg'
                   }
                `}
                disabled={isSearching}
              >
                 {/* --- GEOMETRIC TECH OVERLAY --- */}
                      
                  {/* 1. Large Rotating Arc (Right side) */}
                  <div className={`absolute top-1/2 right-[-20%] w-[120%] h-[200%] -translate-y-1/2 rounded-full border border-dashed animate-[spin_10s_linear_infinite] pointer-events-none opacity-40
                      ${isDark ? 'border-black/20' : 'border-white/10'}
                  `}></div>
                  
                  {/* 2. Thin Crosshair Lines */}
                  <div className={`absolute top-0 bottom-0 left-6 w-[1px] pointer-events-none ${isDark ? 'bg-black/10' : 'bg-white/5'}`}></div>
                  <div className={`absolute left-0 right-0 top-1/2 h-[1px] pointer-events-none ${isDark ? 'bg-black/10' : 'bg-white/5'}`}></div>

                  {/* 3. Corner Markers */}
                  <div className={`absolute top-1 left-1 w-1.5 h-1.5 border-l border-t pointer-events-none ${isDark ? 'border-black/30' : 'border-white/30'}`}></div>
                  <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b pointer-events-none ${isDark ? 'border-black/30' : 'border-white/30'}`}></div>

                  {/* 4. Scanning Line (Subtle) */}
                  <div className={`absolute top-0 bottom-0 left-0 w-[2px] blur-[1px] animate-[shimmer_3s_infinite] pointer-events-none ${isDark ? 'bg-black/20' : 'bg-white/20'}`}></div>

                {isSearching ? <Loader2 className={`w-4 h-4 animate-spin mr-2 relative z-10 ${isDark ? 'text-black' : 'text-white'}`} /> : null}
                <span className={`relative z-10 ${isDark ? 'text-black' : 'text-white'}`}>{isSearching ? t[language].searching : t[language].startSearch}</span>
              </Button>

               <Button 
                variant="outline" 
                onClick={handleSearch}
                disabled={isSearching}
                className={`px-6 h-11 shadow-sm backdrop-blur-sm transition-all font-medium
                   ${isDark 
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-none' 
                      : 'bg-white/50 border-white/60 text-[#2D2D2D] hover:bg-white rounded-lg'
                   }
               `}>
                {t[language].continueSearch}
              </Button>
              {isSearching && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleStop}
                  className={`text-xs px-2 transition-colors ml-auto ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                >
                  <span className={`text-[10px] px-3 py-1.5 border shadow-sm
                      ${isDark ? 'bg-white/5 border-white/10 text-gray-400 rounded-none' : 'bg-white/50 border-gray-200/50 rounded-full'}
                  `}>{t[language].stop}</span>
                </Button>
              )}
            </div>
            
            {(hasResults || isSearching) && (
               <div className={`text-xs mt-2 flex items-center gap-2 font-medium w-fit px-3 py-1 border 
                   ${isDark ? 'bg-white/5 border-white/10 text-gray-400 rounded-none' : 'bg-gray-100/50 border-gray-200/50 text-gray-500 rounded-full'}
               `}>
                 <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>
                   {isSearching ? `${t[language].searching} (${progress.delivered}/${progress.requested})` : t[language].searchComplete}
                 </span>
                 <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                   ({language === 'zh' ? `已显示 ${jobs.length} 个职位` : `${jobs.length} jobs shown`})
                 </span>
               </div>
            )}
          </div>

          {/* Results Area */}
          <div className="min-h-[200px] space-y-4">
            {isSearching && jobs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-3">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full blur animate-pulse ${isDark ? 'bg-white/20' : 'bg-gray-200'}`}></div>
                  <Loader2 className={`w-8 h-8 animate-spin relative z-10 ${isDark ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <p className="text-xs font-medium tracking-wide">{t[language].searchingPlatform}</p>
              </div>
            )}
            
            {jobs.length === 0 && !isSearching && (
              <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {language === 'zh' ? '点击“开始搜索”查找职位' : 'Click "Start Search" to find jobs'}
              </div>
            )}

            {jobs.map((job, index) => {
              return (
              <motion.div
                key={job.hash || job.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`backdrop-blur-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border hover:shadow-[0_15px_35px_-10px_rgba(0,0,0,0.12)] transition-all group/result
                     ${isDark 
                        ? 'bg-white/5 border-white/10 hover:border-white/30 rounded-none' 
                        : 'bg-white/80 border-white/80 hover:border-white rounded-2xl'
                     }
                `}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {job.source ? (
                      <Badge className="bg-[#2D2D2D] hover:bg-black text-[10px] px-2 py-0.5 h-5 rounded shadow-sm text-white font-medium tracking-wide">
                        {job.source.toUpperCase()}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              
              <h3 className={`text-lg font-bold mb-1 transition-colors ${isDark ? 'text-white group-hover/result:text-gray-200' : 'text-[#1F1F1F] group-hover/result:text-black'}`}>
                {job.title}
              </h3>
              <p className="text-xs text-gray-500 mb-6 font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                {job.company} {job.location && `· ${job.location}`}
                {job.posted_at && (
                  <>
                    <span className={`h-1 w-1 rounded-full bg-gray-300`}></span>
                    <span className="text-gray-400">{job.posted_at}</span>
                  </>
                )}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="default" 
                  onClick={() => {
                    const url = job.jd_url || job.url;
                    if (url) window.open(url, '_blank');
                  }}
                  disabled={!job.jd_url && !job.url}
                  className={`text-xs h-10 w-full font-medium shadow-md hover:shadow-lg transition-all relative overflow-hidden group
                      ${isDark ? 'bg-white text-black hover:bg-gray-200 rounded-none' : 'bg-[#2D2D2D] text-white hover:bg-black rounded-lg'}
                  `}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none" style={{ backgroundImage: `linear-gradient(${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'} 1px, transparent 1px)`, backgroundSize: '10px 10px' }}></div>
                  <div className={`absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r skew-x-[-20deg] group-hover:animate-[shimmer_2s_infinite]
                      ${isDark ? 'from-transparent via-black/10 to-transparent' : 'from-transparent via-white/10 to-transparent'}
                  `}></div>
                  
                  <span className="relative z-10 flex items-center justify-center"><ExternalLink className="w-3 h-3 mr-2" /> {t[language].openLink}</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleAnalyzeJD(job)}
                  disabled={analyzingJobId === (job.id || job.hash)}
                  className={`text-xs h-10 w-full font-medium shadow-md hover:shadow-lg transition-all
                      ${isDark ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-none' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg'}
                  `}
                >
                  {analyzingJobId === (job.id || job.hash) ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <FileSearch className="w-3 h-3 mr-2" />
                  )}
                  {language === 'zh' ? '分析JD' : 'Analyze JD'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleSmartMatch(job)}
                  disabled={matchingJobId === (job.id || job.hash)}
                  className={`text-xs h-10 w-full font-medium shadow-md hover:shadow-lg transition-all
                      ${isDark ? 'bg-white/10 text-white border-white/20 hover:bg-white/20 rounded-none' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg'}
                  `}
                >
                  {matchingJobId === (job.id || job.hash) ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3 mr-2" />
                  )}
                  {language === 'zh' ? '智能匹配' : 'Smart Match'}
                </Button>
                
                <Button 
                  variant="default" 
                  onClick={() => handleJobSelect(job)}
                  className={`text-xs h-10 w-full font-medium shadow-md hover:shadow-lg transition-all
                      ${isDark ? 'bg-[#222] text-white border border-white/20 hover:bg-[#333] rounded-none' : 'bg-[#1A1A1A] text-white hover:bg-black rounded-lg'}
                  `}
                >
                  <FileOutput className="w-3 h-3 mr-2" /> {t[language].generateResume}
                </Button>
              </div>
            </motion.div>
            )}
            )}
          </div>

        </CardContent>
      </Card>
      </motion.div>
      </div>

      {/* Navigation - Right */}
      <div className="absolute right-4 md:right-12 z-30">
         <Button
          variant="outline"
          size="icon"
          className={`rounded-full w-14 h-14 border transition-all duration-300 group
             ${isDark 
                ? 'bg-[#1A1A1A] border-white/20 shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.05)] hover:bg-[#222] text-gray-300' 
                : 'bg-[#E0E5EC] border-white/50 shadow-[6px_6px_12px_#A3A7AE,-6px_-6px_12px_#FFFFFF] hover:shadow-[inset_6px_6px_12px_#A3A7AE,inset_-6px_-6px_12px_#FFFFFF] hover:scale-100 text-gray-600'
             }
          `}
          onClick={onNext}
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
