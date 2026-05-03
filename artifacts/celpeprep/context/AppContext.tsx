import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AdService } from "@/services/AdService";

export interface ServerLimits {
  freeAiEvaluationsPerMonth: number;
  freeAiGeneratedPracticesPerDay: number;
  freeRetakesPerPractice: number;
  freeVocabularyAiEnrichmentsPerDay: number;
  freePronunciationEvaluationsPerDay: number;
  freeConversationMinutesPerDay: number;
  freeListeningExercisesPerDay: number;
  freeGrammarLessonsPerDay: number;
  freeWritingCoachUsesPerDay: number;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
  practiceTimerSeconds: number;
}

const DEFAULT_SERVER_LIMITS: ServerLimits = {
  freeAiEvaluationsPerMonth: 5,
  freeAiGeneratedPracticesPerDay: 2,
  freeRetakesPerPractice: 2,
  freeVocabularyAiEnrichmentsPerDay: 10,
  freePronunciationEvaluationsPerDay: 3,
  freeConversationMinutesPerDay: 5,
  freeListeningExercisesPerDay: 3,
  freeGrammarLessonsPerDay: 3,
  freeWritingCoachUsesPerDay: 3,
  rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3,
  practiceTimerSeconds: 1500,
};

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatarEmoji: string;
  level: "A2" | "B1" | "B2" | "C1";
  examDate: string | null;
  dailyGoalMinutes: number;
  streakDays: number;
  bestStreak: number;
  lastActiveDate: string | null;
  aiCreditsUsed: number;
  aiCreditsTotal: number;
  isPremium: boolean;
  onboardingDone: boolean;
  diagnosticDone: boolean;
  deviceToken: string;
  isGuest: boolean;
}

export interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  register: string;
  status: "learning" | "review" | "mastered";
  timesReviewed: number;
  easeLevel: number;
  nextReview: string;
  addedAt: string;
}

export interface PracticeAttempt {
  id: string;
  taskType: string;
  genre: string;
  responseText: string;
  overallScore: number;
  rubricTema: number;
  rubricGenero: number;
  rubricCoesao: number;
  rubricGramatica: number;
  commentary: string;
  timeExpired: boolean;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  title: string;
  type: "practice" | "vocab" | "reading" | "listening" | "grammar";
  durationMins: number;
  dayOfWeek: number;
  completed: boolean;
  completedDate: string | null;
}

interface AppContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  syncProfileToServer: (updates: Partial<UserProfile>) => Promise<{ ok: boolean; error?: string }>;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  serverLimits: ServerLimits;
  refreshLimits: () => Promise<void>;
  vocabWords: VocabWord[];
  addVocabWord: (word: Omit<VocabWord, "id" | "addedAt" | "timesReviewed" | "easeLevel" | "nextReview" | "status">) => Promise<void>;
  updateVocabWord: (id: string, updates: Partial<VocabWord>) => Promise<void>;
  attempts: PracticeAttempt[];
  addAttempt: (attempt: Omit<PracticeAttempt, "id" | "createdAt">) => Promise<void>;
  studyTasks: StudyTask[];
  toggleStudyTask: (id: string) => Promise<void>;
  isLoaded: boolean;
}

const defaultProfile: UserProfile = {
  name: "",
  username: "",
  email: "",
  avatarEmoji: "🎓",
  level: "B1",
  examDate: null,
  dailyGoalMinutes: 30,
  streakDays: 0,
  bestStreak: 0,
  lastActiveDate: null,
  aiCreditsUsed: 0,
  aiCreditsTotal: 5,
  isPremium: false,
  onboardingDone: false,
  diagnosticDone: false,
  deviceToken: "",
  isGuest: false,
};

const defaultStudyTasks: StudyTask[] = [
  { id: "1", title: "Praticar Tarefa 3", type: "practice", durationMins: 30, dayOfWeek: 1, completed: false, completedDate: null },
  { id: "2", title: "Revisar vocabulário", type: "vocab", durationMins: 15, dayOfWeek: 1, completed: false, completedDate: null },
  { id: "3", title: "Praticar Tarefa 1", type: "practice", durationMins: 30, dayOfWeek: 2, completed: false, completedDate: null },
  { id: "4", title: "Gramática — subjuntivo", type: "grammar", durationMins: 20, dayOfWeek: 2, completed: false, completedDate: null },
  { id: "5", title: "Praticar Tarefa 2", type: "practice", durationMins: 30, dayOfWeek: 3, completed: false, completedDate: null },
  { id: "6", title: "Revisar vocabulário", type: "vocab", durationMins: 15, dayOfWeek: 3, completed: false, completedDate: null },
  { id: "7", title: "Praticar Tarefa 4", type: "practice", durationMins: 30, dayOfWeek: 4, completed: false, completedDate: null },
  { id: "8", title: "Leitura de texto autêntico", type: "reading", durationMins: 20, dayOfWeek: 4, completed: false, completedDate: null },
  { id: "9", title: "Prática IA — Escrita", type: "practice", durationMins: 30, dayOfWeek: 5, completed: false, completedDate: null },
  { id: "10", title: "Revisar vocabulário", type: "vocab", durationMins: 15, dayOfWeek: 5, completed: false, completedDate: null },
  { id: "11", title: "Simulado oral", type: "practice", durationMins: 25, dayOfWeek: 6, completed: false, completedDate: null },
  { id: "12", title: "Revisão semanal", type: "reading", durationMins: 30, dayOfWeek: 0, completed: false, completedDate: null },
];

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [studyTasks, setStudyTasks] = useState<StudyTask[]>(defaultStudyTasks);
  const [serverLimits, setServerLimits] = useState<ServerLimits>(DEFAULT_SERVER_LIMITS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const fetchLimits = async (): Promise<ServerLimits | null> => {
    try {
      const res = await fetch(getApiUrl("/api/content/limits"));
      if (!res.ok) return null;
      return (await res.json()) as ServerLimits;
    } catch {
      return null;
    }
  };

  const refreshLimits = useCallback(async () => {
    const limits = await fetchLimits();
    if (!limits) return;
    setServerLimits(limits);
    setProfile((prev) => {
      if (prev.isPremium) return prev;
      const next = { ...prev, aiCreditsTotal: limits.freeAiEvaluationsPerMonth };
      AsyncStorage.setItem("celpeprep_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const loadAll = async () => {
    try {
      const [profileStr, vocabStr, attemptsStr, tasksStr] = await AsyncStorage.multiGet([
        "celpeprep_profile",
        "celpeprep_vocab",
        "celpeprep_attempts",
        "celpeprep_tasks",
      ]);

      let loadedProfile: UserProfile;
      if (profileStr[1]) {
        const saved = JSON.parse(profileStr[1]) as Partial<UserProfile>;
        loadedProfile = { ...defaultProfile, ...saved };
        if (!loadedProfile.deviceToken) {
          loadedProfile.deviceToken = generateUUID();
        }
      } else {
        loadedProfile = { ...defaultProfile, deviceToken: generateUUID() };
      }

      const [limits, adsConfigRes] = await Promise.all([
        fetchLimits(),
        fetch(getApiUrl("/api/content/ads-config")).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (limits) {
        setServerLimits(limits);
        if (!loadedProfile.isPremium) {
          loadedProfile.aiCreditsTotal = limits.freeAiEvaluationsPerMonth;
        }
      }

      if (adsConfigRes) {
        AdService.configure(adsConfigRes, loadedProfile.isPremium);
      }

      AsyncStorage.setItem("celpeprep_profile", JSON.stringify(loadedProfile));
      setProfile(loadedProfile);

      if (vocabStr[1]) setVocabWords(JSON.parse(vocabStr[1]));
      if (attemptsStr[1]) setAttempts(JSON.parse(attemptsStr[1]));
      if (tasksStr[1]) setStudyTasks(JSON.parse(tasksStr[1]));
    } catch (_) {}
    setIsLoaded(true);
  };

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem("celpeprep_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const enterGuestMode = useCallback(async () => {
    const token = generateUUID();
    const guestProfile = { ...defaultProfile, deviceToken: token, isGuest: true, onboardingDone: true, name: "Convidado" };
    await AsyncStorage.setItem("celpeprep_profile", JSON.stringify(guestProfile));
    setProfile(guestProfile);
  }, []);

  const exitGuestMode = useCallback(async () => {
    const next = { ...profile, isGuest: false };
    await AsyncStorage.setItem("celpeprep_profile", JSON.stringify(next));
    setProfile(next);
  }, [profile]);

  const syncProfileToServer = useCallback(async (updates: Partial<UserProfile>): Promise<{ ok: boolean; error?: string }> => {
    const currentProfile = await AsyncStorage.getItem("celpeprep_profile");
    const parsed = currentProfile ? JSON.parse(currentProfile) as UserProfile : profile;
    const deviceToken = parsed.deviceToken || profile.deviceToken;
    if (!deviceToken) return { ok: false, error: "No device token" };

    try {
      const body: Record<string, unknown> = {};
      if (updates.username !== undefined) body["username"] = updates.username;
      if (updates.avatarEmoji !== undefined) body["avatarEmoji"] = updates.avatarEmoji;
      if (updates.name !== undefined) body["displayName"] = updates.name;
      if (updates.level !== undefined) body["level"] = updates.level;
      if (updates.examDate !== undefined) body["targetDate"] = updates.examDate;
      if (updates.dailyGoalMinutes !== undefined) body["dailyGoalMinutes"] = updates.dailyGoalMinutes;

      const res = await fetch(getApiUrl(`/api/profile/${deviceToken}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        return { ok: false, error: "username_taken" };
      }
      if (!res.ok) {
        return { ok: false, error: "server_error" };
      }

      await updateProfile(updates);
      return { ok: true };
    } catch {
      await updateProfile(updates);
      return { ok: true };
    }
  }, [profile, updateProfile]);

  const addVocabWord = useCallback(async (
    word: Omit<VocabWord, "id" | "addedAt" | "timesReviewed" | "easeLevel" | "nextReview" | "status">
  ) => {
    const newWord: VocabWord = {
      ...word,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: "learning",
      timesReviewed: 0,
      easeLevel: 0,
      nextReview: new Date().toISOString(),
      addedAt: new Date().toISOString(),
    };
    setVocabWords((prev) => {
      const next = [newWord, ...prev];
      AsyncStorage.setItem("celpeprep_vocab", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateVocabWord = useCallback(async (id: string, updates: Partial<VocabWord>) => {
    setVocabWords((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, ...updates } : w));
      AsyncStorage.setItem("celpeprep_vocab", JSON.stringify(next));
      return next;
    });
  }, []);

  const addAttempt = useCallback(async (attempt: Omit<PracticeAttempt, "id" | "createdAt">) => {
    const newAttempt: PracticeAttempt = {
      ...attempt,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setAttempts((prev) => {
      const next = [newAttempt, ...prev];
      AsyncStorage.setItem("celpeprep_attempts", JSON.stringify(next));
      return next;
    });

    const today = new Date().toDateString();
    setProfile((prev) => {
      const lastActive = prev.lastActiveDate;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastActive === today
        ? prev.streakDays
        : lastActive === yesterday
        ? prev.streakDays + 1
        : 1;
      const next = {
        ...prev,
        streakDays: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastActiveDate: today,
      };
      AsyncStorage.setItem("celpeprep_profile", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleStudyTask = useCallback(async (id: string) => {
    const today = new Date().toISOString();
    setStudyTasks((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? { ...t, completed: !t.completed, completedDate: !t.completed ? today : null }
          : t
      );
      AsyncStorage.setItem("celpeprep_tasks", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{ profile, updateProfile, syncProfileToServer, enterGuestMode, exitGuestMode, serverLimits, refreshLimits, vocabWords, addVocabWord, updateVocabWord, attempts, addAttempt, studyTasks, toggleStudyTask, isLoaded }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
