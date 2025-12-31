
import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Types & Interfaces ---
interface RankTier {
  name: string;
  min: number;
  gradient: string;
  icon: string;
  color: string;
}

interface ActiveBoost {
  id: string;
  endTime: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  rank: RankTier;
  isUser?: boolean;
  timestamp: number;
  clanIdToJoin?: string; 
}

interface Quest {
  id: string;
  desc: string;
  target: number;
  current: number;
  reward: number;
  type: 'clicks' | 'clan_points' | 'chat' | 'lab';
  claimed: boolean;
}

interface ClanMember {
  id: string;
  name: string;
  roleId: string;
  rank: RankTier;
  isBot?: boolean;
}

interface Player {
  name: string;
  points: number;
  rank: RankTier;
  isUser?: boolean;
}

interface ClanRole {
  id: string;
  name: string;
  permissions: ('withdraw' | 'manage_roles' | 'manage_channels' | 'kick')[];
}

interface Clan {
  id: string;
  name: string;
  ownerId: string;
  balance: number; 
  clanPoints: number; 
  members: ClanMember[];
  roles: ClanRole[];
  channels: { id: string; name: string; messages: ChatMessage[] }[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  val: number;
  type: 'float' | 'spark' | 'crit';
  angle?: number;
}

// --- Constants ---
const RANK_TIERS: RankTier[] = [
  { name: "Novice", min: 0, gradient: "from-slate-400 to-slate-200", icon: "fa-seedling", color: "slate" },
  { name: "Classic", min: 100, gradient: "from-emerald-500 to-teal-300", icon: "fa-shield-heart", color: "emerald" },
  { name: "Warrior", min: 500, gradient: "from-blue-600 to-indigo-400", icon: "fa-khanda", color: "blue" },
  { name: "King", min: 1500, gradient: "from-amber-500 to-yellow-300", icon: "fa-crown", color: "amber" },
  { name: "Emperor", min: 4500, gradient: "from-rose-600 to-orange-400", icon: "fa-gem", color: "rose" },
  { name: "God", min: 15000, gradient: "from-violet-600 to-purple-400", icon: "fa-bolt-lightning", color: "violet" },
  { name: "Immortal", min: 50000, gradient: "from-cyan-600 to-blue-300", icon: "fa-dna", color: "cyan" },
  { name: "Celestial", min: 150000, gradient: "from-fuchsia-600 to-pink-300", icon: "fa-star-and-crescent", color: "fuchsia" },
  { name: "Eternal", min: 500000, gradient: "from-orange-600 to-yellow-400", icon: "fa-infinity", color: "orange" },
  { name: "Void", min: 1000000, gradient: "from-black via-slate-900 to-slate-800", icon: "fa-eye", color: "black" },
  { name: "Singularity", min: 5000000, gradient: "from-indigo-900 via-purple-900 to-black", icon: "fa-vortex", color: "indigo" },
  { name: "Multiverse", min: 25000000, gradient: "from-rose-500 via-purple-500 to-indigo-500", icon: "fa-layer-group", color: "rose" },
  { name: "Omnipotent", min: 100000000, gradient: "from-yellow-200 via-yellow-400 to-yellow-600", icon: "fa-sun", color: "yellow" },
];

const AVATARS = [
  { icon: "fa-user-ninja", bg: "bg-red-500" },
  { icon: "fa-user-astronaut", bg: "bg-blue-500" },
  { icon: "fa-user-secret", bg: "bg-slate-700" },
  { icon: "fa-robot", bg: "bg-indigo-500" },
  { icon: "fa-ghost", bg: "bg-purple-500" },
  { icon: "fa-dragon", bg: "bg-emerald-500" },
  { icon: "fa-bolt", bg: "bg-amber-500" },
  { icon: "fa-cat", bg: "bg-rose-500" },
  { icon: "fa-skull", bg: "bg-black" },
  { icon: "fa-jedi", bg: "bg-blue-600" },
  { icon: "fa-spider", bg: "bg-red-600" },
];

const MOCK_NAMES = ["VoidRunner", "BitHunter", "CodeWraith", "NeoClick", "ZeroSum", "FluxGate", "ZenTap", "NeonSoul", "PixelMage", "DataGhost"];
const MOCK_CHATS = ["Just hit King tier!", "Who wants to join my clan?", "Gamble terminal is hot right now.", "Barium boost is insane.", "Looking for active members.", "250 coins for 1 point is a fair trade.", "Clan wars when?", "System efficiency looks good today.", "Just lost 1k in the spin... pain.", "Who is the admin here?"];
const REPLY_POOL = ["Nice job!", "I agree.", "Wait, really?", "LMAO", "Good luck with that.", "Check the lab, the boosts are worth it.", "Let's gooo!", "Anyone want to trade?", "I'm almost at Emperor rank."];
const BOT_CLAN_MESSAGES = ["Deposited some units.", "Clan points growing fast.", "Hello team.", "Let's reach the next tier.", "Anyone active?"];

const DEFAULT_CLAN_ROLES: ClanRole[] = [
  { id: 'owner', name: 'Commander', permissions: ['withdraw', 'manage_roles', 'manage_channels', 'kick'] },
  { id: 'admin', name: 'Officer', permissions: ['withdraw', 'manage_channels'] },
  { id: 'member', name: 'Agent', permissions: [] },
];

const RankBadge: React.FC<{ rank: RankTier; small?: boolean }> = ({ rank, small }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r ${rank.gradient} text-slate-900 font-black uppercase leading-none shadow-sm ${small ? 'text-[7px]' : 'text-[9px]'}`}>
    <i className={`fa-solid ${rank.icon} ${small ? 'text-[8px]' : 'text-[10px]'}`}></i>
    <span className="truncate">{rank.name}</span>
  </span>
);

const App: React.FC = () => {
  // --- Persisted State ---
  const [points, setPoints] = useState<number>(() => Number(localStorage.getItem('ugh_points')) || 0);
  const [vaultPoints, setVaultPoints] = useState<number>(() => Number(localStorage.getItem('ugh_vault')) || 0);
  const [totalClicks, setTotalClicks] = useState<number>(() => Number(localStorage.getItem('ugh_total_clicks')) || 0);
  const [prestigeLevel, setPrestigeLevel] = useState<number>(() => Number(localStorage.getItem('ugh_prestige')) || 0);
  const [avatarIdx, setAvatarIdx] = useState<number>(() => Number(localStorage.getItem('ugh_avatar')) || 0);
  const [userName, setUserName] = useState(() => localStorage.getItem('ugh_username') || 'PLAYER');
  const [email, setEmail] = useState(() => localStorage.getItem('ugh_email') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('ugh_isLoggedIn') === 'true');
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>(() => JSON.parse(localStorage.getItem('ugh_boosts') || '[]'));
  const [clans, setClans] = useState<Clan[]>(() => JSON.parse(localStorage.getItem('ugh_clans') || '[]'));
  const [userClanId, setUserClanId] = useState<string | null>(() => localStorage.getItem('ugh_user_clan_id'));
  const [usedCodes, setUsedCodes] = useState<string[]>(() => JSON.parse(localStorage.getItem('ugh_used_codes') || '[]'));
  const [banList, setBanList] = useState<string[]>(() => JSON.parse(localStorage.getItem('ugh_banlist') || '[]'));
  const [quests, setQuests] = useState<Quest[]>(() => {
    try {
      const saved = localStorage.getItem('ugh_quests');
      if (saved && saved !== '[]' && saved !== 'null') return JSON.parse(saved);
    } catch(e) {}
    return [
      { id: 'q1', desc: 'Click Grinder: 500 Clicks', target: 500, current: 0, reward: 1000, type: 'clicks', claimed: false },
      { id: 'q2', desc: 'Clan Contributor: 10 Clan Points', target: 10, current: 0, reward: 2000, type: 'clan_points', claimed: false },
      { id: 'q3', desc: 'Socialite: 15 Messages', target: 15, current: 0, reward: 500, type: 'chat', claimed: false },
      { id: 'q4', desc: 'Researcher: Use 5 Lab Boosts', target: 5, current: 0, reward: 3000, type: 'lab', claimed: false },
    ];
  });
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('ugh_isAdmin') === 'true');

  // --- Volatile State ---
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gambleAmount, setGambleAmount] = useState('100');
  const [gambleStatus, setGambleStatus] = useState<'idle' | 'charging' | 'success' | 'jackpot' | 'failed' | 'glitch' | 'void' | 'shielded'>('idle');
  const [activeClanTab, setActiveClanTab] = useState<'chat' | 'bank' | 'manage'>('chat');
  const [leaderboardTab, setLeaderboardTab] = useState<'players' | 'clans'>('players');
  const [news, setNews] = useState("System online. Establish credentials.");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [codeBuffer, setCodeBuffer] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  
  // Admin inputs
  const [injectValue, setInjectValue] = useState('');
  const [banTarget, setBanTarget] = useState('');

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const clanChatScrollRef = useRef<HTMLDivElement>(null);

  // --- Derived State ---
  const currentRank = useMemo(() => [...RANK_TIERS].reverse().find(t => points >= t.min) || RANK_TIERS[0], [points]);
  const isBanned = useMemo(() => banList.includes(userName.toUpperCase()) || banList.includes(email.toUpperCase()), [banList, userName, email]);
  const nextRank = useMemo(() => RANK_TIERS[RANK_TIERS.indexOf(currentRank) + 1] || null, [currentRank]);
  const tierProgress = useMemo(() => {
    if (!nextRank) return 100;
    const range = nextRank.min - currentRank.min;
    const current = points - currentRank.min;
    return Math.min(100, (current / range) * 100);
  }, [points, currentRank, nextRank]);

  const myClan = useMemo(() => clans.find(c => c.id === userClanId), [clans, userClanId]);
  const clickPower = useMemo(() => {
    let multiplier = 1;
    if (activeBoosts.find(b => b.id === 'radium' && b.endTime > currentTime)) multiplier *= 2;
    return Math.floor((1 + prestigeLevel * 2) * multiplier);
  }, [prestigeLevel, activeBoosts, currentTime]);

  const sortedClans = useMemo(() => [...clans].sort((a, b) => b.clanPoints - a.clanPoints), [clans]);
  const sortedPlayers = useMemo<Player[]>(() => {
    // Generate mock players in the range 1.5k to 5k as requested
    const mocks = MOCK_NAMES.map(n => {
        const p = Math.floor(Math.random() * (5000 - 1500 + 1)) + 1500;
        return { 
          name: n, 
          points: p, 
          rank: [...RANK_TIERS].reverse().find(t => p >= t.min) || RANK_TIERS[0] 
        };
    });
    return [
      { name: userName, points, isUser: true, rank: currentRank },
      ...mocks
    ].sort((a, b) => b.points - a.points);
  }, [points, userName, currentRank]);

  // --- Effects ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      setActiveBoosts(prev => prev.filter(b => b.endTime > now));
      
      if (!isBanned) {
        let autoRate = 0;
        if (activeBoosts.find(b => b.id === 'barium' && b.endTime > now)) autoRate += 5;
        if (activeBoosts.find(b => b.id === 'plutonium' && b.endTime > now)) autoRate += 15;
        if (activeBoosts.find(b => b.id === 'antimatter' && b.endTime > now)) autoRate += 100;
        if (autoRate > 0) setPoints(p => p + autoRate);
      }

      // Bot Clan Contributions and Chat
      setClans(prevClans => prevClans.map(c => {
        const botMembers = c.members.filter(m => m.isBot);
        let updatedClan = { ...c };
        if (botMembers.length > 0) {
          if (Math.random() < 0.15) {
            let contribution = 50;
            const addedCoins = botMembers.length * contribution;
            updatedClan.balance += addedCoins;
            updatedClan.clanPoints = Math.floor(updatedClan.balance / 250);
          }
          if (Math.random() < 0.08) {
            const bot = botMembers[Math.floor(Math.random() * botMembers.length)];
            const text = BOT_CLAN_MESSAGES[Math.floor(Math.random() * BOT_CLAN_MESSAGES.length)];
            const msg: ChatMessage = { id: now.toString() + bot.name, sender: bot.name, text, rank: bot.rank, timestamp: now };
            const ch = updatedClan.channels[0];
            updatedClan.channels = [{ ...ch, messages: [...ch.messages.slice(-49), msg] }];
          }
        }
        return updatedClan;
      }));

      // Frequent Global Chat Bots
      if (Math.random() < 0.06) {
        const botName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
        const botPoints = Math.floor(Math.random() * 5000000);
        const botRank = [...RANK_TIERS].reverse().find(t => botPoints >= t.min) || RANK_TIERS[0];
        
        const lastMsg = chatMessages[chatMessages.length - 1];
        const isReply = lastMsg && lastMsg.isUser && Math.random() < 0.4;
        const text = isReply ? REPLY_POOL[Math.floor(Math.random() * REPLY_POOL.length)] : MOCK_CHATS[Math.floor(Math.random() * MOCK_CHATS.length)];
        
        setChatMessages(prev => [...prev.slice(-49), { id: now.toString(), sender: botName, text, rank: botRank, timestamp: now }]);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBoosts, chatMessages, isBanned]);

  useEffect(() => {
    localStorage.setItem('ugh_points', points.toString());
    localStorage.setItem('ugh_vault', vaultPoints.toString());
    localStorage.setItem('ugh_total_clicks', totalClicks.toString());
    localStorage.setItem('ugh_prestige', prestigeLevel.toString());
    localStorage.setItem('ugh_avatar', avatarIdx.toString());
    localStorage.setItem('ugh_username', userName);
    localStorage.setItem('ugh_email', email);
    localStorage.setItem('ugh_isLoggedIn', isLoggedIn.toString());
    localStorage.setItem('ugh_boosts', JSON.stringify(activeBoosts));
    localStorage.setItem('ugh_clans', JSON.stringify(clans));
    localStorage.setItem('ugh_user_clan_id', userClanId || '');
    localStorage.setItem('ugh_quests', JSON.stringify(quests));
    localStorage.setItem('ugh_isAdmin', isAdmin.toString());
    localStorage.setItem('ugh_used_codes', JSON.stringify(usedCodes));
    localStorage.setItem('ugh_banlist', JSON.stringify(banList));
  }, [points, vaultPoints, totalClicks, prestigeLevel, avatarIdx, userName, email, isLoggedIn, activeBoosts, clans, userClanId, quests, isAdmin, usedCodes, banList]);

  // --- Handlers ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempEmail.trim()) return;
    setIsAuthenticating(true);
    setTimeout(() => {
      setEmail(tempEmail);
      if (userName === 'PLAYER') {
        setUserName(tempEmail.split('@')[0].toUpperCase());
      }
      setIsLoggedIn(true);
      setIsAuthenticating(false);
      setNews("Node authenticated. Session synced.");
    }, 1500);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) { setNews("Node not authenticated."); return; }
    if (isBanned) { setNews("ACCESS DENIED. CLUSTER BLACKLISTED."); return; }

    let val = clickPower;
    let isCrit = false;
    if (activeBoosts.find(b => b.id === 'cobalt' && b.endTime > currentTime)) {
      if (Math.random() < 0.15) {
        val *= 5;
        isCrit = true;
      }
    }

    setPoints(p => p + val);
    setTotalClicks(c => c + 1);
    updateQuest('clicks', 1);

    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 80);

    const id = Date.now();
    const newParticles: Particle[] = [
      { id: id + 1, x: e.clientX, y: e.clientY, val, type: isCrit ? 'crit' : 'float' }
    ];
    for (let i = 0; i < (isCrit ? 15 : 5); i++) {
      newParticles.push({
        id: id + 2 + i,
        x: e.clientX,
        y: e.clientY,
        val: 0,
        type: 'spark',
        angle: Math.random() * Math.PI * 2
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setParticles(p => p.filter(x => !newParticles.some(np => np.id === x.id))), 800);
  };

  const updateQuest = (type: Quest['type'], amt: number) => {
    setQuests(prev => prev.map(q => q.type === type && !q.claimed ? { ...q, current: Math.min(q.target, q.current + amt) } : q));
  };

  const buyLabItem = (id: string, cost: number, duration: number) => {
    if (points < cost) { setNews("Insufficient research points."); return; }
    setPoints(p => p - cost);
    setActiveBoosts(prev => [...prev, { id, endTime: Date.now() + duration }]);
    setNews(`Research unit ${id.toUpperCase()} deployed.`);
    updateQuest('lab', 1);
  };

  const handleCreateClan = (name: string) => {
    if (points < 5000) { setNews("Clan establishment requires 5K units."); return; }
    if (!name.trim()) return;
    const newClan: Clan = {
      id: `clan-${Date.now()}`,
      name: name.toUpperCase(),
      ownerId: email,
      balance: 0,
      clanPoints: 0,
      members: [{ id: email, name: userName, roleId: 'owner', rank: currentRank }],
      roles: JSON.parse(JSON.stringify(DEFAULT_CLAN_ROLES)),
      channels: [{ id: 'general', name: 'general', messages: [] }],
    };
    setClans(prev => [...prev, newClan]);
    setUserClanId(newClan.id);
    setPoints(p => p - 5000);
    setNews(`Clan [${newClan.name}] established.`);
  };

  const handleJoinClan = (clanId: string) => {
    if (userClanId) { setNews("Departure from current clan required."); return; }
    if (isBanned) return;
    setClans(prevClans => prevClans.map(c => {
        if (c.id === clanId && c.members.length < 25) {
            setUserClanId(c.id);
            setNews(`Joined ${c.name} cluster.`);
            return { ...c, members: [...c.members, { id: email, name: userName, roleId: 'member', rank: currentRank }] };
        }
        return c;
    }));
  };

  const handleClanAd = () => {
    if (!myClan || isBanned) return;
    const msg: ChatMessage = { 
        id: Date.now().toString(), 
        sender: userName, 
        text: `RECRUITMENT: Join cluster [${myClan.name}]! 🚀 Looking for active members. JOIN BELOW!`, 
        rank: currentRank, 
        isUser: true, 
        timestamp: Date.now(),
        clanIdToJoin: myClan.id
    };
    setChatMessages(prev => [...prev.slice(-49), msg]);
    setNews("Cluster signal broadcasted!");

    setTimeout(() => {
        setClans(prevClans => prevClans.map(c => {
            if (c.id === myClan.id && c.members.length < 25 && Math.random() < 0.85) {
                const botName = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
                if (c.members.some(m => m.name === botName)) return c;
                const botPoints = Math.floor(Math.random() * 100000);
                const botRank = [...RANK_TIERS].reverse().find(t => botPoints >= t.min) || RANK_TIERS[0];
                return {
                    ...c,
                    members: [...c.members, { id: `bot-${Date.now()}`, name: botName, roleId: 'member', rank: botRank, isBot: true }]
                };
            }
            return c;
        }));
    }, 3000);
  };

  const depositClan = (amt: number) => {
    if (!myClan || points < amt || isBanned) return;
    let multiplier = 1;
    if (activeBoosts.find(b => b.id === 'iridium' && b.endTime > currentTime)) multiplier = 1.5;

    setPoints(p => p - amt);
    setClans(prev => prev.map(c => {
      if (c.id === myClan.id) {
        const depositAmt = Math.floor(amt * multiplier);
        const newBalance = c.balance + depositAmt;
        return { ...c, balance: newBalance, clanPoints: Math.floor(newBalance / 250) };
      }
      return c;
    }));
    updateQuest('clan_points', Math.floor(amt / 250));
    setNews(`Deposited ${amt} coins to cluster bank.`);
  };

  const withdrawClan = (amt: number) => {
    if (!myClan || myClan.balance < amt || isBanned) return;
    const userRole = myClan.roles.find(r => r.id === myClan.members.find(m => m.id === email)?.roleId);
    if (myClan.ownerId !== email && !userRole?.permissions.includes('withdraw')) {
      setNews("Withdraw protocol denied.");
      return;
    }
    setPoints(p => p + amt);
    setClans(prev => prev.map(c => c.id === myClan.id ? { ...c, balance: c.balance - amt, clanPoints: Math.floor((c.balance - amt) / 250) } : c));
  };

  const sendGlobalMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isBanned) return;
    const msg: ChatMessage = { id: Date.now().toString(), sender: userName, text: chatInput, rank: currentRank, isUser: true, timestamp: Date.now() };
    setChatMessages(prev => [...prev.slice(-49), msg]);
    setChatInput('');
    updateQuest('chat', 1);
  };

  const sendClanMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !myClan || isBanned) return;
    const msg: ChatMessage = { id: Date.now().toString(), sender: userName, text: chatInput, rank: currentRank, isUser: true, timestamp: Date.now() };
    setClans(prev => prev.map(c => {
      if (c.id === myClan.id) {
        const ch = c.channels[0];
        return { ...c, channels: [{ ...ch, messages: [...ch.messages.slice(-49), msg] }] };
      }
      return c;
    }));
    setChatInput('');
  };

  const handleRedeemCode = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeBuffer.toUpperCase().trim();
    if (!code) return;

    if (usedCodes.includes(code) && code !== 'ROOT' && code !== 'ADMINCASH') {
      setNews("Decryption key already consumed.");
      setCodeBuffer('');
      return;
    }

    if (code === 'ROOT' || code === 'ADMINCASH') { 
      setIsAdmin(true); setNews("ROOT ACCESS GRANTED. TERMINAL LINKED."); setActivePanel('ad');
    } else if (code === 'COINS') { 
      setPoints(p => p + 1000); setUsedCodes(prev => [...prev, code]); setNews("Keys accepted (+1000)."); 
    } else if (code === 'PLAYER67') {
      setPoints(p => p + 67); setUsedCodes(prev => [...prev, code]); setNews("Legacy archive restored (+67).");
    } else if (code === 'PLAYER123') {
      setPoints(p => p + 123); setActiveBoosts(prev => [...prev, { id: 'radium', endTime: Date.now() + 300000 }]); setUsedCodes(prev => [...prev, code]); setNews("Veteran package active.");
    } else { setNews("Invalid decryption key."); }
    setCodeBuffer('');
  };

  const startGamble = async () => {
    if (isBanned) return;
    const amt = parseInt(gambleAmount);
    if (isNaN(amt) || amt <= 0 || points < amt) return;
    
    setPoints(p => p - amt);
    setGambleStatus('charging');
    await new Promise(r => setTimeout(r, 1500));
    
    const roll = Math.random();
    const hasShield = activeBoosts.find(b => b.id === 'xenon' && b.endTime > currentTime);

    if (roll < 0.05) { 
      setPoints(p => p + amt * 10); setGambleStatus('jackpot'); setNews("JACKPOT! 10x Yield."); 
    } else if (roll < 0.45) { 
      setPoints(p => p + amt * 2); setGambleStatus('success'); setNews("Success: 2x Extra."); 
    } else {
      if (hasShield) {
        setPoints(p => p + amt);
        setGambleStatus('shielded');
        setNews("XENON SHIELD ACTIVATED. ASSETS SECURED.");
        setActiveBoosts(prev => prev.filter(b => b.id !== 'xenon')); 
      } else {
        setGambleStatus('failed'); setNews("System meltdown: Assets lost."); 
      }
    }
    setTimeout(() => setGambleStatus('idle'), 2000);
  };

  // --- Panels ---
  const renderPanel = () => {
    switch (activePanel) {
      case 'ad': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 bg-slate-950 border-emerald-500/30 max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] font-black uppercase text-emerald-400">Admin Control [ROOT]</span>
                <i className="fa-solid fa-terminal text-emerald-500 text-xs"></i>
            </div>
            <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Asset Injection</label>
                    <div className="flex gap-2">
                        <input type="number" value={injectValue} onChange={e => setInjectValue(e.target.value)} placeholder="Units" className="flex-1 bg-black/40 border border-slate-800 rounded px-3 py-1.5 text-[10px] text-white" />
                        <button onClick={() => { setPoints(p => p + parseInt(injectValue || '0')); setNews("Injection complete."); }} className="bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded border border-emerald-500/20 text-[9px] font-black uppercase">Run</button>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Blacklist Alias</label>
                    <div className="flex gap-2">
                        <input type="text" value={banTarget} onChange={e => setBanTarget(e.target.value)} placeholder="ALIAS" className="flex-1 bg-black/40 border border-slate-800 rounded px-3 py-1.5 text-[10px] text-white uppercase" />
                        <button onClick={() => { setBanList(prev => [...prev, banTarget.toUpperCase()]); setNews("Target voided."); }} className="bg-rose-600/20 text-rose-400 px-3 py-1.5 rounded border border-rose-500/20 text-[9px] font-black uppercase">Void</button>
                    </div>
                </div>
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <button onClick={() => { setPoints(RANK_TIERS[RANK_TIERS.length-1].min); setNews("Max tier reached."); }} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-[9px] font-black text-left flex justify-between text-white uppercase">
                        <span>> set_omnipotent</span> <i className="fa-solid fa-sun"></i>
                    </button>
                    <button onClick={() => { setQuests(quests.map(q => ({...q, current: 0, claimed: false}))); setNews("Protocol reset."); }} className="w-full bg-slate-800 p-2 rounded border border-slate-700 text-[9px] font-black text-left flex justify-between text-white uppercase">
                        <span>> reset_tasks</span> <i className="fa-solid fa-arrows-rotate"></i>
                    </button>
                    <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full bg-rose-900/20 text-rose-400 p-2 rounded border border-rose-500/20 text-[9px] font-black text-left flex justify-between uppercase">
                        <span>> factory_wipe</span> <i className="fa-solid fa-power-off"></i>
                    </button>
                </div>
            </div>
        </div>
      );
      case 'cl': return (
        <div className="glass-panel p-6 rounded-3xl w-80 max-h-[70vh] flex flex-col animate-in slide-in-from-top-4 overflow-y-auto custom-scrollbar shadow-2xl">
          <span className="text-[10px] font-black uppercase text-indigo-400 mb-4 tracking-widest text-center">Rank Tiers</span>
          <div className="space-y-2">
            {RANK_TIERS.map((tier, idx) => (
              <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center bg-slate-900/40 ${points >= tier.min ? 'border-indigo-500/40 opacity-100' : 'border-slate-800 opacity-40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-slate-900 shadow-md`}>
                    <i className={`fa-solid ${tier.icon} text-xs`}></i>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">{tier.name}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Min {tier.min.toLocaleString()}</span>
                  </div>
                </div>
                {points >= tier.min && <i className="fa-solid fa-check-circle text-indigo-400 text-[10px]"></i>}
              </div>
            ))}
          </div>
        </div>
      );
      case 'lb': return (
        <div className="glass-panel p-6 rounded-3xl w-96 max-h-[70vh] flex flex-col animate-in slide-in-from-top-4 shadow-2xl">
          <div className="flex gap-4 border-b border-slate-800 mb-4">
            <button onClick={() => setLeaderboardTab('players')} className={`pb-2 text-[10px] font-black uppercase transition-all ${leaderboardTab === 'players' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>Players</button>
            <button onClick={() => setLeaderboardTab('clans')} className={`pb-2 text-[10px] font-black uppercase transition-all ${leaderboardTab === 'clans' ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-500 hover:text-slate-300'}`}>Clusters</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {leaderboardTab === 'players' ? sortedPlayers.map((p, i) => (
              <div key={i} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${p.isUser ? 'border-orange-500/40 bg-orange-500/10 shadow-lg' : 'border-slate-800 bg-slate-900/20'}`}>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold tabular-nums ${i < 3 ? 'text-amber-400' : 'text-slate-600'}`}>{i + 1}.</span>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{p.name} {p.isUser && "(YOU)"}</span>
                        <RankBadge rank={p.rank} small />
                    </div>
                </div>
                <span className="text-xs tabular-nums font-black text-slate-300">{p.points.toLocaleString()}</span>
              </div>
            )) : sortedClans.map((c, i) => (
              <div key={i} className={`p-3 rounded-xl border border-slate-800 flex justify-between items-center bg-slate-900/20 ${c.id === userClanId ? 'border-rose-500/40 bg-rose-500/10 shadow-lg' : ''}`}>
                <span className="text-xs font-black text-white">{i + 1}. {c.name}</span>
                <span className="text-xs tabular-nums text-rose-400 font-black">{c.clanPoints.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      );
      case 'clans': return (
        <div className="glass-panel p-6 rounded-3xl w-96 max-h-[70vh] flex flex-col animate-in slide-in-from-top-4 shadow-2xl">
          <span className="text-[10px] font-black uppercase text-rose-400 mb-4 tracking-widest text-center">Cluster Hub</span>
          {!userClanId ? (
            <div className="space-y-6">
              <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 shadow-inner">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-tighter">Initialize Cluster (5K)</p>
                <div className="flex gap-2">
                  <input id="clan-name-in" type="text" placeholder="ID NAME" className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs uppercase font-black focus:border-rose-500/50" />
                  <button onClick={() => handleCreateClan((document.getElementById('clan-name-in') as HTMLInputElement).value)} className="bg-rose-600 px-4 rounded-lg text-[9px] font-black uppercase shadow-lg shadow-rose-500/20 active:scale-95 transition-transform">Run</button>
                </div>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-48 custom-scrollbar">
                {clans.map(c => (
                  <div key={c.id} className="p-3 border border-slate-800 rounded-xl flex justify-between items-center group hover:border-slate-600 transition-all bg-slate-900/20">
                    <span className="text-xs font-black text-white">{c.name} ({c.members.length}/25)</span>
                    <button onClick={() => handleJoinClan(c.id)} className="bg-slate-800 px-3 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-slate-700">Link</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-4">
              <div className="text-center p-4 border border-rose-500/20 bg-rose-500/5 rounded-2xl shadow-lg">
                <h3 className="font-black uppercase tracking-[0.25em]">{myClan?.name}</h3>
                <div className="flex justify-center gap-4 mt-1 opacity-60">
                  <span className="text-[9px] font-bold text-amber-500 tabular-nums">Bank: {myClan?.balance.toLocaleString()}</span>
                  <span className="text-[9px] font-bold text-rose-400 tabular-nums">Pts: {myClan?.clanPoints.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex border-b border-slate-800 overflow-hidden rounded-t-lg">
                {['chat', 'bank', 'manage'].map(t => (
                  <button key={t} onClick={() => setActiveClanTab(t as any)} className={`flex-1 py-2 text-[10px] font-black uppercase transition-all ${activeClanTab === t ? 'bg-rose-500/10 text-rose-400 border-b-2 border-rose-400' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                ))}
              </div>
              {activeClanTab === 'chat' ? (
                <div className="flex-1 flex flex-col h-64">
                  <div ref={clanChatScrollRef} className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-950/40 rounded-xl mb-2 custom-scrollbar">
                    {myClan?.channels[0]?.messages.map(m => (
                      <div key={m.id} className="text-[10px] flex items-center gap-2 mb-1 animate-in slide-in-from-left-2">
                        <RankBadge rank={m.rank} small />
                        <span className="text-rose-400 font-bold truncate max-w-[50px]">{m.sender}</span>
                        <span className="text-slate-300 break-words">{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendClanMessage} className="flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Signal..." className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] text-white" />
                    <button className="bg-rose-600 px-3 rounded-lg"><i className="fa-solid fa-paper-plane text-[10px]"></i></button>
                  </form>
                </div>
              ) : activeClanTab === 'bank' ? (
                <div className="space-y-4">
                  <button onClick={handleClanAd} className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600/40 transition-all flex items-center justify-center gap-2">
                    <i className="fa-solid fa-satellite-dish animate-pulse"></i> Broadcast Signal
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => depositClan(500)} className="bg-slate-800 p-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-700 transition-all">Dep 500</button>
                    <button onClick={() => withdrawClan(500)} className="bg-slate-800 p-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-700 transition-all">With 500</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-64 custom-scrollbar pr-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Members ({myClan?.members.length}/25)</p>
                  {myClan?.members.map(m => (
                      <div key={m.id} className="p-2 border border-slate-800 rounded bg-slate-900/40 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${m.isBot ? 'bg-indigo-600/40 text-indigo-300' : 'bg-slate-700 text-slate-200'}`}>
                                <i className={`fa-solid ${m.isBot ? 'fa-robot' : 'fa-user'}`}></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black truncate max-w-[80px]">{m.name}</span>
                                <RankBadge rank={m.rank} small />
                            </div>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase font-black">{m.roleId}</span>
                      </div>
                  ))}
                  <button onClick={() => { setUserClanId(null); setClans(prevClans => prevClans.map(c => c.id === myClan?.id ? { ...c, members: c.members.filter(m => m.id !== email) } : c)); }} className="w-full bg-red-950/40 text-red-500 border border-red-900/40 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-red-900/60 transition-all mt-4">Depart Cluster</button>
                </div>
              )}
            </div>
          )}
        </div>
      );
      case 'sh': return (
        <div className="glass-panel p-6 rounded-3xl w-80 space-y-3 animate-in slide-in-from-top-4 overflow-y-auto max-h-[70vh] custom-scrollbar shadow-2xl">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2 text-center">Research Facility</span>
          {[
            { id: 'barium', n: 'Barium [Ba]', d: 'Auto-collector (60s)', c: 150, dur: 60000, i: 'fa-microchip' },
            { id: 'radium', n: 'Radium [Ra]', d: 'Overclock x2 Click (60s)', c: 500, dur: 60000, i: 'fa-bolt' },
            { id: 'xenon', n: 'Xenon [Xe]', d: 'Gamble Shield (1 Use)', c: 1200, dur: 3600000, i: 'fa-shield-halved' },
            { id: 'iridium', n: 'Iridium [Ir]', d: 'Cluster x1.5 Multiplier (60s)', c: 2000, dur: 60000, i: 'fa-satellite' },
            { id: 'cobalt', n: 'Cobalt [Co]', d: '15% Chance 5x Crit (60s)', c: 3500, dur: 60000, i: 'fa-atom' },
            { id: 'plutonium', n: 'Plutonium [Pu]', d: 'Advanced Collector (60s)', c: 6000, dur: 60000, i: 'fa-biohazard' },
            { id: 'antimatter', n: 'Antimatter [Am]', d: 'Ultimate Collector (60s)', c: 15000, dur: 60000, i: 'fa-burst' },
          ].map(item => (
            <button key={item.id} onClick={() => buyLabItem(item.id, item.c, item.dur)} className="w-full text-left p-3 border border-slate-800 bg-slate-900/40 rounded-xl hover:border-emerald-500/50 transition-all group active:scale-95 shadow-md">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors uppercase">{item.n}</span>
                <i className={`fa-solid ${item.i} text-slate-700 group-hover:text-emerald-500 transition-colors`}></i>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight mb-2 font-medium">{item.d}</p>
              <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                <span className="text-[10px] font-black text-emerald-500 tracking-tight">{item.c} Units</span>
                <span className="text-[8px] uppercase font-black text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded">Deploy</span>
              </div>
            </button>
          ))}
        </div>
      );
      case 'gc': return (
        <div className="glass-panel p-6 rounded-3xl w-80 h-[60vh] flex flex-col animate-in slide-in-from-top-4 shadow-2xl">
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 custom-scrollbar">
            {chatMessages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                <div className="flex items-center gap-2 mb-1">
                    <RankBadge rank={m.rank} small />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{m.sender}</span>
                </div>
                <div className={`p-2.5 rounded-2xl text-[11px] leading-snug border ${m.isUser ? 'bg-blue-600 text-white rounded-tr-none border-blue-500 shadow-md' : 'bg-slate-800 text-slate-200 rounded-tl-none border-slate-700 shadow-lg'}`}>
                    {m.text}
                    {m.clanIdToJoin && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                            <button onClick={() => handleJoinClan(m.clanIdToJoin!)} className="w-full bg-white text-blue-600 px-3 py-1 rounded text-[9px] font-black uppercase hover:bg-slate-100 transition-all shadow-sm">Join Cluster</button>
                        </div>
                    )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendGlobalMessage} className="flex gap-2">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white" placeholder="Message..." />
            <button className="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-90"><i className="fa-solid fa-paper-plane text-xs"></i></button>
          </form>
        </div>
      );
      case 'profile': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 shadow-2xl">
            <span className="text-[10px] font-black uppercase text-amber-400 block mb-6 text-center tracking-widest">Identity Override</span>
            <div className="grid grid-cols-4 gap-2 mb-6 max-h-40 overflow-y-auto p-2 custom-scrollbar bg-black/20 rounded-xl shadow-inner">
                {AVATARS.map((av, idx) => (
                    <button key={idx} onClick={() => setAvatarIdx(idx)} className={`w-12 h-12 rounded-xl ${av.bg} flex items-center justify-center text-white transition-all ${avatarIdx === idx ? 'ring-2 ring-white scale-110 shadow-lg z-10' : 'opacity-30 hover:opacity-100 scale-95'}`}>
                        <i className={`fa-solid ${av.icon}`}></i>
                    </button>
                ))}
            </div>
            <div className="space-y-4">
                <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Alias" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-all font-bold" />
                <button onClick={() => { setNews("Identity refreshed."); setActivePanel(null); }} className="w-full bg-amber-600 text-slate-900 font-black text-[10px] uppercase py-3 rounded-xl shadow-lg active:scale-95 transition-transform">Apply Changes</button>
            </div>
        </div>
      );
      case 're': return (
        <div className="glass-panel p-6 rounded-3xl w-80 text-center animate-in slide-in-from-top-4 shadow-2xl">
          <span className="text-[10px] font-black uppercase text-purple-400 mb-6 block tracking-widest">Gamble Subsystem</span>
          <div className={`p-10 rounded-2xl border-2 mb-6 transition-all shadow-inner ${gambleStatus === 'charging' ? 'border-purple-500 animate-pulse' : 'border-slate-800'}`}>
            <i className={`fa-solid ${gambleStatus === 'idle' ? 'fa-dice' : 'fa-gear fa-spin'} text-4xl text-slate-700`}></i>
            <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-slate-400">{gambleStatus}</p>
          </div>
          <div className="flex gap-2">
            <input type="number" value={gambleAmount} onChange={e => setGambleAmount(e.target.value)} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 text-xs font-bold text-white" />
            <button onClick={startGamble} className="bg-purple-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-purple-500/20 active:scale-95">Run</button>
          </div>
        </div>
      );
      case 'cd': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 shadow-2xl">
          <span className="text-[10px] font-black uppercase text-amber-400 block mb-4 tracking-widest text-center">Protocol Entry</span>
          <form onSubmit={handleRedeemCode} className="space-y-3">
            <input type="text" value={codeBuffer} onChange={e => setCodeBuffer(e.target.value)} placeholder="ACCESS CODE" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono uppercase focus:border-amber-500/50 text-white" />
            <button className="w-full bg-amber-600/20 text-amber-400 border border-amber-500/20 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600/30 active:scale-95 transition-all">Submit</button>
          </form>
        </div>
      );
      case 'vk': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 shadow-2xl">
          <span className="text-[10px] font-black uppercase text-amber-500 block mb-4 tracking-widest text-center">Cold Storage</span>
          <div className="bg-slate-950 p-6 rounded-2xl text-center border border-slate-800 mb-4 shadow-inner">
            <span className="text-3xl font-black tabular-nums tracking-tighter text-white">{vaultPoints.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { if (points >= 1000) { setPoints(p => p - 1000); setVaultPoints(v => v + 1000); } }} className="bg-slate-800 p-3 rounded-xl text-[9px] font-black uppercase hover:bg-slate-700 active:scale-95 transition-all">Dep 1K</button>
            <button onClick={() => { if (vaultPoints >= 1000) { setVaultPoints(v => v - 1000); setPoints(p => p + 1000); } }} className="bg-slate-800 p-3 rounded-xl text-[9px] font-black uppercase hover:bg-slate-700 active:scale-95 transition-all">With 1K</button>
          </div>
        </div>
      );
      case 'qs': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 shadow-2xl">
          <span className="text-[10px] font-black uppercase text-teal-400 block mb-4 tracking-widest text-center">Active Missions</span>
          <div className="space-y-3 pr-1 max-h-96 overflow-y-auto custom-scrollbar">
            {quests.map(q => (
              <div key={q.id} className={`p-3 border border-slate-800 rounded-xl bg-slate-900/40 ${q.claimed ? 'opacity-30' : ''}`}>
                <p className="text-[10px] font-bold uppercase mb-2 tracking-tighter text-white">{q.desc}</p>
                <div className="w-full h-1 bg-slate-800 rounded-full mb-2 overflow-hidden shadow-inner">
                  <div className="h-full bg-teal-500 transition-all duration-700 ease-out" style={{ width: `${(q.current / q.target) * 100}%` }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-slate-500 tabular-nums">{q.current}/{q.target}</span>
                  {!q.claimed && q.current >= q.target ? (
                    <button onClick={() => { setPoints(p => p + q.reward); setQuests(pr => pr.map(x => x.id === q.id ? { ...x, claimed: true } : x)); setNews("Quest reward claimed!"); }} className="bg-teal-500 text-slate-900 px-3 py-1 rounded text-[8px] font-black uppercase active:scale-95 shadow-lg shadow-teal-500/20">Claim</button>
                  ) : q.claimed && <span className="text-[8px] text-teal-400 font-black uppercase">Secured</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'ms': return (
        <div className="glass-panel p-6 rounded-3xl w-80 animate-in slide-in-from-top-4 shadow-2xl text-center">
          <span className="text-[10px] font-black uppercase text-yellow-400 block mb-4 tracking-widest">Cluster Metrics</span>
          <div className="space-y-2">
            {[
              { l: 'Efct Multi', v: `x${clickPower}` },
              { l: 'Total Cycles', v: totalClicks.toLocaleString() },
              { l: 'Ascension Lvl', v: prestigeLevel },
              { l: 'Alignment', v: myClan?.name || 'UNALIGNED' }
            ].map(x => (
              <div key={x.l} className="flex justify-between p-3 border border-slate-800 bg-slate-900/40 rounded-xl shadow-sm text-left">
                <span className="text-[9px] font-black uppercase text-slate-500">{x.l}</span>
                <span className="text-xs font-black text-white">{x.v}</span>
              </div>
            ))}
          </div>
          <button onClick={handleAscension} className={`w-full mt-6 py-4 rounded-2xl border transition-all text-[11px] font-black uppercase ${points >= RANK_TIERS[4].min ? 'border-rose-500 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20' : 'border-slate-800 text-slate-700 opacity-50 cursor-not-allowed'}`}>Ascension Protocol</button>
        </div>
      );
      default: return null;
    }
  };

  const handleAscension = () => {
    if (points < RANK_TIERS[4].min) return;
    if (window.confirm("INITIATE ASCENSION? Current progress will be reset in exchange for a permanent x2 Multiplier.")) {
      setPrestigeLevel(p => p + 1);
      setPoints(0); setVaultPoints(0); setTotalClicks(0); setActiveBoosts([]);
      setNews("Ascension successful. Multiplier enhanced.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 relative overflow-hidden transition-all duration-500">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]"></div>
      
      {/* Navigation */}
      <div className="absolute top-8 left-8 flex flex-col gap-4 z-40">
        <div className="flex items-center gap-3 px-2 mb-2 group cursor-default">
          <i className="fa-solid fa-crown text-amber-400 text-2xl drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform"></i>
          <h1 className="text-2xl font-black tracking-tighter gradient-text uppercase select-none">CLICK CLASH</h1>
        </div>
        <div className="flex flex-wrap gap-2 max-w-sm">
          {[
            { id: 'cl', label: 'Tiers', icon: 'fa-layer-group', color: 'indigo' },
            { id: 'lb', label: 'Rank', icon: 'fa-trophy', color: 'orange' },
            { id: 'sh', label: 'Lab', icon: 'fa-flask-vial', color: 'emerald' },
            { id: 'cd', label: 'Code', icon: 'fa-key', color: 'amber' },
            { id: 'vk', label: 'Vault', icon: 'fa-building-columns', color: 'amber' },
            { id: 'qs', label: 'Task', icon: 'fa-list-ul', color: 'teal' },
            { id: 're', label: 'Spin', icon: 'fa-dice', color: 'purple' },
            { id: 'gc', label: 'Chat', icon: 'fa-comments', color: 'blue' },
            { id: 'clans', label: 'Clan', icon: 'fa-shield', color: 'rose' },
            { id: 'ms', label: 'Meta', icon: 'fa-chart-simple', color: 'yellow' },
          ].map(btn => (
            <button key={btn.id} onClick={() => setActivePanel(activePanel === btn.id ? null : btn.id)} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all glass-panel group ${activePanel === btn.id ? `border-${btn.color}-500/50 bg-${btn.color}-500/10 text-${btn.color}-400 shadow-xl` : 'border-slate-800 text-slate-400 hover:border-slate-700 active:scale-95'}`}>
              <i className={`fa-solid ${activePanel === btn.id ? 'fa-xmark' : btn.icon} text-[11px]`}></i>
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{btn.label}</span>
            </button>
          ))}
          {isAdmin && (
            <button onClick={() => setActivePanel(activePanel === 'ad' ? null : 'ad')} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all glass-panel border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-lg active:scale-95"><i className="fa-solid fa-terminal text-[11px]"></i><span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Root</span></button>
          )}
        </div>
        {renderPanel()}
      </div>

      {/* Main Interface */}
      <div className="relative flex flex-col items-center gap-8 z-20">
        <button onMouseDown={handleClick} className={`group relative flex items-center justify-center transition-all duration-75 ${isShaking ? 'scale-90 rotate-1' : 'scale-100 active:scale-95'}`}>
          <div className={`absolute inset-0 rounded-full blur-[70px] transition-all duration-1000 ${isLoggedIn ? 'bg-orange-500/30 opacity-40 scale-150 animate-pulse' : 'bg-slate-700 opacity-10'}`}></div>
          <div className={`relative w-64 h-64 bg-gradient-to-br rounded-full font-black text-2xl transition-all shadow-[0_30px_70px_rgba(0,0,0,0.8)] border-[10px] flex flex-col items-center justify-center overflow-hidden ${isLoggedIn ? 'from-orange-500 to-orange-700 border-orange-400/40' : 'from-slate-700 to-slate-900 border-slate-600/30 opacity-40'}`}>
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
             <div className="flex flex-col items-center pointer-events-none select-none">
               <span className="text-[10px] font-black tracking-[0.6em] opacity-40 mb-3 uppercase">{isLoggedIn ? 'Access Core' : 'Link Offline'}</span>
               <i className={`fa-solid ${isLoggedIn ? 'fa-hand-pointer' : 'fa-lock'} text-7xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] text-white`}></i>
               {clickPower > 1 && <span className="mt-4 text-white text-[11px] font-black bg-black/60 px-5 py-1.5 rounded-full border border-white/10 shadow-2xl backdrop-blur-sm tracking-widest uppercase">x{clickPower} Multi</span>}
             </div>
          </div>
        </button>
      </div>

      {/* Auth Interface */}
      <div className="absolute top-8 right-8 w-[280px] z-10">
        <div className="glass-panel rounded-3xl p-5 shadow-2xl border border-slate-800/50 backdrop-blur-3xl">
          {!isLoggedIn ? (
            <form onSubmit={handleAuth} className="space-y-3">
              <input type="email" placeholder="Identifier (Email)" required value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:border-orange-500/40 focus:outline-none transition-all placeholder-slate-600 font-medium text-white" />
              <button disabled={isAuthenticating} className="w-full bg-orange-600/20 text-orange-400 text-[10px] font-black uppercase py-3 rounded-xl border border-orange-500/20 hover:bg-orange-600/30 transition-all active:scale-95 shadow-lg shadow-orange-500/5">
                {isAuthenticating ? 'Linking...' : 'Sync Session'}
              </button>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Cluster Verified</span>
                <span className="text-xs font-bold text-white truncate max-w-[150px]">{email}</span>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="text-[9px] text-red-400 font-black uppercase hover:text-red-300 transition-colors bg-red-950/20 px-2 py-1 rounded border border-red-900/30">Abort</button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Bar */}
      <div className="fixed bottom-8 left-8 z-30 flex items-center gap-4">
        <div className="glass-panel p-3 pr-8 rounded-[2.75rem] border border-slate-800 flex items-center gap-4 shadow-2xl min-w-[360px] hover:border-slate-600 transition-all group backdrop-blur-3xl">
          <div className={`w-16 h-16 rounded-full ${AVATARS[avatarIdx].bg} flex items-center justify-center text-white text-3xl shadow-lg ring-4 ring-slate-900 transition-all group-hover:rotate-12 group-hover:scale-105 cursor-pointer relative overflow-hidden`} onClick={() => setActivePanel('profile')}>
             <i className={`fa-solid ${AVATARS[avatarIdx].icon}`}></i>
             <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><i className="fa-solid fa-pen text-[10px]"></i></div>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm font-black text-white truncate max-w-[140px] tracking-tight">{userName}</span>
                <RankBadge rank={currentRank} />
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full mb-2 overflow-hidden shadow-inner border border-white/5 p-[1px]">
                <div className={`h-full bg-gradient-to-r ${currentRank.gradient} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.25)] rounded-full`} style={{ width: `${tierProgress}%` }}></div>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-coins text-amber-500 text-[13px] animate-pulse"></i>
                  <span className="text-base font-black text-white tabular-nums tracking-tighter">{(points + vaultPoints).toLocaleString()}</span>
               </div>
               <button onClick={() => setActivePanel('ms')} className="text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors flex items-center gap-1.5 border-l border-slate-800 pl-3">INFO <i className="fa-solid fa-chart-line text-[7px]"></i></button>
            </div>
          </div>
        </div>
      </div>

      {/* Particle Rendering */}
      {particles.map(p => (
        <div 
            key={p.id} 
            className={`fixed pointer-events-none select-none z-50 ${p.type === 'float' ? 'text-white font-black text-2xl animate-float-up drop-shadow-md' : p.type === 'crit' ? 'text-amber-400 font-black text-5xl animate-float-up drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] italic tracking-widest' : 'w-1 h-1 bg-orange-400 rounded-full animate-spark shadow-[0_0_5px_rgba(251,146,60,0.8)]'}`} 
            style={{ 
                left: (p.type === 'float' || p.type === 'crit') ? p.x - 20 : p.x, 
                top: (p.type === 'float' || p.type === 'crit') ? p.y - 50 : p.y,
                // @ts-ignore
                '--angle': p.angle ? `${p.angle}rad` : '0rad'
            } as any}
        >
          {(p.type === 'float' || p.type === 'crit') ? `+${p.val}${p.type === 'crit' ? ' CRIT!' : ''}` : ''}
        </div>
      ))}

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes float-up { 
            0% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); } 
            100% { transform: translateY(-200px) scale(1.8); opacity: 0; filter: blur(2px); } 
        }
        @keyframes spark { 
            0% { transform: translate(0,0) scale(1.5); opacity: 1; } 
            100% { transform: translate(calc(cos(var(--angle)) * 140px), calc(sin(var(--angle)) * 140px)) scale(0); opacity: 0; } 
        }
        .animate-shimmer { animation: shimmer 1.5s infinite; }
        .animate-float-up { animation: float-up 0.9s cubic-bezier(0.1, 0.7, 1, 0.1) forwards; }
        .animate-spark { animation: spark 0.7s ease-out forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .gradient-text {
            background: linear-gradient(135deg, #f59e0b, #ef4444);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default App;
