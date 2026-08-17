import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, AlertTriangle, Users, Plus, Trash2, Calendar, Clock, BookOpen, MapPin, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import { QuizEntry, RoomEntry, TeacherEntry, TimetableEntry } from '../types';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quiz: Partial<QuizEntry> & { id?: string }) => Promise<void>;
  editingQuiz: QuizEntry | null;
  timetable: TimetableEntry[];
  rooms: RoomEntry[];
  teachers: TeacherEntry[];
  existingQuizzes: QuizEntry[];
}

export interface ConflictInfo {
  hasConflict: boolean;
  type: 'room_class' | 'teacher_class' | 'batch_class' | 'room_quiz' | 'teacher_quiz' | 'batch_quiz' | 'time_invalid' | 'none';
  title: string;
  message: string;
  details?: string;
  dayOfWeek?: string;
}

// Helper to determine day of the week from YYYY-MM-DD
export function getDayNameFromDate(dateString: string): string {
  if (!dateString) return '';
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

// Helper to check if batches overlap (supports "EE-1A", "EE-1A + EE-1B (Combined)", etc.)
export function doBatchesOverlap(b1: string, b2: string): boolean {
  if (!b1 || !b2) return false;
  const norm1 = b1.toLowerCase().replace(/\(combined\)/g, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
  const norm2 = b2.toLowerCase().replace(/\(combined\)/g, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
  return norm1.some(s1 => norm2.some(s2 => s1 === s2 || s1.includes(s2) || s2.includes(s1)));
}

export default function QuizModal({
  isOpen,
  onClose,
  onSave,
  editingQuiz,
  timetable,
  rooms,
  teachers,
  existingQuizzes
}: QuizModalProps) {
  const [title, setTitle] = useState('Quiz 1');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [customTeacher, setCustomTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [customRoom, setCustomRoom] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('10:15');
  const [batch, setBatch] = useState('');
  const [isCombinedClass, setIsCombinedClass] = useState(false);
  const [combinedSections, setCombinedSections] = useState<string[]>(['', '']);
  const [totalMarks, setTotalMarks] = useState<number | ''>(15);
  const [topics, setTopics] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'ongoing' | 'completed' | 'cancelled'>('scheduled');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available subjects extracted from timetable
  const availableSubjects = Array.from(new Set(timetable.map(t => t.subject).filter(Boolean))).sort();

  useEffect(() => {
    if (editingQuiz) {
      setTitle(editingQuiz.title || 'Quiz');
      setSubject(editingQuiz.subject || '');
      
      const teacherMatch = teachers.find(t => t.name.toLowerCase() === editingQuiz.teacher.toLowerCase());
      if (teacherMatch) {
        setTeacher(teacherMatch.name);
        setCustomTeacher('');
      } else {
        setTeacher('custom');
        setCustomTeacher(editingQuiz.teacher);
      }

      const roomMatch = rooms.find(r => r.name.toLowerCase() === editingQuiz.room.toLowerCase());
      if (roomMatch) {
        setRoom(roomMatch.name);
        setCustomRoom('');
      } else {
        setRoom('custom');
        setCustomRoom(editingQuiz.room);
      }

      setDate(editingQuiz.date || '');
      setStartTime(editingQuiz.startTime || '09:30');
      setEndTime(editingQuiz.endTime || '10:15');
      setBatch(editingQuiz.batch || '');
      setTotalMarks(editingQuiz.totalMarks !== undefined ? editingQuiz.totalMarks : 15);
      setTopics(editingQuiz.topics || '');
      setStatus(editingQuiz.status || 'scheduled');

      const isComb = editingQuiz.batch.includes('+') || editingQuiz.batch.toLowerCase().includes('combined');
      setIsCombinedClass(isComb);
      if (isComb) {
        const parts = editingQuiz.batch.replace(/\(Combined\)/gi, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
        setCombinedSections(parts.length >= 2 ? parts : [editingQuiz.batch, '']);
      } else {
        setCombinedSections(['', '']);
      }
    } else {
      // Defaults for new quiz
      setTitle('Quiz 1');
      setSubject(availableSubjects[0] || '');
      setTeacher(teachers[0]?.name || '');
      setCustomTeacher('');
      setRoom(rooms[0]?.name || '');
      setCustomRoom('');
      
      // Default to tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      
      setStartTime('09:30');
      setEndTime('10:15');
      setBatch('');
      setIsCombinedClass(false);
      setCombinedSections(['', '']);
      setTotalMarks(15);
      setTopics('');
      setStatus('scheduled');
    }
    setError('');
  }, [editingQuiz, isOpen, rooms, teachers]);

  // Compute final form strings for validation & clash detection
  const finalTeacher = teacher === 'custom' ? customTeacher.trim() : teacher;
  const finalRoom = room === 'custom' ? customRoom.trim() : room;
  const finalBatch = isCombinedClass
    ? combinedSections.map(s => s.trim()).filter(Boolean).join(' + ') + (combinedSections.some(s => s.trim()) ? ' (Combined)' : '')
    : batch.trim();

  // Comprehensive clash detection against both regular timetable and scheduled quizzes
  const activeConflict = useMemo<ConflictInfo>(() => {
    if (!date || !startTime || !endTime) {
      return { hasConflict: false, type: 'none', title: '', message: '' };
    }

    if (startTime >= endTime) {
      return {
        hasConflict: true,
        type: 'time_invalid',
        title: 'Invalid Time Range',
        message: 'Start time must be strictly earlier than End time.'
      };
    }

    const dayOfWeek = getDayNameFromDate(date);
    if (!dayOfWeek) {
      return { hasConflict: false, type: 'none', title: '', message: '' };
    }

    // 1. CHECK CLASS TIMETABLE CONFLICTS (Ongoing classes of room, professor, or student section)
    for (const entry of timetable) {
      if (entry.day.toLowerCase() !== dayOfWeek.toLowerCase()) {
        continue;
      }

      // Check time overlap: entry.startTime < endTime && startTime < entry.endTime
      const isOverlap = entry.startTime < endTime && startTime < entry.endTime;
      if (!isOverlap) continue;

      // a) Room Clash with ongoing class
      if (finalRoom && entry.room.toLowerCase().trim() === finalRoom.toLowerCase().trim()) {
        return {
          hasConflict: true,
          type: 'room_class',
          dayOfWeek,
          title: `Room Conflict with Ongoing Class`,
          message: `Room "${finalRoom}" is occupied by an ongoing ${entry.type.toLowerCase()} "${entry.subject}" for Section ${entry.batch} (taught by ${entry.teacher}) on ${dayOfWeek}s from ${entry.startTime} to ${entry.endTime}.`,
          details: `Ongoing: ${entry.subject} (${entry.batch}) • ${entry.startTime} - ${entry.endTime} in ${finalRoom}`
        };
      }

      // b) Professor / Teacher Clash with ongoing class
      if (finalTeacher && entry.teacher.toLowerCase().trim() === finalTeacher.toLowerCase().trim()) {
        return {
          hasConflict: true,
          type: 'teacher_class',
          dayOfWeek,
          title: `Professor Schedule Conflict`,
          message: `Prof./Dr. "${finalTeacher}" is already taking an ongoing class "${entry.subject}" for Section ${entry.batch} in "${entry.room}" on ${dayOfWeek}s from ${entry.startTime} to ${entry.endTime}.`,
          details: `Teaching: ${entry.subject} (${entry.batch}) in ${entry.room} • ${entry.startTime} - ${entry.endTime}`
        };
      }

      // c) Student / Section Clash with ongoing class
      if (finalBatch && doBatchesOverlap(entry.batch, finalBatch)) {
        return {
          hasConflict: true,
          type: 'batch_class',
          dayOfWeek,
          title: `Student Class Timetable Conflict`,
          message: `Students of section "${finalBatch}" already have an ongoing class "${entry.subject}" with ${entry.teacher} in "${entry.room}" on ${dayOfWeek}s from ${entry.startTime} to ${entry.endTime}.`,
          details: `Class: ${entry.subject} with ${entry.teacher} in ${entry.room} • ${entry.startTime} - ${entry.endTime}`
        };
      }
    }

    // 2. CHECK CONFLICTS WITH OTHER QUIZZES ON THIS DATE
    for (const q of existingQuizzes) {
      if (editingQuiz && q.id === editingQuiz.id) continue;
      if (q.date !== date) continue;
      if (q.status === 'cancelled') continue;

      const isOverlap = q.startTime < endTime && startTime < q.endTime;
      if (!isOverlap) continue;

      // a) Room Clash with another quiz
      if (finalRoom && q.room.toLowerCase().trim() === finalRoom.toLowerCase().trim()) {
        return {
          hasConflict: true,
          type: 'room_quiz',
          dayOfWeek,
          title: `Room Conflict with Another Quiz`,
          message: `Room "${finalRoom}" is already booked on this date for "${q.title}" (${q.subject}) for ${q.batch} from ${q.startTime} to ${q.endTime}.`,
          details: `Quiz: ${q.title} (${q.subject}) • ${q.startTime} - ${q.endTime}`
        };
      }

      // b) Teacher Clash with another quiz
      if (finalTeacher && q.teacher.toLowerCase().trim() === finalTeacher.toLowerCase().trim()) {
        return {
          hasConflict: true,
          type: 'teacher_quiz',
          dayOfWeek,
          title: `Professor Conflict with Another Quiz`,
          message: `Prof./Dr. "${finalTeacher}" is already scheduled for "${q.title}" (${q.subject}) in "${q.room}" on this date from ${q.startTime} to ${q.endTime}.`,
          details: `Invigilating: ${q.title} in ${q.room} • ${q.startTime} - ${q.endTime}`
        };
      }

      // c) Section Clash with another quiz
      if (finalBatch && doBatchesOverlap(q.batch, finalBatch)) {
        return {
          hasConflict: true,
          type: 'batch_quiz',
          dayOfWeek,
          title: `Student Conflict with Another Quiz`,
          message: `Section "${finalBatch}" is already scheduled to take "${q.title}" (${q.subject}) in "${q.room}" from ${q.startTime} to ${q.endTime}.`,
          details: `Assessment: ${q.title} in ${q.room} • ${q.startTime} - ${q.endTime}`
        };
      }
    }

    return { hasConflict: false, type: 'none', title: '', message: '', dayOfWeek };
  }, [date, startTime, endTime, finalRoom, finalTeacher, finalBatch, editingQuiz, timetable, existingQuizzes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Quiz title is required (e.g. Quiz 1, Midterm Quiz).');
      return;
    }

    if (!subject.trim()) {
      setError('Course / Subject is required.');
      return;
    }

    if (!finalTeacher) {
      setError('Please specify the Instructor.');
      return;
    }

    if (!finalRoom) {
      setError('Please specify the Room/Venue.');
      return;
    }

    if (!date) {
      setError('Please select the quiz date.');
      return;
    }

    if (isCombinedClass) {
      const validSections = combinedSections.map(s => s.trim()).filter(Boolean);
      if (validSections.length < 2) {
        setError('Please specify at least two sections for a combined quiz.');
        return;
      }
    } else {
      if (!finalBatch) {
        setError('Target Section / Batch is required.');
        return;
      }
    }

    if (!startTime || !endTime) {
      setError('Start time and End time are required.');
      return;
    }

    if (startTime >= endTime) {
      setError('Start time must be strictly earlier than End time.');
      return;
    }

    // STRICT CLASH PREVENTION: Check if there is any active conflict
    if (activeConflict.hasConflict) {
      setError(activeConflict.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<QuizEntry> = {
        title: title.trim(),
        subject: subject.trim(),
        teacher: finalTeacher,
        room: finalRoom,
        date,
        startTime,
        endTime,
        batch: finalBatch,
        totalMarks: totalMarks !== '' ? Number(totalMarks) : undefined,
        topics: topics.trim(),
        status
      };

      if (editingQuiz) {
        payload.id = editingQuiz.id;
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save quiz schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window in portrait layout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {editingQuiz ? 'Edit Quiz Assessment' : 'Schedule New Quiz'}
                </h3>
                <p className="text-[10px] font-medium text-slate-500">
                  Automatic Timetable & Ongoing Class Conflict Verification
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Form Validation Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold shadow-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Real-time Clash Detection Status Card */}
              {activeConflict.hasConflict ? (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-900 text-xs space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    <span>⚠️ {activeConflict.title}</span>
                  </div>
                  <p className="text-[11px] font-medium text-amber-800 leading-relaxed pl-6">
                    {activeConflict.message}
                  </p>
                  {activeConflict.details && (
                    <div className="ml-6 mt-1 px-2.5 py-1 bg-amber-100/70 border border-amber-200 rounded-lg text-[10px] font-mono font-bold text-amber-900">
                      {activeConflict.details}
                    </div>
                  )}
                  <p className="text-[10px] font-semibold text-amber-700/90 pl-6 pt-0.5">
                    ⛔ Quizzes cannot be created during ongoing student classes, professor schedules, or occupied rooms.
                  </p>
                </motion.div>
              ) : date && startTime && endTime && finalRoom && finalTeacher && finalBatch ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shadow-xs">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    ✓ Conflict-Free on {activeConflict.dayOfWeek}: Room, Instructor, and Students are free from ongoing classes.
                  </span>
                </div>
              ) : null}

              {/* Title & Marks */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Quiz 1 or Midterm Quiz"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="15"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Course / Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Electric Circuit Analysis"
                  list="quiz-subject-options"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                />
                <datalist id="quiz-subject-options">
                  {availableSubjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Instructor
                </label>
                <select
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold cursor-pointer mb-1.5 ${
                    activeConflict.type === 'teacher_class' || activeConflict.type === 'teacher_quiz'
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.name}>{t.name} ({t.department})</option>
                  ))}
                  <option value="custom">+ Other / Custom Instructor</option>
                </select>
                {teacher === 'custom' && (
                  <input
                    type="text"
                    value={customTeacher}
                    onChange={(e) => setCustomTeacher(e.target.value)}
                    placeholder="Enter instructor name..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg font-medium"
                  />
                )}
              </div>

              {/* Date & Time Range */}
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Quiz Date
                    </label>
                    {date && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {getDayNameFromDate(date)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 font-semibold cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 font-semibold cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Room / Location */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Room / Venue
                </label>
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold cursor-pointer mb-1.5 ${
                    activeConflict.type === 'room_class' || activeConflict.type === 'room_quiz'
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-slate-200'
                  }`}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>{r.name} ({r.type})</option>
                  ))}
                  <option value="custom">+ Other / Custom Room</option>
                </select>
                {room === 'custom' && (
                  <input
                    type="text"
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    placeholder="Enter venue or room name..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg font-medium"
                  />
                )}
              </div>

              {/* Target Batch & Combined Sections */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Target Section / Batch
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isCombinedClass;
                      setIsCombinedClass(nextState);
                      if (nextState && combinedSections.every(s => !s.trim()) && batch.trim()) {
                        setCombinedSections([batch.trim(), '']);
                      }
                    }}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      isCombinedClass 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <Users size={12} />
                    <span>{isCombinedClass ? "Combined Quiz Mode" : "+ Combine Multiple Sections"}</span>
                  </button>
                </div>

                {isCombinedClass ? (
                  <div className={`p-3 bg-indigo-50/50 border rounded-xl space-y-2.5 ${
                    activeConflict.type === 'batch_class' || activeConflict.type === 'batch_quiz'
                      ? 'border-amber-400 bg-amber-50/40'
                      : 'border-indigo-200/80'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                      <span>Combined Sections</span>
                      <span className="text-[10px] text-indigo-600 font-medium">e.g. EE-1A + EE-1B</span>
                    </div>

                    {combinedSections.map((sec, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 w-12 shrink-0">Sec {idx + 1}:</span>
                        <input
                          type="text"
                          value={sec}
                          onChange={(e) => {
                            const updated = [...combinedSections];
                            updated[idx] = e.target.value;
                            setCombinedSections(updated);
                          }}
                          placeholder={`Section ${idx + 1} (e.g. EE-1${String.fromCharCode(65 + idx)})`}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:border-indigo-600 font-semibold"
                        />
                        {combinedSections.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCombinedSections(combinedSections.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                            title="Remove Section"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setCombinedSections([...combinedSections, ''])}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Add Section</span>
                      </button>

                      {combinedSections.filter(Boolean).length >= 2 && (
                        <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-100/90 px-2 py-0.5 rounded-md border border-indigo-200/50">
                          Preview: {combinedSections.filter(Boolean).join(' + ')}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="e.g. EE-1A or CS-3A"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-hidden focus:border-indigo-600 font-semibold ${
                      activeConflict.type === 'batch_class' || activeConflict.type === 'batch_quiz'
                        ? 'border-amber-400 bg-amber-50/50'
                        : 'border-slate-200'
                    }`}
                  />
                )}
              </div>

              {/* Topics / Syllabus */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Topics / Syllabus Covered
                </label>
                <textarea
                  rows={2}
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. Chapters 1 to 3, K-Maps and Logic Gate Simplification"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 font-medium resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Quiz Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-600 font-semibold cursor-pointer"
                >
                  <option value="scheduled">Scheduled / Upcoming</option>
                  <option value="ongoing">Ongoing (Active Today)</option>
                  <option value="completed">Completed / Graded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || activeConflict.hasConflict}
                className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer ${
                  activeConflict.hasConflict
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98'
                }`}
                title={activeConflict.hasConflict ? activeConflict.message : 'Save and schedule quiz'}
              >
                <Save size={14} />
                {isSubmitting ? 'Saving...' : activeConflict.hasConflict ? 'Resolve Conflict' : 'Save Quiz'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

