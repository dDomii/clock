import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Check, X, MessageSquare, User, Calendar, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface OvertimeRequest {
  id: number;
  username: string;
  department: string;
  clock_in: string;
  clock_out: string;
  overtime_note: string;
  created_at: string;
  date: string;
}

const DEPARTMENT_COLORS = {
  'Human Resource': 'text-orange-400 bg-orange-900/20 border-orange-800/50',
  'Marketing': 'text-gray-400 bg-gray-900/20 border-gray-800/50',
  'Finance': 'text-sky-400 bg-sky-900/20 border-sky-800/50',
  'Account Management': 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50',
  'System Automation': 'text-green-400 bg-green-900/20 border-green-800/50',
  'Sales': 'text-pink-400 bg-pink-900/20 border-pink-800/50',
  'Training': 'text-cyan-400 bg-cyan-900/20 border-cyan-800/50',
  'IT Department': 'text-purple-400 bg-purple-900/20 border-purple-800/50'
};

export function OvertimeApproval() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetchOvertimeRequests();
  }, []);

  const fetchOvertimeRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.100.60:3001/api/overtime-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
    }
    setLoading(false);
  };

  const handleApproval = async (requestId: number, approved: boolean) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`http://192.168.100.60:3001/api/overtime-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        // Show success message
        const action = approved ? 'approved' : 'declined';
        alert(`Overtime request ${action} successfully!`);
        
        // Refresh the list
        await fetchOvertimeRequests();
      } else {
        alert('Failed to process overtime request');
      }
    } catch (error) {
      console.error('Error processing overtime:', error);
      alert('Failed to process overtime request');
    }
    setProcessingId(null);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateOvertimeHours = (clockIn: string, clockOut: string) => {
    const clockInTime = new Date(clockIn);
    const clockOutTime = new Date(clockOut);
    const shiftEnd = new Date(clockInTime);
    shiftEnd.setHours(15, 30, 0, 0); // 3:30 PM

    if (clockOutTime > shiftEnd) {
      const overtime = (clockOutTime.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
      return Math.max(0, overtime).toFixed(2);
    }
    return '0.00';
  };

  const getDepartmentStyle = (department: string) => {
    return DEPARTMENT_COLORS[department] || 'text-slate-400 bg-slate-900/20 border-slate-800/50';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Overtime Approval</h2>
          <p className="text-slate-400">Review and approve overtime requests from employees</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchOvertimeRequests}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 btn-enhanced flex items-center gap-2 shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="bg-orange-900/20 text-orange-400 px-3 py-1 rounded-full text-sm font-medium border border-orange-800/50">
            {requests.length} Pending Requests
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Requests</p>
              <p className="text-2xl font-bold text-white">{requests.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total OT Hours</p>
              <p className="text-2xl font-bold text-orange-400">
                {requests.reduce((sum, req) => sum + parseFloat(calculateOvertimeHours(req.clock_in, req.clock_out)), 0).toFixed(1)}h
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Potential Cost</p>
              <p className="text-2xl font-bold text-emerald-400">
                ₱{(requests.reduce((sum, req) => sum + parseFloat(calculateOvertimeHours(req.clock_in, req.clock_out)), 0) * 35).toFixed(0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading overtime requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-slate-700/30 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
          <p className="text-slate-400">No pending overtime requests to review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const overtimeHours = calculateOvertimeHours(request.clock_in, request.clock_out);
            const overtimePay = (parseFloat(overtimeHours) * 35).toFixed(2);
            const departmentStyle = getDepartmentStyle(request.department);
            const isProcessing = processingId === request.id;

            return (
              <div key={request.id} className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-700/50 transition-all duration-200 shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-3 rounded-xl border border-orange-700/50">
                        <User className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">{request.username}</h3>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${departmentStyle}`}>
                          <div className="w-2 h-2 rounded-full bg-current"></div>
                          {request.department}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatDate(request.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-500">Request submitted</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-400">Clock In</span>
                      </div>
                      <p className="font-mono text-lg font-bold text-emerald-400">{formatTime(request.clock_in)}</p>
                    </div>
                    
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-red-400">Clock Out</span>
                      </div>
                      <p className="font-mono text-lg font-bold text-red-400">{formatTime(request.clock_out)}</p>
                    </div>
                    
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-orange-400">OT Hours</span>
                      </div>
                      <p className="font-mono text-lg font-bold text-orange-400">{overtimeHours}h</p>
                    </div>
                    
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-emerald-400">OT Pay</span>
                      </div>
                      <p className="font-mono text-lg font-bold text-emerald-400">₱{overtimePay}</p>
                      <p className="text-xs text-slate-400">@ ₱35/hour</p>
                    </div>
                  </div>

                  {request.overtime_note && (
                    <div className="bg-slate-700/30 p-4 rounded-lg mb-4 border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Reason for Overtime</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{request.overtime_note}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproval(request.id, false)}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 py-3 px-4 rounded-lg font-medium hover:from-red-500/30 hover:to-red-600/30 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border border-red-800/50 btn-enhanced"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Decline
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleApproval(request.id, true)}
                      disabled={isProcessing}
                      className="flex-1 bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-400 py-3 px-4 rounded-lg font-medium hover:from-emerald-500/30 hover:to-green-600/30 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border border-emerald-800/50 btn-enhanced"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Information Panel */}
      <div className="mt-8 bg-blue-900/20 p-6 rounded-xl border border-blue-800/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-400 mb-2">Overtime Approval Guidelines</p>
            <ul className="text-xs text-blue-300 space-y-1">
              <li>• Overtime is calculated for work done after 3:30 PM (end of regular shift)</li>
              <li>• Overtime rate is ₱35 per hour</li>
              <li>• Only approved overtime will be included in payroll calculations</li>
              <li>• Employees will be notified of approval/decline decisions</li>
              <li>• Review the reason provided before making a decision</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}