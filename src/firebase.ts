import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { TimetableEntry, RoomEntry, TeacherEntry, QuizEntry } from './types';
import firebaseConfigJson from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId);

const TIMETABLE_COLLECTION = "timetable";

const defaultData: Omit<TimetableEntry, 'id'>[] = [
  {
    day: "Monday",
    type: "Class",
    subject: "Software Engineering",
    teacher: "Dr. Mudassar",
    room: "Lecture Room 101",
    startTime: "09:00",
    endTime: "10:30",
    batch: "CS-3A"
  },
  {
    day: "Monday",
    type: "Lab",
    subject: "Web Development Lab",
    teacher: "Engr. Ali",
    room: "Computer Lab A",
    startTime: "11:00",
    endTime: "13:30",
    batch: "CS-3B"
  },
  {
    day: "Tuesday",
    type: "Class",
    subject: "Artificial Intelligence",
    teacher: "Prof. Fatima",
    room: "Lecture Room 102",
    startTime: "10:30",
    endTime: "12:00",
    batch: "CS-3A"
  },
  {
    day: "Tuesday",
    type: "Class",
    subject: "Database Systems",
    teacher: "Dr. Arshad",
    room: "Lecture Room 201",
    startTime: "13:30",
    endTime: "15:00",
    batch: "SE-2A"
  },
  {
    day: "Wednesday",
    type: "Class",
    subject: "Computer Networks",
    teacher: "Prof. Usman",
    room: "Lecture Room 101",
    startTime: "09:00",
    endTime: "10:30",
    batch: "CS-3B"
  },
  {
    day: "Wednesday",
    type: "Lab",
    subject: "Database Systems Lab",
    teacher: "Engr. Ali",
    room: "Computer Lab B",
    startTime: "11:00",
    endTime: "13:30",
    batch: "SE-2A"
  },
  {
    day: "Thursday",
    type: "Class",
    subject: "Data Structures",
    teacher: "Dr. Mudassar",
    room: "Lecture Room 102",
    startTime: "09:00",
    endTime: "10:30",
    batch: "CS-2A"
  },
  {
    day: "Friday",
    type: "Class",
    subject: "Numerical Computing",
    teacher: "Prof. Fatima",
    room: "Lecture Room 201",
    startTime: "10:00",
    endTime: "11:30",
    batch: "CS-3A"
  }
];

export async function getTimetable(): Promise<TimetableEntry[]> {
  try {
    const colRef = collection(db, TIMETABLE_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("Timetable collection is empty. Seeding default data...");
      const seeded: TimetableEntry[] = [];
      const batch = writeBatch(db);
      
      for (const item of defaultData) {
        const newDocRef = doc(colRef);
        const entryWithId = { ...item, id: newDocRef.id };
        batch.set(newDocRef, entryWithId);
        seeded.push(entryWithId);
      }
      
      await batch.commit();
      return seeded;
    }
    
    const entries: TimetableEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        day: data.day || "",
        type: data.type || "Class",
        subject: data.subject || "",
        teacher: data.teacher || "",
        room: data.room || "",
        startTime: data.startTime || "",
        endTime: data.endTime || "",
        batch: data.batch || ""
      });
    });
    
    return entries;
  } catch (error) {
    console.error("Error fetching timetable from Firebase, using default mock:", error);
    return defaultData.map((d, i) => ({ ...d, id: `mock-${i}` }));
  }
}

export async function addTimetableEntry(entry: Omit<TimetableEntry, 'id'>): Promise<string> {
  const colRef = collection(db, TIMETABLE_COLLECTION);
  const docRef = await addDoc(colRef, entry);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateTimetableEntry(id: string, entry: Partial<TimetableEntry>): Promise<void> {
  const docRef = doc(db, TIMETABLE_COLLECTION, id);
  await updateDoc(docRef, entry);
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  const docRef = doc(db, TIMETABLE_COLLECTION, id);
  await deleteDoc(docRef);
}

const ROOMS_COLLECTION = "rooms";

const defaultRooms: Omit<RoomEntry, 'id'>[] = [
  { name: "Lecture Room 101", type: "Class" },
  { name: "Lecture Room 102", type: "Class" },
  { name: "Lecture Room 201", type: "Class" },
  { name: "Computer Lab A", type: "Lab" },
  { name: "Computer Lab B", type: "Lab" },
  { name: "Physics Lab", type: "Lab" },
  { name: "Chemistry Lab", type: "Lab" }
];

export async function getRooms(): Promise<RoomEntry[]> {
  try {
    const colRef = collection(db, ROOMS_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("Rooms collection is empty. Seeding default rooms...");
      const seeded: RoomEntry[] = [];
      const batch = writeBatch(db);
      
      for (const item of defaultRooms) {
        const newDocRef = doc(colRef);
        const entryWithId = { ...item, id: newDocRef.id };
        batch.set(newDocRef, entryWithId);
        seeded.push(entryWithId);
      }
      
      await batch.commit();
      return seeded;
    }
    
    const rooms: RoomEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rooms.push({
        id: docSnap.id,
        name: data.name || "",
        type: data.type || "Class"
      });
    });
    
    return rooms.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching rooms from Firebase, using default mock:", error);
    return defaultRooms.map((d, i) => ({ ...d, id: `mock-room-${i}` }));
  }
}

export async function addRoom(room: Omit<RoomEntry, 'id'>): Promise<string> {
  const colRef = collection(db, ROOMS_COLLECTION);
  const docRef = await addDoc(colRef, room);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function deleteRoom(id: string): Promise<void> {
  const docRef = doc(db, ROOMS_COLLECTION, id);
  await deleteDoc(docRef);
}

const TEACHERS_COLLECTION = "teachers";

const defaultTeachers: Omit<TeacherEntry, 'id'>[] = [
  { name: "Dr. Mudassar", department: "EE" },
  { name: "Engr. Ali", department: "EE" },
  { name: "Prof. Fatima", department: "EE" },
  { name: "Dr. Arshad", department: "EE" },
  { name: "Prof. Usman", department: "EE" }
];

export async function getTeachers(): Promise<TeacherEntry[]> {
  try {
    const colRef = collection(db, TEACHERS_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("Teachers collection is empty. Seeding default teachers...");
      const seeded: TeacherEntry[] = [];
      const batch = writeBatch(db);
      
      for (const item of defaultTeachers) {
        const newDocRef = doc(colRef);
        const entryWithId = { ...item, id: newDocRef.id };
        batch.set(newDocRef, entryWithId);
        seeded.push(entryWithId);
      }
      
      await batch.commit();
      return seeded;
    }
    
    const teachers: TeacherEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      teachers.push({
        id: docSnap.id,
        name: data.name || "",
        department: data.department || "EE"
      });
    });
    
    return teachers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching teachers from Firebase, using default mock:", error);
    return defaultTeachers.map((d, i) => ({ ...d, id: `mock-teacher-${i}` }));
  }
}

export async function addTeacher(teacher: Omit<TeacherEntry, 'id'>): Promise<string> {
  const colRef = collection(db, TEACHERS_COLLECTION);
  const docRef = await addDoc(colRef, teacher);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function deleteTeacher(id: string): Promise<void> {
  const docRef = doc(db, TEACHERS_COLLECTION, id);
  await deleteDoc(docRef);
}

const QUIZZES_COLLECTION = "quizzes";

// Helper to generate dynamic ISO dates relative to today
const getDateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const defaultQuizzes: Omit<QuizEntry, 'id'>[] = [
  {
    title: "Quiz 1: Electric Circuit Analysis",
    subject: "Electric Circuit Theory",
    teacher: "Dr. Mudassar",
    room: "Lecture Room 101",
    batch: "EE-1A + EE-1B (Combined)",
    date: getDateOffset(2),
    startTime: "09:30",
    endTime: "10:15",
    totalMarks: 15,
    topics: "Ohm's Law, Kirchhoff's Laws (KVL & KCL), Node Voltage Method",
    status: "scheduled"
  },
  {
    title: "Quiz 2: Semiconductor Physics",
    subject: "Electronic Devices",
    teacher: "Prof. Fatima",
    room: "Lecture Room 102",
    batch: "EE-2A",
    date: getDateOffset(4),
    startTime: "11:00",
    endTime: "11:45",
    totalMarks: 20,
    topics: "PN Junction diode characteristics, Zener Diode & rectifiers",
    status: "scheduled"
  },
  {
    title: "Quiz 1: SQL & Relational Models",
    subject: "Database Systems",
    teacher: "Dr. Arshad",
    room: "Computer Lab A",
    batch: "SE-2A",
    date: getDateOffset(6),
    startTime: "14:00",
    endTime: "14:50",
    totalMarks: 20,
    topics: "DDL, DML, Nested Queries and Join operations",
    status: "scheduled"
  },
  {
    title: "Quiz 3: Digital Logic Design",
    subject: "Digital Logic & Design",
    teacher: "Engr. Ali",
    room: "Lecture Room 201",
    batch: "CS-3A + CS-3B (Combined)",
    date: getDateOffset(9),
    startTime: "10:00",
    endTime: "10:45",
    totalMarks: 15,
    topics: "K-Maps minimization, Multiplexers, Decoders & Adders",
    status: "scheduled"
  }
];

export async function getQuizzes(): Promise<QuizEntry[]> {
  try {
    const colRef = collection(db, QUIZZES_COLLECTION);
    const snapshot = await getDocs(colRef);
    
    if (snapshot.empty) {
      console.log("Quizzes collection is empty. Seeding default quizzes...");
      const seeded: QuizEntry[] = [];
      const batch = writeBatch(db);
      
      for (const item of defaultQuizzes) {
        const newDocRef = doc(colRef);
        const entryWithId = { ...item, id: newDocRef.id };
        batch.set(newDocRef, entryWithId);
        seeded.push(entryWithId);
      }
      
      await batch.commit();
      return seeded;
    }
    
    const quizzes: QuizEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      quizzes.push({
        id: docSnap.id,
        title: data.title || "Quiz",
        subject: data.subject || "",
        teacher: data.teacher || "",
        room: data.room || "",
        batch: data.batch || "",
        date: data.date || "",
        startTime: data.startTime || "09:00",
        endTime: data.endTime || "10:00",
        totalMarks: data.totalMarks ? Number(data.totalMarks) : undefined,
        topics: data.topics || "",
        status: data.status || "scheduled"
      });
    });
    
    return quizzes.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.startTime.localeCompare(b.startTime);
    });
  } catch (error) {
    console.error("Error fetching quizzes from Firebase, using default mock:", error);
    return defaultQuizzes.map((d, i) => ({ ...d, id: `mock-quiz-${i}` }));
  }
}

export async function addQuiz(quiz: Omit<QuizEntry, 'id'>): Promise<string> {
  const colRef = collection(db, QUIZZES_COLLECTION);
  const docRef = await addDoc(colRef, quiz);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateQuiz(id: string, quiz: Partial<QuizEntry>): Promise<void> {
  const docRef = doc(db, QUIZZES_COLLECTION, id);
  await updateDoc(docRef, quiz);
}

export async function deleteQuiz(id: string): Promise<void> {
  const docRef = doc(db, QUIZZES_COLLECTION, id);
  await deleteDoc(docRef);
}

