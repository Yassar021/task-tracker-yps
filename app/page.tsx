"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Calendar,
  Plus,
  CheckCircle,
  AlertTriangle,
  Settings,
  Users,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { AssignmentForm } from "@/components/forms/assignment-form";
import { Footer } from "@/components/layout/footer";
import { toast } from "sonner";

// Helper function for safe JSON parsing
const safeJsonParse = async (response: Response) => {
  try {
    const text = await response.text();
    if (!text) {
      throw new Error('Empty response body');
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Define types locally
interface Class {
  id: string;
  grade: number;
  name: string;
  isActive: boolean;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: "TUGAS" | "UJIAN";
  weekNumber: number;
  year: number;
  status: string;
  classAssignments?: Array<{
    classId: string;
  }>;
}

interface ClassStatus {
  class: Class;
  tasks: number;
  exams: number;
  maxTasks: number;
  maxExams: number;
  updateCounter?: number;
}

export default function HomePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classStatuses, setClassStatuses] = useState<ClassStatus[]>([]);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [inputCode, setInputCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<{ weekNumber: number; year: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sample codes - in real app these would come from database
  const GRADE_CODES = {
    '7': 'KODE-KELAS-7',
    '8': 'KODE-KELAS-8',
    '9': 'KODE-KELAS-9'
  };

  useEffect(() => {
    // Add a timeout fallback in case fetchHomeData never completes
    const dataFetchTimeout = setTimeout(() => {
      if (loading) {
        console.log('⏰ Fetch timeout reached, setting sample data...');
        setSampleData();
        setLoading(false);
      }
    }, 15000); // 15 second timeout fallback

    fetchHomeData();

    return () => clearTimeout(dataFetchTimeout);
  }, []);

  const fetchHomeData = async () => {
    try {
      console.log('🔄 Starting fetchHomeData...');

      // Fetch data with better error handling and timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
      );

      const dataPromise = Promise.all([
        fetch('/api/classes', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000) // 8 second timeout per request
        }),
        fetch('/api/home/assignments', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000)
        }),
        fetch('/api/utils/week-info', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(8000)
        }),
      ]);

      const [classesResponse, assignmentsResponse, weekResponse] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]);

      console.log('📡 API Responses received:', {
        classesOk: classesResponse.ok,
        assignmentsOk: assignmentsResponse.ok,
        weekOk: weekResponse.ok
      });

      // Check if responses are OK before parsing JSON
      if (!classesResponse.ok) {
        console.error('Classes API failed:', classesResponse.status, classesResponse.statusText);
        throw new Error(`Classes API failed: ${classesResponse.status}`);
      }
      if (!assignmentsResponse.ok) {
        console.error('Assignments API failed:', assignmentsResponse.status, assignmentsResponse.statusText);
        throw new Error(`Assignments API failed: ${assignmentsResponse.status}`);
      }
      if (!weekResponse.ok) {
        console.error('Week API failed:', weekResponse.status, weekResponse.statusText);
        throw new Error(`Week API failed: ${weekResponse.status}`);
      }

      // Safely parse JSON with error handling
      const [classesData, assignmentsData, weekData] = await Promise.all([
        safeJsonParse(classesResponse),
        safeJsonParse(assignmentsResponse),
        safeJsonParse(weekResponse),
      ]);

      console.log('📊 Parsed data:', {
        classesCount: classesData.classes?.length || 0,
        assignmentsCount: assignmentsData.assignments?.length || 0,
        weekInfo: weekData.weekInfo
      });

      setClasses(classesData.classes || []);
      setAssignments(assignmentsData.assignments || []);
      setCurrentWeek(weekData.weekInfo);

      // Calculate status
      const statuses = calculateClassStatuses(classesData.classes || [], assignmentsData.assignments || [], weekData.weekInfo);
      setClassStatuses(statuses);

      console.log('✅ fetchHomeData completed successfully');
    } catch (error) {
      console.error("❌ Error in fetchHomeData:", error);
      console.log("🔄 Falling back to sample data...");
      // If API fails, show sample data
      setSampleData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchHomeData();
      toast.success("Data berhasil diperbarui!", {
        description: "Informasi kelas dan tugas telah dimuat ulang",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Gagal memperbarui data", {
        description: "Terjadi kesalahan saat mengambil data terbaru",
        duration: 5000,
      });
    }
  };

  const setSampleData = () => {
    console.log('🔧 Setting sample data as fallback...');

    // Create sample classes if API fails
    const sampleClasses = [
      { id: '7-DIS', grade: 7, name: 'DISCIPLINE', isActive: true },
      { id: '7-RES', grade: 7, name: 'RESPECT', isActive: true },
      { id: '7-CRE', grade: 7, name: 'CREATIVE', isActive: true },
      { id: '7-IND', grade: 7, name: 'INDEPENDENT', isActive: true },
      { id: '7-COL', grade: 7, name: 'COLLABORATIVE', isActive: true },
      { id: '7-RESI', grade: 7, name: 'RESILIENT', isActive: true },
      // Grade 8
      { id: '8-DIS', grade: 8, name: 'DISCIPLINE', isActive: true },
      { id: '8-RES', grade: 8, name: 'RESPECT', isActive: true },
      { id: '8-CRE', grade: 8, name: 'CREATIVE', isActive: true },
      { id: '8-IND', grade: 8, name: 'INDEPENDENT', isActive: true },
      { id: '8-COL', grade: 8, name: 'COLLABORATIVE', isActive: true },
      { id: '8-RESI', grade: 8, name: 'RESILIENT', isActive: true },
      // Grade 9
      { id: '9-DIS', grade: 9, name: 'DISCIPLINE', isActive: true },
      { id: '9-RES', grade: 9, name: 'RESPECT', isActive: true },
      { id: '9-CRE', grade: 9, name: 'CREATIVE', isActive: true },
      { id: '9-IND', grade: 9, name: 'INDEPENDENT', isActive: true },
      { id: '9-COL', grade: 9, name: 'COLLABORATIVE', isActive: true },
      { id: '9-RESI', grade: 9, name: 'RESILIENT', isActive: true },
    ];

    // Set empty assignments since we don't have real data
    setAssignments([]);

    // Set current week info
    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    setCurrentWeek({ weekNumber, year: now.getFullYear() });

    setClasses(sampleClasses);

    // Calculate empty class statuses
    const statuses = calculateClassStatuses(sampleClasses, [], { weekNumber, year: now.getFullYear() });
    setClassStatuses(statuses);

    console.log('✅ Sample data set successfully with', sampleClasses.length, 'classes');
  };

  const calculateClassStatuses = (classes: Class[], assignments: Assignment[], weekInfo: { weekNumber: number; year: number }): ClassStatus[] => {
    if (!classes || !Array.isArray(classes)) {
      console.log('calculateClassStatuses: No classes provided');
      return [];
    }
    if (!assignments || !Array.isArray(assignments)) {
      console.log('calculateClassStatuses: No assignments provided, using empty array');
      assignments = [];
    }
    if (!weekInfo) {
      console.log('calculateClassStatuses: No weekInfo provided');
      return [];
    }

    console.log('calculateClassStatuses called with:', {
      classCount: classes.length,
      assignmentCount: assignments.length,
      weekInfo: weekInfo
    });

    return classes.map(classItem => {
      const weekAssignments = assignments.filter(assignment =>
        assignment.weekNumber === weekInfo.weekNumber &&
        assignment.year === weekInfo.year &&
        assignment.classAssignments?.some(ca => ca.classId === classItem.id)
      );

      const tasks = weekAssignments.filter(a => a.type === 'TUGAS').length;
      const exams = weekAssignments.filter(a => a.type === 'UJIAN').length;

      const status = {
        class: classItem,
        tasks,
        exams,
        maxTasks: 2,
        maxExams: 5
      };

      // Log only classes with assignments
      if (tasks > 0 || exams > 0) {
        console.log(`Class ${classItem.id}: ${tasks} tasks, ${exams} exams`);
      }

      return status;
    });
  };

  const getProgressColor = (used: number, max: number) => {
    const percentage = (used / max) * 100;
    if (percentage >= 100) return 'bg-gradient-to-r from-red-500 to-pink-500';
    if (percentage >= 75) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (percentage >= 25) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    return 'bg-gradient-to-r from-green-400 to-emerald-500';
  };

  const getOverallProgress = () => {
    const totalSlots = classStatuses.reduce((acc, status) =>
      acc + status.maxTasks + status.maxExams, 0
    );
    const usedSlots = classStatuses.reduce((acc, status) =>
      acc + status.tasks + status.exams, 0
    );
    return totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;
  };

  const getOverallProgressColor = () => {
    const percentage = getOverallProgress();
    if (percentage >= 100) return 'bg-gradient-to-r from-red-500 to-pink-500';
    if (percentage >= 75) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (percentage >= 50) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (percentage >= 25) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    return 'bg-gradient-to-r from-green-400 to-emerald-500';
  };

  const handleInputSubmit = () => {
    if (!selectedGrade || !inputCode) {
      alert('Pilih tingkatan dan masukkan kode!');
      return;
    }

    if (inputCode !== GRADE_CODES[selectedGrade as keyof typeof GRADE_CODES]) {
      alert('Kode salah! Silakan coba lagi.');
      return;
    }

    // Show assignment form
    setShowInputForm(false);
    setShowAssignmentForm(true);
    setSelectedGrade('');
    setInputCode('');
    setShowPassword(false); // Reset password visibility
  };

  // Group classes by grade
  const classesByGrade = {
    7: classStatuses.filter(status => status.class.grade === 7),
    8: classStatuses.filter(status => status.class.grade === 8),
    9: classStatuses.filter(status => status.class.grade === 9),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-xs mx-auto">
          {/* Simple Spinner */}
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>

          {/* Simple Loading Text */}
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-gray-700">
              Memuat Data...
            </h2>
            <p className="text-sm text-gray-500">
              Mengambil informasi kelas dan tugas
            </p>
          </div>

          {/* Debug info for production */}
          {process.env.NODE_ENV === 'production' && (
            <div className="mt-4 text-xs text-gray-400">
              <p>Jika loading berlanjut, data akan fallback ke mode demo.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          📚 Monitoring Tugas & Ujian
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
          SMP YPS SINGKOLE - Minggu {currentWeek?.weekNumber} Tahun {currentWeek?.year}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 px-2">
          <Button
            onClick={() => setShowInputForm(true)}
            className="gap-2 w-full sm:w-auto text-sm px-3 py-2 h-9 sm:h-10 sm:px-4"
          >
            <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Input Tugas/Ujian</span>
            <span className="sm:hidden">Input</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 relative w-full sm:w-auto text-sm px-3 py-2 h-9 sm:h-10 sm:px-4"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Memuat...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/admin'}
            className="gap-2 w-full sm:w-auto text-sm px-3 py-2 h-9 sm:h-10 sm:px-4"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Admin Panel</span>
            <span className="sm:hidden">Admin</span>
          </Button>
        </div>
      </div>

      {/* Classes by Grade */}
      {Object.entries(classesByGrade).map(([grade, statusList]) => (
        <div key={grade} className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-center">
            📚 Kelas {grade}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {statusList.map((status) => {
              const totalUsed = status.tasks + status.exams;
              const totalMax = status.maxTasks + status.maxExams;
              const percentage = (totalUsed / totalMax) * 100;
              const isOverloaded = percentage >= 100;

              const getStatusColor = () => {
                if (isOverloaded) return 'from-red-500 to-pink-500';
                if (percentage >= 75) return 'from-orange-500 to-red-500';
                if (percentage >= 50) return 'from-yellow-500 to-orange-500';
                if (percentage >= 25) return 'from-blue-500 to-cyan-500';
                return 'from-green-500 to-emerald-500';
              };

              const getStatusIcon = () => {
                if (isOverloaded) return '⚠️';
                if (percentage >= 75) return '🔴';
                if (percentage >= 50) return '🟡';
                if (percentage >= 25) return '🔵';
                return '✅';
              };

              return (
                <Card
                  key={`${status.class.id}-${status.updateCounter || 0}`}
                  className={`relative transition-all duration-500 ease-out hover:shadow-xl ${
                    refreshing ? 'scale-95 opacity-70' : 'scale-100 opacity-100'
                  } ${
                    isOverloaded ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                  }`}
                >
                  <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${getStatusColor()} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                          <span className="text-base sm:text-lg font-bold">
                            {status.class.id.split('-')[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base lg:text-lg text-gray-900 dark:text-white truncate">
                            {status.class.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            Kelas {status.class.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-xl sm:text-2xl flex-shrink-0">
                        {getStatusIcon()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 p-3 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {/* Load Percentage Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Beban Tugas</span>
                          <span className={`text-xs sm:text-sm font-bold ${
                            percentage >= 75 ? 'text-red-600 dark:text-red-400' :
                            percentage >= 50 ? 'text-orange-600 dark:text-orange-400' :
                            percentage >= 25 ? 'text-blue-600 dark:text-blue-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {Math.round(percentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                          <div
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
                              isOverloaded ? 'bg-red-500' :
                              percentage >= 75 ? 'bg-orange-500' :
                              percentage >= 50 ? 'bg-yellow-500' :
                              percentage >= 25 ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Tasks and Exams Stats */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Tugas</p>
                              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{status.tasks}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Ujian</p>
                              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">{status.exams}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Input Form Modal */}
      {showInputForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Input Tugas/Ujian</CardTitle>
              <CardDescription className="text-sm">
                Masukkan kode untuk melanjutkan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Tingkatan:</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(GRADE_CODES).map(grade => (
                    <Button
                      key={grade}
                      variant={selectedGrade === grade ? "default" : "outline"}
                      onClick={() => setSelectedGrade(grade)}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    >
                      Kelas {grade}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Kode Rahasia:</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Masukkan kode"
                    className="w-full p-3 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInputForm(false);
                    setSelectedGrade('');
                    setInputCode('');
                    setShowPassword(false);
                  }}
                  className="flex-1 text-sm"
                >
                  Batal
                </Button>
                <Button onClick={handleInputSubmit} className="flex-1 text-sm">
                  Lanjut
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment Form Dialog */}
      {showAssignmentForm && (
        <AssignmentForm
          isOpen={showAssignmentForm}
          onClose={() => setShowAssignmentForm(false)}
          currentClassStatuses={classStatuses}
          onSuccess={() => {
            setShowAssignmentForm(false);
            toast.success("Tugas/Ujian berhasil ditambahkan!");
            // Refresh data from server to get updated state
            setTimeout(() => {
              fetchHomeData();
            }, 500);
          }}
          teacherId="T_BrdZG4ZO" // Using existing teacher ID from Supabase
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
