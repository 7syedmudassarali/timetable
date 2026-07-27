import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, Users, Plus, Trash2 } from 'lucide-react';
import { TimetableEntry, RoomEntry, TeacherEntry } from '../types';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: any) => Promise<void>;
  editingEntry?: TimetableEntry | null;
  timetable: TimetableEntry[];
  rooms: RoomEntry[];
  teachers: TeacherEntry[];
}

const COMMON_ROOMS = [
  "Lecture Room 101",
  "Lecture Room 102",
  "Lecture Room 201",
  "Computer Lab A",
  "Computer Lab B",
  "Physics Lab",
  "Chemistry Lab"
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

export default function TimetableModal({
  isOpen,
  onClose,
  onSave,
  editingEntry,
  timetable,
  rooms,
  teachers
}: TimetableModalProps) {
  const roomList = rooms && rooms.length > 0 ? rooms.map(r => r.name) : COMMON_ROOMS;
  const teacherList = teachers && teachers.length > 0 ? teachers.map(t => t.name) : [];

  const [day, setDay] = useState('Monday');
  const [type, setType] = useState<'Class' | 'Lab'>('Class');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [customTeacher, setCustomTeacher] = useState('');
  const [useCustomTeacher, setUseCustomTeacher] = useState(false);
  const [room, setRoom] = useState(roomList[0] || 'Lecture Room 101');
  const [customRoom, setCustomRoom] = useState('');
  const [useCustomRoom, setUseCustomRoom] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [batch, setBatch] = useState('');
  const [isCombinedClass, setIsCombinedClass] = useState(false);
  const [combinedSections, setCombinedSections] = useState<string[]>(['', '']);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const listRooms = rooms && rooms.length > 0 ? rooms.map(r => r.name) : COMMON_ROOMS;
    const listTeachers = teachers && teachers.length > 0 ? teachers.map(t => t.name) : [];

    if (editingEntry) {
      setDay(editingEntry.day);
      setType(editingEntry.type);
      setSubject(editingEntry.subject);
      
      if (listTeachers.includes(editingEntry.teacher)) {
        setTeacher(editingEntry.teacher);
        setUseCustomTeacher(false);
      } else {
        setUseCustomTeacher(true);
        setCustomTeacher(editingEntry.teacher);
        setTeacher(editingEntry.teacher);
      }

      if (listRooms.includes(editingEntry.room)) {
        setRoom(editingEntry.room);
        setUseCustomRoom(false);
      } else {
        setUseCustomRoom(true);
        setCustomRoom(editingEntry.room);
      }
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setBatch(editingEntry.batch);

      const isComb = editingEntry.batch.includes('+') || editingEntry.batch.toLowerCase().includes('combined');
      setIsCombinedClass(isComb);
      if (isComb) {
        const parts = editingEntry.batch.replace(/\(Combined\)/gi, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
        setCombinedSections(parts.length >= 2 ? parts : [editingEntry.batch, '']);
      } else {
        setCombinedSections(['', '']);
      }
    } else {
      // Defaults
      setDay('Monday');
      setType('Class');
      setSubject('');
      
      const defaultTeacher = listTeachers[0] || '';
      setTeacher(defaultTeacher);
      setCustomTeacher('');
      setUseCustomTeacher(listTeachers.length === 0);

      setRoom(listRooms[0] || 'Lecture Room 101');
      setCustomRoom('');
      setUseCustomRoom(false);
      setStartTime('09:00');
      setEndTime('10:30');
      setBatch('');
      setIsCombinedClass(false);
      setCombinedSections(['', '']);
    }
    setError('');
  }, [editingEntry, isOpen, rooms, teachers]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple Validations
    if (!subject.trim()) {
      setError('Subject field is required.');
      return;
    }
    
    const finalTeacher = useCustomTeacher ? customTeacher.trim() : teacher;
    if (!finalTeacher) {
      setError('Teacher field is required.');
      return;
    }
    
    const finalRoom = useCustomRoom ? customRoom.trim() : room;
    if (!finalRoom) {
      setError('Please specify a lecture room or lab.');
      return;
    }
    
    let finalBatch = batch.trim();
    if (isCombinedClass) {
      const validSections = combinedSections.map(s => s.trim()).filter(Boolean);
      if (validSections.length < 2) {
        setError('Please specify at least two sections for a combined class.');
        return;
      }
      finalBatch = `${validSections.join(' + ')} (Combined)`;
    } else {
      if (!finalBatch) {
        setError('Batch/Section is required.');
        return;
      }
    }

    if (!startTime || !endTime) {
      setError('Both start and end times must be defined.');
      return;
    }

    // Check if end time is after start time
    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    // Helper to check if batches overlap
    const doBatchesOverlap = (b1: string, b2: string) => {
      const norm1 = b1.toLowerCase().replace(/\(combined\)/g, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
      const norm2 = b2.toLowerCase().replace(/\(combined\)/g, '').split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
      return norm1.some(s1 => norm2.some(s2 => s1 === s2 || s1.includes(s2) || s2.includes(s1)));
    };

    // Check for scheduling conflicts (Room, Teacher, and Batch/Class)
    const conflictingEntry = timetable.find(entry => {
      if (editingEntry && entry.id === editingEntry.id) {
        return false;
      }
      if (entry.day !== day) {
        return false;
      }

      // Overlap check: entry.startTime < endTime && startTime < entry.endTime
      return entry.startTime < endTime && startTime < entry.endTime;
    });

    if (conflictingEntry) {
      const roomConflict = conflictingEntry.room.toLowerCase().trim() === finalRoom.toLowerCase().trim();
      const teacherConflict = conflictingEntry.teacher.toLowerCase().trim() === finalTeacher.toLowerCase().trim();
      const batchConflict = doBatchesOverlap(conflictingEntry.batch, finalBatch);

      if (roomConflict) {
        setError(`Room Conflict: Room/Lab "${finalRoom}" is already booked for "${conflictingEntry.subject}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) on ${day}.`);
        return;
      }
      if (teacherConflict) {
        setError(`Teacher Conflict: Dr./Prof. "${finalTeacher}" is already scheduled for "${conflictingEntry.subject}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) in "${conflictingEntry.room}" on ${day}.`);
        return;
      }
      if (batchConflict) {
        setError(`Section Conflict: Section "${finalBatch}" conflicts with scheduled class for "${conflictingEntry.batch}" (${conflictingEntry.subject} ${conflictingEntry.startTime} - ${conflictingEntry.endTime}) on ${day}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        day,
        type,
        subject: subject.trim(),
        teacher: finalTeacher,
        room: finalRoom,
        startTime,
        endTime,
        batch: finalBatch
      };
      
      if (editingEntry) {
        payload.id = editingEntry.id;
      }
      
      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingEntry ? 'Edit Schedule Slot' : 'Add New Schedule Slot'}
              </h3>
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
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Day of Week & Slot Type vertically stacked in Portrait Mode */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Day of Week
                  </label>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Slot Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'Class' | 'Lab')}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                  >
                    <option value="Class">Class (Lecture)</option>
                    <option value="Lab">Lab (Practical)</option>
                  </select>
                </div>
              </div>

            {/* Subject / Course Title */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Subject / Course Name
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Artificial Intelligence"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Instructor Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Instructor Name
                </label>
                {teacherList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !useCustomTeacher;
                      setUseCustomTeacher(nextVal);
                      if (!nextVal) {
                        setTeacher(teacherList[0] || '');
                      } else {
                        setCustomTeacher(teacher);
                      }
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {useCustomTeacher ? "Select Database Teacher" : "Enter Custom Teacher"}
                  </button>
                )}
              </div>

              {useCustomTeacher || teacherList.length === 0 ? (
                <input
                  type="text"
                  value={customTeacher}
                  onChange={(e) => {
                    setCustomTeacher(e.target.value);
                    setTeacher(e.target.value);
                  }}
                  placeholder="e.g. Dr. Mudassar"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                />
              ) : (
                <select
                  value={teacher}
                  onChange={(e) => setTeacher(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
                >
                  {teacherList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Lecture Room / Lab Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Location / Room
                </label>
                <button
                  type="button"
                  onClick={() => setUseCustomRoom(!useCustomRoom)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  {useCustomRoom ? "Select Common Room" : "Enter Custom Room"}
                </button>
              </div>

              {useCustomRoom ? (
                <input
                  type="text"
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  placeholder="e.g. Workshop C, Room 302"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                />
              ) : (
                <select
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
                >
                  {roomList.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* Target Batch / Class Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Batch / Section
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
                  <span>{isCombinedClass ? "Combined Class Mode" : "+ Combine Multiple Sections"}</span>
                </button>
              </div>

              {isCombinedClass ? (
                <div className="p-3 bg-indigo-50/50 border border-indigo-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                    <span>Combined Sections (2 or more)</span>
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
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
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
                  placeholder="e.g. CS-3A or Section-B"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
                />
              )}
            </div>
            </div>

            {/* Submit Actions (Fixed Footer in Portrait Modal) */}
            <div className="flex gap-3 px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-all shadow-xs cursor-pointer"
              >
                <Save size={14} />
                {isSubmitting ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
