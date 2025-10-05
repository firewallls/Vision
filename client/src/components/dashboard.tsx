import React, { useState, useEffect, useMemo} from 'react';
import type {FC} from 'react'
import type { ChangeEvent } from 'react';
import type { MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, Filter, Star, GitFork, AlertCircle, Calendar, Code, ExternalLink, TrendingUp, Users, GitBranch, Award, Rocket, Target, Shield, Compass, BookOpen, Heart, ChevronRight, Layers, XCircle, Sun, Moon, Sparkles, BrainCircuit, Github } from 'lucide-react';

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
  onInsightClick: (repo: Repository) => void;
}

interface AIInsightModalProps {
    isOpen: boolean;
    onClose: () => void;
    repository: Repository | null;
}

interface AIInsights {
    summary: string;
    contributionHighlights: string[];
}


// --- Helper Functions ---

/**
 * Formats an ISO date string into a human-readable relative time.
 * @param dateString The ISO date string to format.
 * @returns A formatted string like "Today", "Yesterday", "5 days ago", etc.
 */
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

/**
 * Formats a number into a compact string (e.g., 1200 -> 1.2K).
 * @param num The number to format.
 * @returns A compact string representation of the number.
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};


// --- Reusable UI Components ---

const RepositoryCard: FC<RepositoryCardProps> = ({ repository, onInsightClick }) => (
  <div className="group relative animate-fadeInUp">
    <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8559] via-[#FFB578] to-[#E65447] rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
    <div className="relative bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-slate-700 hover:border-[#E65447] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#E65447] to-[#FF8559] rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-200 transition-all duration-300">{repository.name}</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold">{repository.fullName}</p>
          </div>
        </div>
        <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-900 border-2 border-slate-700 hover:border-[#E65447] rounded-xl transition-all duration-300 hover:scale-110 hover:rotate-12 shadow-md hover:shadow-lg">
          <ExternalLink className="w-5 h-5 text-[#E65447]" />
        </a>
      </div>
      <p className="text-slate-400 mb-6 leading-relaxed text-base sm:text-lg flex-grow">{repository.description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 rounded-xl p-3 text-center border-2 border-slate-700 hover:border-[#FFB578] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <Star className="w-5 h-5 text-[#FFB578] mx-auto mb-1 fill-current" />
          <div className="text-lg font-black text-slate-200">{formatNumber(repository.health.stars)}</div>
          <div className="text-xs text-[#FFB578] font-bold tracking-wider">STARS</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-3 text-center border-2 border-slate-700 hover:border-[#FF8559] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <GitFork className="w-5 h-5 text-[#FF8559] mx-auto mb-1" />
          <div className="text-lg font-black text-slate-200">{formatNumber(repository.health.forks)}</div>
          <div className="text-xs text-[#FF8559] font-bold tracking-wider">FORKS</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-3 text-center border-2 border-slate-700 hover:border-[#E65447] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <AlertCircle className="w-5 h-5 text-[#E65447] mx-auto mb-1" />
          <div className="text-lg font-black text-slate-200">{repository.health.openIssues}</div>
          <div className="text-xs text-[#E65447] font-bold tracking-wider">ISSUES</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-3 text-center border-2 border-slate-700 hover:border-[#CF5376] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 min-h-[6rem] flex flex-col justify-center items-center">
          <Users className="w-5 h-5 text-[#CF5376] mx-auto mb-1" />
          <div className="text-lg font-black text-slate-200">{repository.goodFirstIssues || 0}</div>
          <div className="text-xs text-[#CF5376] font-bold tracking-wider">BEGINNER</div>
        </div>
      </div>
       <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#FF8559]/20 border-2 border-transparent rounded-lg hover:border-[#FF8559] transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md">
                    <Code className="w-5 h-5 text-[#FF8559]" />
                    <span className="text-[#FF8559] font-bold text-sm">{repository.primaryLanguage}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors duration-300">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold text-sm">{formatDate(repository.health.lastCommitDate)}</span>
                </div>
            </div>
            <button 
                onClick={() => onInsightClick(repository)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#e65447] to-[#ff8559] text-white rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
            >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-bold">✨ Gemini Insights</span>
            </button>
        </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {repository.topics.slice(0, 5).map((topic, idx) => (
          <span key={idx} className="px-3 py-1.5 bg-[#FF8559]/20 border-2 border-transparent text-[#FFB578] rounded-lg text-xs font-bold tracking-wider hover:border-[#E65447] hover:text-white transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 cursor-pointer shadow-sm hover:shadow-md">
            {topic.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const LoadingSkeleton: FC = () => (
    <div className="group relative">
      <div className="relative bg-slate-800/80 rounded-3xl p-6 sm:p-8 border-2 border-slate-700/50 shadow-lg animate-pulse">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-700 rounded-xl"></div>
            <div>
              <div className="h-6 w-32 bg-slate-700 rounded-md mb-2"></div>
              <div className="h-4 w-48 bg-slate-700 rounded-md"></div>
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-700 rounded-xl"></div>
        </div>
        <div className="h-5 w-full bg-slate-700 rounded-md mb-3"></div>
        <div className="h-5 w-3/4 bg-slate-700 rounded-md mb-6"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="h-24 bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    </div>
  );

const NoResults: FC = () => (
  <div className="text-center py-16 col-span-1 lg:col-span-2 bg-slate-800/50 rounded-3xl border-2 border-dashed border-[#E65447]/50 animate-fadeInUp">
    <Layers className="w-16 h-16 mx-auto text-[#E65447]/50 mb-4" />
    <h3 className="text-2xl font-bold text-slate-200 mb-2">No Projects Found</h3>
    <p className="text-slate-400">Try adjusting your search or filter criteria.</p>
  </div>
);

const AIInsightModal: FC<AIInsightModalProps> = ({ isOpen, onClose, repository }) => {
    const [insights, setInsights] = useState<AIInsights | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && repository) {
            const fetchInsights = async () => {
                setIsLoading(true);
                setError(null);
                setInsights(null);

                const prompt = `
                    Analyze the following GitHub repository data:
                    - Name: ${repository.name}
                    - Description: ${repository.description}
                    - Primary Language: ${repository.primaryLanguage}
                    - Topics: ${repository.topics.join(', ')}

                    Based on this data, provide a JSON object with the following structure:
                    {
                      "summary": "A concise, one-sentence summary of what the project is.",
                      "contributionHighlights": [
                        "A compelling reason to contribute to this project.",
                        "Another compelling reason.",
                        "A third reason, focusing on skills they might learn or the project's impact."
                      ]
                    }
                    Keep the summary to a single, clear sentence. The contribution highlights should be encouraging and specific.
                `;

                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: "OBJECT",
                            properties: {
                                summary: { type: "STRING" },
                                contributionHighlights: {
                                    type: "ARRAY",
                                    items: { type: "STRING" }
                                }
                            },
                            required: ["summary", "contributionHighlights"]
                        }
                    }
                };
                
                const apiKey = ""; 
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error(`API error: ${response.statusText}`);
                    }

                    const result = await response.json();
                    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                        setInsights(parsedJson);
                    } else {
                        throw new Error("Unexpected API response structure.");
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : "An unknown error occurred.");
                    console.error("Gemini API call failed:", err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchInsights();
        }
    }, [isOpen, repository]);
    
    if (!isOpen || !repository) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeInUp" onClick={onClose}>
            <div className="relative bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl border-2 border-slate-700" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle className="w-8 h-8"/>
                </button>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-gradient-to-br from-[#E65447] to-[#FF8559] rounded-xl shadow-lg">
                        <GitBranch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-100">{repository.name}</h2>
                        <p className="text-sm text-slate-400">{repository.fullName}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-200 mb-2">
                           <Sparkles className="w-5 h-5 text-[#E65447]" /> AI Summary
                        </h3>
                        {isLoading && <div className="h-5 w-full bg-slate-700 rounded-md animate-pulse"></div>}
                        {error && <p className="text-red-500 text-sm">Could not load summary. {error}</p>}
                        {insights && <p className="text-slate-300">{insights.summary}</p>}
                    </div>
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-200 mb-3">
                            <BrainCircuit className="w-5 h-5 text-[#FF8559]" /> Why Contribute?
                        </h3>
                        {isLoading && (
                            <ul className="space-y-3">
                                <li className="h-4 w-3/4 bg-slate-700 rounded-md animate-pulse"></li>
                                <li className="h-4 w-5/6 bg-slate-700 rounded-md animate-pulse"></li>
                                <li className="h-4 w-1/2 bg-slate-700 rounded-md animate-pulse"></li>
                            </ul>
                        )}
                         {error && <p className="text-red-500 text-sm">Could not load contribution ideas. {error}</p>}
                         {insights && (
                            <ul className="space-y-3 list-disc list-inside text-slate-300">
                                {insights.contributionHighlights.map((highlight, index) => (
                                    <li key={index}>{highlight}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                 <div className="mt-8 pt-4 border-t border-slate-700 text-center">
                     <p className="text-xs text-slate-500">
                         Powered by Gemini. Insights are AI-generated and may not be perfect.
                     </p>
                </div>
            </div>
        </div>
    );
};


/**
 * Main application component for the Open Source Discovery Engine.
 * It handles state management, data fetching simulation, filtering logic, and renders the entire UI.
 */
const dashboard: FC = () => {
  const initialFilters: Filters = {
    language: '',
    minStars: '',
    recentActivity: 'any',
    sortBy: 'stars'
  };

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (repo: Repository) => {
    setSelectedRepo(repo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRepo(null);
  };


  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // --- Data Fetching Simulation ---
  useEffect(() => {
    const sampleRepositories: Repository[] = [
      {
        githubId: '10270250', name: 'React', fullName: 'facebook/react', htmlUrl: 'https://github.com/facebook/react', description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.', primaryLanguage: 'JavaScript', languages: { 'JavaScript': 5000000 }, topics: ['javascript', 'react', 'frontend', 'ui', 'library'],
        health: {
            stars: 225000, forks: 46000, openIssues: 1150, closedIssues: 15500, watchers: 7200, contributorsCount: 1650, commitsLastMonth: 180, commitsLastYear: 2100, lastCommitDate: new Date(Date.now() - 2 * 86400000).toISOString(),
            creationDate: new Date('2013-05-29T16:14:20Z').toISOString(),
        },
        complexity: { linesOfCode: 150000, fileCount: 2000, directoryDepth: 10, dependencyCount: 50, readmeLength: 5000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 45, helpWantedIssues: 150, difficultyScore: 0.8, qualityScore: 0.95, beginnerFriendlyScore: 0.4, overallScore: 0.9, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '60024429', name: 'TensorFlow', fullName: 'tensorflow/tensorflow', htmlUrl: 'https://github.com/tensorflow/tensorflow', description: 'An end-to-end open source platform for machine learning.', primaryLanguage: 'Python', languages: { 'Python': 4000000, 'C++': 2000000 }, topics: ['machine-learning', 'deep-learning', 'python', 'ai', 'neural-network'],
        health: {
            stars: 185000, forks: 89000, openIssues: 2000, closedIssues: 21000, watchers: 8100, contributorsCount: 2600, commitsLastMonth: 220, commitsLastYear: 3100, lastCommitDate: new Date().toISOString(),
            creationDate: new Date('2015-11-07T01:19:20Z').toISOString(),
        },
        complexity: { linesOfCode: 2000000, fileCount: 10000, directoryDepth: 15, dependencyCount: 100, readmeLength: 10000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 78, helpWantedIssues: 300, difficultyScore: 0.9, qualityScore: 0.98, beginnerFriendlyScore: 0.3, overallScore: 0.92, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '29028775', name: 'VS Code', fullName: 'microsoft/vscode', htmlUrl: 'https://github.com/microsoft/vscode', description: 'Visual Studio Code - Open Source ("Code - OSS"). A popular, free, and open-source code editor.', primaryLanguage: 'TypeScript', languages: { 'TypeScript': 6000000 }, topics: ['editor', 'typescript', 'electron', 'ide'],
        health: {
            stars: 155000, forks: 27000, openIssues: 5000, closedIssues: 90000, watchers: 4500, contributorsCount: 1200, commitsLastMonth: 500, commitsLastYear: 7000, lastCommitDate: new Date(Date.now() - 1 * 86400000).toISOString(),
            creationDate: new Date('2015-04-29T21:24:28Z').toISOString(),
        },
        complexity: { linesOfCode: 3000000, fileCount: 15000, directoryDepth: 12, dependencyCount: 200, readmeLength: 8000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 150, helpWantedIssues: 400, difficultyScore: 0.85, qualityScore: 0.96, beginnerFriendlyScore: 0.6, overallScore: 0.93, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '70107786', name: 'Next.js', fullName: 'vercel/next.js', htmlUrl: 'https://github.com/vercel/next.js', description: 'The React Framework for Production. Next.js gives you the best developer experience with all the features you need.', primaryLanguage: 'JavaScript', languages: { 'JavaScript': 3000000, 'TypeScript': 2000000 }, topics: ['react', 'framework', 'ssr', 'jamstack', 'nodejs'],
        health: {
            stars: 118000, forks: 20000, openIssues: 1800, closedIssues: 12000, watchers: 2000, contributorsCount: 2000, commitsLastMonth: 700, commitsLastYear: 8000, lastCommitDate: new Date().toISOString(),
            creationDate: new Date('2016-10-06T19:51:31Z').toISOString(),
        },
        complexity: { linesOfCode: 500000, fileCount: 4000, directoryDepth: 9, dependencyCount: 80, readmeLength: 6000, hasContributingGuide: true, hasCodeOfConduct: false, hasLicense: true },
        goodFirstIssues: 200, helpWantedIssues: 500, difficultyScore: 0.75, qualityScore: 0.94, beginnerFriendlyScore: 0.7, overallScore: 0.91, cachedAt: new Date().toISOString(),
      },
       {
        githubId: '23372612', name: 'Godot Engine', fullName: 'godotengine/godot', htmlUrl: 'https://github.com/godotengine/godot', description: 'Multi-platform 2D and 3D game engine. Free and open source under the MIT license.', primaryLanguage: 'C++', languages: { 'C++': 8000000, 'GDScript': 1000000 }, topics: ['game-engine', 'gamedev', 'cpp', 'cross-platform', '3d'],
        health: {
            stars: 81000, forks: 16000, openIssues: 4000, closedIssues: 25000, watchers: 2500, contributorsCount: 1800, commitsLastMonth: 900, commitsLastYear: 10000, lastCommitDate: new Date(Date.now() - 3 * 86400000).toISOString(),
            creationDate: new Date('2014-08-25T19:24:22Z').toISOString(),
        },
        complexity: { linesOfCode: 5000000, fileCount: 20000, directoryDepth: 18, dependencyCount: 300, readmeLength: 9000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 500, helpWantedIssues: 800, difficultyScore: 0.95, qualityScore: 0.97, beginnerFriendlyScore: 0.2, overallScore: 0.9, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '134918951', name: 'Home Assistant', fullName: 'home-assistant/core', htmlUrl: 'https://github.com/home-assistant/core', description: 'Open source home automation that puts local control and privacy first.', primaryLanguage: 'Python', languages: { 'Python': 5000000 }, topics: ['home-automation', 'python', 'iot', 'privacy'],
        health: {
            stars: 68000, forks: 21000, openIssues: 2500, closedIssues: 30000, watchers: 1500, contributorsCount: 2500, commitsLastMonth: 1200, commitsLastYear: 15000, lastCommitDate: new Date().toISOString(),
            creationDate: new Date('2013-09-17T21:49:15Z').toISOString(),
        },
        complexity: { linesOfCode: 1800000, fileCount: 9000, directoryDepth: 14, dependencyCount: 150, readmeLength: 7000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 300, helpWantedIssues: 600, difficultyScore: 0.8, qualityScore: 0.9, beginnerFriendlyScore: 0.5, overallScore: 0.88, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '159293338', name: 'FastAPI', fullName: 'tiangolo/fastapi', htmlUrl: 'https://github.com/tiangolo/fastapi', description: 'FastAPI framework, high performance, easy to learn, fast to code, ready for production', primaryLanguage: 'Python', languages: { 'Python': 300000 }, topics: ['python', 'api', 'framework', 'async', 'web'],
        health: {
            stars: 68000, forks: 5500, openIssues: 1000, closedIssues: 2000, watchers: 900, contributorsCount: 500, commitsLastMonth: 150, commitsLastYear: 2000, lastCommitDate: new Date(Date.now() - 8 * 86400000).toISOString(),
            creationDate: new Date('2018-12-05T18:00:22Z').toISOString(),
        },
        complexity: { linesOfCode: 100000, fileCount: 500, directoryDepth: 7, dependencyCount: 40, readmeLength: 15000, hasContributingGuide: true, hasCodeOfConduct: true, hasLicense: true },
        goodFirstIssues: 120, helpWantedIssues: 250, difficultyScore: 0.6, qualityScore: 0.98, beginnerFriendlyScore: 0.8, overallScore: 0.94, cachedAt: new Date().toISOString(),
      },
      {
        githubId: '479585', name: 'Lobsters', fullName: 'lobsters/lobsters', htmlUrl: 'https://github.com/lobsters/lobsters', description: 'Computing-focused community centered around link aggregation and discussion.', primaryLanguage: 'Ruby', languages: { 'Ruby': 200000, 'JavaScript': 50000 }, topics: ['rails', 'ruby', 'community', 'forum'],
        health: {
            stars: 3800, forks: 800, openIssues: 150, closedIssues: 1500, watchers: 200, contributorsCount: 300, commitsLastMonth: 50, commitsLastYear: 600, lastCommitDate: new Date(Date.now() - 15 * 86400000).toISOString(),
            creationDate: new Date('2012-01-24T05:24:22Z').toISOString(),
        },
        complexity: { linesOfCode: 50000, fileCount: 300, directoryDepth: 6, dependencyCount: 60, readmeLength: 4000, hasContributingGuide: true, hasCodeOfConduct: false, hasLicense: true },
        goodFirstIssues: 30, helpWantedIssues: 50, difficultyScore: 0.5, qualityScore: 0.85, beginnerFriendlyScore: 0.75, overallScore: 0.8, cachedAt: new Date().toISOString(),
      },
    ];

    setTimeout(() => {
      setRepositories(sampleRepositories);
      setLoading(false);
    }, 1500);
  }, []);

  // --- Filtering and Sorting Logic ---
  // useMemo is used to optimize performance by memoizing the filtered list.
  // The calculation only re-runs if its dependencies change.
  const filteredRepositories = useMemo(() => {
    let results: Repository[] = [...repositories];
    const lowercasedSearch = searchTerm.toLowerCase();

    // 1. Apply search term filter
    if (lowercasedSearch) {
        results = results.filter(p =>
            p.name.toLowerCase().includes(lowercasedSearch) ||
            (p.description && p.description.toLowerCase().includes(lowercasedSearch)) ||
            p.fullName.toLowerCase().includes(lowercasedSearch) ||
            p.topics.some(t => t.toLowerCase().includes(lowercasedSearch))
        );
    }
    
    // 2. Apply advanced filters
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
    
    // 3. Apply quick filters (if active, they override sorting)
    if(activeQuickFilter){
      switch(activeQuickFilter){
        case '🔥 Trending':
           const monthAgo = new Date();
           monthAgo.setMonth(monthAgo.getMonth() - 1);
           results = results.filter(p => p.health.lastCommitDate && new Date(p.health.lastCommitDate) > monthAgo);
           results.sort((a,b) => b.health.commitsLastMonth - a.health.commitsLastMonth);
           break;
        case '🌱 Good First Issues':
           results = results.filter(p => p.goodFirstIssues > 0).sort((a,b) => b.goodFirstIssues - a.goodFirstIssues);
           break;
        case '⚡ Active Today':
           results = results.filter(p => p.health.lastCommitDate && formatDate(p.health.lastCommitDate) === 'Today');
           break;
        case '💎 Hidden Gems':
           results = results.filter(p => p.health.stars > 1000 && p.health.stars < 20000).sort((a,b) => b.health.stars - a.health.stars);
           break;
        default: break;
      }
    } else { // 4. Apply default sorting if no quick filter is active
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

    return results;
  }, [searchTerm, filters, repositories, activeQuickFilter]);

  // --- Event Handlers ---
  const handleFilterChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({...prev, [name as keyof Filters]: value}));
    setActiveQuickFilter(''); // Deactivate quick filter when advanced filters are used
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
  
  // --- Static Content Definitions ---
  interface Feature { icon: LucideIcon; title: string; description: string; color: string; }
  interface Step { icon: LucideIcon; title: string; description: string; color: string; }

  const features: Feature[] = [
    { icon: Filter, title: "Granular Project Filtering", description: "Pinpoint projects with filters for language, stars, activity, and more.", color: "#FF8559" },
    { icon: Users, title: "Beginner-Friendly Focus", description: "Discover projects actively seeking new contributors with 'good first issues'.", color: "#E65447" },
    { icon: TrendingUp, title: "Track Project Momentum", description: "Gauge community health with metrics on commits, issues, and contributors.", color: "#8C7A75" },
    { icon: Shield, title: "Holistic Health Score", description: "Assess project maturity and support through our unique quality scoring.", color: "#FFB578" },
    { icon: Code, title: "Find Your Tech Stack", description: "Quickly find projects that match your preferred languages and frameworks.", color: "#E65447" },
    { icon: BookOpen, title: "Dive Deeper", description: "Explore rich project cards with key metrics and direct repository links.", color: "#FFB578" }
  ];

  const steps: Step[] = [
    { icon: Search, title: "Search & Discover", description: "Use keywords or our smart filters to narrow your search.", color: "#FFB578"},
    { icon: Compass, title: "Analyze Smart Metrics", description: "Our engine provides deep insights beyond surface-level stats.", color: "#8C7A75" },
    { icon: Award, title: "Review Curated Results", description: "Browse detailed project cards tailored to your query.", color: "#E65447" },
    { icon: Rocket, title: "Start Contributing", description: "Jump directly to the repository and make your first PR.", color: "#FF8559" }
  ];

  const areFiltersActive = searchTerm || activeQuickFilter || JSON.stringify(filters) !== JSON.stringify(initialFilters);
  
  return (
    <>
    <div className="min-h-screen bg-slate-900 relative overflow-hidden font-['DM_Sans',_sans_serif] text-slate-300">
       <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.animate-fadeInUp{animation:fadeInUp .5s ease-out both}`}</style>

      {/* Background Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8559]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E65447]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#FFB578]/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10">
        
        {/* Header Navigation */}
        <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-sm transition-all duration-300 animate-fadeInUp">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
             <h4 className="text-slate-200 font-black text-xl flex items-center gap-3">
                <Github className="w-6 h-6 text-[#E65447]" />
                OSS Discovery <span className="text-xs font-medium text-[#E65447]">Engine</span>
              </h4>
               <nav className="flex items-center space-x-4 sm:space-x-6">
                <a href="#projects" onClick={(e) => handleSmoothScroll(e, 'projects')} className="text-slate-400 font-semibold hover:text-white transition-all duration-300 active:scale-[0.98]">Projects</a>
                <a href="#features" onClick={(e) => handleSmoothScroll(e, 'features')} className="text-slate-400 font-semibold hover:text-white transition-all duration-300 active:scale-[0.98] hidden sm:inline">Features</a>
                <a href="#about" onClick={(e) => handleSmoothScroll(e, 'about')} className="text-slate-400 font-semibold hover:text-white transition-all duration-300 active:scale-[0.98] hidden md:inline">About</a>
               </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-3">
              Find Your Perfect Project
            </h1>
            <p className="text-slate-400 text-base sm:text-xl max-w-3xl mx-auto">Search across millions of open-source repositories to start contributing today.</p>
          </div>

          {/* Search & Filter Panel */}
          <div className="relative group mb-12 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8559] to-[#E65447] rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative bg-slate-800 rounded-3xl p-6 sm:p-10 border-2 border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative group">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6 group-focus-within:text-[#E65447] transition-colors duration-300" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, description, or keyword..."
                    className="w-full pl-14 pr-12 py-3 sm:py-5 bg-slate-900 border-2 border-slate-600 rounded-2xl text-slate-200 text-base placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[#E65447]/20 focus:border-[#E65447] transition-all duration-300"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors">
                      <XCircle className="w-6 h-6" />
                    </button>
                  )}
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
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600 hover:border-[#E65447] text-slate-300 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <details className="group/details">
                <summary className="flex items-center justify-between cursor-pointer list-none mb-6">
                    <div className="flex items-center gap-3 text-[#FF8559] hover:text-[#FF8559]/80 font-bold text-base sm:text-lg group-hover/details:translate-x-2 transition-all duration-300 active:scale-[0.98]">
                      <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
                      Advanced Filters
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-open/details:rotate-90 transition-transform duration-300" />
                    </div>
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 p-4 sm:p-8 bg-slate-900 rounded-2xl border-2 border-slate-700">
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">LANGUAGE</label>
                    <select name="language" value={filters.language} onChange={handleFilterChange} className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="">All Languages</option>
                      {languageOptions.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">MIN STARS</label>
                    <input type="number" name="minStars" value={filters.minStars} onChange={handleFilterChange} placeholder="e.g., 1000" className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]" />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">ACTIVITY</label>
                    <select name="recentActivity" value={filters.recentActivity} onChange={handleFilterChange} className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="any">Any Time</option>
                      <option value="week">Past Week</option>
                      <option value="month">Past Month</option>
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">SORT BY</label>
                    <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange} className="w-full md:w-1/3 px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#E65447]/50 focus:border-[#E65447] transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.99]">
                      <option value="stars">⭐ Most Stars</option>
                      <option value="updated">🔄 Recently Updated</option>
                    </select>
                  </div>
                </div>
              </details>
              {areFiltersActive && (
                 <div className="mt-6 text-center">
                    <button onClick={handleClearFilters} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-red-500 font-semibold transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-105 active:scale-100">
                        <XCircle className="w-4 h-4" /> Clear All Filters & Search
                    </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Projects List Section */}
          <section className="mt-10 sm:mt-16 bg-gradient-to-b from-transparent to-[#FFB578]/10 rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-slate-800 animate-fadeInUp" id="projects" style={{animationDelay: '0.3s'}}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 sm:mb-10 border-b pb-4 border-[#E65447]/40">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFB578]" />
                <h2 className="text-2xl sm:text-3xl font-black text-slate-200">
                  Featured Projects
                </h2>
              </div>
              {!loading && (
                <p className="font-semibold text-slate-400 text-sm sm:text-base whitespace-nowrap pt-2">
                  Showing {filteredRepositories.length} of {repositories.length} projects
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {loading ? (
                <>
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                  <LoadingSkeleton />
                </>
              ) : filteredRepositories.length > 0 ? (
                filteredRepositories.map((repo) => (
                  <RepositoryCard key={repo.githubId} repository={repo} onInsightClick={handleOpenModal} />
                ))
              ) : (
                <NoResults />
              )}
            </div>
          </section>
        </main>
        
        {/* Stats Section */}
        <section className="py-10 sm:py-20 px-4 sm:px-6 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
              {[
                { label: '10M+', desc: 'Projects', color: 'from-[#E65447] to-[#FF8559]' },
                { label: '50K+', desc: 'Active Repos', color: 'from-[#FFB578] to-[#FF8559]' },
                { label: '100+', desc: 'Languages', color: 'from-[#E65447] to-[#CF5376]' }
              ].map((stat, i) => (
                <div key={i} className="group relative w-full sm:w-auto">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#E65447] to-[#FFB578] opacity-0 group-hover:opacity-50 blur transition duration-300 rounded-2xl"></div>
                  <div className="relative text-center bg-slate-800 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl border-2 border-slate-700 hover:border-[#E65447] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-[0.98]">
                    <div className={`text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>{stat.label}</div>
                    <div className="text-sm text-slate-400 font-semibold mt-1">{stat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20" id="features">
          <div className="text-center mb-10 sm:mb-20 animate-fadeInUp" style={{animationDelay: '0.5s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Everything you need to find the perfect project
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative animate-fadeInUp" style={{animationDelay: `${0.6 + index * 0.05}s`}}>
                <div className={'absolute -inset-1 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500'} style={{backgroundColor: feature.color}}></div>
                <div className={`relative bg-slate-800 rounded-3xl p-8 sm:p-10 border-2 border-slate-700 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer active:scale-[0.98]`}>
                  <div className={'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg flex-shrink-0'} style={{backgroundColor: feature.color}}>
                    <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-200 mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-base flex-grow">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20 bg-gradient-to-b from-transparent to-[#E65447]/10 rounded-3xl" id="how-it-works">
          <div className="text-center mb-10 sm:mb-20 animate-fadeInUp" style={{animationDelay: '0.7s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
              Four simple steps to discover your next favorite project
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="group relative animate-fadeInUp" style={{animationDelay: `${0.8 + index * 0.1}s`}}>
                <div className={'absolute -inset-1 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500'} style={{backgroundColor: step.color}}></div>
                <div className={`relative bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-slate-700 h-full flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98]`}>
                  <div className='flex-grow flex flex-col items-center justify-center'>
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`} style={{backgroundColor: step.color}}>
                      <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-black text-[#E65447] mb-2 tracking-wider">STEP {index + 1}</div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-200 mb-3">{step.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20" id="about">
          <div className="text-center mb-10 sm:mb-16 animate-fadeInUp" style={{animationDelay: '0.9s'}}>
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8559] via-[#E65447] to-[#CF5376] mb-4">
              About OSS Discovery Engine
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto">
              Breaking down barriers in open-source exploration
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="group relative animate-fadeInUp" style={{animationDelay: '1.0s'}}>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E65447] to-[#FFB578] rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-slate-800 rounded-3xl p-8 sm:p-10 border-2 border-slate-700 hover:border-[#E65447] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98] h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#E65447] to-[#FF8559] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Target className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-200 mb-4">The Problem</h3>
                <p className="text-slate-400 leading-relaxed text-base sm:text-lg">
                  The open-source world is vast. With millions of repositories, finding one that matches your skills and interests can feel like searching for a needle in a digital haystack. Standard search often highlights only the largest projects, leaving countless innovative ones undiscovered.
                </p>
              </div>
            </div>
            <div className="group relative animate-fadeInUp" style={{animationDelay: '1.1s'}}>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#FFB578] to-[#FF8559] rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-slate-800 rounded-3xl p-8 sm:p-10 border-2 border-slate-700 hover:border-[#FF8559] shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 active:scale-[0.98] h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#FFB578] to-[#FF8559] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <Rocket className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-200 mb-4">Our Solution</h3>
                <p className="text-slate-400 leading-relaxed text-base sm:text-lg">
                  OSS Discovery Engine is our answer. We go beyond simple star counts, analyzing community health, recent activity, and developer-friendly signals to connect you with projects where you can truly make an impact. Find your next passion project with us.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 animate-fadeInUp" style={{animationDelay: '1.2s'}}>
         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="max-w-sm">
              <a href="#" className="inline-flex items-center justify-center md:justify-start gap-3 mb-4 text-white font-black text-xl hover:text-[#FF8559] transition-colors duration-300">
                <Github className="w-7 h-7 text-[#FF8559]" />
                <span>OSS Discovery</span>
              </a>
              <p className="leading-relaxed text-sm">Making open-source accessible and discoverable for every developer.</p>
            </div>
            
            <div className="flex-shrink-0">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                 {['Projects', 'Features', 'How It Works', 'About'].map(text => (
                    <li key={text}>
                        <a href={`#${text.toLowerCase().replace(/\s+/g, '-')}`} onClick={(e) => handleSmoothScroll(e, text.toLowerCase().replace(/\s+/g, '-'))} className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-semibold">
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
    <AIInsightModal isOpen={isModalOpen} onClose={handleCloseModal} repository={selectedRepo} />
    </>
  );
};

export default dashboard;

