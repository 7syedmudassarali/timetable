import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Clock, Calendar, Search, AlertCircle, BookOpen, Plus, Trash2 } from 'lucide-react';
import { TimetableEntry, TeacherEntry, getSemesterFromBatch } from '../types';

interface TeacherViewProps {
  timetable: TimetableEntry[];
  isAdmin: boolean;
  teachers: TeacherEntry[];
  onAddTeacher: (name: string, department: string) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TeacherView({ 
  timetable, 
  isAdmin, 
  teachers, 
  onAddTeacher, 
  onDeleteTeacher 
}: TeacherViewProps) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Local state for instructor management form
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('EE');
  const [teacherCreatorError, setTeacherCreatorError] = useState('');
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherEntry | null>(null);

  // Merge database teachers and teachers who have classes in the timetable
  const dbTeacherNames = teachers.map(t => t.name.trim());
  const timetableTeacherNames = timetable.map(entry => entry.teacher.trim()).filter(Boolean);
  const allTeacherNames = Array.from(
    new Set([...dbTeacherNames, ...timetableTeacherNames])
  ).sort();

  // Initialize selectedTeacher if not set but teachers exist
  useEffect(() => {
    if (allTeacherNames.length > 0 && !selectedTeacher) {
      setSelectedTeacher(allTeacherNames[0]);
    }
  }, [timetable, teachers, selectedTeacher, allTeacherNames]);

  // Filter teachers for list based on search query
  const filteredTeachers = allTeacherNames.filter(t => {
    const q = searchQuery.toLowerCase();
    if (t.toLowerCase().includes(q)) return true;
    
    // Support searching teachers by subject, room, or semester they teach
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

        {isAdmin && (
          <button
            onClick={() => setIsAddingTeacher(!isAddingTeacher)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Manage Instructors</span>
          </button>
        )}
      </div>

      {/* Admin Teacher Manager Expandable Panel */}
      <AnimatePresence>
        {isAdmin && isAddingTeacher && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Dynamic Instructor Management
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {teachers.length} Defined Instructors
                </span>
              </div>

              {/* Add Teacher Inline Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTeacherCreatorError('');
                  if (!newTeacherName.trim()) {
                    setTeacherCreatorError('Instructor name is required.');
                    return;
                  }
                  // Check duplicate name
                  if (teachers.some(t => t.name.toLowerCase() === newTeacherName.trim().toLowerCase())) {
                    setTeacherCreatorError('An instructor with this name already exists.');
                    return;
                  }
                  try {
                    await onAddTeacher(newTeacherName.trim(), newTeacherDept);
                    setNewTeacherName('');
                    setTeacherCreatorError('');
                  } catch (err: any) {
                    setTeacherCreatorError(err.message || 'Failed to add instructor.');
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-150"
              >
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Instructor Name / Title
                  </label>
                  <input
                    type="text"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    placeholder="e.g. Dr. Abdul Rahman"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Department / Area
                  </label>
                  <select
                    value={newTeacherDept}
                    onChange={(e) => setNewTeacherDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold cursor-pointer"
                  >
                    <option value="EE">Electrical Engineering (EE)</option>
                    <option value="CS">Computer Science (CS)</option>
                    <option value="Math">Mathematics (Math)</option>
                    <option value="Islamic Studies">Islamic Studies</option>
                    <option value="Humanities">Humanities</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Add Instructor
                </button>
              </form>

              {teacherCreatorError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  {teacherCreatorError}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                const matchedDbTeacher = teachers.find(t => t.name.toLowerCase().trim() === teacher.toLowerCase().trim());
                
                return (
                  <div
                    key={teacher}
                    className="flex items-center gap-1.5 w-full"
                  >
                    <button
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`flex-1 flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-lg transition-all duration-150 text-left border cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <User size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                        <span className="truncate">{teacher}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200/40'
                      }`}>
                        {count}
                      </span>
                    </button>

                    {isAdmin && matchedDbTeacher && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTeacherToDelete(matchedDbTeacher);
                        }}
                        className={`p-2 rounded-lg transition-all cursor-pointer shrink-0 ${
                          isActive 
                            ? 'text-blue-100 hover:text-white hover:bg-blue-700' 
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="Delete Instructor"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
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

      {/* Dynamic Teacher Deletion Confirmation Modal */}
      <AnimatePresence>
        {teacherToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="h-1 bg-red-600" />
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="h-9 w-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                    <Trash2 size={16} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Remove Instructor?</h3>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Are you sure you want to remove <span className="font-extrabold text-slate-800">"{teacherToDelete.name}"</span>? This will permanently remove them from the list of selectable instructors.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTeacherToDelete(null)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await onDeleteTeacher(teacherToDelete.id);
                        setTeacherToDelete(null);
                        // If selectedTeacher was deleted, set selectedTeacher to the first available one
                        const nextTeachersList = teachers.filter(t => t.id !== teacherToDelete.id);
                        if (selectedTeacher.toLowerCase() === teacherToDelete.name.toLowerCase()) {
                          setSelectedTeacher(nextTeachersList[0]?.name || '');
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Remove Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
