import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle } from 'lucide-react';
import { TimetableEntry, RoomEntry } from '../types';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: any) => Promise<void>;
  editingEntry?: TimetableEntry | null;
  timetable: TimetableEntry[];
  rooms: RoomEntry[];
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
  rooms
}: TimetableModalProps) {
  const roomList = rooms && rooms.length > 0 ? rooms.map(r => r.name) : COMMON_ROOMS;

  const [day, setDay] = useState('Monday');
  const [type, setType] = useState<'Class' | 'Lab'>('Class');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState(roomList[0] || 'Lecture Room 101');
  const [customRoom, setCustomRoom] = useState('');
  const [useCustomRoom, setUseCustomRoom] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [batch, setBatch] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingEntry) {
      setDay(editingEntry.day);
      setType(editingEntry.type);
      setSubject(editingEntry.subject);
      setTeacher(editingEntry.teacher);
      if (roomList.includes(editingEntry.room)) {
        setRoom(editingEntry.room);
        setUseCustomRoom(false);
      } else {
        setUseCustomRoom(true);
        setCustomRoom(editingEntry.room);
      }
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setBatch(editingEntry.batch);
    } else {
      // Defaults
      setDay('Monday');
      setType('Class');
      setSubject('');
      setTeacher('');
      setRoom(roomList[0] || 'Lecture Room 101');
      setCustomRoom('');
      setUseCustomRoom(false);
      setStartTime('09:00');
      setEndTime('10:30');
      setBatch('');
    }
    setError('');
  }, [editingEntry, isOpen, rooms]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple Validations
    if (!subject.trim()) {
      setError('Subject field is required.');
      return;
    }
    if (!teacher.trim()) {
      setError('Teacher field is required.');
      return;
    }
    
    const finalRoom = useCustomRoom ? customRoom.trim() : room;
    if (!finalRoom) {
      setError('Please specify a lecture room or lab.');
      return;
    }
    
    if (!batch.trim()) {
      setError('Batch/Section is required.');
      return;
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
      const teacherConflict = conflictingEntry.teacher.toLowerCase().trim() === teacher.trim().toLowerCase();
      const batchConflict = conflictingEntry.batch.toLowerCase().trim() === batch.trim().toLowerCase();

      if (roomConflict) {
        setError(`Room Conflict: Room/Lab "${finalRoom}" is already booked for "${conflictingEntry.subject}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) on ${day}.`);
        return;
      }
      if (teacherConflict) {
        setError(`Teacher Conflict: Dr./Prof. "${teacher.trim()}" is already scheduled for "${conflictingEntry.subject}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) in "${conflictingEntry.room}" on ${day}.`);
        return;
      }
      if (batchConflict) {
        setError(`Section Conflict: Batch/Section "${batch.trim()}" is already scheduled for "${conflictingEntry.subject}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) in "${conflictingEntry.room}" on ${day}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        day,
        type,
        subject: subject.trim(),
        teacher: teacher.trim(),
        room: finalRoom,
        startTime,
        endTime,
        batch: batch.trim()
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
          className="w-full max-w-lg overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-100"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              {editingEntry ? 'Edit Schedule Slot' : 'Add New Schedule Slot'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 text-xs font-semibold">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Day of Week */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Day of Week
                </label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Type (Class/Lab) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Slot Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'Class' | 'Lab')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Instructor Name
              </label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="e.g. Dr. Mudassar"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              />
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
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Batch / Section
              </label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="e.g. CS-3A or Section-B"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
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
