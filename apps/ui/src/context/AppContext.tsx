import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Profile, Job } from '../services/api';

interface JDData {
  title?: string;
  company?: string;
  location?: string;
  responsibilities?: string[];
  requirements?: string[];
  keywords?: string[];
  description?: string;
}

interface MatchData {
  score: number;
  reasons?: string[];
  gaps?: string[];
  recommendations?: string[];
}

interface AppContextType {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
  jdData: JDData | null;
  setJDData: (data: JDData | null) => void;
  matchData: MatchData | null;
  setMatchData: (data: MatchData | null) => void;
  sessionId: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jdData, setJDData] = useState<JDData | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [sessionId] = useState<string>(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        selectedJob,
        setSelectedJob,
        jobs,
        setJobs,
        jdData,
        setJDData,
        matchData,
        setMatchData,
        sessionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
