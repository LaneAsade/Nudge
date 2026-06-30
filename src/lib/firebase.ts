import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, Goal, Habit, AgentAction } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/tasks');

let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      console.error('Sign in error:', error);
    }
    throw error;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const getTasksCollection = (userId: string) => collection(db, 'users', userId, 'tasks');
export const getGoalsCollection = (userId: string) => collection(db, 'users', userId, 'goals');
export const getHabitsCollection = (userId: string) => collection(db, 'users', userId, 'habits');
export const getAgentActionsCollection = (userId: string) => collection(db, 'users', userId, 'actions');

export const saveTask = (userId: string, task: Task) => setDoc(doc(db, 'users', userId, 'tasks', task.id), task);
export const updateTaskFields = (userId: string, taskId: string, fields: Partial<Task>) => updateDoc(doc(db, 'users', userId, 'tasks', taskId), fields);
export const deleteTask = (userId: string, taskId: string) => deleteDoc(doc(db, 'users', userId, 'tasks', taskId));

export const saveGoal = (userId: string, goal: Goal) => setDoc(doc(db, 'users', userId, 'goals', goal.id), goal);
export const deleteGoal = (userId: string, goalId: string) => deleteDoc(doc(db, 'users', userId, 'goals', goalId));

export const saveHabit = (userId: string, habit: Habit) => setDoc(doc(db, 'users', userId, 'habits', habit.id), habit);
export const deleteHabit = (userId: string, habitId: string) => deleteDoc(doc(db, 'users', userId, 'habits', habitId));

export const saveAgentAction = (userId: string, action: AgentAction) => setDoc(doc(db, 'users', userId, 'actions', action.id), action);
export const updateAgentActionStatus = (userId: string, actionId: string, status: string) => updateDoc(doc(db, 'users', userId, 'actions', actionId), { status });

export const updateMyLeaderboardStats = (userId: string, stats: { displayName: string, initials: string, tasksCompletedToday: number, tasksAssignedToday: number, streakDays: number, avgPriority: number }) => {
  return setDoc(doc(db, 'leaderboard', userId), {
    ...stats,
    lastUpdated: new Date().toISOString()
  });
};

