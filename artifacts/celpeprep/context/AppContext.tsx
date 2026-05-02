import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface UserProfile {
  name: string;
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

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [studyTasks, setStudyTasks] = useState<StudyTask[]>(defaultStudyTasks);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [profileStr, vocabStr, attemptsStr, tasksStr] = await AsyncStorage.multiGet([
        "celpeprep_profile",
        "celpeprep_vocab",
        "celpeprep_attempts",
        "celpeprep_tasks",
      ]);
      if (profileStr[1]) {
        const saved = JSON.parse(profileStr[1]) as Partial<UserProfile>;
        const merged: UserProfile = { ...defaultProfile, ...saved };
        if (!merged.deviceToken) {
          merged.deviceToken = generateUUID();
          AsyncStorage.setItem("celpeprep_profile", JSON.stringify(merged));
        }
        setProfile(merged);
      } else {
        const withToken = { ...defaultProfile, deviceToken: generateUUID() };
        AsyncStorage.setItem("celpeprep_profile", JSON.stringify(withToken));
        setProfile(withToken);
      }
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
      value={{ profile, updateProfile, vocabWords, addVocabWord, updateVocabWord, attempts, addAttempt, studyTasks, toggleStudyTask, isLoaded }}
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
