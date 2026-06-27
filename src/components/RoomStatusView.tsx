import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Clock, Calendar, CheckCircle2, AlertTriangle, Play, HelpCircle, ArrowRight, Search, Plus, Trash2 } from 'lucide-react';
import { TimetableEntry, RoomStatus, RoomEntry, getSemesterFromBatch } from '../types';

interface RoomStatusViewProps {
  timetable: TimetableEntry[];
  isAdmin: boolean;
  rooms: RoomEntry[];
  onAddRoom: (name: string, type: 'Class' | 'Lab') => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function RoomStatusView({ 
  timetable, 
  isAdmin, 
  rooms, 
  onAddRoom, 
  onDeleteRoom 
}: RoomStatusViewProps) {
  const [targetDay, setTargetDay] = useState('Monday');
  const [targetTime, setTargetTime] = useState('10:00');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');

  // Local state for the room creator form
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'Class' | 'Lab'>('Class');
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [roomCreatorError, setRoomCreatorError] = useState('');
  const [roomToDelete, setRoomToDelete] = useState<RoomEntry | null>(null);

  // Sync with current day/time if useCurrentTime is true
  useEffect(() => {
    if (useCurrentTime) {
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const now = new Date();
      const currentDayName = daysOfWeek[now.getDay()];
      if (DAYS.includes(currentDayName)) {
        setTargetDay(currentDayName);
      }
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTargetTime(`${hours}:${minutes}`);
    }
  }, [useCurrentTime]);

  // Tick current time every 30 seconds if enabled
  useEffect(() => {
    if (!useCurrentTime) return;
    
    const timer = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTargetTime(`${hours}:${minutes}`);
    }, 30000);
    
    return () => clearInterval(timer);
  }, [useCurrentTime]);

  // Extract all rooms (database defined rooms + fallback/custom ones scheduled in the timetable)
  const roomNamesList = rooms && rooms.length > 0 ? rooms.map(r => r.name.trim()) : COMMON_ROOMS;
  const allRoomsInDatabase = Array.from(
    new Set([
      ...roomNamesList,
      ...timetable.map(entry => entry.room.trim()).filter(Boolean)
    ])
  ).sort();

  // Extract unique semesters
  const uniqueSemesters = Array.from(
    new Set(timetable.map(entry => getSemesterFromBatch(entry.batch)))
  )
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 99;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 99;
      return numA - numB;
    });

  // Compute status for all rooms at targetDay & targetTime
  const roomStatuses = allRoomsInDatabase.map((roomName) => {
    // Find all schedules in this room on the target day
    const daySchedulesInRoom = timetable
      .filter(entry => entry.room.toLowerCase() === roomName.toLowerCase() && entry.day === targetDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find if any class is currently running at the targetTime
    const currentClass = daySchedulesInRoom.find(entry => {
      return targetTime >= entry.startTime && targetTime <= entry.endTime;
    });

    // Find the next class starting after targetTime
    const nextClass = daySchedulesInRoom.find(entry => {
      return entry.startTime > targetTime;
    });

    return {
      name: roomName,
      isFree: !currentClass,
      currentClass,
      nextClass,
      allTodaySchedules: daySchedulesInRoom
    };
  });

  // Filter the computed room statuses based on search query and semester filter
  const filteredRoomStatuses = roomStatuses.filter(room => {
    // 1. Semester filter: if selected, the room must have at least one class scheduled today for that semester
    if (selectedSemester !== 'All') {
      const hasClassForSemester = room.allTodaySchedules.some(
        schedule => getSemesterFromBatch(schedule.batch) === selectedSemester
      );
      if (!hasClassForSemester) return false;
    }

    // 2. Search query filter
    if (roomSearch.trim() !== '') {
      const q = roomSearch.toLowerCase();
      // Match room name
      const matchesRoomName = room.name.toLowerCase().includes(q);
      
      // Match current active class details
      const matchesCurrentClass = room.currentClass && (
        room.currentClass.subject.toLowerCase().includes(q) ||
        room.currentClass.teacher.toLowerCase().includes(q) ||
        room.currentClass.batch.toLowerCase().includes(q) ||
        getSemesterFromBatch(room.currentClass.batch).toLowerCase().includes(q)
      );

      // Match any class scheduled in the room today
      const matchesAnyTodayClass = room.allTodaySchedules.some(schedule => 
        schedule.subject.toLowerCase().includes(q) ||
        schedule.teacher.toLowerCase().includes(q) ||
        schedule.batch.toLowerCase().includes(q) ||
        getSemesterFromBatch(schedule.batch).toLowerCase().includes(q)
      );

      return matchesRoomName || matchesCurrentClass || matchesAnyTodayClass;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Title banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-4 sm:p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 shadow-sm">
            <Map size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Room Occupancy & Free Spaces</h2>
            <p className="text-xs text-slate-500 font-semibold">Real-time status tracking of all lecture halls, laboratories, and seminar spaces</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddingRoom(!isAddingRoom)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Manage Rooms & Labs</span>
          </button>
        )}
      </div>

      {/* Admin Room Manager Expandable Panel */}
      <AnimatePresence>
        {isAdmin && isAddingRoom && (
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
                  Dynamic Facility Management
                </h3>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {rooms.length} Defined Rooms
                </span>
              </div>

              {/* Add Room Inline Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setRoomCreatorError('');
                  if (!newRoomName.trim()) {
                    setRoomCreatorError('Room name is required.');
                    return;
                  }
                  // Check duplicate name
                  if (rooms.some(r => r.name.toLowerCase() === newRoomName.trim().toLowerCase())) {
                    setRoomCreatorError('A room or laboratory with this name already exists.');
                    return;
                  }
                  try {
                    await onAddRoom(newRoomName.trim(), newRoomType);
                    setNewRoomName('');
                    setRoomCreatorError('');
                  } catch (err: any) {
                    setRoomCreatorError(err.message || 'Failed to create room.');
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-150"
              >
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Room Name / Title
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Seminar Hall B, Lab 402"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Facility Type
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as 'Class' | 'Lab')}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold cursor-pointer"
                  >
                    <option value="Class">Lecture Room (Class)</option>
                    <option value="Lab">Laboratory (Lab)</option>
                  </select>
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Create Facility</span>
                  </button>
                </div>
                {roomCreatorError && (
                  <p className="col-span-1 sm:col-span-3 text-[10px] text-red-600 font-semibold">{roomCreatorError}</p>
                )}
              </form>

              {/* Dynamic List of Active Rooms to Delete */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Database Facilities</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {rooms.map((roomItem) => (
                    <div 
                      key={roomItem.id} 
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-slate-100/50 transition-all text-xs"
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <p className="font-extrabold text-slate-900 truncate">{roomItem.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {roomItem.type === 'Lab' ? 'Lab / Practical' : 'Lecture / Class'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRoomToDelete(roomItem)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete Facility"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {rooms.length === 0 && (
                    <p className="col-span-full text-center text-xs text-slate-400 py-3 font-semibold">
                      No custom database rooms created yet. Common rooms are loaded as default fallback.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control panel for day & time testing */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Real-time vs Custom mode toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
          <button
            onClick={() => setUseCurrentTime(true)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              useCurrentTime 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Real-Time Monitor
          </button>
          <button
            onClick={() => setUseCurrentTime(false)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
              !useCurrentTime 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom Planner View
          </button>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Day selection */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={targetDay}
              onChange={(e) => {
                setTargetDay(e.target.value);
                setUseCurrentTime(false);
              }}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Time selection */}
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <input
              type="time"
              value={targetTime}
              onChange={(e) => {
                setTargetTime(e.target.value);
                setUseCurrentTime(false);
              }}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
            />
          </div>

          {/* Active Status Info Badge */}
          {useCurrentTime ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-150 shadow-xs animate-pulse">
              ● Live Status
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-150 shadow-xs">
              Custom View
            </span>
          )}
        </div>

      </div>

      {/* Search & Filter section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search rooms/labs by name, subject, teacher or semester..."
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Filter by Semester:
          </span>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer shadow-xs min-w-[140px]"
          >
            <option value="All">All Semesters</option>
            {uniqueSemesters.map(semester => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid status of rooms */}
      {filteredRoomStatuses.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">No rooms or laboratories found</p>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
            No rooms or labs scheduled today match your criteria. Try adjusting your search query or semester filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoomStatuses.map((room) => {
            const matchedDbRoom = rooms.find(r => r.name.toLowerCase().trim() === room.name.toLowerCase().trim());

            return (
              <div
                key={room.name}
                className={`bg-white border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between relative overflow-hidden group ${
                  room.isFree 
                    ? 'border-slate-200/80 hover:border-emerald-200' 
                    : 'border-slate-200/80 hover:border-red-200'
                }`}
              >
                {/* Room name and Free status indicator */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight truncate">{room.name}</h3>
                      {isAdmin && matchedDbRoom && (
                        <button
                          type="button"
                          onClick={() => setRoomToDelete(matchedDbRoom)}
                          className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Room/Lab"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-mono mt-0.5">
                      {room.allTodaySchedules.length} Sessions Scheduled
                    </p>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold shrink-0 border ${
                    room.isFree 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-100/60 shadow-xs' 
                      : 'bg-red-50 text-red-800 border-red-100/60 shadow-xs'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${room.isFree ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span>{room.isFree ? 'FREE' : 'BUSY'}</span>
                  </div>
                </div>

                {/* Status details card */}
                <div className="space-y-4">
                  {room.isFree ? (
                    // Free layout
                    <div className="bg-emerald-50/20 rounded-xl p-3 border border-emerald-50/50 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                        <span>Available for Use</span>
                      </div>

                      <div className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                        {room.nextClass ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span>Free until</span>
                            <span className="font-extrabold font-mono text-slate-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100">{room.nextClass.startTime}</span>
                            <span>- next class:</span>
                            <span className="text-slate-900 font-extrabold">{room.nextClass.subject}</span>
                          </div>
                        ) : (
                          <span>Free for the rest of the day. No further lectures scheduled.</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Occupied layout
                    <div className="bg-red-50/25 rounded-xl p-3 border border-red-100/50 space-y-2.5">
                      <div className="flex items-center gap-2 text-red-800 text-xs font-bold">
                        <AlertTriangle size={15} className="text-red-500 shrink-0" />
                        <span>Current Lecture Active</span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-slate-900 line-clamp-1">
                          {room.currentClass?.subject}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-bold font-mono">
                          <span className="text-blue-600 font-extrabold">{room.currentClass?.startTime} - {room.currentClass?.endTime}</span>
                          <span>•</span>
                          <span className="text-slate-600">{room.currentClass?.teacher}</span>
                          <span>•</span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] border border-slate-200/50">{room.currentClass?.batch}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Micro hourly Timeline of the room for today */}
                  {room.allTodaySchedules.length > 0 && (
                    <div className="pt-3 border-t border-slate-100/80">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Timeline</p>
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                        {room.allTodaySchedules.map((schedule) => {
                          const isCurrent = room.currentClass?.id === schedule.id;
                          return (
                            <div 
                              key={schedule.id}
                              className={`flex items-center justify-between text-xs p-2 rounded-lg transition-colors border ${
                                isCurrent 
                                  ? 'bg-blue-50 border-blue-100 text-blue-900 font-bold' 
                                  : 'text-slate-600 bg-slate-50 border-transparent hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate max-w-[120px] font-medium">{schedule.subject}</span>
                              <span className="font-mono text-[10px] font-bold text-slate-500 shrink-0">
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Room Deletion Confirmation Modal */}
      <AnimatePresence>
        {roomToDelete && (
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
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Delete Facility?</h3>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      Are you sure you want to delete <span className="font-extrabold text-slate-800">"{roomToDelete.name}"</span>? This will permanently remove it from the list of selectable facilities.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRoomToDelete(null)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await onDeleteRoom(roomToDelete.id);
                        setRoomToDelete(null);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete Permanently
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
