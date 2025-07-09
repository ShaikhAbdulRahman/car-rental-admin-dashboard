"use client"
import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Activity, Clock, User, ArrowRight, Calendar, Search, Filter, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const intervalRef = useRef(null);
  const previousLogsRef = useRef([]);

  useEffect(() => {
    fetchAuditLogs();
    startRealTimeUpdates();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    filterLogs();
  }, [auditLogs, searchTerm, actionFilter, dateFilter]);

  const startRealTimeUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/audit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await response.json();
      const logs = data.logs || [];
      setAuditLogs(logs);
      previousLogsRef.current = logs;
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogsRealTime = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/audit', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch');
      }
      
      const data = await response.json();
      const logs = data.logs || [];
      
      const previousIds = previousLogsRef.current.map(log => log.id);
      const newLogs = logs.filter(log => !previousIds.includes(log.id));
      
      if (newLogs.length > 0) {
        setNewLogsCount(prev => prev + newLogs.length);
                if (newLogs.length === 1) {
          showNotification(`New audit log: ${newLogs[0].username} ${getActionText(newLogs[0].action)} listing #${newLogs[0].listing_id}`);
        } else {
          showNotification(`${newLogs.length} new audit logs added`);
        }
      }
      
      setAuditLogs(logs);
      previousLogsRef.current = logs;
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to fetch real-time updates:', error);
    }
  };

  const showNotification = (message) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Car Rental Admin', {
          body: message,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Car Rental Admin', {
              body: message,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }

  const filterLogs = () => {
    let filtered = auditLogs;
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.listing_id.toString().includes(searchTerm)
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action.includes(actionFilter));
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(log => new Date(log.timestamp) >= filterDate);
          break;
      }
    }

    setFilteredLogs(filtered);
  };

  const formatDetailedDate = (timestamp) => {
    const date = new Date(timestamp);
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDetailedDate(timestamp);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'approved':
      case 'status_changed_to_approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
      case 'status_changed_to_rejected':
        return 'text-red-600 bg-red-100';
      case 'updated':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
      case 'status_changed_to_pending':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'approved':
      case 'status_changed_to_approved':
        return '✓';
      case 'rejected':
      case 'status_changed_to_rejected':
        return '✗';
      case 'updated':
        return '✎';
      case 'pending':
      case 'status_changed_to_pending':
        return '⏳';
      default:
        return '•';
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'status_changed_to_approved':
        return 'approved';
      case 'status_changed_to_rejected':
        return 'rejected';
      case 'status_changed_to_pending':
        return 'set to pending';
      case 'updated':
        return 'updated';
      default:
        return action;
    }
  };

  const getActionDescription = (log) => {
    const baseText = `${log.username} ${getActionText(log.action)} listing #${log.listing_id}`;
    
    if (log.old_status && log.new_status) {
      return `${baseText} from ${log.old_status} to ${log.new_status}`;
    }
    
    return baseText;
  };

  const manualRefresh = () => {
    setLoading(true);
    fetchAuditLogs();
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Activity className="h-6 w-6 mr-2" />
                Audit Trail
                <span className="ml-2 text-sm text-gray-500">
                  (Real-time)
                </span>
              </h1>
              <p className="mt-2 text-sm text-gray-700">
                Track all administrative actions performed on listings with real-time updates.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-4">            
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md">
                Total Actions: {auditLogs.length}
              </div>
            </div>
          </div>
          {lastUpdated && (
            <div className="mt-2 text-xs text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Last updated: {formatRelativeTime(lastUpdated)}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by admin name or listing ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Actions</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending</option>
                <option value="updated">Updated</option>
              </select>
            </div>

            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredLogs.length} of {auditLogs.length} audit entries
          </div>

          <div className="mt-6">
            <div className="flow-root">
              <ul className="-mb-8">
                {filteredLogs.map((log, logIdx) => {
                  const isNew = previousLogsRef.current.length > 0 && 
                    !previousLogsRef.current.some(prevLog => prevLog.id === log.id);
                  
                  return (
                    <li key={log.id} className={isNew ? 'animate-pulse' : ''}>
                      <div className="relative pb-8">
                        {logIdx !== filteredLogs.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getActionColor(log.action)} ${
                              isNew ? 'ring-blue-200' : ''
                            }`}>
                              <span className="text-sm font-medium">
                                {getActionIcon(log.action)}
                              </span>
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`bg-white border rounded-lg p-4 shadow-sm ${
                              isNew ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            }`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                      {log.username}
                                    </span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                                      {getActionText(log.action)}
                                    </span>
                                    {isNew && (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                  
                                  <p className="mt-2 text-sm text-gray-700">
                                    {getActionDescription(log)}
                                  </p>
                                  
                                  {log.old_status && log.new_status && (
                                    <div className="mt-2 flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">Status changed:</span>
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.old_status)}`}>
                                        {log.old_status}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-gray-400" />
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.new_status)}`}>
                                        {log.new_status}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="ml-4 flex-shrink-0 text-right">
                                  <div className="flex items-center text-sm text-gray-500 mb-1">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {formatRelativeTime(log.timestamp)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {formatDetailedDate(log.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {auditLogs.length === 0 ? 'No audit logs' : 'No matching audit logs'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {auditLogs.length === 0 
                    ? 'Administrative actions will appear here once performed.'
                    : 'Try adjusting your filters to see more results.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}