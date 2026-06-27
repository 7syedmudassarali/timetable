import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, MapPin, User, Clock, GraduationCap, Edit, Trash2, PlusCircle, AlertCircle } from 'lucide-react';
import { TimetableEntry, getSemesterFromBatch } from '../types';

interface StudentViewProps {
  timetable: TimetableEntry[];
  isAdmin: boolean;
  onAddClick: () => void;
  onEditClick: (entry: TimetableEntry) => void;
  onDeleteClick: (id: string) => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudentView({
  timetable,
  isAdmin,
  onAddClick,
  onEditClick,
  onDeleteClick
}: StudentViewProps) {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(() => localStorage.getItem('student_selected_semester') || 'All');
  const [selectedBatch, setSelectedBatch] = useState(() => localStorage.getItem('student_selected_batch') || 'All');

  // Auto-select current day of week on mount
  useEffect(() => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDayName = daysOfWeek[new Date().getDay()];
    if (DAYS.includes(currentDayName)) {
      setSelectedDay(currentDayName);
    }
  }, []);

  // Persist selected batch & semester
  useEffect(() => {
    localStorage.setItem('student_selected_batch', selectedBatch);
  }, [selectedBatch]);

  useEffect(() => {
    localStorage.setItem('student_selected_semester', selectedSemester);
  }, [selectedSemester]);

  // Extract unique semesters
  const uniqueSemesters = Array.from(new Set(timetable.map(entry => getSemesterFromBatch(entry.batch))))
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 99;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 99;
      return numA - numB;
    });

  // Extract unique batches for the student selection dropdown, potentially filtered by selected semester
  const uniqueBatches = Array.from(
    new Set(
      timetable
        .filter(entry => selectedSemester === 'All' || getSemesterFromBatch(entry.batch) === selectedSemester)
        .map(entry => entry.batch)
    )
  )
    .filter(Boolean)
    .sort();

  // Reset selected batch if it is no longer valid for the selected semester
  useEffect(() => {
    if (selectedBatch !== 'All' && !uniqueBatches.includes(selectedBatch)) {
      setSelectedBatch('All');
    }
  }, [selectedSemester, uniqueBatches, selectedBatch]);

  // Filter entries based on selected day, search query, semester, and batch
  const filteredEntries = timetable
    .filter(entry => entry.day === selectedDay)
    .filter(entry => {
      if (selectedSemester !== 'All' && getSemesterFromBatch(entry.batch) !== selectedSemester) {
        return false;
      }
      if (selectedBatch !== 'All' && entry.batch !== selectedBatch) {
        return false;
      }
      return true;
    })
    .filter(entry => {
      const q = searchQuery.toLowerCase();
      const sem = getSemesterFromBatch(entry.batch).toLowerCase();
      return (
        entry.subject.toLowerCase().includes(q) ||
        entry.teacher.toLowerCase().includes(q) ||
        entry.batch.toLowerCase().includes(q) ||
        entry.room.toLowerCase().includes(q) ||
        sem.includes(q)
      );
    })
    // Sort chronologically by startTime
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find next class for the banner
  const nextClass = filteredEntries.find(entry => {
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return entry.startTime > currentHourMin;
  });

  return (
    <div className="space-y-6">
      
      {/* Search, Filter & Preference controls */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Today's Schedule — {selectedDay}</h2>
              <p className="text-xs text-slate-500 font-semibold">
                {nextClass 
                  ? `Next Class: ${nextClass.subject} (${nextClass.startTime})`
                  : 'No more upcoming classes scheduled for today.'
                }
              </p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search subject, teacher, section, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold shadow-xs"
            />
          </div>
        </div>

        {/* Refined Student-Specific Filters */}
        <div className="pt-3.5 border-t border-slate-200/60 flex flex-col sm:flex-row gap-4">
          {/* Semester Selector */}
          <div className="max-w-xs w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Filter by Semester</label>
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold cursor-pointer shadow-xs"
              >
                <option value="All">All Semesters</option>
                {uniqueSemesters.map(semester => (
                  <option key={semester} value={semester}>{semester}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section / Batch Selector */}
          <div className="max-w-xs w-full">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">My Assigned Section</label>
            <div className="relative">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold cursor-pointer shadow-xs"
              >
                <option value="All">All Sections {selectedSemester !== 'All' ? `(${selectedSemester})` : ''}</option>
                {uniqueBatches.map(batch => (
                  <option key={batch} value={batch}>Only Section {batch}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Weekday Selection Bar */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {DAYS.map((day) => {
          const isActive = selectedDay === day;
          const count = timetable.filter(entry => entry.day === day).length;
          
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2.5 relative border cursor-pointer ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white border-blue-700 shadow-md shadow-blue-700/10' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-slate-200 shadow-xs'
              }`}
            >
              <span>{day}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200/40'
              }`}>
                {count}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeDayIndicator"
                  className="absolute bottom-1 left-4 right-4 h-0.5 bg-emerald-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Action Row for Admin */}
      {isAdmin && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <PlusCircle size={15} />
            <span>Add Timetable Slot</span>
          </button>
        </div>
      )}

      {/* Timetable Slots Display */}
      <div className="space-y-4">
        {filteredEntries.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time Slot</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subject / Course Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Section</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50/55 transition-colors group">
                      {/* Time */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs font-bold font-mono text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 border border-slate-200/40 w-fit px-2.5 py-1 rounded-md">
                          <Clock size={12} className="text-blue-500" />
                          <span>{entry.startTime} - {entry.endTime}</span>
                        </div>
                      </td>
                      {/* Subject */}
                      <td className="px-6 py-4.5 text-sm font-extrabold text-slate-900">
                        {entry.subject}
                      </td>
                      {/* Instructor */}
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs font-semibold text-slate-600">
                        {entry.teacher}
                      </td>
                      {/* Location */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 border border-blue-200/40 px-3 py-1 rounded-lg">
                          <MapPin size={13} className="text-blue-600" />
                          {entry.room}
                        </span>
                      </td>
                      {/* Batch */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/50">
                          {entry.batch}
                        </span>
                      </td>
                      {/* Type Badge */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                          entry.type === 'Lab' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200/50'
                        }`}>
                          {entry.type === 'Lab' ? 'LAB' : 'LECTURE'}
                        </span>
                      </td>
                      {/* Actions */}
                      {isAdmin && (
                        <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs font-semibold">
                          <div className="flex items-center justify-end gap-1.5 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditClick(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => onDeleteClick(entry.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Grid (Under MD breakpoint) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.04 }}
                    className="relative p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group overflow-hidden"
                  >
                    {/* Decorative badge strip on top card */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      entry.type === 'Lab' ? 'bg-emerald-500' : 'bg-blue-600'
                    }`} />

                    {/* Header info (Subject + Type Badge) */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                          entry.type === 'Lab' 
                            ? 'bg-[#dcfce7] text-[#166534]' 
                            : 'bg-[#dbeafe] text-[#1e40af]'
                        }`}>
                          {entry.type === 'Lab' ? 'LAB' : 'LECTURE'}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-100 rounded-md font-mono">
                          {entry.batch}
                        </span>
                      </div>
                      
                      <h3 className="text-base font-bold text-slate-850 line-clamp-2">
                        {entry.subject}
                      </h3>
                    </div>

                    {/* Body info (Time, Teacher, Room) */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      {/* Time */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                        <Clock size={15} className="text-slate-400 shrink-0" />
                        <span className="font-mono">{entry.startTime} - {entry.endTime}</span>
                      </div>

                      {/* Teacher */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{entry.teacher}</span>
                      </div>

                      {/* Room Location */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin size={15} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-[#1e3a8a] bg-blue-50 px-2 py-1 rounded-md">
                          {entry.room}
                        </span>
                      </div>
                    </div>

                    {/* Admin Editor Buttons overlay */}
                    {isAdmin && (
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onEditClick(entry)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit slot"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteClick(entry.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-center">
            <AlertCircle size={36} className="text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">No slots scheduled</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              There are no classes or labs on {selectedDay} matching your criteria.
            </p>
            {isAdmin && (
              <button
                onClick={onAddClick}
                className="mt-4 px-4 py-2 text-xs font-semibold text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Create First Slot
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
