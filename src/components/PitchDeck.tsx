import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  BanknotesIcon,
  CubeIcon,
  ListBulletIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  SearchIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowTrendUpIcon,
  CircleStackIcon,
  ArrowPathIcon
} from './icons';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const SLIDES = [
  {
    id: "intro",
    title: "CheckMate",
    subtitle: "Enterprise-Grade Check Digitization & AI-Driven Insights",
    description: "Modernizing institutional check workflows with real-time collaboration and intelligent extraction. Designed for high-volume compliance and absolute accuracy.",
    icon: <CheckCircleIcon className="w-16 h-16 text-sky-500" />,
    image: "marketing/collaboration.png",
    accent: "bg-sky-500"
  },
  {
    id: "efficiency",
    title: "Operational Efficiency",
    subtitle: "Eliminating the Manual Bottleneck",
    description: "Manual check entry is the primary efficiency leak in branch operations. CheckMate automates the heavy lifting, saving thousands of hours per year.",
    chart: {
      type: 'bar',
      data: {
        labels: ['Manual Entry', 'Competitor (OCR)', 'CheckMate (AI)'],
        datasets: [
          {
            label: 'Hours per Week (Full-Time Employee)',
            data: [12.5, 4.2, 0.8],
            backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(14, 165, 233, 0.7)'],
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Avg. Weekly Time spent per Branch Employee', color: '#94a3b8' }
        },
        scales: {
          y: {
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' },
            title: { display: true, text: 'Hours per Week', color: '#94a3b8' }
          },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    },
    icon: <ChartBarIcon className="w-16 h-16 text-amber-500" />,
    accent: "bg-amber-500"
  },
  {
    id: "ai",
    title: "Intelligent Ingestion",
    subtitle: "Precision Extraction at Scale",
    description: "Utilizing a custom AI model specifically trained on physical check variations, combined with Tesseract OCR and OpenCV for flawless orientation and field identification.",
    image: "marketing/ai_extraction.png",
    icon: <CubeIcon className="w-16 h-16 text-indigo-500" />,
    accent: "bg-indigo-500"
  },
  {
    id: "accuracy",
    title: "Risk Mitigation",
    subtitle: "Unmatched Accuracy Standards",
    description: "Manual entry error rates average 12%. CheckMate's multi-pass AI verification virtually eliminates data entry risk for high-value transactions.",
    chart: {
      type: 'bar',
      data: {
        labels: ['Human Errors', 'AI Detections', 'Residual Risk'],
        datasets: [
          {
            label: 'Errors per 10,000 Checks',
            data: [1200, 1180, 20],
            backgroundColor: ['#ef4444', '#0ea5e9', '#f59e0b'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Errors Prevented per 10k Checks', color: '#94a3b8' }
        },
        scales: {
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    },
    icon: <ShieldCheckIcon className="w-16 h-16 text-emerald-500" />,
    accent: "bg-emerald-500"
  },
  {
    id: "dashboard",
    title: "Transparent Management",
    subtitle: "Real-Time Centralized Dashboard",
    description: "The Command Center provides instant visibility into every check's status across the entire enterprise. Drag-and-drop simplicity meets powerful status orchestration.",
    image: "screenshots/kanban_board_filled.png",
    icon: <ListBulletIcon className="w-16 h-16 text-sky-400" />,
    accent: "bg-sky-400"
  },
  {
    id: "collaboration",
    title: "Deep Visibility",
    subtitle: "Granular Detail & Transparency",
    description: "Every check includes a complete audit log, real-time comments, and high-resolution image preservation. Resolve discrepancies in seconds, not hours.",
    image: "screenshots/check_details.png",
    icon: <UserGroupIcon className="w-16 h-16 text-cyan-500" />,
    accent: "bg-cyan-500"
  },
  {
    id: "scalability",
    title: "Unlimited Capacity",
    subtitle: "Built for Enterprise Demand",
    description: "Our serverless infrastructure is engineered to meet any volume. Performance remains stable whether you are processing a single branch or a global operation.",
    chart: {
      type: 'line',
      data: {
        labels: ['1k', '10k', '50k', '100k', '500k'],
        datasets: [
          {
            label: 'Avg Processing Time (ms)',
            data: [320, 318, 322, 319, 321],
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            tension: 0,
            borderWidth: 4,
            pointRadius: 6,
            pointBackgroundColor: '#f43f5e'
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Enterprise Load Stability', color: '#94a3b8' }
        },
        scales: {
          y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' }, title: { display: true, text: 'Latency (ms)', color: '#94a3b8' }, min: 300, max: 350 },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    },
    icon: <ArrowTrendUpIcon className="w-16 h-16 text-rose-500" />,
    accent: "bg-rose-500"
  },
  {
    id: "batch_export",
    title: "Legacy Integration",
    subtitle: "Bridging the Gap",
    description: "Generate structured batches and export clean, formatted Excel reports that plug directly into existing accounting systems.",
    dualImage: [
      { src: "screenshots/batch_history.png", label: "Batch Management" },
      { src: "screenshots/legacy_excel.png", label: "Legacy Excel Export" }
    ],
    icon: <CircleStackIcon className="w-16 h-16 text-slate-400" />,
    accent: "bg-slate-500"
  },
  {
    id: "future",
    title: "Future-Ready",
    subtitle: "Automating the AR Lifecycle",
    description: "Built with an extensible API-first architecture, CheckMate aims to fully automate the Accounts Receivable process, integrating directly with core banking systems.",
    icon: <ArrowPathIcon className="w-16 h-16 text-purple-500" />,
    accent: "bg-purple-500"
  },
  {
    id: "conclusion",
    title: "Conclusion",
    subtitle: "Modernize Your Fiscal Operations",
    description: "CheckMate transforms physical check handling into a digital-first, collaborative asset. Ready to streamline your branch workflows?",
    image: "marketing/growth.png",
    list: [
      "Standardized compliance across all departments",
      "Significant reduction in manual labor costs",
      "Unified visibility and accountability",
      "Secure, long-term digital record preservation"
    ],
    icon: <CheckCircleIcon className="w-16 h-16 text-sky-600" />,
    accent: "bg-sky-600"
  }
];

const AnimatedImageStack: React.FC<{ images: { src: string, label: string }[], accent: string }> = ({ images, accent }) => {
  const [frontIdx, setFrontIdx] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const swap = React.useCallback(() => {
    setIsSwapping(true);
    setTimeout(() => {
      setFrontIdx(prev => (prev === 0 ? 1 : 0));
      setIsSwapping(false);
    }, 700);
  }, []);

  React.useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      swap();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, swap]);

  const handleManualSwap = () => {
    setIsAutoPlaying(false);
    swap();
  };

  const backIdx = frontIdx === 0 ? 1 : 0;

  return (
    <div className="relative w-full max-w-lg aspect-video mt-10">
      <style>{`
        @keyframes front-to-back {
          0% { transform: translate(0, 0); z-index: 30; }
          45% { transform: translate(0, -120%); z-index: 30; }
          50% { z-index: 10; }
          100% { transform: translate(40px, 40px); z-index: 10; }
        }
        @keyframes back-to-front {
          0% { transform: translate(40px, 40px); z-index: 10; }
          45% { transform: translate(80px, 120%); z-index: 10; }
          50% { z-index: 30; }
          100% { transform: translate(0, 0); z-index: 30; }
        }
        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .stack-card-anim-front {
          animation: front-to-back 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .stack-card-anim-back {
          animation: back-to-front 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* BACK Image - Initially offset down/right */}
      <div
        onClick={handleManualSwap}
        className={`absolute inset-0 transition-all duration-300 cursor-pointer 
          ${isSwapping ? 'stack-card-anim-back' : 'translate-x-10 translate-y-10 z-10 opacity-60'}
        `}
      >
        <div className="relative rounded-3xl overflow-hidden border border-slate-700/50 shadow-xl bg-slate-800/80 backdrop-blur-sm h-full">
          <img
            src={`/${images[backIdx].src}`}
            alt={images[backIdx].label}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x450/1e293b/FFFFFF?text=${encodeURIComponent(images[backIdx].label)}`; }}
          />
          <div className="absolute inset-x-0 bottom-0 p-3 bg-slate-900/80 backdrop-blur-md border-t border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-center text-slate-400">{images[backIdx].label}</p>
          </div>
        </div>
      </div>

      {/* FRONT Image - Initially top/left */}
      <div
        className={`absolute inset-0 transition-all duration-300 
          ${isSwapping ? 'stack-card-anim-front' : 'translate-x-0 translate-y-0 z-20 opacity-100'}
        `}
      >
        <div className="relative rounded-3xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950/40 backdrop-blur-md h-full">
          <img
            src={`/${images[frontIdx].src}`}
            alt={images[frontIdx].label}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x450/1e293b/FFFFFF?text=${encodeURIComponent(images[frontIdx].label)}`; }}
          />
          <div className={`absolute inset-x-0 bottom-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-700`}>
            <p className={`text-xs font-bold uppercase tracking-[0.3em] text-center ${accent.replace('bg-', 'text-')}`}>{images[frontIdx].label}</p>
          </div>
        </div>
      </div>

      {isAutoPlaying && (
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500/50"
              style={{ animation: 'progress-bar 5s linear infinite' }} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto-Cycle</span>
        </div>
      )}
    </div>
  );
};

const ChartRenderer: React.FC<{ slide: any }> = ({ slide }) => {
  if (!slide.chart) return null;

  switch (slide.chart.type) {
    case 'bar':
      return <Bar data={slide.chart.data} options={slide.chart.options} />;
    case 'doughnut':
      return <Doughnut data={slide.chart.data} options={slide.chart.options} />;
    case 'line':
      return <Line data={slide.chart.data} options={slide.chart.options} />;
    default:
      return null;
  }
};

const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg ${slide.accent} flex items-center justify-center transition-colors duration-500 shadow-lg shadow-white/5`}>
            <CheckCircleIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CheckMate <span className="text-slate-500 font-normal">Enterprise Pitch</span></span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="p-1.5 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          title="Exit Presentation"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Main Slide Content */}
      <div className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        {/* Dynamic Background glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full ${slide.accent} opacity-[0.06] blur-[150px] transition-all duration-1000`} />

        <div key={currentSlide} className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">

          {/* Text Side */}
          <div className="space-y-8 lg:space-y-10">
            <div className="space-y-6 lg:space-y-8">
              <div className="flex items-center gap-6 lg:gap-8">
                <div className={`p-5 lg:p-6 rounded-[2rem] lg:rounded-[2.5rem] bg-slate-800/80 border border-slate-700 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-700 hover:scale-105`}>
                  {React.cloneElement(slide.icon as React.ReactElement, { className: "w-12 h-12 lg:w-16 lg:h-16" })}
                </div>
                <div className="space-y-2 lg:space-y-3">
                  <h3 className={`text-xs lg:text-sm font-bold uppercase tracking-[0.3em] opacity-40`}>{slide.title}</h3>
                  <h2 className="text-4xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">{slide.subtitle}</h2>
                </div>
              </div>
              <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed font-light max-w-2xl">
                {slide.description}
              </p>
            </div>

            {slide.list && (
              <ul className="space-y-4 lg:space-y-5">
                {slide.list.map((item, id) => (
                  <li key={id} className="flex items-center gap-4 group">
                    <div className={`w-2.5 h-2.5 rounded-full ${slide.accent} group-hover:scale-125 transition-transform duration-300`} />
                    <span className="text-lg lg:text-xl text-slate-100 font-medium tracking-tight">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {currentSlide === 0 && (
              <button
                onClick={nextSlide}
                className={`py-5 px-10 rounded-[2rem] ${slide.accent} hover:brightness-110 active:scale-95 transition-all font-bold text-xl flex items-center gap-4 shadow-2xl shadow-sky-500/20 group`}
              >
                Launch Presentation <ChevronRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {/* Visualization Side */}
          <div className="relative h-full flex items-center justify-center">
            {slide.dualImage ? (
              <AnimatedImageStack images={slide.dualImage} accent={slide.accent} />
            ) : slide.image ? (
              <div className="relative group w-full">
                <div className="absolute -inset-10 bg-gradient-to-tr from-white/10 to-transparent rounded-[3rem] blur-3xl opacity-10" />
                <div className="relative rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden border border-slate-700/50 shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)] bg-slate-950/40 flex items-center justify-center transition-all duration-1000">
                  <img
                    src={`/${slide.image}`}
                    alt={slide.title}
                    className="w-full h-auto max-h-[60vh] object-contain shadow-inner"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/1200x900/1e293b/FFFFFF?text=${encodeURIComponent(slide.title)}`;
                    }}
                  />
                </div>
              </div>
            ) : slide.chart ? (
              <div className="w-full max-w-xl mx-auto p-10 lg:p-12 rounded-[2.5rem] lg:rounded-[3.5rem] bg-slate-800/40 border border-slate-700/50 shadow-2xl backdrop-blur-sm animate-in zoom-in-95 duration-700">
                <ChartRenderer slide={slide} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 lg:gap-8 w-full">
                {[BanknotesIcon, SearchIcon, UserGroupIcon, ClipboardDocumentIcon].map((Icon, i) => (
                  <div key={i} className="h-44 lg:h-56 rounded-[2.5rem] lg:rounded-[3rem] bg-slate-800/40 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700/60 transition-all duration-500 group">
                    <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-[1.5rem] lg:rounded-[2rem] ${slide.accent}/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-8 h-8 lg:w-10 lg:h-10 text-white opacity-40`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Progress Bar - COMPACT */}
      <div className="px-10 py-6 lg:py-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex gap-4">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-700 ${idx === currentSlide ? `w-20 ${slide.accent}` : 'w-4 bg-slate-700 hover:bg-slate-600'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-6 lg:gap-10">
          <div className="text-slate-500 font-mono text-base lg:text-lg tracking-[0.3em] mr-2 opacity-50">
            {String(currentSlide + 1).padStart(2, '0')} — {String(SLIDES.length).padStart(2, '0')}
          </div>
          <button
            disabled={currentSlide === 0}
            onClick={prevSlide}
            className="flex items-center gap-2 p-3 px-6 rounded-2xl hover:bg-slate-800 disabled:opacity-10 transition-all font-bold border border-slate-800 hover:border-slate-700 text-slate-300 text-base"
          >
            <ChevronLeftIcon className="w-5 h-5" /> Previous
          </button>
          <button
            onClick={currentSlide === SLIDES.length - 1 ? () => navigate('/') : nextSlide}
            className={`flex items-center gap-2 p-3 px-8 rounded-2xl ${slide.accent} hover:brightness-110 active:scale-95 transition-all font-bold shadow-xl shadow-${slide.accent.split('-')[1]}-500/20 text-base`}
          >
            {currentSlide === SLIDES.length - 1 ? 'Complete' : 'Next Insight'} <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PitchDeck;
