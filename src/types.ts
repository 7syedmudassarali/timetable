export interface RoomEntry {
  id: string;
  name: string;
  type: 'Class' | 'Lab';
}

export interface TimetableEntry {
  id: string;
  day: string; // Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  type: 'Class' | 'Lab';
  subject: string;
  teacher: string;
  room: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  batch: string; // e.g., "CS-3A"
}

export interface RoomStatus {
  name: string;
  isFree: boolean;
  currentClass?: TimetableEntry;
  nextClass?: TimetableEntry;
}

export function getSemesterFromBatch(batch: string): string {
  if (!batch) return 'Other';
  
  const romanMap: Record<string, string> = { 
    i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' 
  };
  
  const lowerBatch = batch.toLowerCase().trim();
  
  // Try matching Roman numerals at boundaries
  const romanMatch = lowerBatch.match(/\b(viii|vii|vi|iv|v|iii|ii|i)\b/);
  if (romanMatch) {
    return `Semester ${romanMap[romanMatch[1]]}`;
  }
  
  // Try matching ordinal numbers like 1st, 2nd, 3rd, 4th, etc.
  const ordinalMatch = lowerBatch.match(/(\d+)(st|nd|rd|th)/);
  if (ordinalMatch) {
    const num = parseInt(ordinalMatch[1], 10);
    if (num >= 1 && num <= 8) {
      return `Semester ${num}`;
    }
  }
  
  // Try matching standard CS department patterns like "CS-3A", "CS3A", "MCS-2", "CS-1"
  // Look for any digit 1 to 8
  const digitMatch = lowerBatch.match(/[a-z-]*([1-8])[a-z]*/);
  if (digitMatch) {
    return `Semester ${digitMatch[1]}`;
  }
  
  // Standalone digit
  const standaloneMatch = lowerBatch.match(/\b([1-8])\b/);
  if (standaloneMatch) {
    return `Semester ${standaloneMatch[1]}`;
  }
  
  return 'Other';
}
