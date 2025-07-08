import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Download, 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  MapPin,
  DollarSign,
  MessageSquare,
  ExternalLink,
  User,
  Target,
  Zap,
  FileText
} from "lucide-react";
import { Link } from "wouter";
import type { Lead } from "@shared/schema";

export default function LeadsDatabasePage() {
  const { data: leads, isLoading } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json()) as Promise<Lead[]>
  });

  // Handle CSV Export using server endpoint
  const exportToCSV = async () => {
    try {
      const response = await fetch('/api/export/csv', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('CSV export failed. Please try again.');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('CSV export failed. Please try again.');
    }
  };

  // Handle Google Sheets Export
  const handleGoogleSheetsExport = async () => {
    const email = prompt('Enter your email address for Google Sheets sharing:');
    if (!email) return;

    try {
      const response = await fetch('/api/export/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Google Sheets export sent successfully! Check your email: ${email}`);
      } else {
        const error = await response.json();
        alert(`Export failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Google Sheets export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportLeadsToCSV = () => {
    if (!leads || leads.length === 0) {
      alert('No leads to export');
      return;
    }

    const headers = ['Username', 'Type', 'Comment', 'Priority', 'Confidence', 'Intent', 'Budget', 'Location', 'Platform', 'Video URL', 'Created Date'];
    const csvData = leads.map((lead: Lead) => 
      [
        lead.username,
        lead.type,
        `"${lead.comment.replace(/"/g, '""')}"`,
        lead.priority,
        lead.confidenceScore || 50,
        lead.intent || '',
        lead.budget || '',
        lead.location || '',
        lead.platform,
        lead.videoUrl,
        new Date(lead.createdAt!).toLocaleDateString()
      ].join(',')
    );

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `real-estate-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leads database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Chat</span>
                </button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Real Estate Leads Database</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{leads?.length || 0} total leads</span>
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleGoogleSheetsExport}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Google Sheets</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {leads && leads.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Required</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{lead.username}</div>
                            {lead.profileLink && (
                              <a 
                                href={lead.profileLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                View Profile
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (lead.classification || lead.type || '').includes('Renter') ? 'bg-blue-100 text-blue-800' :
                          (lead.classification || lead.type || '').includes('Buyer') ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {lead.classification || lead.type || 'Interested'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={lead.comment}>
                          {lead.comment}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (lead.urgencyLevel || lead.priority) === 'High' || (lead.urgencyLevel || lead.priority) === 'high' ? 'bg-red-100 text-red-800' :
                          (lead.urgencyLevel || lead.priority) === 'Medium' || (lead.urgencyLevel || lead.priority) === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.urgencyLevel || lead.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Target className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">{lead.confidenceScore || 50}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={lead.recommendedAction || undefined}>
                          {lead.recommendedAction || 'Contact lead'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {lead.followUpTimeframe || 'Within 24 hours'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads collected yet</h3>
            <p className="text-gray-500 mb-6">Start analyzing videos to collect structured lead data from social media comments</p>
            <Link href="/">
              <button className="inline-flex items-center px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                <MessageSquare className="w-4 h-4 mr-2" />
                Go to Chat Interface
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}