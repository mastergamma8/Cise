import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  query, 
  limit, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { 
  Trophy, 
  Package, 
  User, 
  CreditCard, 
  Star, 
  X, 
  Zap, 
  Volume2, 
  VolumeX,
  Shield,
  Gamepad2
} from 'lucide-react';

// --- CONFIGURATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cs2-case-tma';

// --- GAME DATA (Converted to Stars) ---
const CASES_DATA = {
    "Gamma Case": {
        id: "gamma",
        name: "Гамма",
        price: 50, // Stars
        image: "img/Gamma Case/Gamma Case.png",
        items: [
            { name: "MAC-10 Carnivore", rarity: "consumer", price: 10, image: "img/Gamma Case/item Gamma Case/MAC-10 Carnivore.png" },
            { name: "Nova Exo", rarity: "consumer", price: 12, image: "img/Gamma Case/item Gamma Case/Nova Exo.png" },
            { name: "PP-Bizon Harvester", rarity: "industrial", price: 25, image: "img/Gamma Case/item Gamma Case/PP-Bizon Harvester.png" },
            { name: "Tec-9 Ice Cap", rarity: "industrial", price: 30, image: "img/Gamma Case/item Gamma Case/Tec-9 Ice Cap.png" },
            { name: "P90 Chopper", rarity: "mil-spec", price: 60, image: "img/Gamma Case/item Gamma Case/P90 Chopper.png" },
            { name: "AWP Phobos", rarity: "restricted", price: 170, image: "img/Gamma Case/item Gamma Case/AWP Phobos.png" },
            { name: "M4A1-S Mecha Industries", rarity: "covert", price: 1300, image: "img/Gamma Case/item Gamma Case/M4A1-S Mecha Industries.png" },
            { name: "★ Karambit Gamma Doppler", rarity: "rare", price: 50000, image: "img/Gamma Case/item Gamma Case/★ Karambit Gamma Doppler Emerald.png" }
        ]
    },
    "Kilowatt Case": {
        id: "kilowatt",
        name: "Киловатт",
        price: 80,
        image: "img/Kilowatt Case/Kilowatt Case.png",
        items: [
            { name: "Nova Dark Sigil", rarity: "consumer", price: 15, image: "img/Kilowatt Case/item Kilowatt Case/Nova Dark Sigil.png" },
            { name: "Tec-9 Slag", rarity: "industrial", price: 35, image: "img/Kilowatt Case/item Kilowatt Case/Tec-9 Slag.png" },
            { name: "Zeus x27 Olympus", rarity: "mil-spec", price: 90, image: "img/Kilowatt Case/item Kilowatt Case/Zeus x27 Olympus.png" },
            { name: "M4A1-S Black Lotus", rarity: "classified", price: 950, image: "img/Kilowatt Case/item Kilowatt Case/M4A1-S Black Lotus.png" },
            { name: "AK-47 Inheritance", rarity: "covert", price: 3000, image: "img/Kilowatt Case/item Kilowatt Case/AK-47 Inheritance.png" },
            { name: "★ Kukri Knife Fade", rarity: "rare", price: 36000, image: "img/Kilowatt Case/item Kilowatt Case/★ Kukri Knife Fade.png" }
        ]
    },
    "Revolution Case": {
        id: "revolution",
        name: "Революция",
        price: 60,
        image: "img/Revolution Case/Revolution Case.png",
        items: [
            { name: "MAG-7 Insomnia", rarity: "consumer", price: 12, image: "img/Revolution Case/item Revolution Case/MAG-7 Insomnia.png" },
            { name: "P250 Re.built", rarity: "industrial", price: 32, image: "img/Revolution Case/item Revolution Case/P250 Re.built.png" },
            { name: "MAC-10 Sakkaku", rarity: "mil-spec", price: 65, image: "img/Revolution Case/item Revolution Case/MAC-10 Sakkaku.png" },
            { name: "Glock-18 Umbral Rabbit", rarity: "restricted", price: 160, image: "img/Revolution Case/item Revolution Case/Glock-18 Umbral Rabbit.png" },
            { name: "AK-47 Head Shot", rarity: "covert", price: 2200, image: "img/Revolution Case/item Revolution Case/AK-47 Head Shot.png" },
            { name: "★ Sport Gloves", rarity: "rare", price: 24000, image: "img/Revolution Case/item Revolution Case/★ Sport Gloves Amphibious.png" }
        ]
    }
};

// Rarity Colors
const RARITY_COLORS = {
    consumer: "border-gray-400 bg-gray-900/50 text-gray-300",
    industrial: "border-blue-400 bg-blue-900/50 text-blue-300",
    "mil-spec": "border-blue-600 bg-blue-800/50 text-blue-200",
    restricted: "border-purple-500 bg-purple-900/50 text-purple-300",
    classified: "border-pink-500 bg-pink-900/50 text-pink-300",
    covert: "border-red-500 bg-red-900/50 text-red-300",
    rare: "border-yellow-400 bg-yellow-900/50 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
};

const RARITY_PROBS = {
    consumer: 0.40,
    industrial: 0.30,
    "mil-spec": 0.18,
    restricted: 0.08,
    classified: 0.03,
    covert: 0.0064,
    rare: 0.0036
};

// --- HELPER COMPONENTS ---

const Notification = ({ msg, type, onClose }) => (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 animate-bounce-in
        ${type === 'success' ? 'bg-green-900/90 text-green-100' : 'bg-red-900/90 text-red-100'}`}>
        {type === 'success' ? <Shield size={18} /> : <X size={18} />}
        <span className="font-medium text-sm">{msg}</span>
    </div>
);

const RarityBadge = ({ rarity }) => {
    let color = "bg-gray-500";
    if (rarity === "rare") color = "bg-yellow-500";
    else if (rarity === "covert") color = "bg-red-500";
    else if (rarity === "classified") color = "bg-pink-500";
    else if (rarity === "restricted") color = "bg-purple-500";
    else if (rarity === "mil-spec") color = "bg-blue-600";
    else if (rarity === "industrial") color = "bg-blue-400";

    return <div className={`h-1.5 w-full rounded-full mt-2 ${color}`} />;
};

// --- MAIN APP ---

export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('cases'); // cases, inventory, leaderboard, profile
    const [selectedCase, setSelectedCase] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [wonItem, setWonItem] = useState(null);
    const [rouletteItems, setRouletteItems] = useState([]);
    const [notification, setNotification] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const rouletteRef = useRef(null);

    // Audio Context (Lazy init)
    const audioCtx = useRef(null);

    // --- INITIALIZATION ---
    useEffect(() => {
        const initAuth = async () => {
             if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInAnonymously(auth); // Use custom token in real prod, anonymous for demo
            } else {
                await signInAnonymously(auth);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // --- DATA SYNC ---
    useEffect(() => {
        if (!user) return;

        // Private User Data Listener
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
        const unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserData(docSnap.data());
                // Sync to public leaderboard when private data changes
                syncToLeaderboard(user.uid, docSnap.data());
            } else {
                // Initialize new user
                const initialData = {
                    balance: 1000, // Starting Stars
                    inventory: [],
                    stats: { opened: 0, spent: 0, earned: 0 },
                    username: `Player ${user.uid.slice(0, 4)}`,
                    createdAt: Date.now()
                };
                setDoc(userDocRef, initialData);
            }
        }, (err) => console.error("User sync error:", err));

        // Public Leaderboard Listener
        const leaderboardQuery = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'),
            orderBy('stats.earned', 'desc'),
            limit(10)
        );

        const unsubLeaderboard = onSnapshot(leaderboardQuery, (snapshot) => {
            const lbData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setLeaderboard(lbData);
        }, (err) => console.error("Leaderboard error:", err));

        return () => {
            unsubUser();
            unsubLeaderboard();
        };
    }, [user]);

    const syncToLeaderboard = async (uid, data) => {
        // Only update public doc with necessary info
        try {
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', uid), {
                username: data.username,
                stats: data.stats,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`
            });
        } catch (e) {
            console.error("Failed to sync leaderboard", e);
        }
    };

    // --- AUDIO ---
    const playSound = (type) => {
        if (!soundEnabled) return;
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        
        const ctx = audioCtx.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        
        if (type === 'click') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'spin') {
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.2);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0, now + 1);
            osc.start(now);
            osc.stop(now + 1);
        } else if (type === 'rare') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(600, now + 2);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 2.5);
            osc.start(now);
            osc.stop(now + 2.5);
        }
    };

    const showNotification = (msg, type = 'info') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- GAME LOGIC ---

    const generateRoulette = (caseData) => {
        // Logic to simulate CS2 probabilities
        const items = [];
        // Pre-fill buffer
        for (let i = 0; i < 65; i++) {
            const rand = Math.random();
            let cumProb = 0;
            let chosenRarity = 'consumer';
            
            for (const [rarity, prob] of Object.entries(RARITY_PROBS)) {
                cumProb += prob;
                if (rand <= cumProb) {
                    chosenRarity = rarity;
                    break;
                }
            }

            const pool = caseData.items.filter(i => i.rarity === chosenRarity);
            const fallback = caseData.items.filter(i => i.rarity === 'consumer');
            const item = pool.length > 0 
                ? pool[Math.floor(Math.random() * pool.length)] 
                : fallback[Math.floor(Math.random() * fallback.length)];
            
            items.push({ ...item, id: Math.random() });
        }
        return items;
    };

    const handleOpenCase = async () => {
        if (!userData || !selectedCase || isSpinning) return;
        if (userData.balance < selectedCase.price) {
            showNotification("Недостаточно звёзд!", "error");
            setIsPaymentModalOpen(true);
            return;
        }

        playSound('click');
        setIsSpinning(true);
        setWonItem(null); // Reset win

        // Deduct balance locally (optimistic) and generate items
        const newBalance = userData.balance - selectedCase.price;
        const items = generateRoulette(selectedCase);
        
        // Predetermined winner is at index 58 (visual center ish)
        const winner = items[58]; 

        setRouletteItems(items);

        // Update DB
        try {
            const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
            await updateDocInTransaction(userRef, {
                balance: newBalance,
                'stats.opened': (userData.stats.opened || 0) + 1,
                'stats.spent': (userData.stats.spent || 0) + selectedCase.price
            });
        } catch (e) {
            console.error("Transact fail", e);
        }

        // Start Animation
        setTimeout(() => {
            if (rouletteRef.current) {
                // Determine pixel offset
                // Item width 144px (w-36) + 8px gap (mx-1) = 152px
                // Center is roughly item 58
                const itemWidth = 152;
                const offset = (58 * itemWidth) - (window.innerWidth / 2) + (itemWidth / 2);
                
                // Add some randomness within the item box
                const randomOffset = Math.floor(Math.random() * 80) - 40;
                
                rouletteRef.current.style.transition = 'transform 6s cubic-bezier(0.15, 0.85, 0.35, 1.05)';
                rouletteRef.current.style.transform = `translateX(-${offset + randomOffset}px)`;
            }
            
            // Ticking sound simulation
            let tickRate = 50;
            const tick = () => {
                if (!isSpinning) return;
                playSound('spin');
                tickRate *= 1.1; // Slow down
                if (tickRate < 400) setTimeout(tick, tickRate);
            };
            tick();

        }, 100);

        // End Animation
        setTimeout(async () => {
            setIsSpinning(false);
            setWonItem(winner);
            if (['covert', 'rare'].includes(winner.rarity)) playSound('rare');
            else playSound('win');
            
            // Add to inventory in DB
            const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
            const newItem = { ...winner, acquiredAt: Date.now() };
            // Simple array union simulation via transaction/update
            // Reading fresh data to avoid overwrite
            const snap = await getDoc(userRef);
            if(snap.exists()){
                const currInv = snap.data().inventory || [];
                await setDoc(userRef, { inventory: [newItem, ...currInv] }, { merge: true });
            }

        }, 6100);
    };

    const updateDocInTransaction = async (ref, updates) => {
        try {
            await setDoc(ref, updates, { merge: true });
        } catch(e) { console.error(e); }
    };

    const handleSellItem = async (item, index) => {
        if (!userData) return;
        
        playSound('click');
        const newBalance = userData.balance + item.price;
        const newInventory = [...userData.inventory];
        newInventory.splice(index, 1);
        
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
        await setDoc(userRef, {
            balance: newBalance,
            inventory: newInventory,
            'stats.earned': (userData.stats.earned || 0) + item.price
        }, { merge: true });

        showNotification(`Продано за ${item.price} ⭐`, 'success');
        if (wonItem && wonItem.acquiredAt === item.acquiredAt) {
            setWonItem(null); // Close modal if selling from modal
            setSelectedCase(null);
        }
    };

    const handleSellAll = async () => {
        if (!userData || userData.inventory.length === 0) return;
        if (!confirm("Продать ВСЁ?")) return;

        const totalValue = userData.inventory.reduce((sum, i) => sum + i.price, 0);
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
        
        await setDoc(userRef, {
            balance: userData.balance + totalValue,
            inventory: [],
            'stats.earned': (userData.stats.earned || 0) + totalValue
        }, { merge: true });
        
        playSound('click');
        showNotification(`Всё продано за ${totalValue} ⭐`, 'success');
    };

    const handleAddStars = async () => {
        setIsPaymentModalOpen(false);
        // Mock payment
        playSound('win');
        const userRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile');
        const bonus = 500;
        await setDoc(userRef, {
            balance: (userData?.balance || 0) + bonus
        }, { merge: true });
        showNotification(`+${bonus} Stars зачислено!`, 'success');
    };

    // --- RENDER HELPERS ---

    if (!user || !userData) {
        return (
            <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-white p-4">
                <div className="w-12 h-12 border-4 border-t-yellow-400 border-white/20 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-bold font-mono">LOADING CS2 STARS...</h2>
            </div>
        );
    }

    const Modal = ({ children, onClose }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#16213e] w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                    <X size={24} />
                </button>
                {children}
            </div>
        </div>
    );

    return (
        <div className="bg-[#1a1a2e] min-h-screen text-white font-sans pb-24 overflow-x-hidden">
            {notification && <Notification {...notification} />}

            {/* HEADER */}
            <header className="fixed top-0 inset-x-0 h-16 bg-[#16213e]/90 backdrop-blur-md border-b border-white/5 z-40 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Shield className="text-red-500" fill="#e94560" size={24} />
                    <span className="font-bold text-lg tracking-wider">RICH<span className="text-[#e94560]">CASE</span></span>
                </div>
                
                <div className="flex items-center gap-3">
                    <div 
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-2 bg-[#0f0f23] px-3 py-1.5 rounded-full border border-yellow-500/30 cursor-pointer active:scale-95 transition-transform"
                    >
                        <Star size={16} className="text-yellow-400 fill-yellow-400" />
                        <span className="font-mono font-bold text-yellow-400">{userData.balance}</span>
                        <div className="bg-yellow-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-black font-bold">+</div>
                    </div>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-400 hover:text-white">
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="pt-20 px-4">
                
                {/* CASES TAB */}
                {activeTab === 'cases' && (
                    <div className="grid grid-cols-2 gap-4 animate-slide-up">
                        {Object.values(CASES_DATA).map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => { setSelectedCase(c); playSound('click'); }}
                                className="group relative bg-[#16213e] rounded-xl p-3 border border-white/5 active:scale-95 transition-all cursor-pointer overflow-hidden hover:border-[#e94560]/50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[#e94560]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="aspect-[4/3] w-full flex items-center justify-center mb-2">
                                    <img 
                                        src={c.image} 
                                        alt={c.name}
                                        className="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                                        onError={(e) => {e.target.src = 'https://placehold.co/200x150/16213e/FFFFFF/png?text=Case';}} 
                                    />
                                </div>
                                <h3 className="font-bold text-sm truncate">{c.name}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-mono font-bold">
                                        <Star size={12} fill="currentColor" />
                                        {c.price}
                                    </div>
                                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">Открыть</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* INVENTORY TAB */}
                {activeTab === 'inventory' && (
                    <div className="animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Package className="text-blue-400" /> 
                                Инвентарь <span className="text-sm bg-white/10 px-2 rounded-full text-gray-400">{userData.inventory.length}</span>
                            </h2>
                            <button 
                                onClick={handleSellAll}
                                className="text-xs bg-red-900/50 text-red-300 px-3 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-900"
                            >
                                Продать всё
                            </button>
                        </div>

                        {userData.inventory.length === 0 ? (
                            <div className="text-center py-20 opacity-50">
                                <Package size={48} className="mx-auto mb-2" />
                                <p>Пусто...</p>
                                <button onClick={() => setActiveTab('cases')} className="mt-4 text-[#e94560] underline">Открыть кейс</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                {userData.inventory.map((item, idx) => (
                                    <div key={idx} className={`relative bg-[#16213e] rounded-lg p-2 border ${RARITY_COLORS[item.rarity].split(' ')[0]} border-opacity-30 flex flex-col items-center`}>
                                        <img 
                                            src={item.image} 
                                            className="w-16 h-12 object-contain mb-1"
                                            onError={(e) => {e.target.src = 'https://placehold.co/100x80/transparent/FFFFFF/png?text=Gun';}} 
                                        />
                                        <p className="text-[10px] text-center w-full truncate text-gray-300">{item.name}</p>
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-yellow-400 font-mono">
                                            <Star size={8} fill="currentColor" /> {item.price}
                                        </div>
                                        <button 
                                            onClick={() => handleSellItem(item, idx)}
                                            className="mt-2 w-full bg-white/5 hover:bg-white/10 text-[10px] py-1 rounded transition-colors"
                                        >
                                            Продать
                                        </button>
                                        <div className={`absolute bottom-0 inset-x-0 h-0.5 ${RARITY_COLORS[item.rarity].split(' ')[0].replace('border', 'bg')}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* LEADERBOARD TAB */}
                {activeTab === 'leaderboard' && (
                    <div className="animate-slide-up">
                         <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <Trophy className="text-yellow-400" /> Топ игроков
                        </h2>
                        <div className="space-y-2">
                            {leaderboard.map((player, idx) => (
                                <div key={player.id} className="bg-[#16213e] p-3 rounded-xl flex items-center gap-3 border border-white/5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono 
                                        ${idx === 0 ? 'bg-yellow-400 text-black' : 
                                          idx === 1 ? 'bg-gray-300 text-black' : 
                                          idx === 2 ? 'bg-orange-400 text-black' : 'bg-white/10 text-gray-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <img src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} className="w-10 h-10 rounded-full bg-black/20" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm">{player.username}</h4>
                                        <p className="text-xs text-gray-400">Открыто кейсов: {player.stats?.opened || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-yellow-400 font-mono font-bold text-sm flex items-center justify-end gap-1">
                                            {player.stats?.earned || 0} <Star size={10} fill="currentColor" />
                                        </div>
                                        <div className="text-[10px] text-gray-500">PROFIT</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PROFILE TAB */}
                {activeTab === 'profile' && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-gradient-to-r from-[#16213e] to-[#1f2e52] p-6 rounded-2xl border border-white/5 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><User size={100} /></div>
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-24 h-24 rounded-full border-4 border-[#e94560] mx-auto bg-black/20 shadow-xl" />
                            <h2 className="mt-4 text-2xl font-bold">{userData.username}</h2>
                            <p className="text-gray-400 text-sm font-mono">ID: {user.uid.slice(0,8)}</p>
                            
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <p className="text-xs text-gray-400 uppercase">Потрачено</p>
                                    <p className="text-red-400 font-mono font-bold">{userData.stats.spent} ⭐</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <p className="text-xs text-gray-400 uppercase">Заработано</p>
                                    <p className="text-green-400 font-mono font-bold">{userData.stats.earned} ⭐</p>
                                </div>
                            </div>
                        </div>

                         <div className="bg-[#16213e] p-4 rounded-xl border border-white/5">
                            <h3 className="font-bold mb-3 flex items-center gap-2"> <CreditCard size={18}/> Баланс</h3>
                             <button 
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="w-full bg-[#e94560] hover:bg-[#ff6b6b] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                <Star fill="white" size={18} /> Купить Звезды
                            </button>
                        </div>
                    </div>
                )}

            </main>

            {/* BOTTOM NAV */}
            <nav className="fixed bottom-0 inset-x-0 bg-[#0f0f23]/95 backdrop-blur border-t border-white/10 flex justify-around py-2 pb-safe z-40">
                <NavBtn icon={Package} label="Кейсы" active={activeTab === 'cases'} onClick={() => {setActiveTab('cases'); playSound('click');}} />
                <NavBtn icon={Trophy} label="Топ" active={activeTab === 'leaderboard'} onClick={() => {setActiveTab('leaderboard'); playSound('click');}} />
                <NavBtn icon={User} label="Профиль" active={activeTab === 'profile'} onClick={() => {setActiveTab('profile'); playSound('click');}} />
                <div className="relative">
                    <NavBtn icon={Gamepad2} label="Инвентарь" active={activeTab === 'inventory'} onClick={() => {setActiveTab('inventory'); playSound('click');}} />
                    {userData.inventory.length > 0 && (
                        <span className="absolute -top-1 right-2 w-4 h-4 bg-[#e94560] rounded-full text-[10px] flex items-center justify-center font-bold animate-bounce">
                            {userData.inventory.length}
                        </span>
                    )}
                </div>
            </nav>

            {/* --- MODALS --- */}

            {/* CASE OPENING */}
            {selectedCase && (
                <Modal onClose={() => !isSpinning && setSelectedCase(null)}>
                    {!isSpinning && !wonItem ? (
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-1 text-[#e94560]">{selectedCase.name}</h2>
                            <img src={selectedCase.image} className="w-48 h-36 mx-auto object-contain my-4 drop-shadow-[0_0_15px_rgba(233,69,96,0.3)]" onError={(e) => {e.target.src = 'https://placehold.co/200x150/16213e/FFFFFF/png?text=Case';}} />
                            
                            <div className="grid grid-cols-4 gap-2 mb-6 max-h-32 overflow-y-auto px-2">
                                {selectedCase.items.map((i, idx) => (
                                    <div key={idx} className={`w-full aspect-square bg-black/30 rounded border ${RARITY_COLORS[i.rarity].split(' ')[0]} border-opacity-30 relative group`}>
                                        <img src={i.image} className="w-full h-full object-contain p-1" onError={(e) => {e.target.src = 'https://placehold.co/50x50/transparent/FFFFFF/png?text=.';}} />
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={handleOpenCase}
                                disabled={userData.balance < selectedCase.price}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                                    ${userData.balance < selectedCase.price ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'bg-[#e94560] hover:scale-105 shadow-[0_0_20px_rgba(233,69,96,0.5)]'}`}
                            >
                                <Star fill="currentColor" size={20} /> {selectedCase.price} Открыть
                            </button>
                        </div>
                    ) : (
                        <div className="py-4">
                            {/* ROULETTE TRACK */}
                            <div className="relative w-full h-36 bg-[#0f0f23] mb-4 overflow-hidden rounded-lg shadow-inner border border-white/10">
                                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-400 z-20 -translate-x-1/2 shadow-[0_0_10px_yellow]" />
                                <div 
                                    ref={rouletteRef}
                                    className="flex h-full items-center pl-[50%]"
                                    style={{ width: 'max-content', willChange: 'transform' }}
                                >
                                    {rouletteItems.map((item) => (
                                        <div 
                                            key={item.id} 
                                            className={`w-36 h-32 mx-1 flex-shrink-0 bg-[#1a1a2e] rounded-lg border-b-4 ${RARITY_COLORS[item.rarity].split(' ')[0]} flex flex-col items-center justify-center relative p-2`}
                                        >
                                            <img src={item.image} className="w-24 h-16 object-contain" onError={(e) => {e.target.src = 'https://placehold.co/100x80/transparent/FFFFFF/png?text=Gun';}} />
                                            <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* WIN SCREEN */}
                            {wonItem && (
                                <div className="text-center animate-zoom-in">
                                    <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-2">Выпал предмет</h3>
                                    <div className={`inline-block p-4 rounded-xl bg-gradient-to-b from-transparent ${RARITY_COLORS[wonItem.rarity].split(' ')[1]} mb-4 w-full`}>
                                        <img src={wonItem.image} className="w-48 h-32 mx-auto object-contain drop-shadow-xl animate-float" onError={(e) => {e.target.src = 'https://placehold.co/200x150/transparent/FFFFFF/png?text=WIN';}} />
                                    </div>
                                    <h2 className="text-xl font-bold mb-1">{wonItem.name}</h2>
                                    <p className={`text-sm font-mono mb-6 ${RARITY_COLORS[wonItem.rarity].split(' ')[2]}`}>{wonItem.price} ⭐</p>
                                    
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleSellItem(wonItem, userData.inventory.findIndex(i => i.acquiredAt === wonItem.acquiredAt))}
                                            className="flex-1 bg-gray-700 py-3 rounded-xl font-bold"
                                        >
                                            Продать ({wonItem.price})
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedCase(null); setWonItem(null); }}
                                            className="flex-1 bg-green-600 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(22,163,74,0.4)]"
                                        >
                                            Забрать
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>
            )}

            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && (
                <Modal onClose={() => setIsPaymentModalOpen(false)}>
                    <div className="text-center p-2">
                        <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-400 animate-pulse">
                            <Star size={32} fill="currentColor" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Пополнить баланс</h2>
                        <p className="text-gray-400 text-sm mb-6">Используйте Telegram Stars для покупки валюты в приложении.</p>
                        
                        <div className="space-y-3">
                            {[100, 500, 1000, 5000].map(amount => (
                                <button 
                                    key={amount}
                                    onClick={handleAddStars}
                                    className="w-full bg-white/5 hover:bg-[#e94560] border border-white/10 hover:border-[#e94560] p-3 rounded-xl flex justify-between items-center group transition-all"
                                >
                                    <div className="flex items-center gap-2 font-mono font-bold text-yellow-400">
                                        <Star size={16} fill="currentColor" /> {amount}
                                    </div>
                                    <span className="text-sm text-gray-500 group-hover:text-white">{(amount / 50).toFixed(2)} USD</span>
                                </button>
                            ))}
                        </div>
                        <p className="mt-4 text-[10px] text-gray-500">Это демо-режим. Нажмите любую кнопку для бесплатного пополнения.</p>
                    </div>
                </Modal>
            )}
        </div>
    );
}

const NavBtn = ({ icon: Icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-[#e94560]' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);
