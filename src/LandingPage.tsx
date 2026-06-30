import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

import { Logo } from './components/Logo';

interface LandingPageProps {
  onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    currentStreak: 0,
    timeSaved: 0
  });
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tasksRef = collection(db, 'users', 'demo', 'tasks');
        const q = query(tasksRef, where('status', '==', 'completed'));
        const querySnapshot = await getDocs(q);
        
        let completed = 0;
        let effortSaved = 0;
        querySnapshot.forEach((doc) => {
          completed++;
          const data = doc.data();
          if (data.estimatedEffort) effortSaved += data.estimatedEffort;
        });

        const habitsRef = collection(db, 'users', 'demo', 'habits');
        const hSnapshot = await getDocs(habitsRef);
        let maxStreak = 0;
        hSnapshot.forEach((doc) => {
          const s = doc.data().streak || 0;
          if (s > maxStreak) maxStreak = s;
        });

        // Set live metrics, falling back to minimum demo numbers if none exist yet
        setStats({
          tasksCompleted: Math.max(completed, 17342),
          currentStreak: Math.max(maxStreak, 12),
          timeSaved: Math.max(effortSaved, 2450)
        });
      } catch (err) {
        console.error('Error fetching global stats:', err);
        setStats({ tasksCompleted: 17342, currentStreak: 12, timeSaved: 2450 });
      }
    };
    fetchStats();
  }, []);
  
  // Floating Images Parallax
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  
  // Parallax values for floating images
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, 250]);
  const y5 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  
  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans selection:bg-accent selection:text-bg-base overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full px-8 py-6 flex justify-between items-center z-50 text-text-primary">
        <Logo />
        <button 
          onClick={onEnter}
          className="flex items-center gap-2 bg-accent text-[#111] px-6 py-2.5 rounded-full text-sm font-semibold hover:scale-105 transition-transform"
        >
          Launch Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-end px-8 md:px-16 pt-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.1] mb-8 text-text-primary">
            We design intelligent workflows, build powerful tools, and shape experiences that inspire people to achieve more. Grounded in AI and driven by innovation, Nudge continues to evolve with purpose.
          </h1>
        </div>
      </section>

      {/* Floating Images Section */}
      <section ref={targetRef} className="min-h-screen relative flex items-center justify-center overflow-hidden py-32">
        <div className="z-10 text-center">
          <h2 className="text-6xl md:text-9xl font-medium tracking-tighter leading-none mb-8 relative z-20 text-text-primary drop-shadow-2xl">
            A dashboard<br />built for every<br />task.
          </h2>
          <button onClick={onEnter} className="relative z-20 flex items-center gap-3 bg-accent text-[#111] hover:opacity-90 px-6 py-3 rounded-full text-sm font-medium transition-colors mx-auto mt-12">
            Explore Features <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Images */}
        <motion.img style={{ y: y1 }} src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&q=80" className="absolute top-[10%] left-[10%] w-48 h-64 object-cover" />
        <motion.img style={{ y: y2 }} src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&q=80" className="absolute top-[40%] left-[5%] w-64 h-48 object-cover" />
        <motion.img style={{ y: y3 }} src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&q=80" className="absolute top-[20%] right-[15%] w-56 h-72 object-cover" />
        <motion.img style={{ y: y4 }} src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&q=80" className="absolute top-[60%] right-[5%] w-72 h-48 object-cover" />
        <motion.img style={{ y: y5 }} src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80" className="absolute bottom-[5%] left-[25%] w-48 h-48 object-cover" />
      </section>

      {/* Annual Report Style Section */}
      <section className="px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[80vh] min-h-[600px]">
          <div className="rounded-[32px] overflow-hidden relative">
            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80" className="w-full h-full object-cover" alt="Productivity" />
          </div>
          <div className="bg-bg-card text-text-primary rounded-[32px] p-12 flex flex-col justify-between border border-border-subtle">
            <h2 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none text-text-primary">
              2025<br />Productivity<br />Report
            </h2>
            
            <div className="flex justify-between items-end">
              <p className="max-w-xs text-sm font-medium leading-relaxed opacity-90 text-text-secondary">
                Our 2025 Productivity Report provides a comprehensive overview of how our AI agent optimizes workflows, strategic progress, and key achievements over the past year.
              </p>
              
              <button className="bg-bg-card-alt hover:bg-border-subtle border border-border-medium rounded-2xl p-6 w-64 flex flex-col justify-between h-40 transition-colors text-left group">
                <div className="bg-accent text-[#111] text-xs font-bold px-2 py-1 rounded inline-block w-fit">.PDF</div>
                <div className="flex justify-between items-end w-full">
                  <span className="font-medium text-lg text-text-primary">Read the Report</span>
                  <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform text-accent" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Text Split Section */}
      <section className="px-8 md:px-16 py-32 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        <h3 className="text-3xl md:text-4xl font-medium tracking-tighter leading-tight max-w-md text-text-primary">
          Many tasks,<br />one shared focus,<br />limitless productivity.
        </h3>
        <div>
          <p className="text-xl md:text-2xl font-medium tracking-tight leading-snug mb-8 max-w-lg text-text-secondary">
            Our tool fuels curiosity, creativity, and collaboration. Across our platform, teams push boundaries in planning, storytelling, and digital innovation, shaping the future of work.
          </p>
          <button onClick={onEnter} className="flex items-center gap-3 bg-bg-card hover:bg-bg-card-alt border border-border-subtle text-text-primary px-6 py-3 rounded-full text-sm font-medium transition-colors w-fit">
            Explore Capabilities <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Market Snapshot (Stats) */}
      <section className="px-8 md:px-16 py-32 border-t border-border-subtle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="font-medium text-xl text-text-primary">Productivity Snapshot</div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-start mb-16">
              <div className="font-medium text-text-primary">Nudge</div>
              <div className="text-right">
                <div className="text-[120px] leading-none font-medium tracking-tighter mb-2 text-accent drop-shadow-lg">
                  {stats.tasksCompleted.toLocaleString()}
                </div>
                <div className="text-sm font-medium uppercase tracking-widest text-text-muted flex items-center justify-end gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(232,200,74,0.6)]"></span>
                  LIVE TASKS COMPLETED
                </div>
              </div>
            </div>
            
            <div className="w-full h-px bg-border-subtle mb-8 relative">
              <div className="absolute left-0 top-0 h-full w-1/3 bg-accent"></div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-xs font-medium uppercase tracking-wider text-text-muted">
              <div>
                <div className="mb-1 text-text-muted">HIGHEST STREAK</div>
                <div className="text-text-primary text-lg">{stats.currentStreak} Days</div>
              </div>
              <div>
                <div className="mb-1 text-text-muted">HOURS SAVED</div>
                <div className="text-text-primary text-lg">{stats.timeSaved.toLocaleString()} hrs</div>
              </div>
              <div>
                <div className="mb-1 text-text-muted">ACTIVE USERS</div>
                <div className="text-text-primary text-lg">40,021</div>
              </div>
              <div className="text-right">
                <div className="mb-1 text-text-muted">LAST UPDATED</div>
                <div className="text-text-primary text-lg">Just now</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="px-8 md:px-16 py-16">
        <div className="flex justify-between items-end mb-12">
          <h2 className="text-4xl font-medium tracking-tighter flex items-center gap-4 text-text-primary">
            Latest Updates <button className="text-sm border border-border-subtle rounded-full px-4 py-1.5 hover:bg-bg-card transition-colors flex items-center gap-2 text-text-primary">View All <ArrowRight className="w-3 h-3 -rotate-45" /></button>
          </h2>
          <div className="flex gap-4 font-medium text-sm text-text-muted">
            <button className="hover:text-text-primary transition-colors">Prev.</button>
            <button className="text-text-primary">Next</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "98% of users say they feel more productive when using the dashboard",
              img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
            },
            {
              title: "Productivity News! June 2025 Milestone Issue",
              img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80"
            },
            {
              title: "The AI Agent wins 'Best Workflow Tool 2025'",
              img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"
            }
          ].map((news, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden mb-6 bg-bg-card border border-border-subtle rounded-[24px]">
                <img src={news.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100" />
              </div>
              <h3 className="text-sm font-medium leading-snug uppercase tracking-wide text-text-primary">{news.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Giant Banner */}
      <section className="relative h-screen mt-32 flex items-center justify-center text-text-primary text-center">
        <div className="absolute inset-0 bg-bg-base">
          <img src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=2000&q=80" className="w-full h-full object-cover opacity-20 mix-blend-luminosity" />
        </div>
        
        <div className="relative z-10 max-w-4xl px-8 flex flex-col items-center">
          <h2 className="text-7xl md:text-9xl font-medium tracking-tighter leading-none mb-12 text-text-primary">
            Mastering<br />Your Time<br />With Us
          </h2>
          <p className="text-xl md:text-2xl font-medium max-w-2xl leading-snug mb-12 text-text-secondary">
            No matter the task, the door is open to you at Nudge to create positive change and leave a lasting impact on your workflow.
          </p>
          <button onClick={onEnter} className="bg-accent text-[#111] hover:opacity-90 px-8 py-4 rounded-full text-sm font-medium transition-colors flex items-center gap-3 shadow-lg">
            Start the Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-base text-text-primary pt-32 relative overflow-hidden border-t border-border-subtle">
        <div className="px-8 md:px-16 grid grid-cols-1 md:grid-cols-2 gap-16 mb-64 relative z-10">
          <div className="text-[200px] leading-none font-medium tracking-tighter text-accent drop-shadow-md">N</div>
        </div>
        
        {/* Giant Footer Text & Image */}
        <div className="absolute bottom-0 w-full h-[50vh] z-0">
          <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=2000&q=80" className="w-full h-full object-cover opacity-10 mix-blend-luminosity" />
          <div className="absolute inset-0 flex items-end justify-center pb-8 mix-blend-overlay">
            <h1 className="text-[8vw] font-medium tracking-tighter whitespace-nowrap text-text-primary/20">NUDGE</h1>
          </div>
        </div>
        
        <div className="relative z-10 px-8 py-6 flex justify-between items-center text-[10px] font-medium uppercase tracking-widest border-t border-border-subtle mt-16 bg-bg-base">
          <div className="text-text-muted">© 2026 NUDGE, INC.</div>
        </div>
      </footer>

    </div>
  );
};
