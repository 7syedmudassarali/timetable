import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getTimetable, 
  addTimetableEntry, 
  updateTimetableEntry, 
  deleteTimetableEntry,
  getRooms,
  addRoom,
  deleteRoom
} from './firebase';
import { TimetableEntry, RoomEntry } from './types';
import Header from './components/Header';
import StudentView from './components/StudentView';
import TeacherView from './components/TeacherView';
import RoomStatusView from './components/RoomStatusView';
import TimetableModal from './components/TimetableModal';
import { BookOpen, GraduationCap, Map, Users, Settings, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

export default function App() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher' | 'rooms'>('student');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<TimetableEntry | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load the timetable and rooms on mount
  useEffect(() => {
    fetchData();
    
    // Check if user was previously logged in
    const cachedAdmin = localStorage.getItem('timetable_admin_session');
    if (cachedAdmin === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [timetableData, roomsData] = await Promise.all([
        getTimetable(),
        getRooms()
      ]);
      setTimetable(timetableData);
      setRooms(roomsData);
    } catch (error) {
      console.error("Failed to load initial data:", error);
      showToast("Failed to fetch data from Firebase. Using local cache.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const data = await getTimetable();
      setTimetable(data);
      const roomsData = await getRooms();
      setRooms(roomsData);
    } catch (error) {
      console.error("Failed to load timetable data:", error);
      showToast("Failed to fetch timetable data. Using local cache.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    localStorage.setItem('timetable_admin_session', 'true');
    showToast("Successfully logged in as administrator!");
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('timetable_admin_session');
    showToast("Logged out successfully.");
  };

  const handleSaveEntry = async (entryPayload: any) => {
    try {
      if (entryPayload.id) {
        // Edit flow
        const { id, ...dataToSave } = entryPayload;
        await updateTimetableEntry(id, dataToSave);
        setTimetable(prev => prev.map(item => item.id === id ? { ...item, ...dataToSave } : item));
        showToast("Timetable entry updated successfully!");
      } else {
        // Add flow
        const newId = await addTimetableEntry(entryPayload);
        const newEntry = { ...entryPayload, id: newId };
        setTimetable(prev => [...prev, newEntry]);
        showToast("Timetable entry added successfully!");
      }
    } catch (error) {
      console.error(error);
      showToast("Error saving timetable slot.", "error");
      throw error;
    }
  };

  const handleAddRoom = async (name: string, type: 'Class' | 'Lab') => {
    try {
      const id = await addRoom({ name, type });
      setRooms(prev => [...prev, { id, name, type }].sort((a, b) => a.name.localeCompare(b.name)));
      showToast(`Room/Lab "${name}" added successfully!`);
    } catch (error) {
      console.error(error);
      showToast("Error adding room.", "error");
      throw error;
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteRoom(roomId);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      showToast("Room/Lab deleted successfully!");
    } catch (error) {
      console.error(error);
      showToast("Error deleting room.", "error");
      throw error;
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const entry = timetable.find(item => item.id === id);
    if (entry) {
      setDeleteConfirmEntry(entry);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!deleteConfirmEntry) return;
    const { id } = deleteConfirmEntry;

    try {
      await deleteTimetableEntry(id);
      setTimetable(prev => prev.filter(item => item.id !== id));
      showToast("Timetable entry removed.");
    } catch (error) {
      console.error(error);
      showToast("Error deleting timetable entry.", "error");
    } finally {
      setDeleteConfirmEntry(null);
    }
  };

  const handleEditClick = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* App Header & Login system */}
      <Header 
        isAdmin={isAdmin} 
        onLoginSuccess={handleLoginSuccess} 
        onLogout={handleLogout} 
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Tab Controls Navigation card */}
        <div className="bg-white border border-slate-200/80 p-2 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap w-full md:w-auto p-1 bg-slate-50 rounded-xl gap-1.5 border border-slate-200/40">
            {/* Student view tab */}
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <GraduationCap size={15} />
              <span>Student Timetable</span>
            </button>

            {/* Teacher view tab */}
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Users size={15} />
              <span>Teacher Schedule</span>
            </button>

            {/* Room Status view tab */}
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Map size={15} />
              <span>Free Rooms Finder</span>
            </button>
          </div>

          {/* Right quick Actions & Status Indicator */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto px-1 md:px-0">
            {isAdmin && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Admin Privileges Active</span>
              </div>
            )}
            <button
              onClick={fetchTimetable}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all border border-slate-200 bg-white shadow-xs cursor-pointer active:scale-95"
              title="Refresh Timetable from Database"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dynamic Views Rendering with simple fade transition */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <RefreshCw size={36} className="animate-spin text-[#1e3a8a]" />
              <p className="text-xs font-bold tracking-wide uppercase text-slate-500">Syncing timetable from Firebase...</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'student' && (
                <StudentView
                  timetable={timetable}
                  isAdmin={isAdmin}
                  onAddClick={handleAddClick}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteEntry}
                />
              )}

              {activeTab === 'teacher' && (
                <TeacherView timetable={timetable} />
              )}

              {activeTab === 'rooms' && (
                <RoomStatusView 
                  timetable={timetable} 
                  isAdmin={isAdmin}
                  rooms={rooms}
                  onAddRoom={handleAddRoom}
                  onDeleteRoom={handleDeleteRoom}
                />
              )}
            </motion.div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1.5">
          <p className="text-xs text-slate-400 font-semibold">
            Departmental Facility & Lecture Management Portal
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Powered by Firebase Firestore Persistent DB
          </p>
        </div>
      </footer>

      {/* Editor Modal Dialog */}
      <TimetableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        timetable={timetable}
        rooms={rooms}
      />

      {/* Custom Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmEntry(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Animated card container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden z-10"
            >
              <div className="h-1.5 bg-red-600 w-full" />
              
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0 border border-red-100 shadow-xs">
                    <Trash2 size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      Delete Timetable Slot?
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Are you sure you want to delete this class slot? This action cannot be undone and will permanently remove this schedule from the database.
                    </p>
                  </div>
                </div>

                {/* Slot Details Preview Box */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Subject</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      deleteConfirmEntry.type === 'Lab' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {deleteConfirmEntry.type === 'Lab' ? 'LAB' : 'LECTURE'}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 line-clamp-1">{deleteConfirmEntry.subject}</p>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 text-[11px] font-semibold text-slate-600 font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wide mb-0.5">Time & Day</span>
                      <span>{deleteConfirmEntry.day}, {deleteConfirmEntry.startTime} - {deleteConfirmEntry.endTime}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase tracking-wide mb-0.5">Room & Batch</span>
                      <span>{deleteConfirmEntry.room} • {deleteConfirmEntry.batch}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmEntry(null)}
                    className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteEntry}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant notifications toast overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border max-w-sm bg-white"
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <AlertCircle size={18} />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {toastMessage.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
