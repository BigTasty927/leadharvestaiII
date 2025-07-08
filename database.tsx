import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Database, 
  ArrowLeft, 
  ExternalLink, 
  Calendar,
  Users,
  TrendingUp,
  Download,
  Eye,
  Filter,
  Search
} from "lucide-react";
import { Link } from "wouter";
import type { VideoAnalysis, Lead } from "@shared/schema";

export default function DatabasePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [selectedAnalysis, setSelectedAnalysis] = useState<VideoAnalysis | null>(null);

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['/api/video-analyses'],
    queryFn: async () => {
      const response = await fetch('/api/video-analyses');
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return response.json() as Promise<VideoAnalysis[]>;
    }
  });

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         analysis.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === "all" || analysis.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const totalLeads = analyses.reduce((sum, analysis) => sum + (analysis.leadsFound || 0), 0);
  const totalVideos = analyses.length;
  const completedAnalyses = analyses.filter(a => a.analysisStatus === 'completed').length;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return '📺';
      case 'tiktok': return '🎵';
      case 'instagram': return '📷';
      default: return '🔗';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = (analysis: VideoAnalysis) => {
    if (!analysis.leads || analysis.leads.length === 0) {
      alert('No leads to export for this analysis');
      return;
    }

    const csvHeader = 'Type,Comment,Location,Budget,Contact Info,Priority,Tags\n';
    const csvData = analysis.leads.map((lead: Lead) => 
      `"${lead.type}","${lead.comment.replace(/"/g, '""')}","${lead.location || ''}","${lead.budget || ''}","${lead.contactInfo || ''}","${lead.priority}","${lead.tags.join('; ')}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${analysis.id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedAnalysis) {
    return (
      <div className="min-h-screen bg-bg-light">
        {/* Analysis Detail Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Analysis Details</h1>
                  <p className="text-sm text-gray-600">
                    {getPlatformIcon(selectedAnalysis.platform)} {selectedAnalysis.title || 'Untitled Video'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => exportToCSV(selectedAnalysis)}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <a
                  href={selectedAnalysis.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Stats */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Comments Analyzed</p>
                  <p className="text-2xl font-semibold text-gray-900">{selectedAnalysis.commentsCount || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Leads Found</p>
                  <p className="text-2xl font-semibold text-gray-900">{selectedAnalysis.leadsFound || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedAnalysis.commentsCount ? 
                      Math.round(((selectedAnalysis.leadsFound || 0) / selectedAnalysis.commentsCount) * 100) 
                      : 0}%
                  </p>
                </div>
                <Database className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-medium capitalize text-gray-900">{selectedAnalysis.analysisStatus}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lead Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedAnalysis.leads && selectedAnalysis.leads.length > 0 ? (
                    selectedAnalysis.leads.map((lead: Lead, index: number) => (
                      <tr key={lead.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            lead.type === 'purchase' ? 'bg-green-100 text-green-800' :
                            lead.type === 'rental' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {lead.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {lead.comment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.budget || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            lead.priority === 'high' ? 'bg-red-100 text-red-800' :
                            lead.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {lead.tags.join(', ')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No leads found for this analysis
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Video Analysis Database</h1>
                <p className="text-sm text-gray-600">Track and manage all your lead analysis results</p>
              </div>
            </div>
            <Database className="w-8 h-8 text-orange-primary" />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Videos Analyzed</p>
                <p className="text-3xl font-bold text-gray-900">{totalVideos}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads Found</p>
                <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Analyses</p>
                <p className="text-3xl font-bold text-gray-900">{completedAnalyses}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent"
                >
                  <option value="all">All Platforms</option>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Analysis History</h2>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading analyses...</div>
          ) : filteredAnalyses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {analyses.length === 0 ? 'No analyses found. Start by analyzing a video!' : 'No analyses match your search criteria.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredAnalyses.map((analysis) => (
                <div key={analysis.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg">{getPlatformIcon(analysis.platform)}</span>
                        <h3 className="font-medium text-gray-900">
                          {analysis.title || 'Untitled Video'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          analysis.analysisStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          analysis.analysisStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {analysis.analysisStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2 truncate max-w-md">{analysis.url}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{analysis.commentsCount || 0} comments</span>
                        <span>{analysis.leadsFound || 0} leads</span>
                        <span>{formatDate(analysis.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className="flex items-center space-x-2 px-3 py-2 text-orange-primary hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                      <a
                        href={analysis.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}