import React, { useState, useEffect} from 'react';
import type {FC, ChangeEvent, MouseEvent } from 'react';
import { Search, Filter, Star, GitFork, AlertCircle, Calendar, Code, ExternalLink, TrendingUp, Users, GitBranch, Award, Rocket, Target, Shield, Compass, BookOpen, Heart, ChevronRight, Layers, XCircle } from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
// --- Type Definitions (Derived from Backend Models) ---
// Note: Backend snake_case properties are converted to camelCase for idiomatic TS/JS.

/**
 * Represents the health and activity metrics of a GitHub repository.
 * From: models/repository.py -> RepositoryHealth
 */
export interface RepositoryHealth {
  stars: number;
  forks: number;
  openIssues: number;
  closedIssues: number;
  watchers: number;
  contributorsCount: number;
  commitsLastMonth: number;
  commitsLastYear: number;
  lastCommitDate: string | null; // ISO Date String
  creationDate: string | null;   // ISO Date String
}

/**
 * Represents the complexity and documentation metrics of a GitHub repository.
 * From: models/repository.py -> RepositoryComplexity
 */
export interface RepositoryComplexity {
  linesOfCode: number;
  fileCount: number;
  directoryDepth: number;
  dependencyCount: number;
  readmeLength: number;
  hasContributingGuide: boolean;
  hasCodeOfConduct: boolean;
  hasLicense: boolean;
}

/**
 * The main interface for a GitHub repository, combining all its data points.
 * From: models/repository.py -> Repository
 */
export interface Repository {
  githubId: string;
  name: string;
  fullName: string;
  htmlUrl: string; // From original JS version, essential for links
  description?: string | null;
  primaryLanguage?: string | null;
  languages: Record<string, number>; // e.g., { "TypeScript": 1024, "Python": 2048 }
  topics: string[];
  health: RepositoryHealth;
  complexity: RepositoryComplexity;
  goodFirstIssues: number;
  helpWantedIssues: number;
  difficultyScore: number;
  qualityScore: number;
  beginnerFriendlyScore: number;
  overallScore: number;
  cachedAt: string; // ISO Date String
}

/**
 * Type definition for the advanced filter state.
 */
interface Filters {
  language: string;
  minStars: string;
  recentActivity: 'any' | 'week' | 'month';
  sortBy: 'stars' | 'updated';
}

interface RepositoryCardProps {
  repository: Repository;
}


// --- Helper Functions ---
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};


// --- Reusable UI Components ---

const RepositoryCard: FC<RepositoryCardProps> = ({ repository }) => (
  <div className="group relative animate-fadeInUp">
    <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8559] via-[#FFB578] to-[#E65447] rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
    <div className="relative bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#F0E5E2] hover:border-[#E65447] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#E65447] to-[#FF8559] rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-[#4A3C38] transition-all duration-300">{repository.name}</h3>
            <p className="text-xs sm:text-sm text-[#8C7A75] font-semibold">{repository.fullName}</p>
          </div>
        </div>
        <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-[#FFFBF7] border-2 border-[#F0E5E2] hover:border-[#E65447] rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-12 shadow-md hover:shadow-lg">
          <ExternalLink className="w-5 h-5 text-[#E65447]" />
        </a>
      </div>
      <p className="text-[#8C7A75] mb-6 leading-relaxed text-base sm:text-lg flex-grow">{repository.description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-3 text-center border-2 border-[#F0E5E2] hover:border-[#FFB578] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <Star className="w-5 h-5 text-[#FFB578] mx-auto mb-1 fill-current" />
          <div className="text-lg font-black text-[#4A3C38]">{formatNumber(repository.health.stars)}</div>
          <div className="text-xs text-[#FFB578] font-bold tracking-wider">STARS</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border-2 border-[#F0E5E2] hover:border-[#FF8559] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <GitFork className="w-5 h-5 text-[#FF8559] mx-auto mb-1" />
          <div className="text-lg font-black text-[#4A3C38]">{formatNumber(repository.health.forks)}</div>
          <div className="text-xs text-[#FF8559] font-bold tracking-wider">FORKS</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border-2 border-[#F0E5E2] hover:border-[#E65447] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <AlertCircle className="w-5 h-5 text-[#E65447] mx-auto mb-1" />
          <div className="text-lg font-black text-[#4A3C38]">{repository.health.openIssues}</div>
          <div className="text-xs text-[#E65447] font-bold tracking-wider">ISSUES</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border-2 border-[#F0E5E2] hover:border-[#CF5376] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <Users className="w-5 h-5 text-[#CF5376] mx-auto mb-1" />
          <div className="text-lg font-black text-[#4A3C38]">{repository.goodFirstIssues || 0}</div>
          <div className="text-xs text-[#CF5376] font-bold tracking-wider">BEGINNER</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-[#FF8559]/10 border-2 border-[#F0E5E2] rounded-lg hover:border-[#FF8559] transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md">
          <Code className="w-5 h-5 text-[#FF8559]" />
          <span className="text-[#4A3C38] font-bold text-sm">{repository.primaryLanguage}</span>
        </div>
        <div className="flex items-center gap-2 text-[#8C7A75] hover:text-[#4A3C38] transition-colors duration-300">
          <Calendar className="w-5 h-5" />
          <span className="font-semibold text-sm">{formatDate(repository.health.lastCommitDate)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {repository.topics.map((topic, idx) => (
          <span key={idx} className="px-3 py-1.5 bg-[#FF8559]/10 border-2 border-[#F0E5E2] text-[#E65447] rounded-lg text-xs font-bold tracking-wider hover:border-[#E65447] hover:text-[#4A3C38] transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-pointer shadow-sm hover:shadow-md">
            {topic.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const LoadingSkeleton: FC = () => (
    <div className="group relative">
      <div className="relative bg-white/80 rounded-3xl p-6 sm:p-8 border-2 border-[#F0E5E2]/50 shadow-lg animate-pulse">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
            <div>
              <div className="h-6 w-32 bg-slate-200 rounded-md mb-2"></div>
              <div className="h-4 w-48 bg-slate-200 rounded-md"></div>
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="h-5 w-full bg-slate-200 rounded-md mb-3"></div>
        <div className="h-5 w-3/4 bg-slate-200 rounded-md mb-6"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
          <div className="h-24 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );

const NoResults: FC = () => (
  <div className="text-center py-16 col-span-1 lg:col-span-2 bg-white/50 rounded-3xl border-2 border-dashed border-[#E65447]/50 animate-fadeInUp">
    <Layers className="w-16 h-16 mx-auto text-[#E65447]/50 mb-4" />
    <h3 className="text-2xl font-bold text-[#4A3C38] mb-2">No Projects Found</h3>
    <p className="text-[#8C7A75]">Try adjusting your search or filter criteria.</p>
  </div>
);


const dashboard: FC = () => {
  const initialFilters: Filters = {
    language: '',
    minStars: '',
    recentActivity: 'any',
    sortBy: 'stars'
  };

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');

  // --- Data Fetching Simulation ---
  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const fiveDaysAgo = new Date(); fiveDaysAgo.setDate(today.getDate() - 5);
    const monthAgo = new Date(); monthAgo.setMonth(today.getMonth() - 1);

    const sampleRepositories: Repository[] = [
      {
        githubId: '10270250', name: 'React', fullName: 'facebook/react', htmlUrl: 'https://github.com/facebook/react', description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.', primaryLanguage: 'JavaScript', languages: { 'JavaScript': 5000000 }, topics: ['javascript', 'react', 'frontend', 'ui', 'library'],
        health: {
            stars: 218000, forks: 45000, openIssues: 1200, closedIssues: 15000, watchers: 7000, contributorsCount: 1600, commitsLastMonth: 150, commitsLastYear: 2000, lastCommitDate: yesterday.toISOString(), creationDate: new Date('2013-05-29T16:14:20Z').toISOString(),
        },
        complexity: {
            linesOfCode: 150000, fileCount: 2000, directoryDepth: 10, dependencyCount: 50, readmeLength: 5000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true,
        },
        goodFirstIssues: 45, helpWantedIssues: 150, difficultyScore: 0.8, qualityScore: 0.95, beginnerFriendlyScore: 0.4, overallScore: 0.9, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '60024429', name: 'TensorFlow', fullName: 'tensorflow/tensorflow', htmlUrl: 'https://github.com/tensorflow/tensorflow', description: 'An Open Source Machine Learning Framework for Everyone', primaryLanguage: 'Python', languages: { 'Python': 4000000, 'C++': 2000000 }, topics: ['machine-learning', 'deep-learning', 'python', 'ai'],
        health: {
            stars: 182000, forks: 88000, openIssues: 2100, closedIssues: 20000, watchers: 8000, contributorsCount: 2500, commitsLastMonth: 200, commitsLastYear: 3000, lastCommitDate: today.toISOString(), creationDate: new Date('2015-11-07T01:19:20Z').toISOString(),
        },
        complexity: {
            linesOfCode: 2000000, fileCount: 10000, directoryDepth: 15, dependencyCount: 100, readmeLength: 10000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true,
        },
        goodFirstIssues: 78, helpWantedIssues: 300, difficultyScore: 0.9, qualityScore: 0.98, beginnerFriendlyScore: 0.3, overallScore: 0.92, cachedAt: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setRepositories(sampleRepositories);
      setFilteredRepositories([...sampleRepositories].sort((a,b) => b.health.stars - a.health.stars)); // Initial sort
      setLoading(false);
    }, 1500);
  }, []);

  // --- Filtering and Sorting Logic ---
  useEffect(() => {
    let results: Repository[] = [...repositories];
    const lowercasedSearch = searchTerm.toLowerCase();

    if (lowercasedSearch) {
        results = results.filter(p =>
            p.name.toLowerCase().includes(lowercasedSearch) ||
            (p.description && p.description.toLowerCase().includes(lowercasedSearch)) ||
            p.fullName.toLowerCase().includes(lowercasedSearch) ||
            p.topics.some(t => t.toLowerCase().includes(lowercasedSearch))
        );
    }
    
    if (filters.language) {
      results = results.filter(p => p.primaryLanguage === filters.language);
    }
    if (filters.minStars) {
      results = results.filter(p => p.health.stars >= parseInt(filters.minStars, 10));
    }
    if (filters.recentActivity !== 'any') {
      const days = filters.recentActivity === 'week' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(new Date().getDate() - days)
      results = results.filter(p => p.health.lastCommitDate && new Date(p.health.lastCommitDate) > cutoffDate);
    }
    
    if(activeQuickFilter){
      switch(activeQuickFilter){
        case '🔥 Trending':
           const monthAgo = new Date();
           monthAgo.setMonth(monthAgo.getMonth() - 1);
           results = results.filter(p => p.health.lastCommitDate && new Date(p.health.lastCommitDate) > monthAgo);
           results.sort((a,b) => b.health.stars - a.health.stars);
           break;
        case '🌱 Good First Issues':
           results = results.filter(p => p.goodFirstIssues > 0);
           break;
        case '⚡ Active Today':
           results = results.filter(p => p.health.lastCommitDate && formatDate(p.health.lastCommitDate) === 'Today');
           break;
        case '💎 Hidden Gems':
           results = results.filter(p => p.health.stars > 1000 && p.health.stars < 20000);
           break;
        default: break;
      }
    } else {
        if (filters.sortBy === 'stars') {
            results.sort((a, b) => b.health.stars - a.health.stars);
        } else if (filters.sortBy === 'updated') {
            results.sort((a, b) => {
                const dateA = a.health.lastCommitDate ? new Date(a.health.lastCommitDate).getTime() : 0;
                const dateB = b.health.lastCommitDate ? new Date(b.health.lastCommitDate).getTime() : 0;
                return dateB - dateA;
            });
        }
    }

    setFilteredRepositories(results);
  }, [searchTerm, filters, repositories, activeQuickFilter]);

  // --- Event Handlers ---
  const handleFilterChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name as keyof Filters]: value}));
    setActiveQuickFilter('');
  };

  const handleQuickFilterClick = (filterName: string) => {
    setActiveQuickFilter(prev => prev === filterName ? '' : filterName);
  };
  
  const handleClearFilters = () => {
      setSearchTerm('');
      setFilters(initialFilters);
      setActiveQuickFilter('');
  };

  const handleSmoothScroll = (e: MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const languageOptions: string[] = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin'];
  
  interface Feature { icon: LucideIcon; title: string; description: string; color: string; }
  interface Step { icon: LucideIcon; title: string; description: string; color: string; }

  const features: Feature[] = [
    { icon: Filter, title: "Advanced Filtering", description: "Filter by language, stars, issues, and more", color: "#FF8559" },
    { icon: Users, title: "Beginner Friendly", description: "Find projects with good first issues", color: "#E65447" },
    { icon: TrendingUp, title: "Activity Tracking", description: "See real-time metrics on community engagement", color: "#8C7A75" },
    { icon: Shield, title: "Community Health", description: "Assess project health through metrics", color: "#FFB578" },
    { icon: Code, title: "Tech Stack Match", description: "Find projects in your preferred languages", color: "#E65447" },
    { icon: BookOpen, title: "Detailed Insights", description: "Rich project cards with Git links", color: "#FFB578" }
  ];

  const steps: Step[] = [
    { icon: Search, title: "Search & Filter", description: "Enter keywords or apply advanced filters", color: "#FFB578"},
    { icon: Compass, title: "Smart Discovery", description: "Our engine analyzes Git data", color: "#8C7A75" },
    { icon: Award, title: "View Results", description: "Browse detailed project cards", color: "#E65447" },
    { icon: Rocket, title: "Start Contributing", description: "Click through to the repository", color: "#FF8559" }
  ];
  
  return (
    <div className="min-h-screen bg-[#FFFBF7] relative overflow-hidden font-['DM_Sans',_sans-serif]">
       <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.animate-fadeInUp{animation:fadeInUp .5s ease-out both}`}</style>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8559]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E65447]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#FFB578]/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F0E5E2] shadow-sm transition-all duration-300 animate-fadeInUp">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
             <h4 className="text-[#4A3C38] font-black text-xl flex items-center gap-3">
                <GitBranch className="w-6 h-6 text-[#E65447]" />
                OSS Discovery <span className="text-xs font-medium text-[#E65447]">Engine</span>
              </h4>
               <nav className="flex space-x-4 sm:space-x-6">
                <a href="#projects" onClick={(e) => handleSmoothScroll(e, 'projects')} className="text-[#8C7A75] font-semibold hover:text-[#E65447] transition-all duration-300 active:scale-[0.98]">Projects</a>
                <a href="#features" onClick={(e) => handleSmoothScroll(e, 'features')} className="text-[#8C7A75] font-semibold hover:text-[#E65447] transition-all duration-300 active:scale-[0.98] hidden sm:inline">Features</a>
                <a href="#about" onClick={(e) => handleSmoothScroll(e, 'about')} className="text-[#8C7A75] font-semibold hover:text-[#E65447] transition-all duration-300 active:scale-[0.98] hidden md:inline">About</a>
              </nav>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="text-center mb-12 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-3">
              Find Your Perfect Project
            </h2>
            <p className="text-[#8C7A75] text-base sm:text-xl max-w-3xl mx-auto">Search across millions of open-source repositories to start contributing today.</p>
          </div>

          <div className="relative group mb-12 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8559] to-[#E65447] rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative bg-white rounded-3xl p-6 sm:p-10 border-2 border-[#F0E5E2] shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative group">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6 group-focus-within:text-[#E65447] transition-colors duration-300" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, description, or keyword..."
                    className="w-full pl-14 pr-6 py-3 sm:py-5 bg-white border-2 border-[#F0E5E2] rounded-2xl text-[#4A3C38] text-base placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#E65447]/20 focus:border-[#E65447] transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
                {['🔥 Trending', '🌱 Good First Issues', '⚡ Active Today', '💎 Hidden Gems'].map((label) => (
                  <button 
                    key={label} 
                    onClick={() => handleQuickFilterClick(label)}
                    className={`px-4 py-2 sm:px-5 sm:py-3 border-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 active:scale-[0.98] ${
                      activeQuickFilter === label
                        ? 'bg-[#E65447] text-white border-[#E65447]'
                        : 'bg-white hover:bg-[#FFFBF7] border-[#F0E5E2] hover:border-[#E65447] text-[#8C7A75] hover:text-[#4A3C38]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <details className="group/details">
                <summary className="flex items-center justify-between cursor-pointer list-none mb-6">
                    <div className="flex items-center gap-3 text-[#E65447] hover:text-[#E65447]/80 font-bold text-base sm:text-lg group-hover/details:translate-x-2 transition-all duration-300 active:scale-[0.98]">
                      <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
                      Advanced Filters
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-open/details:rotate-90 transition-transform duration-300" />
                    </div>
                    <button onClick={handleClearFilters} className="flex items-center gap-2 text-sm text-[#8C7A75] hover:text-red-500 font-semibold transition-colors duration-300 opacity-50 hover:opacity-100">
                        <XCircle className="w-4 h-4" /> Clear All
                    </button>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-4 sm:p-8 bg-[#FFFBF7] rounded-2xl border-2 border-[#F0E5E2]">
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">LANGUAGE</label>
                    <select name="language" value={filters.language} onChange={handleFilterChange} className="w-full px-4 py-3 bg-white border-2 border-[#F0E5E2] rounded-xl text-[#4A3C38] focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="">All Languages</option>
                      {languageOptions.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">MIN STARS</label>
                    <input type="number" name="minStars" value={filters.minStars} onChange={handleFilterChange} placeholder="e.g., 1000" className="w-full px-4 py-3 bg-white border-2 border-[#F0E5E2] rounded-xl text-[#4A3C38] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">ACTIVITY</label>
                    <select name="recentActivity" value={filters.recentActivity} onChange={handleFilterChange} className="w-full px-4 py-3 bg-white border-2 border-[#F0E5E2] rounded-xl text-[#4A3C38] focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="any">Any Time</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">SORT BY</label>
                    <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange} className="w-full md:w-1/3 px-4 py-3 bg-white border-2 border-[#F0E5E2] rounded-xl text-[#4A3C38] focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="stars">⭐ Most Stars</option>
                      <option value="updated">🔄 Recently Updated</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>
          </div>
          
          <div className="mt-10 sm:mt-16 bg-[#FFFBF7] rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-[#F0E5E2] animate-fadeInUp" id="projects" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center gap-4 mb-8 sm:mb-10 border-b pb-4 border-[#E65447]/20">
              <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFB578]" />
              <h2 className="text-2xl sm:text-3xl font-black text-[#4A3C38]">
                Featured Open Source Projects
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {loading ? (
                <>
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                </>
              ) : filteredRepositories.length > 0 ? (
                filteredRepositories.map((repo) => (
                  <RepositoryCard key={repo.githubId} repository={repo} />
                ))
              ) : (
                <NoResults />
              )}
            </div>
          </div>
        </div>
        
        <div className="py-10 sm:py-20 px-4 sm:px-6 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
              {[
                { label: '10M+', desc: 'Projects', color: 'from-[#E65447] to-[#FF8559]' },
                { label: '50K+', desc: 'Active Repos', color: 'from-[#FFB578] to-[#FF8559]' },
                { label: '100+', desc: 'Languages', color: 'from-[#E65447] to-[#CF5376]' }
              ].map((stat, i) => (
                <div key={i} className="group relative w-full sm:w-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#E65447] to-[#FFB578] opacity-0 group-hover:opacity-50 blur transition duration-300 rounded-2xl"></div>
                  <div className="relative text-center bg-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl border-2 border-[#F0E5E2] hover:border-[#E65447] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-[0.98]">
                    <div className={`text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>{stat.label}</div>
                    <div className="text-sm text-[#8C7A75] font-semibold mt-1">{stat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20" id="features">
          <div className="text-center mb-10 sm:mb-20 animate-fadeInUp" style={{animationDelay: '0.5s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-[#8C7A75] max-w-2xl mx-auto">
              Everything you need to find the perfect project
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative animate-fadeInUp" style={{animationDelay: `${0.6 + index * 0.05}s`}}>
                <div className={'absolute -inset-1 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500'} style={{backgroundColor: feature.color}}></div>
                <div className={`relative bg-white rounded-3xl p-8 sm:p-10 border-2 border-[#F0E5E2] h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer active:scale-[0.98]`}>
                  <div className={'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg flex-shrink-0'} style={{backgroundColor: feature.color}}>
                    <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#4A3C38] mb-3">{feature.title}</h3>
                  <p className="text-[#8C7A75] leading-relaxed text-base flex-grow">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20 bg-gradient-to-b from-transparent to-[#E65447]/5 rounded-3xl" id="how-it-works">
          <div className="text-center mb-10 sm:mb-20 animate-fadeInUp" style={{animationDelay: '0.7s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-[#8C7A75] max-w-2xl mx-auto">
              Four simple steps to discover your next favorite project
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="group relative animate-fadeInUp" style={{animationDelay: `${0.8 + index * 0.1}s`}}>
                <div className={'absolute -inset-1 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500'} style={{backgroundColor: step.color}}></div>
                <div className={`relative bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#F0E5E2] h-full flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98]`}>
                  <div className='flex-grow flex flex-col items-center justify-center'>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`} style={{backgroundColor: step.color}}>
                      <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">STEP {index + 1}</div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#4A3C38] mb-3">{step.title}</h3>
                      <p className="text-[#8C7A75] text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* About Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20" id="about">
          <div className="text-center mb-10 sm:mb-16 animate-fadeInUp" style={{animationDelay: '0.9s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              About OSS Discovery Engine
            </h2>
            <p className="text-lg sm:text-xl text-[#8C7A75] max-w-3xl mx-auto">
              Breaking down barriers in open-source exploration
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="group relative animate-fadeInUp" style={{animationDelay: '1.0s'}}>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E65447] to-[#FFB578] rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 sm:p-10 border-2 border-[#F0E5E2] hover:border-[#E65447] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98] h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E65447] to-[#FF8559] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Target className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#4A3C38] mb-4">The Problem</h3>
                <p className="text-[#8C7A75] leading-relaxed text-base sm:text-lg">
                  With millions of projects on code hosting platforms, finding the right tool feels like searching for a needle in a haystack.
                  Standard search prioritizes popular projects, causing innovative or niche projects to be overlooked.
                </p>
              </div>
            </div>
            <div className="group relative animate-fadeInUp" style={{animationDelay: '1.1s'}}>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFB578] to-[#FF8559] rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white rounded-3xl p-8 sm:p-10 border-2 border-[#F0E5E2] hover:border-[#FF8559] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98] h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#FFB578] to-[#FF8559] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Rocket className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#4A3C38] mb-4">Our Solution</h3>
                <p className="text-[#8C7A75] leading-relaxed text-base sm:text-lg">
                  We built a smart discovery engine that goes beyond keywords and star counts.
                  Find projects based on community health, recent activity, and beginner-friendliness.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#4A3C38] text-white/80 animate-fadeInUp" style={{animationDelay: '1.2s'}}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="max-w-sm">
              <a href="#" className="inline-flex items-center justify-center md:justify-start gap-3 mb-4 text-white font-black text-xl hover:text-[#FF8559] transition-colors duration-300">
                <GitBranch className="w-7 h-7 text-[#FF8559]" />
                <span>OSS Discovery</span>
              </a>
              <p className="leading-relaxed text-sm">Making open-source accessible and discoverable for every developer.</p>
            </div>
            
            <div className="flex-shrink-0">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                 {['Projects', 'Features', 'How It Works', 'About'].map(text => (
                    <li key={text}>
                        <a href={`#${text.toLowerCase().replace(/\s+/g, '-')}`} onClick={(e) => handleSmoothScroll(e, text.toLowerCase().replace(/\s+/g, '-'))} className="text-white/80 hover:text-white transition-colors duration-300 text-sm font-semibold">
                            {text}
                        </a>
                    </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 my-6"></div>
          <div className="text-center">
            <p className="flex items-center justify-center gap-2 text-sm">
              Made with <Heart className="w-5 h-5 text-[#E65447] fill-current" /> for the Open Source Community
            </p>
          </div>
         </div>
        </footer>
      </div>
    </div>
  );
};

export default dashboard;

