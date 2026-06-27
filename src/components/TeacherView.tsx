import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Clock, Calendar, Search, AlertCircle, BookOpen } from 'lucide-react';
import { TimetableEntry, getSemesterFromBatch } from '../types';

interface TeacherViewProps {
  timetable: TimetableEntry[];
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TeacherView({ timetable }: TeacherViewProps) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique teachers from the timetable
  const teachers = Array.from(
    new Set(timetable.map(entry => entry.teacher.trim()).filter(Boolean))
  ).sort();

  // Initialize selectedTeacher if not set but teachers exist
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacher) {
      setSelectedTeacher(teachers[0]);
    }
  }, [timetable, teachers, selectedTeacher]);

  // Filter teachers for list based on search query
  const filteredTeachers = teachers.filter(t => {
    const q = searchQuery.toLowerCase();
    if (t.toLowerCase().includes(q)) return true;
    
    // Support searching teachers by subject, room, or semester they teach!
    const schedules = timetable.filter(entry => entry.teacher.toLowerCase() === t.toLowerCase());
    return schedules.some(entry => 
      entry.subject.toLowerCase().includes(q) ||
      entry.batch.toLowerCase().includes(q) ||
      getSemesterFromBatch(entry.batch).toLowerCase().includes(q) ||
      entry.room.toLowerCase().includes(q)
    );
  });

  // Get full schedule for selected teacher
  const teacherSchedule = timetable
    .filter(entry => entry.teacher.toLowerCase() === selectedTeacher.toLowerCase())
    // Sort by day order, then start time
    .sort((a, b) => {
      const dayDiff = DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  // Group schedule by day
  const scheduleByDay = DAYS_ORDER.reduce((acc, day) => {
    const slots = teacherSchedule.filter(entry => entry.day === day);
    if (slots.length > 0) {
      acc[day] = slots;
    }
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  return (
    <div className="space-y-6">
      
      {/* Title banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 sm:p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Instructor Directory & Location Tracker</h2>
            <p className="text-xs text-slate-500 font-semibold">Identify current rooms, schedule slots, and teaching assignments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Teacher Directory */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4.5 h-fit space-y-4 shadow-sm">
          <h3 className="font-bold text-[10px] text-slate-400 tracking-wider uppercase">
            Instructor Directory
          </h3>
          
          {/* Quick Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter teachers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          {/* Directory List */}
          <div className="max-h-80 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => {
                const isActive = selectedTeacher.toLowerCase() === teacher.toLowerCase();
                const count = timetable.filter(entry => entry.teacher.toLowerCase() === teacher.toLowerCase()).length;
                
                return (
                  <button
                    key={teacher}
                    onClick={() => setSelectedTeacher(teacher)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-lg transition-all duration-150 text-left border cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{teacher}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200/40'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-4">No teachers found</p>
            )}
          </div>
        </div>

        {/* Right Side: Schedule View */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTeacher ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              
              {/* Selected teacher metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-extrabold text-lg border border-blue-100 shadow-inner">
                    {selectedTeacher.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{selectedTeacher}</h3>
                    <p className="text-xs text-slate-500 font-semibold">Total workload: {teacherSchedule.length} weekly sessions</p>
                  </div>
                </div>
              </div>

              {/* Schedule cards list grouped by day */}
              {Object.keys(scheduleByDay).length > 0 ? (
                <div className="space-y-6">
                  {DAYS_ORDER.map((day) => {
                    const slots = scheduleByDay[day];
                    if (!slots) return null;

                    return (
                      <div key={day} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200/40 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {day}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {slots.map((slot) => (
                            <div 
                              key={slot.id} 
                              className={`p-4 rounded-xl border border-slate-200 bg-slate-50/20 hover:bg-slate-50/60 transition-all duration-150 flex flex-col justify-between ${
                                slot.type === 'Lab' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-600'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    slot.type === 'Lab' 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/55' 
                                      : 'bg-blue-50 text-blue-700 border border-blue-200/55'
                                  }`}>
                                    {slot.type === 'Lab' ? 'LAB' : 'LECTURE'}
                                  </span>
                                  <div className="flex gap-1.5 items-center">
                                    <span className="text-[10px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">
                                      {getSemesterFromBatch(slot.batch)}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                      {slot.batch}
                                    </span>
                                  </div>
                                </div>
                                <h4 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                                  {slot.subject}
                                </h4>
                              </div>

                              <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-600 gap-2 border-t border-slate-100/80 pt-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={14} className="text-slate-400" />
                                  <span className="font-mono text-slate-600">{slot.startTime} - {slot.endTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin size={14} className="text-blue-600" />
                                  <span className="text-blue-900 font-bold bg-blue-50 px-2 py-0.5 border border-blue-200/40 rounded-md">
                                    {slot.room}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <AlertCircle size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No scheduled sessions found for this teacher.</p>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <BookOpen size={48} className="text-slate-200 mb-3" />
              <h3 className="font-bold text-slate-700">No instructor selected</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Please select a teacher from the directory list on the left to view their lecture halls and labs schedule.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
