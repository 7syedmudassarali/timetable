import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Award, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Edit3, 
  Trash2, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  CalendarClock,
  Sparkles,
  Layers
} from 'lucide-react';
import { QuizEntry, TimetableEntry, RoomEntry, TeacherEntry, getSemesterFromBatch } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface QuizManagementViewProps {
  quizzes: QuizEntry[];
  timetable: TimetableEntry[];
  rooms: RoomEntry[];
  teachers: TeacherEntry[];
  isAdmin: boolean;
  onAddQuiz: () => void;
  onEditQuiz: (quiz: QuizEntry) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export default function QuizManagementView({
  quizzes,
  timetable,
  rooms,
  teachers,
  isAdmin,
  onAddQuiz,
  onEditQuiz,
  onDeleteQuiz
}: QuizManagementViewProps) {
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Semester options
  const semesters = [
    'All',
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8'
  ];

  // Helper to test if a quiz section matches target section filter (supports combined classes)
  const isBatchMatch = (quizBatch: string, targetSection: string) => {
    if (targetSection === 'All') return true;
    if (quizBatch === targetSection) return true;
    const normEntry = quizBatch.toLowerCase().replace(/\(combined\)/g, '').trim();
    const normTarget = targetSection.toLowerCase().replace(/\(combined\)/g, '').trim();
    const parts = normEntry.split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
    return parts.includes(normTarget) || normEntry.includes(normTarget);
  };

  // Extract unique batches from both timetable & quizzes for dropdown
  const uniqueBatches = Array.from(
    new Set([
      ...timetable.flatMap(entry => {
        const cleaned = entry.batch.replace(/\(Combined\)/gi, '').trim();
        const parts = cleaned.split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
        return parts.length > 0 ? parts : [entry.batch.trim()];
      }),
      ...quizzes.flatMap(q => {
        const cleaned = q.batch.replace(/\(Combined\)/gi, '').trim();
        const parts = cleaned.split(/[\+,\&]/).map(s => s.trim()).filter(Boolean);
        return parts.length > 0 ? parts : [q.batch.trim()];
      })
    ])
  )
    .filter(Boolean)
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA === numB) return a.localeCompare(b);
      return numA - numB;
    });

  // Calculate days remaining / relative status helper
  const getRelativeDateInfo = (dateStr: string) => {
    if (!dateStr) return { label: 'TBD', isUrgent: false, isPast: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const quizDate = new Date(dateStr);
    quizDate.setHours(0, 0, 0, 0);
    
    const diffTime = quizDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `${Math.abs(diffDays)}d ago`, isUrgent: false, isPast: true };
    }
    if (diffDays === 0) {
      return { label: 'Today', isUrgent: true, isPast: false };
    }
    if (diffDays === 1) {
      return { label: 'Tomorrow', isUrgent: true, isPast: false };
    }
    return { label: `In ${diffDays} days`, isUrgent: diffDays <= 3, isPast: false };
  };

  // Format date helper (e.g. Mon, Oct 24, 2026)
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Date not set';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(quiz => {
    // Semester filter
    if (selectedSemester !== 'All' && getSemesterFromBatch(quiz.batch) !== selectedSemester) {
      return false;
    }

    // Batch filter
    if (!isBatchMatch(quiz.batch, selectedBatch)) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'All' && quiz.status !== selectedStatus) {
      return false;
    }

    // Tab filter (upcoming / past)
    const rel = getRelativeDateInfo(quiz.date);
    if (activeTab === 'upcoming' && (rel.isPast || quiz.status === 'completed')) {
      return false;
    }
    if (activeTab === 'past' && !rel.isPast && quiz.status !== 'completed') {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = quiz.title.toLowerCase().includes(q);
      const matchSubject = quiz.subject.toLowerCase().includes(q);
      const matchTeacher = quiz.teacher.toLowerCase().includes(q);
      const matchRoom = quiz.room.toLowerCase().includes(q);
      const matchBatch = quiz.batch.toLowerCase().includes(q);
      const matchTopics = (quiz.topics || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSubject && !matchTeacher && !matchRoom && !matchBatch && !matchTopics) {
        return false;
      }
    }

    return true;
  });

  // Download PDF functionality in Portrait A4
  const downloadQuizPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text("EE Department — Quiz & Assessment Schedule", 14, 18);

      // Sub-header details
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139); // Slate 500
      
      let titleStr = "Departmental Quizzes & Examinations Schedule";
      if (selectedSemester !== 'All' || selectedBatch !== 'All') {
        titleStr = `Filtered Quiz Schedule — Semester: ${selectedSemester} | Section: ${selectedBatch}`;
      }
      doc.text(titleStr, 14, 24);
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 14, 29);

      // Divider line
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.line(14, 32, 196, 32);

      const headers = [["Date", "Time", "Quiz Title & Course", "Section", "Venue", "Instructor", "Marks & Topics"]];
      const rows = filteredQuizzes.map(q => {
        const isCombined = q.batch.includes('+') || q.batch.toLowerCase().includes('combined');
        let secText = q.batch;
        if (isCombined && !secText.toLowerCase().includes('combined')) {
          secText = `${secText} (Combined)`;
        }

        const dateFormatted = formatDisplayDate(q.date);
        const titleAndCourse = `${q.title}\n(${q.subject})`;
        const marksAndTopics = `${q.totalMarks ? `Marks: ${q.totalMarks}\n` : ''}${q.topics ? `Topics: ${q.topics}` : 'Syllabus as announced'}`;

        return [
          dateFormatted,
          `${q.startTime} - ${q.endTime}`,
          titleAndCourse,
          secText,
          q.room,
          q.teacher,
          marksAndTopics
        ];
      });

      if (rows.length === 0) {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(148, 163, 184);
        doc.text("No quiz assessments found matching the selected filter criteria.", 14, 45);
      } else {
        autoTable(doc, {
          startY: 36,
          head: headers,
          body: rows,
          theme: 'striped',
          headStyles: {
            fillColor: [30, 41, 59], // Slate 800
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8.5,
            halign: 'left'
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [51, 65, 85]
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 26 },
            1: { fontStyle: 'bold', cellWidth: 24 },
            2: { fontStyle: 'bold', cellWidth: 42 },
            3: { cellWidth: 24 },
            4: { cellWidth: 22 },
            5: { cellWidth: 24 },
            6: { cellWidth: 30 }
          },
          margin: { left: 14, right: 14 },
          didDrawPage: () => {
            const str = "Page " + (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text(str, 196 - doc.getTextWidth(str), 287);
            doc.text("EE Department Portal — Quiz Management", 14, 287);
          }
        });
      }

      const filename = `quiz_schedule_${selectedSemester.replace(/\s+/g, '_')}_${selectedBatch}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("Error generating quiz PDF:", err);
    }
  };

  // Stats calculation
  const totalQuizzes = quizzes.length;
  const upcomingQuizzesCount = quizzes.filter(q => {
    const rel = getRelativeDateInfo(q.date);
    return !rel.isPast && q.status !== 'completed' && q.status !== 'cancelled';
  }).length;
  const completedCount = quizzes.filter(q => q.status === 'completed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Management Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <CalendarClock size={18} />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Quiz & Assessment Schedule
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
              {filteredQuizzes.length} {filteredQuizzes.length === 1 ? 'Quiz' : 'Quizzes'}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <CheckCircle2 size={12} />
              <span>Clash-Protected</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Verified assessment schedules protected against ongoing class, faculty, and room timetable clashes.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={downloadQuizPDF}
            disabled={filteredQuizzes.length === 0}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            title="Download Quiz Schedule in PDF"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>

          {isAdmin && (
            <button
              onClick={onAddQuiz}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Schedule New Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Top filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Semester Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedBatch('All');
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold text-slate-700 cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select Section / Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="All">All Sections (Auto-Include Combined)</option>
              {uniqueBatches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Quiz Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled / Upcoming</option>
              <option value="ongoing">Ongoing (Today)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search Quizzes
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, instructor, syllabus..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
              />
            </div>
          </div>

        </div>

        {/* Quick Filter Pill Tabs */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'upcoming'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Upcoming ({upcomingQuizzesCount})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {(selectedSemester !== 'All' || selectedBatch !== 'All' || selectedStatus !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSemester('All');
                setSelectedBatch('All');
                setSelectedStatus('All');
                setSearchQuery('');
                setActiveTab('upcoming');
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Quizzes List Cards */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarClock size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No quizzes scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
            There are currently no quiz assessments matching the selected filters. Change filter options or schedule a new quiz.
          </p>
          {isAdmin && (
            <button
              onClick={onAddQuiz}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Schedule Quiz Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredQuizzes.map((quiz) => {
              const rel = getRelativeDateInfo(quiz.date);
              const isCombined = quiz.batch.includes('+') || quiz.batch.toLowerCase().includes('combined');

              return (
                <motion.div
                  key={quiz.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  {/* Top Status & Date Banner */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          rel.isUrgent
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : rel.isPast || quiz.status === 'completed'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {rel.label}
                        </span>
                        
                        {quiz.totalMarks && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                            <Award size={11} />
                            <span>{quiz.totalMarks} Marks</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{formatDisplayDate(quiz.date)}</span>
                      </div>
                    </div>

                    {/* Section & Combined Badge */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {quiz.batch}
                      </span>
                      {isCombined && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                          Combined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject & Quiz Title */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {quiz.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-indigo-500 shrink-0" />
                      <span className="line-clamp-1">{quiz.subject}</span>
                    </p>
                  </div>

                  {/* Topics / Syllabus snippet */}
                  {quiz.topics && (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[11px] text-slate-600">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Syllabus / Topics
                      </span>
                      <p className="font-medium line-clamp-2 leading-relaxed text-slate-700">
                        {quiz.topics}
                      </p>
                    </div>
                  )}

                  {/* Time, Venue & Instructor Info */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Clock size={13} className="text-slate-400" />
                        <span>{quiz.startTime} - {quiz.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        <MapPin size={11} className="text-slate-500" />
                        <span className="line-clamp-1">{quiz.room}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        <span className="line-clamp-1">{quiz.teacher}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {getSemesterFromBatch(quiz.batch)}
                      </span>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onEditQuiz(quiz)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteQuiz(quiz.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
