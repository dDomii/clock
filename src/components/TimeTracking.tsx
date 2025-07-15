import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { Clock, Play, Square, MessageSquare, AlertCircle, Home, BarChart3, X, Target, TrendingUp, Edit3, Check, Calendar, Timer, Award, Zap } from 'lucide-react';
import { PayrollHistory } from './PayrollHistory';

interface TimeEntry {
  id: number;
  clock_in: string;
  clock_out: string | null;
  overtime_requested: boolean;
  overtime_note: string | null;
  overtime_approved?: boolean | null;
}

interface HoursProgress {
  requiredHours: number;
  workedHours: number;
  remainingHours: number;
  progressPercentage: number;
  isCompleted: boolean;
}

type TabType = 'time-tracking' | 'payroll-history';

export function TimeTracking() {
  const [activeTab, setActiveTab] = useState<TabType>('time-tracking');
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [overtimeNote, setOvertimeNote] = useState('');
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hoursProgress, setHoursProgress] = useState<HoursProgress | null>(null);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [newRequiredHours, setNewRequiredHours] = useState('');
  const { token, user } = useAuth();

  useEffect(() => {
    fetchTodayEntry();
    fetchOvertimeNotifications();
    fetchHoursProgress();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Check if it's a new day and reset the entry
    const checkNewDay = () => {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = localStorage.getItem('lastCheckDate');
      
      if (lastCheck !== today) {
        localStorage.setItem('lastCheckDate', today);
        // If it's a new day, refresh the today entry
        fetchTodayEntry();
      }
    };

    checkNewDay();
    // Check every minute for new day
    const dayCheckInterval = setInterval(checkNewDay, 60000);
    
    return () => clearInterval(dayCheckInterval);
  }, []);

  const fetchTodayEntry = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.TODAY_ENTRY, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTodayEntry(data);
    } catch (error) {
      console.error('Error fetching today entry:', error);
    }
  };

  const fetchHoursProgress = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USER_HOURS_PROGRESS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setHoursProgress(data);
    } catch (error) {
      console.error('Error fetching hours progress:', error);
    }
  };

  const updateRequiredHours = async () => {
    const hours = parseFloat(newRequiredHours);
    if (isNaN(hours) || hours < 0) {
      alert('Please enter a valid number of hours');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.USER_REQUIRED_HOURS, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requiredHours: hours }),
      });

      const data = await response.json();
      if (data.success) {
        setShowHoursModal(false);
        setNewRequiredHours('');
        fetchHoursProgress();
        alert('Required hours updated successfully!');
      } else {
        alert(data.message || 'Failed to update required hours');
      }
    } catch (error) {
      console.error('Error updating required hours:', error);
      alert('Failed to update required hours');
    }
  };

  const fetchOvertimeNotifications = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.OVERTIME_NOTIFICATIONS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.length > 0) {
        setNotifications(data);
        setShowNotifications(true);
      }
    } catch (error) {
      console.error('Error fetching overtime notifications:', error);
    }
  };

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CLOCK_IN, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchTodayEntry();
      } else {
        // If already clocked in, show option to reset only if they don't have an entry
        if (data.message && data.message.includes('Already clocked in') && data.hasEntry) {
          const shouldReset = window.confirm('You already clocked in today. Do you want to start a new clock-in session? This will replace your current entry.');
          if (shouldReset) {
            await resetAndClockIn();
          }
        } else if (data.message && data.message.includes('Already clocked in')) {
          // User is currently clocked in but hasn't clocked out yet
          alert('You are already clocked in. Please clock out first before starting a new session.');
        } else {
          alert(data.message || 'Failed to clock in');
        }
      }
    } catch (error) {
      console.error('Clock in error:', error);
      alert('Failed to clock in');
    }
    setIsLoading(false);
  };

  const resetAndClockIn = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.RESET_CLOCK_IN, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchTodayEntry();
      } else {
        alert(data.message || 'Failed to reset clock in');
      }
    } catch (error) {
      console.error('Reset clock in error:', error);
      alert('Failed to reset clock in');
    }
  };

  const handleClockOut = async () => {
    // Simple clock out without overtime logic
    await performClockOut();
  };

  const performClockOut = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CLOCK_OUT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ overtimeNote }),
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchTodayEntry();
        setShowOvertimeModal(false);
        setOvertimeNote('');
        
        if (data.overtimeRequested) {
          alert('Overtime request submitted for admin approval!');
        }
      } else {
        alert(data.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      alert('Failed to clock out');
    }
    setIsLoading(false);
  };

  const submitOvertimeRequest = async () => {
    if (!overtimeNote.trim()) {
      alert('Please provide a reason for overtime');
      return;
    }

    setIsLoading(true);
    try {
      // Submit standalone overtime request (separate from clock out)
      const response = await fetch(API_ENDPOINTS.OVERTIME_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          overtimeNote,
          date: new Date().toISOString().split('T')[0]
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowOvertimeModal(false);
        setOvertimeNote('');
        alert('Overtime request submitted for admin approval!');
        await fetchTodayEntry();
      } else {
        alert(data.message || 'Failed to submit overtime request');
      }
    } catch (error) {
      console.error('Overtime request error:', error);
      alert('Failed to submit overtime request');
    }
    setIsLoading(false);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateWorkedTime = () => {
    if (!todayEntry?.clock_in || !todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const clockOut = new Date(todayEntry.clock_out);
    const diff = clockOut.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const calculateCurrentWorkedTime = () => {
    if (!todayEntry?.clock_in || todayEntry?.clock_out) return { hours: 0, minutes: 0, seconds: 0 };
    
    const clockIn = new Date(todayEntry.clock_in);
    const diff = currentTime.getTime() - clockIn.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isAfterShiftHours = () => {
    const now = new Date();
    const overtimeThreshold = new Date();
    overtimeThreshold.setHours(16, 0, 0, 0); // 4:00 PM
    return now > overtimeThreshold;
  };

  const getOvertimeTime = () => {
    if (!isAfterShiftHours()) return { hours: 0, minutes: 0, seconds: 0 };
    const now = new Date();
    const overtimeThreshold = new Date();
    overtimeThreshold.setHours(16, 0, 0, 0); // 4:00 PM
    const diff = Math.max(0, now.getTime() - overtimeThreshold.getTime());
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const isLateClockIn = () => {
    if (!todayEntry?.clock_in) return false;
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0); // 7:00 AM
    return clockIn > shiftStart;
  };

  const getLateTime = () => {
    if (!todayEntry?.clock_in || !isLateClockIn()) return { hours: 0, minutes: 0, seconds: 0 };
    const clockIn = new Date(todayEntry.clock_in);
    const shiftStart = new Date(clockIn);
    shiftStart.setHours(7, 0, 0, 0);
    const diff = clockIn.getTime() - shiftStart.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  const formatTimeDisplay = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours}h ${time.minutes}m ${time.seconds}s`;
  };

  const workedTime = todayEntry?.clock_out ? calculateWorkedTime() : calculateCurrentWorkedTime();
  const overtimeTime = getOvertimeTime();
  const lateTime = getLateTime();

  const tabs = [
    { id: 'time-tracking', label: 'Time Tracking', icon: Clock },
    { id: 'payroll-history', label: 'Payroll History', icon: BarChart3 }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      {/* Compact Header */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-2 rounded-lg shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Welcome, {user?.username}</h1>
              <p className="text-sm text-slate-400">{formatCurrentDate()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Current Time</p>
            <div className="text-lg font-mono font-bold text-emerald-400">{formatCurrentTime()}</div>
          </div>
        </div>
      </div>

      {/* Compact Tabs */}
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="border-b border-slate-700/50">
          <nav className="flex justify-center p-3">
            <div className="bg-slate-700/30 p-1 rounded-lg flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`btn-enhanced ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg'
                        : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                    } py-2 px-4 rounded-md font-medium text-sm flex items-center gap-2 transition-all duration-300`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'time-tracking' && (
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Progress Tracker - Compact */}
              {hoursProgress && (
                <div className="lg:col-span-3">
                  <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-4 border border-blue-700/30 h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">Progress</h3>
                    </div>
                    
                    {/* Compact Circular Progress */}
                    <div className="flex justify-center mb-3">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
                          <circle
                            cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round"
                            className={hoursProgress.isCompleted ? 'text-emerald-400' : 'text-blue-400'}
                            style={{
                              strokeDasharray: `${2 * Math.PI * 32}`,
                              strokeDashoffset: `${2 * Math.PI * 32 * (1 - hoursProgress.progressPercentage / 100)}`,
                              transition: 'stroke-dashoffset 1s ease-in-out'
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className={`text-lg font-bold ${hoursProgress.isCompleted ? 'text-emerald-400' : 'text-blue-400'}`}>
                              {Number(hoursProgress.progressPercentage).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Required:</span>
                        <span className="text-blue-400 font-medium">{Number(hoursProgress.requiredHours).toFixed(0)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Worked:</span>
                        <span className="text-emerald-400 font-medium">{Number(hoursProgress.workedHours).toFixed(0)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Remaining:</span>
                        <span className={`font-medium ${hoursProgress.isCompleted ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {hoursProgress.isCompleted ? 'Done!' : `${Number(hoursProgress.remainingHours).toFixed(0)}h`}
                        </span>
                      </div>
                    </div>
                    
                    {hoursProgress.isCompleted && (
                      <div className="bg-emerald-900/30 p-2 rounded-lg border border-emerald-800/50 mt-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-3 h-3 text-emerald-400" />
                          <p className="text-xs text-emerald-400 font-medium">Completed!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Activity Panel - Compact */}
              <div className={`${hoursProgress ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
                <div className="grid lg:grid-cols-2 gap-4 h-full">
                  {/* Time Display */}
                  <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Today's Activity</h3>
                    </div>
                    
                    {todayEntry ? (
                      <div className="space-y-3">
                        {/* Compact Time Cards */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-900/30 p-3 rounded-lg border border-emerald-800/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Play className="w-3 h-3 text-emerald-400" />
                              <span className="text-xs text-emerald-400">Clock In</span>
                            </div>
                            <div className={`text-lg font-mono font-bold ${isLateClockIn() ? 'text-red-400' : 'text-emerald-400'}`}>
                              {formatTime(todayEntry.clock_in).slice(0, -3)}
                            </div>
                            {isLateClockIn() && (
                              <span className="bg-red-900/30 text-red-400 px-1 py-0.5 rounded text-xs">Late</span>
                            )}
                          </div>

                          <div className="bg-red-900/30 p-3 rounded-lg border border-red-800/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Square className="w-3 h-3 text-red-400" />
                              <span className="text-xs text-red-400">Clock Out</span>
                            </div>
                            <div className="text-lg font-mono font-bold text-red-400">
                              {todayEntry.clock_out ? formatTime(todayEntry.clock_out).slice(0, -3) : 'Active'}
                            </div>
                          </div>
                        </div>

                        {/* Worked Time - Compact */}
                        <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-800/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-blue-400" />
                              <span className="text-sm text-white font-medium">Time Worked</span>
                            </div>
                            {!todayEntry.clock_out && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-xs text-emerald-400">Live</span>
                              </div>
                            )}
                          </div>
                          <div className="text-2xl font-mono font-bold text-blue-400">
                            {formatTimeDisplay(workedTime)}
                          </div>
                        </div>

                        {/* Warnings & Status - Compact */}
                        {isLateClockIn() && (
                          <div className="bg-red-900/30 p-2 rounded-lg border border-red-800/50">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-3 h-3 text-red-400" />
                              <p className="text-xs text-red-400">
                                Late: {formatTimeDisplay(lateTime)} after 7:00 AM
                              </p>
                            </div>
                          </div>
                        )}

                        {isAfterShiftHours() && !todayEntry.clock_out && (
                          <div className="bg-orange-900/30 p-2 rounded-lg border border-orange-800/50">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-orange-400" />
                              <div>
                                <p className="text-xs text-orange-400 font-medium">Potential Overtime</p>
                                <p className="text-xs text-orange-300">{formatTimeDisplay(overtimeTime)} past 4:00 PM</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {todayEntry.overtime_requested && (
                          <div className={`p-2 rounded-lg border ${
                            todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                              ? 'bg-yellow-900/30 border-yellow-800/50'
                              : todayEntry.overtime_approved 
                                ? 'bg-emerald-900/30 border-emerald-800/50'
                                : 'bg-red-900/30 border-red-800/50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <AlertCircle className={`w-3 h-3 ${
                                todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                  ? 'text-yellow-400'
                                  : todayEntry.overtime_approved 
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                              }`} />
                              <p className={`text-xs font-medium ${
                                todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                  ? 'text-yellow-400'
                                  : todayEntry.overtime_approved 
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                              }`}>
                                {todayEntry.overtime_approved === null || todayEntry.overtime_approved === undefined
                                  ? 'Overtime Pending'
                                  : todayEntry.overtime_approved 
                                    ? 'Overtime Approved ✓'
                                    : 'Overtime Rejected ✗'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <h4 className="text-sm font-medium text-white mb-1">Ready to Start?</h4>
                        <p className="text-xs text-slate-400">Clock in to begin tracking</p>
                      </div>
                    )}
                  </div>

                  {/* Actions & Info Panel */}
                  <div className="space-y-4">
                    {/* Action Buttons - Compact */}
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Quick Actions
                      </h4>
                      
                      <div className="space-y-2">
                        {!todayEntry && (
                          <button
                            onClick={handleClockIn}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 btn-enhanced flex items-center justify-center gap-2 text-sm"
                          >
                            <Play className="w-4 h-4" />
                            {isLoading ? 'Clocking In...' : 'Clock In'}
                          </button>
                        )}
                        
                        {todayEntry && todayEntry.clock_in && !todayEntry.clock_out && (
                          <button
                            onClick={handleClockOut}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-lg font-medium hover:from-red-600 hover:to-red-700 disabled:opacity-50 btn-enhanced flex items-center justify-center gap-2 text-sm"
                          >
                            <Square className="w-4 h-4" />
                            {isLoading ? 'Clocking Out...' : 'Clock Out'}
                          </button>
                        )}

                        {todayEntry && todayEntry.clock_in && todayEntry.clock_out && (
                          <button
                            onClick={handleClockIn}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 btn-enhanced flex items-center justify-center gap-2 text-sm"
                          >
                            <Play className="w-4 h-4" />
                            New Session
                          </button>
                        )}
                        
                        <button
                          onClick={() => setShowOvertimeModal(true)}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 btn-enhanced flex items-center justify-center gap-2 text-sm"
                        >
                          <Clock className="w-4 h-4" />
                          Request Overtime
                        </button>
                      </div>
                    </div>

                    {/* Shift Info - Compact */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                
                        Shift Info
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-700/30 p-2 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Regular</span>
                          </div>
                          <p className="text-white font-semibold">7:00 AM - 3:30 PM</p>
                        </div>
                        
                        <div className="bg-slate-700/30 p-2 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-orange-400" />
                            <span className="text-orange-400 font-medium">Overtime</span>
                          </div>
                          <p className="text-white font-semibold">₱35/hour</p>
                        </div>
                        
                        <div className="bg-slate-700/30 p-2 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <AlertCircle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400 font-medium">Late</span>
                          </div>
                          <p className="text-white font-semibold">-₱25/hour</p>
                        </div>
                        
                        <div className="bg-slate-700/30 p-2 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <Home className="w-3 h-3 text-purple-400" />
                            <span className="text-purple-400 font-medium">Staff House</span>
                          </div>
                          {user?.staff_house ? (
                            <p className="text-emerald-400 font-semibold">-₱250/week</p>
                          ) : (
                            <p className="text-slate-300 font-semibold">Not Enrolled</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-blue-900/20 rounded border border-blue-800/50">
                        <p className="text-xs text-blue-300">
                          Base pay capped at ₱200 for 8.5 hours • Work hours count from 7:00 AM onwards
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll-history' && <PayrollHistory />}
        </div>
      </div>

      {/* Modals remain the same but with updated styling for compactness */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-xl p-4 w-full max-w-sm border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Overtime Updates</h3>
            </div>
            
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {notifications.map((notification, index) => (
                <div key={index} className={`p-2 rounded border text-sm ${
                  notification.overtime_approved 
                    ? 'bg-emerald-900/20 border-emerald-800/50' 
                    : 'bg-red-900/20 border-red-800/50'
                }`}>
                  <span className={`font-medium ${
                    notification.overtime_approved ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {notification.overtime_approved ? 'Overtime Approved ✓' : 'Overtime Rejected ✗'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notification.clock_in).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowNotifications(false);
                setNotifications([]);
              }}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-emerald-600 hover:to-green-700"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {showOvertimeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-xl p-4 w-full max-w-sm border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Overtime Request</h3>
            </div>
            
            <div className="bg-orange-900/20 p-3 rounded border border-orange-800/50 mb-3">
              <p className="text-sm text-orange-300">
                {isAfterShiftHours() 
                  ? `Current overtime: ${formatTimeDisplay(overtimeTime)} past 4:00 PM`
                  : 'Request overtime for work after 4:00 PM'
                }
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Reason for Overtime <span className="text-red-400">*</span>
              </label>
              <textarea
                value={overtimeNote}
                onChange={(e) => setOvertimeNote(e.target.value)}
                className="w-full p-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-400 text-sm"
                rows={3}
                placeholder="Please explain the reason for overtime work..."
                required
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowOvertimeModal(false);
                  setOvertimeNote('');
                }}
                className="flex-1 bg-slate-700/50 text-slate-300 py-2 px-3 rounded font-medium hover:bg-slate-600/50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitOvertimeRequest}
                disabled={!overtimeNote.trim() || isLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2 px-3 rounded font-medium hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 btn-enhanced text-sm"
              >
                {isLoading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}