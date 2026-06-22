import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Check, Plus, Repeat, Calendar, Target, Sun, TrendingUp,
  ChevronLeft, ChevronRight, Flame, Trash2, Moon, Layers,
  X, FolderOpen, LayoutGrid, Edit2, Settings, Smartphone,
  Bell, Download, Shield, ArrowRight, Sparkles, Upload, User, Camera,
  AlertCircle, ChevronDown, MessageSquare, AlertTriangle, MoreHorizontal,
  Search, Tag, Zap, FileText, GripVertical
} from "lucide-react";

// ─── Temas ─────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:"#0F0C0A",surface:"#1A1512",surface2:"#231C17",line:"#312720",
    ink:"#F6EFE8",mute:"#9A8A7C",faint:"#6A5A4D",
    accent:"#FF9D42",accentDim:"#3A2614",warn:"#FFD27A",done:"#4A3E35",shadow:"none",
  },
  light: {
    bg:"#F7F1E8",surface:"#FFFDF9",surface2:"#F1E8DA",line:"#E3D7C5",
    ink:"#2B2017",mute:"#8A7868",faint:"#B3A493",
    accent:"#E07A1F",accentDim:"#FBE6CE",warn:"#C98A22",done:"#D9CDBC",
    shadow:"0 1px 2px rgba(80,55,30,.06)",
  },
};
let COL = THEMES.dark;

// ─── Persistência — localStorage puro (funciona no artefato publicado) ────
const DB_KEY    = "lume:v2";
const TKEY      = "lume:theme";
const OKEY      = "lume:onboarded";
const PKEY      = "lume:profile";
const CKEY      = "lume:checkins";

const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
const lsGet = (k)   => { try { return localStorage.getItem(k); } catch { return null; } };

const loadState     = () => { const r=lsGet(DB_KEY); return r?JSON.parse(r):null; };
const saveState     = s  => lsSet(DB_KEY, JSON.stringify(s));
const loadTheme     = () => lsGet(TKEY)||"dark";
const saveTheme     = t  => lsSet(TKEY,t);
const loadOnboarded = () => lsGet(OKEY)==="1";
const saveOnboarded = () => lsSet(OKEY,"1");
const loadProfile   = () => { const r=lsGet(PKEY); return r?JSON.parse(r):{name:"",age:"",weight:"",height:"",photo:null}; };
const saveProfile   = p  => lsSet(PKEY, JSON.stringify(p));
const loadCheckins  = () => { const r=lsGet(CKEY); return r?JSON.parse(r):[]; };
const saveCheckins  = c  => lsSet(CKEY, JSON.stringify(c));

// helpers de semana ISO
const weekKey = (d=new Date()) => {
  const x=new Date(d); x.setHours(0,0,0,0);
  x.setDate(x.getDate()-x.getDay()+1); // segunda
  return todayKey(x);
};

// ─── Helpers de data ───────────────────────────────────────────
const pad       = n => String(n).padStart(2,"0");
const todayKey  = (d=new Date()) => { const x=new Date(d); return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`; };
const keyToDate = k => { const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d); };
const fmtShort  = k => keyToDate(k).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
const monthName = (y,m) => new Date(y,m,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
const uid       = () => Math.random().toString(36).slice(2,9);
const defaultTime = () => { const n=new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
const WD        = ["dom","seg","ter","qua","qui","sex","sáb"];
const WCAP      = ["D","S","T","Q","Q","S","S"];

// ─── Hábito ativo ──────────────────────────────────────────────
const isHabitActive = (h,k) => {
  if (!h.days.includes(keyToDate(k).getDay())) return false;
  if (h.startDate && k < h.startDate) return false;
  if (h.endDate   && k > h.endDate)   return false;
  return true;
};

// ─── Tarefa recorrente ativa numa data ─────────────────────────
const isTaskActive = (t, k) => {
  if (!t.recurrent) return t.date === k;
  if (!t.days || !t.days.includes(keyToDate(k).getDay())) return false;
  if (t.startDate && k < t.startDate) return false;
  if (t.endDate   && k > t.endDate)   return false;
  return true;
};
const RKEY = "lume:reclog";
const loadRecLog = () => { const r=lsGet(RKEY); return r?JSON.parse(r):{}; };
const saveRecLog = l => lsSet(RKEY, JSON.stringify(l));

// ─── Cores de área ─────────────────────────────────────────────
const AREA_COLORS = ["#FF9D42","#5B8EFF","#A78BFA","#34D399","#F87171","#FBBF24","#F472B6","#22D3EE"];

// ─── Estado vazio (novo usuário pós-onboarding) ────────────────
const emptyState = () => ({ areas:[], tasks:[], habits:[], events:[], goals:[], notes:[] });

const NKEY = "lume:notes";
const TGKEY = "lume:tags";
const loadNotes = () => { const r=lsGet(NKEY); return r?JSON.parse(r):[]; };
const saveNotes = n => lsSet(NKEY, JSON.stringify(n));
const loadTags  = () => { const r=lsGet(TGKEY); return r?JSON.parse(r):[]; };
const saveTags  = t => lsSet(TGKEY, JSON.stringify(t));

// ─── Raiz ──────────────────────────────────────────────────────
export default function Lume() {
  const [state,      setState]      = useState(null);
  const [tab,        setTab]        = useState("hoje");
  const [cursor,     setCursor]     = useState(todayKey());
  const [theme,      setTheme]      = useState("dark");
  const [onboarded,  setOnboarded]  = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [profile,    setProfile]    = useState({ name:"", age:"", weight:"", photo:null });
  const [checkins,   setCheckins]   = useState([]);
  const [showCheckin,setShowCheckin]= useState(false);
  const [notes,      setNotes]      = useState([]);
  const [recLog,     setRecLog]     = useState({});
  const [tags,       setTags]       = useState([]);
  const [focoMode,   setFocoMode]   = useState(false);
  const [busca,      setBusca]      = useState(false);

  useEffect(() => {
    setState(loadState() || emptyState());
    setTheme(loadTheme());
    setOnboarded(loadOnboarded());
    setProfile(loadProfile());
    setCheckins(loadCheckins());
    setNotes(loadNotes());
    setRecLog(loadRecLog());
    setTags(loadTags());
  }, []);

  useEffect(() => { if (state) saveState(state); }, [state]);
  useEffect(() => { saveTheme(theme); }, [theme]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveCheckins(checkins); }, [checkins]);
  useEffect(() => { saveNotes(notes); }, [notes]);
  useEffect(() => { saveRecLog(recLog); }, [recLog]);
  useEffect(() => { saveTags(tags); }, [tags]);

  const patchNotes  = useCallback(fn => setNotes(n => { const c=structuredClone(n); fn(c); return c; }), []);
  const toggleRecLog = useCallback((taskId, dateKey) => {
    setRecLog(l => { const n={...l}; const k=`${taskId}_${dateKey}`; n[k]=!n[k]; return n; });
  }, []);

  COL = THEMES[theme] || THEMES.dark;

  const patch       = useCallback(fn => setState(s => { const n=structuredClone(s); fn(n); return n; }), []);
  const toggleTheme = () => setTheme(t => t==="dark"?"light":"dark");
  const finishOnboard = (initialState) => {
    setState(initialState);
    saveOnboarded();
    setOnboarded(true);
  };

  const [activeProject, setActiveProject] = useState(null); // {areaId, projectId}

  if (!state) return <Splash />;
  if (!onboarded) return <Onboarding theme={theme} toggleTheme={toggleTheme} onDone={finishOnboard} />;

  // Se tem projeto ativo, mostra tela de projeto
  if (activeProject) {
    return (
      <div style={{ minHeight:"100vh",background:COL.bg,color:COL.ink,
        fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column",
        maxWidth:480,margin:"0 auto" }}>
        <style>{`*{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}@keyframes slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}.row{animation:slide .2s ease both;}input::placeholder{color:${COL.faint}}select{appearance:none;-webkit-appearance:none;}input[type=range]{accent-color:${COL.accent};}::-webkit-scrollbar{display:none;}`}</style>
        <ProjetoView
          state={state} patch={patch}
          notes={notes} patchNotes={patchNotes}
          areaId={activeProject.areaId}
          projectId={activeProject.projectId}
          onBack={()=>setActiveProject(null)}
          onHome={()=>{ setActiveProject(null); setTab("hoje"); }}
        />
      </div>
    );
  }

  // Abas principais (5) + menu "..."
  const mainTabs = [
    { id:"hoje",    label:"Hoje",    icon:Sun        },
    { id:"tempo",   label:"Tempo",   icon:LayoutGrid },
    { id:"habitos", label:"Hábitos", icon:Repeat     },
    { id:"areas",   label:"Áreas",   icon:Layers     },
    { id:"review",  label:"Review",  icon:TrendingUp },
  ];
  const moreTabs = [
    { id:"agenda",  label:"Agenda",  icon:Calendar      },
    { id:"metas",   label:"Metas",   icon:Target        },
    { id:"notas",   label:"Notas",   icon:MessageSquare },
    { id:"perfil",  label:"Perfil",  icon:User          },
  ];

  return (
    <div style={{ minHeight:"100vh",background:COL.bg,color:COL.ink,
      fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column",
      maxWidth:480,margin:"0 auto",position:"relative" }}>
      <style>{`
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        @keyframes pop{0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .row{animation:slide .2s ease both;}
        button:focus-visible{outline:2px solid ${COL.accent};outline-offset:2px;}
        @media(prefers-reduced-motion:reduce){.row,.anim{animation:none}}
        input,textarea,select{font-size:16px !important;}
        input::placeholder,textarea::placeholder{color:${COL.faint}}
        select{appearance:none;-webkit-appearance:none;}
        input[type=range]{accent-color:${COL.accent};}
        input[type=date],input[type=time]{color-scheme:${theme==="dark"?"dark":"light"};}
        ::-webkit-scrollbar{display:none;}
        html{height:-webkit-fill-available;}
        body{min-height:-webkit-fill-available;}
      `}</style>

      <Header tab={tab} cursor={cursor} setCursor={setCursor} theme={theme} toggleTheme={toggleTheme}
        profile={profile} onPerfil={()=>setTab("perfil")}
        onBusca={()=>setBusca(true)} focoMode={focoMode} onFoco={()=>setFocoMode(v=>!v)}/>

      <main style={{ flex:1,overflowY:"auto",padding:"8px 16px 0",paddingBottom:"max(calc(env(safe-area-inset-bottom) + 80px), 110px)" }}>
        {focoMode
          ? <FocoMode state={state} cursor={cursor} patch={patch} recLog={recLog} toggleRecLog={toggleRecLog} onExit={()=>setFocoMode(false)}/>
          : <>
            {tab==="hoje"    && <Hoje    state={state} cursor={cursor} patch={patch} onEdit={setEditTarget} recLog={recLog} toggleRecLog={toggleRecLog} tags={tags}/>}
            {tab==="tempo"   && <Tempo   state={state} patch={patch}/>}
            {tab==="agenda"  && <Agenda  state={state} patch={patch} onEdit={setEditTarget}/>}
            {tab==="habitos" && <Habitos state={state} patch={patch} onEdit={setEditTarget}/>}
            {tab==="areas"   && <Areas   state={state} patch={patch} onProject={setActiveProject}/>}
            {tab==="metas"   && <Metas   state={state} patch={patch} onEdit={setEditTarget}/>}
            {tab==="notas"   && <Notas   state={state} notes={notes} patchNotes={patchNotes} tags={tags} setTags={setTags}/>}
            {tab==="review"  && <Review  state={state} checkins={checkins} onCheckin={()=>setShowCheckin(true)} recLog={recLog}/>}
            {tab==="perfil"  && <Perfil  profile={profile} setProfile={setProfile} state={state} theme={theme} toggleTheme={toggleTheme} patch={patch} notes={notes} recLog={recLog}/>}
          </>
        }
      </main>

      <Nav mainTabs={mainTabs} moreTabs={moreTabs} tab={tab} setTab={setTab}/>

      {busca && (
        <BuscaModal
          state={state} notes={notes} patch={patch}
          recLog={recLog} toggleRecLog={toggleRecLog}
          onClose={()=>setBusca(false)}
        />
      )}

      {editTarget && (
        <EditModal
          target={editTarget}
          state={state}
          patch={patch}
          tags={tags}
          setTags={setTags}
          onClose={()=>setEditTarget(null)}
        />
      )}

      {showCheckin && (
        <CheckinModal
          state={state}
          onSave={entry=>{ setCheckins(c=>[...c,entry]); setShowCheckin(false); }}
          onClose={()=>setShowCheckin(false)}
        />
      )}
    </div>
  );
}

// ─── Splash ────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{minHeight:"100vh",background:THEMES.dark.bg,display:"grid",placeItems:"center",fontFamily:"Inter,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <Flame size={40} color={THEMES.dark.accent} style={{filter:`drop-shadow(0 0 14px ${THEMES.dark.accent}80)`}}/>
        <div style={{letterSpacing:8,marginTop:12,fontWeight:700,fontSize:20,color:THEMES.dark.ink}}>LUME</div>
        <div style={{color:THEMES.dark.faint,fontSize:12,marginTop:6,letterSpacing:1}}>mantenha aceso</div>
      </div>
    </div>
  );
}

// ─── Onboarding ────────────────────────────────────────────────
const OB_STEPS = [
  {
    icon: <Flame size={48} color={THEMES.dark.accent} style={{filter:`drop-shadow(0 0 20px ${THEMES.dark.accent}60)`}}/>,
    title: "Bem-vindo ao Lume",
    sub: "Mantenha aceso.",
    body: "Um lugar só pra tudo que importa — tarefas, hábitos, eventos e metas vivem juntos aqui, organizados por áreas da sua vida.",
    action: "Começar",
  },
  {
    icon: <Layers size={48} color={THEMES.dark.accent}/>,
    title: "Áreas da sua vida",
    sub: "Do dia um ao um dia.",
    body: "Organize tudo em áreas como Espiritual, Trabalho e Pessoal. Dentro de cada área você pode criar projetos. Tudo conectado.",
    action: "Entendi",
  },
  {
    icon: <Repeat size={48} color={THEMES.dark.accent}/>,
    title: "Hábitos com intenção",
    sub: "Cada dia alimenta a chama.",
    body: "Crie hábitos com os dias certos e, opcionalmente, uma data de fim. O Lume mostra sua sequência e te lembra quando a chama está apagando.",
    action: "Entendi",
  },
  {
    icon: <Sparkles size={48} color={THEMES.dark.accent}/>,
    title: "Sua primeira área",
    sub: "Vamos acender.",
    body: null, // replaced by form
    action: "Entrar no Lume",
    isForm: true,
  },
];

function Onboarding({ theme, toggleTheme, onDone }) {
  const [step,    setStep]    = useState(0);
  const [name,    setName]    = useState("");
  const [areas,   setAreas]   = useState([
    { id:uid(), name:"Espiritual", color:"#A78BFA", projects:[] },
    { id:uid(), name:"Trabalho",   color:"#5B8EFF", projects:[] },
    { id:uid(), name:"Pessoal",    color:"#34D399", projects:[] },
  ]);
  const [newA,    setNewA]    = useState("");
  const [newACol, setNewACol] = useState(AREA_COLORS[0]);
  COL = THEMES[theme] || THEMES.dark;

  const cur = OB_STEPS[step];
  const isLast = step === OB_STEPS.length - 1;

  const advance = () => {
    if (!isLast) { setStep(s=>s+1); return; }
    const s = emptyState();
    s.areas = areas;
    onDone(s);
  };

  const addArea = () => {
    const t=newA.trim(); if(!t) return;
    setAreas(a=>[...a,{id:uid(),name:t,color:newACol,projects:[]}]);
    setNewA(""); setNewACol(AREA_COLORS[Math.floor(Math.random()*AREA_COLORS.length)]);
  };
  const removeArea = id => setAreas(a=>a.filter(x=>x.id!==id));

  return (
    <div style={{minHeight:"100vh",background:COL.bg,color:COL.ink,
      fontFamily:"Inter,system-ui,sans-serif",display:"flex",flexDirection:"column",
      maxWidth:480,margin:"0 auto",padding:"0 24px 40px"}}>

      {/* progress dots */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 0 0"}}>
        <div style={{display:"flex",gap:6}}>
          {OB_STEPS.map((_,i)=>(
            <div key={i} style={{width:i===step?20:6,height:6,borderRadius:3,
              background:i===step?COL.accent:i<step?COL.accentDim:COL.line,
              transition:"all .3s ease"}}/>
          ))}
        </div>
        <button onClick={toggleTheme} style={{background:"none",border:"none",color:COL.mute,padding:6,cursor:"pointer"}}>
          {theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}
        </button>
      </div>

      {/* content */}
      <div key={step} style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",animation:"fadeUp .4s ease both"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          {cur.icon}
          <div style={{fontSize:26,fontWeight:800,marginTop:20,letterSpacing:-0.5}}>{cur.title}</div>
          <div style={{fontSize:13,color:COL.accent,fontWeight:600,marginTop:6,letterSpacing:1}}>{cur.sub}</div>
          {cur.body && <div style={{fontSize:15,color:COL.mute,marginTop:16,lineHeight:1.6}}>{cur.body}</div>}
        </div>

        {cur.isForm && (
          <div>
            <div style={{fontSize:12,color:COL.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
              Áreas da sua vida
            </div>
            {areas.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,background:COL.surface,
                border:`1px solid ${COL.line}`,borderRadius:12,padding:"10px 14px",marginBottom:8}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:a.color,flexShrink:0}}/>
                <div style={{flex:1,fontWeight:500}}>{a.name}</div>
                <button onClick={()=>removeArea(a.id)} style={{background:"none",border:"none",color:COL.faint,padding:2,cursor:"pointer"}}><X size={14}/></button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <input value={newA} onChange={e=>setNewA(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addArea()}
                placeholder="Nova área…" style={{...obInput(COL)}}/>
              <button onClick={addArea} style={{...obAddBtn(COL)}}><Plus size={18}/></button>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              {AREA_COLORS.map(c=>(
                <button key={c} onClick={()=>setNewACol(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${newACol===c?COL.ink:"transparent"}`,cursor:"pointer"}}/>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={advance}
        style={{...obAddBtn(COL),width:"100%",height:52,borderRadius:14,fontSize:16,fontWeight:700,gap:8}}>
        {cur.action} <ArrowRight size={18}/>
      </button>
    </div>
  );
}

const obInput  = COL => ({ flex:1,background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.ink,borderRadius:10,padding:"11px 13px",fontSize:14,fontFamily:"inherit",outline:"none",width:"100%" });
const obAddBtn = COL => ({ background:COL.accent,color:COL.bg,border:"none",borderRadius:10,width:44,minWidth:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",cursor:"pointer",fontSize:14 });

// ─── Header ────────────────────────────────────────────────────
function Header({ tab, cursor, setCursor, theme, toggleTheme, profile, onPerfil, onBusca, focoMode, onFoco }) {
  const shift = n => { const [y,m,d]=cursor.split("-").map(Number); setCursor(todayKey(new Date(y,m-1,d+n))); };
  const isToday = cursor===todayKey();
  return (
    <header style={{padding:"env(safe-area-inset-top, 18px) 16px 6px",paddingTop:"max(env(safe-area-inset-top), 18px)",position:"sticky",top:0,
      background:`linear-gradient(${COL.bg}, ${COL.bg}E0)`,backdropFilter:"blur(8px)",zIndex:5}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onPerfil} style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          {profile?.photo
            ?<img src={profile.photo} alt="perfil" style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`2px solid ${COL.accent}`}}/>
            :<div style={{width:34,height:34,borderRadius:"50%",background:COL.accentDim,border:`2px solid ${COL.accent}`,display:"grid",placeItems:"center"}}><Flame size={16} color={COL.accent}/></div>
          }
          {profile?.name
            ?<div style={{fontWeight:700,fontSize:15,letterSpacing:-0.3,color:COL.ink}}>{profile.name.split(" ")[0]}</div>
            :<div style={{fontWeight:800,fontSize:20,letterSpacing:-0.5,color:COL.ink}}>lume</div>
          }
        </button>
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          {tab==="hoje" && (
            <>
              <IconBtn onClick={()=>shift(-1)}><ChevronLeft size={18}/></IconBtn>
              <button onClick={()=>setCursor(todayKey())}
                style={{background:isToday?COL.accentDim:"transparent",color:isToday?COL.accent:COL.mute,
                  border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:600,
                  fontFamily:"inherit",textTransform:"capitalize",minWidth:86,cursor:"pointer"}}>
                {isToday?"Hoje":fmtShort(cursor)}
              </button>
              <IconBtn onClick={()=>shift(1)}><ChevronRight size={18}/></IconBtn>
            </>
          )}
          <IconBtn onClick={onBusca}><Search size={17}/></IconBtn>
          {tab==="hoje" && (
            <IconBtn onClick={onFoco}>
              <Zap size={17} color={focoMode?COL.accent:COL.mute}/>
            </IconBtn>
          )}
          <IconBtn onClick={toggleTheme} aria-label="tema">
            {theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}
          </IconBtn>
        </div>
      </div>
    </header>
  );
}

// ─── helpers ───────────────────────────────────────────────────
const areaOf   = (s,id)  => s.areas.find(a=>a.id===id);
const projectOf= (s,aid,pid) => areaOf(s,aid)?.projects?.find(p=>p.id===pid);

function AreaDot({ color, size=8 }) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:color||COL.faint,flexShrink:0}}/>;
}
function AreaBadge({ state, areaId, projectId }) {
  const a=areaOf(state,areaId), p=projectOf(state,areaId,projectId);
  if (!a) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10.5,color:COL.faint,
      background:COL.surface2,padding:"3px 8px",borderRadius:20,flexShrink:0}}>
      <AreaDot color={a.color} size={7}/>{p?`${a.name} · ${p.name}`:a.name}
    </div>
  );
}
function AreaProjectSelect({ state, areaId, projectId, onArea, onProject }) {
  const area=areaOf(state,areaId);
  return (
    <div style={{display:"flex",gap:8,marginBottom:10}}>
      <select value={areaId||""} onChange={e=>{onArea(e.target.value);onProject("");}}
        style={{...inputStyle,flex:2,paddingRight:12}}>
        <option value="">Área (opcional)</option>
        {state.areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {area?.projects?.length>0 && (
        <select value={projectId||""} onChange={e=>onProject(e.target.value)}
          style={{...inputStyle,flex:2,paddingRight:12}}>
          <option value="">Projeto</option>
          {area.projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Modal de edição ───────────────────────────────────────────
function EditModal({ target, state, patch, onClose, tags, setTags }) {
  const { type, id } = target;
  const item = type==="task"  ? state.tasks.find(t=>t.id===id)
             : type==="habit" ? state.habits.find(h=>h.id===id)
             : type==="goal"  ? state.goals.find(g=>g.id===id)
             : type==="event" ? state.events.find(e=>e.id===id)
             : null;
  if (!item) return null;

  const [title,     setTitle]     = useState(item.title);
  const [areaId,    setAreaId]    = useState(item.areaId||"");
  const [projId,    setProjId]    = useState(item.projectId||"");
  const [prio,      setPrio]      = useState(item.priority||"normal");
  const [itemTags,  setItemTags]  = useState(item.tags||[]);
  const [newTag,    setNewTag]    = useState("");
  // subtarefas
  const [subs,      setSubs]      = useState(item.subtasks||[]);
  const [subDraft,  setSubDraft]  = useState("");
  // hábito/recorrente extra
  const [days,    setDays]    = useState(item.days||[]);
  const [start,   setStart]   = useState(item.startDate||todayKey());
  const [end,     setEnd]     = useState(item.endDate||"");
  const [hasEnd,  setHasEnd]  = useState(!!item.endDate);
  // meta extra
  const [prog,    setProg]    = useState(item.progress||0);
  // evento extra
  const [date,    setDate]    = useState(item.date||todayKey());
  const [time,    setTime]    = useState(item.time||"");

  const addSub = () => {
    const t=subDraft.trim(); if(!t) return;
    setSubs(s=>[...s,{id:uid(),title:t,done:false}]);
    setSubDraft("");
  };
  const toggleSub = sid => setSubs(s=>s.map(x=>x.id===sid?{...x,done:!x.done}:x));
  const delSub    = sid => setSubs(s=>s.filter(x=>x.id!==sid));

  const addTag = () => {
    const t=newTag.trim().toLowerCase().replace(/\s+/g,"-"); if(!t||itemTags.includes(t)) return;
    setItemTags(ts=>[...ts,t]);
    if(tags&&setTags&&!tags.includes(t)) setTags(tg=>[...tg,t]);
    setNewTag("");
  };

  const save = () => {
    patch(s => {
      if (type==="task") {
        const t=s.tasks.find(x=>x.id===id);
        t.title=title; t.areaId=areaId||null; t.projectId=projId||null; t.priority=prio;
        t.tags=itemTags; t.subtasks=subs;
        if (t.recurrent) {
          t.days=days; t.startDate=start; t.endDate=hasEnd&&end?end:null;
        }
      } else if (type==="habit") {
        const h=s.habits.find(x=>x.id===id);
        h.title=title; h.areaId=areaId||null; h.projectId=projId||null;
        h.days=days; h.startDate=start; h.endDate=hasEnd&&end?end:null;
        h.tags=itemTags;
      } else if (type==="goal") {
        const g=s.goals.find(x=>x.id===id);
        g.title=title; g.areaId=areaId||null; g.projectId=projId||null; g.progress=prog;
        g.tags=itemTags;
      } else if (type==="event") {
        const e=s.events.find(x=>x.id===id);
        e.title=title; e.areaId=areaId||null; e.projectId=projId||null; e.date=date; e.time=time;
        e.tags=itemTags;
      }
    });
    onClose();
  };

  const typeLabel = {task:item?.recurrent?"Tarefa Recorrente":"Tarefa",habit:"Hábito",goal:"Meta",event:"Evento"}[type];
  const isRecurrent = type==="task" && item?.recurrent;
  const doneSubs = subs.filter(s=>s.done).length;

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",animation:"fadeIn .2s ease"}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:COL.surface,borderRadius:"20px 20px 0 0",
          padding:"20px 20px 40px",animation:"fadeUp .25s ease both",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:16}}>Editar {typeLabel}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:COL.mute,padding:4,cursor:"pointer"}}><X size={20}/></button>
        </div>

        <input value={title} onChange={e=>setTitle(e.target.value)}
          style={{...inputStyle,marginBottom:12,fontSize:16}} autoFocus/>
        <AreaProjectSelect state={state} areaId={areaId} projectId={projId} onArea={setAreaId} onProject={setProjId}/>

        {/* Tags */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Tags</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {itemTags.map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:4,background:COL.accentDim,
                color:COL.accent,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600}}>
                #{t}
                <button onClick={()=>setItemTags(ts=>ts.filter(x=>x!==t))}
                  style={{background:"none",border:"none",color:COL.accent,padding:0,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={newTag} onChange={e=>setNewTag(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addTag()}
              placeholder="Adicionar tag…"
              style={{...inputStyle,flex:1}}/>
            <button onClick={addTag} style={{...addBtn,width:42,height:42,minWidth:42,borderRadius:10}}><Plus size={16}/></button>
          </div>
          {/* Tags existentes */}
          {tags&&tags.filter(t=>!itemTags.includes(t)).length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {tags.filter(t=>!itemTags.includes(t)).map(t=>(
                <button key={t} onClick={()=>setItemTags(ts=>[...ts,t])}
                  style={{background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.mute,
                    borderRadius:20,padding:"3px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                  +#{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {type==="task" && !isRecurrent && (
          <>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Prioridade</div>
              <div style={{display:"flex",gap:6}}>
                {Object.entries(PRIORITY).map(([k,v])=>(
                  <button key={k} onClick={()=>setPrio(k)}
                    style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11.5,fontWeight:600,
                      fontFamily:"inherit",cursor:"pointer",
                      border:`1px solid ${prio===k?(v.color||COL.accent):COL.line}`,
                      background:prio===k?(v.bg||COL.accentDim):"transparent",
                      color:prio===k?(v.color||COL.accent):COL.mute}}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtarefas */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11.5,color:COL.faint}}>Subtarefas</div>
                {subs.length>0&&<div style={{fontSize:11,color:COL.faint}}>{doneSubs}/{subs.length}</div>}
              </div>
              {subs.length>0&&(
                <div style={{height:3,background:COL.surface2,borderRadius:2,overflow:"hidden",marginBottom:10}}>
                  <div style={{height:"100%",width:`${subs.length?Math.round((doneSubs/subs.length)*100):0}%`,
                    background:COL.accent,borderRadius:2,transition:"width .3s ease"}}/>
                </div>
              )}
              {subs.map(s=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",
                  borderBottom:`1px solid ${COL.line}`}}>
                  <button onClick={()=>toggleSub(s.id)}
                    style={{width:20,height:20,borderRadius:5,border:`2px solid ${s.done?COL.accent:COL.line}`,
                      background:s.done?COL.accent:"transparent",display:"grid",placeItems:"center",
                      cursor:"pointer",flexShrink:0}}>
                    {s.done&&<Check size={12} color={COL.bg} strokeWidth={3}/>}
                  </button>
                  <div style={{flex:1,fontSize:13,color:s.done?COL.mute:COL.ink,
                    textDecoration:s.done?"line-through":"none"}}>{s.title}</div>
                  <button onClick={()=>delSub(s.id)}
                    style={{background:"none",border:"none",color:COL.faint,padding:2,cursor:"pointer"}}>
                    <X size={13}/>
                  </button>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <input value={subDraft} onChange={e=>setSubDraft(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addSub()}
                  placeholder="Nova subtarefa…"
                  style={{...inputStyle,flex:1}}/>
                <button onClick={addSub} style={{...addBtn,width:42,height:42,minWidth:42,borderRadius:10}}><Plus size={16}/></button>
              </div>
            </div>
          </>
        )}

        {type==="task" && isRecurrent && (
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Prioridade</div>
            <div style={{display:"flex",gap:6}}>
              {Object.entries(PRIORITY).map(([k,v])=>(
                <button key={k} onClick={()=>setPrio(k)}
                  style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11.5,fontWeight:600,
                    fontFamily:"inherit",cursor:"pointer",
                    border:`1px solid ${prio===k?(v.color||COL.accent):COL.line}`,
                    background:prio===k?(v.bg||COL.accentDim):"transparent",
                    color:prio===k?(v.color||COL.accent):COL.mute}}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isRecurrent && (
          <>
            <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Dias da semana</div>
            <div style={{display:"flex",gap:5,marginBottom:12}}>
              {WD.map((w,i)=>{const on=days.includes(i);return(
                <button key={i} onClick={()=>setDays(p=>on?p.filter(x=>x!==i):[...p,i])}
                  style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",
                    border:`1px solid ${on?COL.accent:COL.line}`,background:on?COL.accentDim:"transparent",
                    color:on?COL.accent:COL.mute,cursor:"pointer"}}>{w}</button>
              );})}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              <div>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
                <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={{...inputStyle,width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim (opcional)</div>
                {hasEnd?(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" value={end} onChange={e=>setEnd(e.target.value)} min={start} style={{...inputStyle,flex:1}}/>
                    <button onClick={()=>{setHasEnd(false);setEnd("");}} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer",padding:4}}><X size={16}/></button>
                  </div>
                ):(
                  <button onClick={()=>setHasEnd(true)} style={{...inputStyle,cursor:"pointer",color:COL.faint,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
                    <Plus size={14}/> Definir data de fim
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {type==="habit" && (
          <>
            <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Dias da semana</div>
            <div style={{display:"flex",gap:5,marginBottom:12}}>
              {WD.map((w,i)=>{
                const on=days.includes(i);
                return (
                  <button key={i} onClick={()=>setDays(p=>on?p.filter(x=>x!==i):[...p,i])}
                    style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",
                      border:`1px solid ${on?COL.accent:COL.line}`,background:on?COL.accentDim:"transparent",
                      color:on?COL.accent:COL.mute,cursor:"pointer"}}>
                    {w}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              <div>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
                <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={{...inputStyle,width:"100%"}}/>
              </div>
              <div>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim (opcional)</div>
                {hasEnd?(
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="date" value={end} onChange={e=>setEnd(e.target.value)} min={start} style={{...inputStyle,flex:1}}/>
                    <button onClick={()=>{setHasEnd(false);setEnd("");}} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer",padding:4}}><X size={16}/></button>
                  </div>
                ):(
                  <button onClick={()=>setHasEnd(true)}
                    style={{...inputStyle,cursor:"pointer",color:COL.faint,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
                    <Plus size={14}/> Definir data de fim
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {type==="goal" && (
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontSize:12,color:COL.faint}}>Progresso</div>
              <div style={{fontSize:12,fontWeight:700,color:COL.accent}}>{prog}%</div>
            </div>
            <input type="range" min="0" max="100" value={prog} onChange={e=>setProg(+e.target.value)}
              style={{width:"100%",accentColor:areaOf(state,areaId)?.color||COL.accent}}/>
          </div>
        )}

        {type==="event" && (
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...inputStyle,flex:2}}/>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{...inputStyle,flex:1}}/>
          </div>
        )}

        <button onClick={save}
          style={{...addBtn,width:"100%",height:48,borderRadius:12,fontSize:15,fontWeight:700}}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

// ─── HOJE ──────────────────────────────────────────────────────
const PRIORITY = {
  alta:   { label:"Alta",   color:"#F87171", bg:"#3A1414" },
  media:  { label:"Média",  color:"#FFD27A", bg:"#3A3010" },
  normal: { label:"Normal", color:null,      bg:null       },
};

function PriorityBadge({ p }) {
  const pr = PRIORITY[p||"normal"];
  if (!pr.color) return null;
  return (
    <div style={{fontSize:9.5,fontWeight:700,color:pr.color,background:pr.bg,
      padding:"2px 7px",borderRadius:20,flexShrink:0}}>
      {pr.label}
    </div>
  );
}

function Hoje({ state, cursor, patch, onEdit, recLog, toggleRecLog }) {
  const [draft,    setDraft]    = useState("");
  const [dArea,    setDArea]    = useState("");
  const [dProject, setDProject] = useState("");
  const [dPrio,    setDPrio]    = useState("normal");
  const [open,     setOpen]     = useState(false);
  const [recMode,  setRecMode]  = useState(false); // modo tarefa recorrente

  const tk = todayKey();
  const events   = state.events.filter(e=>e.date===cursor).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  // tarefas normais do dia
  const tasks    = state.tasks.filter(t=>!t.recurrent && t.date===cursor);
  // tarefas recorrentes ativas hoje
  const recTasks = state.tasks.filter(t=>t.recurrent && isTaskActive(t, cursor));
  // atrasadas: tarefas normais não concluídas de dias anteriores
  const overdue  = cursor===tk
    ? state.tasks.filter(t=>!t.recurrent && !t.done && t.date<tk).sort((a,b)=>b.date.localeCompare(a.date))
    : [];
  const habits   = state.habits.filter(h=>isHabitActive(h,cursor));

  const sortedTasks = [...tasks].sort((a,b)=>{
    if (a.done !== b.done) return a.done?1:-1;
    const po = {alta:0,media:1,normal:2};
    return (po[a.priority||"normal"]||2)-(po[b.priority||"normal"]||2);
  });

  const total = tasks.length+habits.length+recTasks.length;
  const done  = tasks.filter(t=>t.done).length
              + habits.filter(h=>h.log[cursor]).length
              + recTasks.filter(t=>recLog[`${t.id}_${cursor}`]).length;
  const pct   = total?Math.round((done/total)*100):0;

  const addTask = () => {
    const t=draft.trim(); if(!t)return;
    patch(s=>s.tasks.push({id:uid(),title:t,date:cursor,done:false,recurrent:false,
      areaId:dArea||null,projectId:dProject||null,priority:dPrio}));
    setDraft(""); setOpen(false); setDPrio("normal");
  };
  const toggleTask  = id => patch(s=>{const x=s.tasks.find(t=>t.id===id);x.done=!x.done;});
  const delTask     = id => patch(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});
  const toggleHabit = id => patch(s=>{const h=s.habits.find(x=>x.id===id);h.log[cursor]=!h.log[cursor];});
  const reschedule  = id => patch(s=>{const t=s.tasks.find(x=>x.id===id);if(t)t.date=tk;});

  return (
    <>
      <ProgressRing pct={pct} done={done} total={total}/>

      {/* Tarefas atrasadas */}
      {overdue.length>0 && (
        <Section label={`⚠️ Atrasadas · ${overdue.length}`}>
          {overdue.map(t=>(
            <Item key={t.id} className="row"
              style={{borderColor:"#5A2020",background:"#1E0E0E"}}>
              <AlertTriangle size={14} color="#F87171" style={{flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13.5,color:"#F8B4B4"}}>{t.title}</div>
                <div style={{fontSize:10.5,color:"#9A5A5A",marginTop:2}}>{fmtShort(t.date)}</div>
              </div>
              <button onClick={()=>reschedule(t.id)}
                style={{fontSize:11,fontWeight:700,color:COL.accent,background:COL.accentDim,
                  border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",whiteSpace:"nowrap"}}>
                Mover pra hoje
              </button>
              <button onClick={()=>toggleTask(t.id)}
                style={{background:"none",border:"none",color:"#9A5A5A",padding:4,cursor:"pointer"}}>
                <Check size={14}/>
              </button>
            </Item>
          ))}
        </Section>
      )}

      {events.length>0 && (
        <Section label="Agenda">
          {events.map(e=>(
            <Item key={e.id} className="row">
              <div style={{width:42,fontSize:12,fontWeight:700,color:COL.warn}}>{e.time||"—"}</div>
              <div style={{flex:1}}>{e.title}</div>
              <AreaBadge state={state} areaId={e.areaId} projectId={e.projectId}/>
              <button onClick={()=>onEdit({type:"event",id:e.id})} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
            </Item>
          ))}
        </Section>
      )}

      {habits.length>0 && (
        <Section label="Hábitos de hoje">
          {habits.map(h=>{
            const on=!!h.log[cursor];
            return (
              <Item key={h.id} className="row" clickable onClick={()=>toggleHabit(h.id)}>
                <Toggle on={on} color={areaOf(state,h.areaId)?.color}/>
                <div style={{flex:1,color:on?COL.mute:COL.ink,textDecoration:on?"line-through":"none"}}>{h.title}</div>
                <AreaBadge state={state} areaId={h.areaId} projectId={h.projectId}/>
                <button onClick={e=>{e.stopPropagation();onEdit({type:"habit",id:h.id});}}
                  style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
              </Item>
            );
          })}
        </Section>
      )}

      {recTasks.length>0 && (
        <Section label="Tarefas recorrentes">
          {recTasks.map(t=>{
            const on=!!recLog[`${t.id}_${cursor}`];
            return (
              <Item key={t.id} className="row" clickable onClick={()=>toggleRecLog(t.id,cursor)}>
                <Toggle on={on} color={areaOf(state,t.areaId)?.color||PRIORITY[t.priority||"normal"]?.color}/>
                <div style={{flex:1,color:on?COL.mute:COL.ink,textDecoration:on?"line-through":"none"}}>{t.title}</div>
                <AreaBadge state={state} areaId={t.areaId} projectId={t.projectId}/>
                <button onClick={e=>{e.stopPropagation();onEdit({type:"task",id:t.id});}}
                  style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
              </Item>
            );
          })}
        </Section>
      )}

      <Section label="Tarefas">
        {sortedTasks.length===0&&!open&&<Faint>Sem tarefas pra este dia.</Faint>}
        {sortedTasks.map(t=>{
          const doneSubs = (t.subtasks||[]).filter(s=>s.done).length;
          const totalSubs = (t.subtasks||[]).length;
          return (
          <div key={t.id} className="row">
            <Item clickable onClick={()=>toggleTask(t.id)} style={{opacity:t.done?.65:1,marginBottom:totalSubs>0?4:8}}>
              <Toggle on={t.done} color={areaOf(state,t.areaId)?.color||PRIORITY[t.priority||"normal"]?.color}/>
              <div style={{flex:1}}>
                <div style={{color:t.done?COL.mute:COL.ink,textDecoration:t.done?"line-through":"none",fontSize:14}}>{t.title}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:t.priority&&t.priority!=="normal"&&!t.done?4:0}}>
                  {t.priority&&t.priority!=="normal"&&!t.done&&<PriorityBadge p={t.priority}/>}
                  {(t.tags||[]).map(tg=><span key={tg} style={{fontSize:9.5,color:COL.faint,background:COL.surface2,padding:"1px 6px",borderRadius:20}}>#{tg}</span>)}
                </div>
                {totalSubs>0&&(
                  <div style={{marginTop:6}}>
                    <div style={{height:3,background:COL.surface2,borderRadius:2,overflow:"hidden",marginBottom:3}}>
                      <div style={{height:"100%",width:`${Math.round((doneSubs/totalSubs)*100)}%`,background:COL.accent,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:10,color:COL.faint}}>{doneSubs}/{totalSubs} subtarefas</div>
                  </div>
                )}
              </div>
              <AreaBadge state={state} areaId={t.areaId} projectId={t.projectId}/>
              <button onClick={e=>{e.stopPropagation();onEdit({type:"task",id:t.id});}}
                style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
              <button onClick={e=>{e.stopPropagation();delTask(t.id);}}
                style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
            </Item>
          </div>
          );
        })}

        {open?(
          <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:8}}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!recMode&&addTask()}
              placeholder="Título da tarefa…" style={{...inputStyle,marginBottom:10}} autoFocus/>
            <AreaProjectSelect state={state} areaId={dArea} projectId={dProject} onArea={setDArea} onProject={setDProject}/>
            <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Prioridade</div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {Object.entries(PRIORITY).map(([k,v])=>(
                <button key={k} onClick={()=>setDPrio(k)}
                  style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11.5,fontWeight:600,
                    fontFamily:"inherit",cursor:"pointer",
                    border:`1px solid ${dPrio===k?(v.color||COL.accent):COL.line}`,
                    background:dPrio===k?(v.bg||COL.accentDim):"transparent",
                    color:dPrio===k?(v.color||COL.accent):COL.mute}}>
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={addTask} style={{...addBtn,flex:1,borderRadius:10,height:42}}>Adicionar</button>
              <button onClick={()=>{setOpen(false);setDPrio("normal");}} style={{...addBtn,flex:1,borderRadius:10,height:42,background:COL.surface2,color:COL.mute}}>Cancelar</button>
            </div>
          </div>
        ):(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setOpen(true)}
              style={{display:"flex",alignItems:"center",gap:8,flex:1,background:"transparent",
                border:`1.5px dashed ${COL.line}`,borderRadius:12,padding:"11px 14px",
                color:COL.faint,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}>
              <Plus size={16}/> Nova tarefa
            </button>
          </div>
        )}
      </Section>

      {total===0&&events.length===0&&overdue.length===0&&
        <Faint style={{marginTop:20}}>Dia livre. Acenda algo pra começar.</Faint>}
    </>
  );
}

// ─── TEMPO ─────────────────────────────────────────────────────
function Tempo({ state, patch }) {
  const [view,    setView]    = useState("mes");
  const [nav,     setNav]     = useState(0);
  const [daySheet,setDaySheet]= useState(null); // dateKey selecionado

  return (
    <>
      <div style={{display:"flex",gap:6,marginBottom:14,marginTop:4}}>
        {["semana","mes","ano"].map(v=>(
          <button key={v} onClick={()=>{setView(v);setNav(0);}}
            style={{flex:1,padding:"8px 0",borderRadius:10,fontSize:12.5,fontWeight:600,
              fontFamily:"inherit",border:"none",
              background:view===v?COL.accentDim:"transparent",
              color:view===v?COL.accent:COL.mute,cursor:"pointer"}}>
            {v==="semana"?"Semana":v==="mes"?"Mês":"Ano"}
          </button>
        ))}
      </div>
      {view==="semana"&&<ViewSemana state={state} nav={nav} setNav={setNav} onDay={setDaySheet}/>}
      {view==="mes"   &&<ViewMes    state={state} nav={nav} setNav={setNav} onDay={setDaySheet}/>}
      {view==="ano"   &&<ViewAno    state={state} nav={nav} setNav={setNav} onDay={setDaySheet}/>}

      {daySheet&&(
        <DaySheet
          dateKey={daySheet}
          state={state}
          patch={patch}
          onClose={()=>setDaySheet(null)}
        />
      )}
    </>
  );
}

function ViewSemana({ state, nav, setNav, onDay }) {
  const days=useMemo(()=>{
    const today=new Date(),dow=today.getDay();
    const mon=new Date(today); mon.setDate(today.getDate()-dow+1+nav*7);
    return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return todayKey(d); });
  },[nav]);
  const label=`${fmtShort(days[0])} – ${fmtShort(days[6])}`;
  return (
    <>
      <NavRow label={label} onPrev={()=>setNav(n=>n-1)} onNext={()=>setNav(n=>n+1)} onReset={()=>setNav(0)} isToday={nav===0}/>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {days.map(k=>{
          const dt=keyToDate(k),dow2=dt.getDay();
          const tasks=state.tasks.filter(t=>t.date===k);
          const habits=state.habits.filter(h=>isHabitActive(h,k));
          const events=state.events.filter(e=>e.date===k);
          const total=tasks.length+habits.length;
          const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length;
          const pct=total?Math.round((done/total)*100):null;
          const isT=k===todayKey();
          return (
            <div key={k} onClick={()=>onDay(k)} style={{background:COL.surface,border:`1px solid ${isT?COL.accent:COL.line}`,
              borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <div style={{width:34,textAlign:"center"}}>
                <div style={{fontSize:10,color:isT?COL.accent:COL.faint,fontWeight:700,textTransform:"uppercase"}}>{WD[dow2]}</div>
                <div style={{fontSize:20,fontWeight:800,color:isT?COL.accent:COL.ink,lineHeight:1.1}}>{dt.getDate()}</div>
              </div>
              <div style={{flex:1}}>
                {events.map(e=><div key={e.id} style={{fontSize:12,color:COL.warn,marginBottom:2}}>{e.time&&<span style={{marginRight:4}}>{e.time}</span>}{e.title}</div>)}
                {tasks.slice(0,2).map(t=><div key={t.id} style={{fontSize:12,color:t.done?COL.faint:COL.mute,textDecoration:t.done?"line-through":"none",marginBottom:2}}>· {t.title}</div>)}
                {tasks.length>2&&<div style={{fontSize:11,color:COL.faint}}>+{tasks.length-2} tarefas</div>}
                {habits.length>0&&<div style={{fontSize:11,color:COL.faint}}>{habits.length} hábito(s)</div>}
              </div>
              {pct!==null&&<MiniRing pct={pct} color={pct>=70?COL.accent:pct>=40?COL.warn:COL.done}/>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function ViewMes({ state, nav, setNav, onDay }) {
  const {year,month}=useMemo(()=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+nav); return {year:d.getFullYear(),month:d.getMonth()}; },[nav]);
  const days=useMemo(()=>{ const first=new Date(year,month,1),last=new Date(year,month+1,0),cells=[]; for(let i=0;i<first.getDay();i++) cells.push(null); for(let d=1;d<=last.getDate();d++) cells.push(todayKey(new Date(year,month,d))); while(cells.length%7!==0) cells.push(null); return cells; },[year,month]);
  const dotMap=useMemo(()=>{ const m={}; state.tasks.forEach(t=>{if(!m[t.date])m[t.date]=[]; if(t.areaId)m[t.date].push(areaOf(state,t.areaId)?.color||COL.accent);}); state.events.forEach(e=>{if(!m[e.date])m[e.date]=[]; if(e.areaId)m[e.date].push(areaOf(state,e.areaId)?.color||COL.warn);}); return m; },[state]);
  const compMap=useMemo(()=>{ const m={}; days.filter(Boolean).forEach(k=>{ const tasks=state.tasks.filter(t=>t.date===k); const habits=state.habits.filter(h=>isHabitActive(h,k)); const total=tasks.length+habits.length; const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length; m[k]=total?Math.round((done/total)*100):null; }); return m; },[days,state]);
  return (
    <>
      <NavRow label={monthName(year,month)} onPrev={()=>setNav(n=>n-1)} onNext={()=>setNav(n=>n+1)} onReset={()=>setNav(0)} isToday={nav===0}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:8}}>
        {WCAP.map(w=><div key={w} style={{textAlign:"center",fontSize:10.5,color:COL.faint,fontWeight:700,padding:"4px 0"}}>{w}</div>)}
        {days.map((k,i)=>{
          if(!k) return <div key={`e${i}`}/>;
          const dt=keyToDate(k),isT=k===todayKey(),pct=compMap[k],dots=(dotMap[k]||[]).slice(0,3);
          const bg=pct===null?COL.surface:pct>=70?"#1E3B1E":pct>=40?"#3B2C10":"#2A1A1A";
          return (
            <div key={k} onClick={()=>onDay(k)} style={{background:isT?COL.accentDim:bg,border:`1px solid ${isT?COL.accent:COL.line}`,
              borderRadius:8,padding:"6px 4px",textAlign:"center",minHeight:52,display:"flex",
              flexDirection:"column",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
              <div style={{fontSize:12.5,fontWeight:isT?800:500,color:isT?COL.accent:COL.ink}}>{dt.getDate()}</div>
              <div style={{display:"flex",gap:2,justifyContent:"center"}}>{dots.map((c,j)=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:c}}/>)}</div>
              {pct!==null&&<div style={{fontSize:9,color:COL.faint}}>{pct}%</div>}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}>
        {state.areas.map(a=><div key={a.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:COL.mute}}><AreaDot color={a.color}/>{a.name}</div>)}
      </div>
    </>
  );
}

function ViewAno({ state, nav, setNav, onDay }) {
  const year=useMemo(()=>new Date().getFullYear()+nav,[nav]);
  const MONTHS=useMemo(()=>Array.from({length:12},(_,m)=>{ const first=new Date(year,m,1),last=new Date(year,m+1,0),cells=[]; for(let i=0;i<first.getDay();i++) cells.push(null); for(let d=1;d<=last.getDate();d++) cells.push(todayKey(new Date(year,m,d))); return {m,name:new Date(year,m,1).toLocaleDateString("pt-BR",{month:"short"}),cells}; }),[year]);
  const compMap=useMemo(()=>{ const m={}; for(let mo=0;mo<12;mo++){ const last=new Date(year,mo+1,0).getDate(); for(let d=1;d<=last;d++){ const k=todayKey(new Date(year,mo,d)); const tasks=state.tasks.filter(t=>t.date===k); const habits=state.habits.filter(h=>isHabitActive(h,k)); const total=tasks.length+habits.length; const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length; m[k]=total?Math.round((done/total)*100):null; }} return m; },[year,state]);
  return (
    <>
      <NavRow label={String(year)} onPrev={()=>setNav(n=>n-1)} onNext={()=>setNav(n=>n+1)} onReset={()=>setNav(0)} isToday={nav===0}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {MONTHS.map(({m,name,cells})=>(
          <div key={m} style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:10,padding:"8px 6px"}}>
            <div style={{fontSize:11,fontWeight:700,color:COL.accent,marginBottom:5,textTransform:"capitalize"}}>{name}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
              {cells.map((k,i)=>{ if(!k) return <div key={`e${m}-${i}`} style={{height:7}}/>; const isT=k===todayKey(),pct=compMap[k]; const bg=isT?COL.accent:pct===null?COL.surface2:pct>=70?"#2A4A2A":pct>=40?"#4A3510":"#3A2020"; return <div key={k} style={{height:7,borderRadius:1,background:bg}}/>; })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── DAY SHEET ─────────────────────────────────────────────────
function DaySheet({ dateKey, state, patch, onClose }) {
  const [tab,     setTab]     = useState("ver");  // ver | tarefa | evento
  const [draft,   setDraft]   = useState("");
  const [dPrio,   setDPrio]   = useState("normal");
  const [dArea,   setDArea]   = useState("");
  const [dProj,   setDProj]   = useState("");
  const [dTime,   setDTime]   = useState(()=>defaultTime());

  const dow     = keyToDate(dateKey).getDay();
  const tasks   = state.tasks.filter(t=>t.date===dateKey);
  const events  = state.events.filter(e=>e.date===dateKey).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  const habits  = state.habits.filter(h=>isHabitActive(h,dateKey));
  const isToday = dateKey===todayKey();

  const addTask = () => {
    const t=draft.trim(); if(!t) return;
    patch(s=>s.tasks.push({id:uid(),title:t,date:dateKey,done:false,areaId:dArea||null,projectId:dProj||null,priority:dPrio}));
    setDraft(""); setTab("ver");
  };
  const addEvent = () => {
    const t=draft.trim(); if(!t) return;
    patch(s=>s.events.push({id:uid(),title:t,date:dateKey,time:dTime,areaId:dArea||null,projectId:dProj||null}));
    setDraft(""); setTab("ver");
  };
  const toggleTask  = id => patch(s=>{const x=s.tasks.find(t=>t.id===id);x.done=!x.done;});
  const toggleHabit = id => patch(s=>{const h=s.habits.find(x=>x.id===id);h.log[dateKey]=!h.log[dateKey];});

  const IS=inputStyle, AB=addBtn;

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",animation:"fadeIn .2s ease"}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:COL.surface,borderRadius:"20px 20px 0 0",
          paddingBottom:"max(env(safe-area-inset-bottom),24px)",
          animation:"fadeUp .25s ease both",maxHeight:"85vh",display:"flex",flexDirection:"column"}}>

        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:COL.line}}/>
        </div>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 12px",borderBottom:`1px solid ${COL.line}`}}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:isToday?COL.accent:COL.ink}}>
              {isToday?"Hoje":fmtShort(dateKey)}
            </div>
            <div style={{fontSize:12,color:COL.faint,marginTop:2}}>
              {tasks.length} tarefa(s) · {events.length} evento(s) · {habits.length} hábito(s)
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setTab("tarefa")}
              style={{background:tab==="tarefa"?COL.accentDim:COL.surface2,color:tab==="tarefa"?COL.accent:COL.mute,
                border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
              + Tarefa
            </button>
            <button onClick={()=>setTab("evento")}
              style={{background:tab==="evento"?COL.accentDim:COL.surface2,color:tab==="evento"?COL.accent:COL.mute,
                border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
              + Evento
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>

          {/* Form tarefa */}
          {tab==="tarefa"&&(
            <div style={{background:COL.surface2,borderRadius:12,padding:14,marginBottom:12}}>
              <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                placeholder="Título da tarefa…" style={{...IS,marginBottom:10}} autoFocus/>
              <AreaProjectSelect state={state} areaId={dArea} projectId={dProj} onArea={setDArea} onProject={setDProj}/>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {Object.entries(PRIORITY).map(([k,v])=>(
                  <button key={k} onClick={()=>setDPrio(k)}
                    style={{flex:1,padding:"6px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                      border:`1px solid ${dPrio===k?(v.color||COL.accent):COL.line}`,
                      background:dPrio===k?(v.bg||COL.accentDim):"transparent",
                      color:dPrio===k?(v.color||COL.accent):COL.mute}}>
                    {v.label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addTask} style={{...AB,flex:1,height:42,borderRadius:10}}>Adicionar</button>
                <button onClick={()=>setTab("ver")} style={{...AB,flex:1,height:42,borderRadius:10,background:COL.surface,color:COL.mute}}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Form evento */}
          {tab==="evento"&&(
            <div style={{background:COL.surface2,borderRadius:12,padding:14,marginBottom:12}}>
              <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEvent()}
                placeholder="Título do evento…" style={{...IS,marginBottom:10}} autoFocus/>
              <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                <div style={{fontSize:12,color:COL.faint,flexShrink:0}}>Horário</div>
                <input type="time" value={dTime} onChange={e=>setDTime(e.target.value)}
                  style={{...IS,flex:1,padding:"8px 12px"}}/>
              </div>
              <AreaProjectSelect state={state} areaId={dArea} projectId={dProj} onArea={setDArea} onProject={setDProj}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={addEvent} style={{...AB,flex:1,height:42,borderRadius:10}}>Adicionar</button>
                <button onClick={()=>setTab("ver")} style={{...AB,flex:1,height:42,borderRadius:10,background:COL.surface,color:COL.mute}}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Eventos */}
          {events.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:COL.faint,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Eventos</div>
              {events.map(e=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:10,background:COL.surface2,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:700,color:COL.warn,width:38}}>{e.time||"—"}</div>
                  <div style={{flex:1,fontSize:13}}>{e.title}</div>
                  {e.areaId&&<AreaDot color={areaOf(state,e.areaId)?.color} size={8}/>}
                </div>
              ))}
            </>
          )}

          {/* Tarefas */}
          {tasks.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:COL.faint,textTransform:"uppercase",letterSpacing:1,marginBottom:6,marginTop:events.length?12:0}}>Tarefas</div>
              {tasks.map(t=>(
                <div key={t.id} onClick={()=>toggleTask(t.id)} style={{display:"flex",alignItems:"center",gap:10,background:COL.surface2,borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer"}}>
                  <Toggle on={t.done} color={areaOf(state,t.areaId)?.color}/>
                  <div style={{flex:1,fontSize:13,color:t.done?COL.mute:COL.ink,textDecoration:t.done?"line-through":"none"}}>{t.title}</div>
                </div>
              ))}
            </>
          )}

          {/* Hábitos */}
          {habits.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:COL.faint,textTransform:"uppercase",letterSpacing:1,marginBottom:6,marginTop:tasks.length||events.length?12:0}}>Hábitos</div>
              {habits.map(h=>{
                const on=!!h.log[dateKey];
                return (
                  <div key={h.id} onClick={()=>toggleHabit(h.id)} style={{display:"flex",alignItems:"center",gap:10,background:COL.surface2,borderRadius:10,padding:"10px 12px",marginBottom:6,cursor:"pointer"}}>
                    <Toggle on={on} color={areaOf(state,h.areaId)?.color}/>
                    <div style={{flex:1,fontSize:13,color:on?COL.mute:COL.ink,textDecoration:on?"line-through":"none"}}>{h.title}</div>
                  </div>
                );
              })}
            </>
          )}

          {tasks.length===0&&events.length===0&&habits.length===0&&tab==="ver"&&(
            <div style={{textAlign:"center",padding:"24px 0",color:COL.faint,fontSize:13}}>
              Dia vazio. Toque em "+ Tarefa" ou "+ Evento" pra adicionar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavRow({ label, onPrev, onNext, onReset, isToday }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <IconBtn onClick={onPrev}><ChevronLeft size={18}/></IconBtn>
      <button onClick={onReset} style={{background:"none",border:"none",color:isToday?COL.accent:COL.ink,fontWeight:700,fontSize:14,fontFamily:"inherit",textTransform:"capitalize",cursor:"pointer"}}>{label}</button>
      <IconBtn onClick={onNext}><ChevronRight size={18}/></IconBtn>
    </div>
  );
}
function MiniRing({ pct, color }) {
  const r=14,c=2*Math.PI*r;
  return (
    <svg width="36" height="36" style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx="18" cy="18" r={r} fill="none" stroke={COL.surface2} strokeWidth="4"/>
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c-(c*pct)/100}
        style={{transition:"stroke-dashoffset .4s ease"}}/>
    </svg>
  );
}

// ─── HÁBITOS ───────────────────────────────────────────────────
function Habitos({ state, patch, onEdit }) {
  const [draft,setDraft]=useState(""); const [dDays,setDDays]=useState([1,2,3,4,5,6,0]);
  const [dArea,setDArea]=useState(""); const [dProject,setDProject]=useState("");
  const [dStart,setDStart]=useState(todayKey()); const [dEnd,setDEnd]=useState("");
  const [hasEnd,setHasEnd]=useState(false); const [open,setOpen]=useState(false);
  const resetForm=()=>{ setDraft(""); setDArea(""); setDProject(""); setDStart(todayKey()); setDEnd(""); setHasEnd(false); setOpen(false); };
  const add=()=>{ const t=draft.trim(); if(!t)return; patch(s=>s.habits.push({id:uid(),title:t,days:[...dDays],log:{},areaId:dArea||null,projectId:dProject||null,startDate:dStart||todayKey(),endDate:hasEnd&&dEnd?dEnd:null})); resetForm(); };
  const del=id=>patch(s=>{s.habits=s.habits.filter(h=>h.id!==id);});
  const streak=h=>{ let n=0; for(let i=0;i<90;i++){ const d=new Date(); d.setDate(d.getDate()-i); const k=todayKey(d); if(!isHabitActive(h,k))continue; if(h.log[k])n++; else break; } return n; };
  const fmtEnd=h=>{ if(!h.endDate)return"sem fim"; const diff=Math.ceil((keyToDate(h.endDate)-new Date())/(864e5)); if(diff<0)return"encerrado"; if(diff===0)return"termina hoje"; return`até ${h.endDate.split("-").reverse().join("/")}`; };
  return (
    <>
      <Section label="Seus hábitos">
        {state.habits.length===0&&<Faint>Nenhum hábito ainda.</Faint>}
        {state.habits.map(h=>{ const s2=streak(h),area=areaOf(state,h.areaId),ended=h.endDate&&todayKey()>h.endDate; return (
          <Item key={h.id} className="row" style={{opacity:ended?.5:1}}>
            {area&&<AreaDot color={area.color} size={10}/>}
            <div style={{flex:1}}>
              <div style={{fontWeight:500,color:ended?COL.mute:COL.ink}}>{h.title}</div>
              <div style={{fontSize:11,color:COL.faint,marginTop:2}}>
                {h.days.length===7?"todo dia":h.days.map(d=>WD[d]).join(" · ")}
                {" · "}<span style={{color:ended?COL.warn:COL.faint}}>{fmtEnd(h)}</span>
              </div>
            </div>
            {s2>0&&!ended&&<div style={{display:"flex",alignItems:"center",gap:3,color:COL.warn,fontSize:13,fontWeight:700}}><Flame size={13}/>{s2}</div>}
            <button onClick={()=>onEdit({type:"habit",id:h.id})} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
            <button onClick={()=>del(h.id)} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
          </Item>
        );})}
      </Section>
      {open?(
        <Section label="Novo hábito">
          <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Ex: meditar 10 min" style={{...inputStyle,marginBottom:10}} autoFocus/>
          <AreaProjectSelect state={state} areaId={dArea} projectId={dProject} onArea={setDArea} onProject={setDProject}/>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Dias da semana</div>
          <div style={{display:"flex",gap:5,marginBottom:12}}>
            {WD.map((w,i)=>{ const on=dDays.includes(i); return (<button key={i} onClick={()=>setDDays(p=>on?p.filter(x=>x!==i):[...p,i])} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",border:`1px solid ${on?COL.accent:COL.line}`,background:on?COL.accentDim:"transparent",color:on?COL.accent:COL.mute,cursor:"pointer"}}>{w}</button>); })}
          </div>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Período</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            <div>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
              <input type="date" value={dStart} onChange={e=>setDStart(e.target.value)}
                style={{...inputStyle,width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim (opcional)</div>
              {hasEnd?(
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="date" value={dEnd} onChange={e=>setDEnd(e.target.value)}
                    min={dStart} style={{...inputStyle,flex:1}}/>
                  <button onClick={()=>{setHasEnd(false);setDEnd("");}}
                    style={{background:"none",border:"none",color:COL.faint,cursor:"pointer",padding:4}}>
                    <X size={16}/>
                  </button>
                </div>
              ):(
                <button onClick={()=>setHasEnd(true)}
                  style={{...inputStyle,cursor:"pointer",color:COL.faint,textAlign:"left",
                    display:"flex",alignItems:"center",gap:6,background:COL.surface2}}>
                  <Plus size={14}/> Definir data de fim
                </button>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={add} style={{...addBtn,flex:1,height:42,borderRadius:10}}>Criar</button>
            <button onClick={resetForm} style={{...addBtn,flex:1,height:42,borderRadius:10,background:COL.surface2,color:COL.mute}}>Cancelar</button>
          </div>
        </Section>
      ):(
        <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",border:`1.5px dashed ${COL.line}`,borderRadius:12,padding:"11px 14px",color:COL.faint,fontSize:14,fontFamily:"inherit",cursor:"pointer",marginTop:12}}>
          <Plus size={16}/> Novo hábito
        </button>
      )}

      {/* Tarefas Recorrentes */}
      <TarefasRecorrentes state={state} patch={patch} onEdit={onEdit}/>
    </>
  );
}

function TarefasRecorrentes({ state, patch, onEdit }) {
  const [open,     setOpen]    = useState(false);
  const [draft,    setDraft]   = useState("");
  const [dDays,    setDDays]   = useState([1,2,3,4,5,6,0]);
  const [dArea,    setDArea]   = useState("");
  const [dProject, setDProject]= useState("");
  const [dStart,   setDStart]  = useState(todayKey());
  const [dEnd,     setDEnd]    = useState("");
  const [hasEnd,   setHasEnd]  = useState(false);
  const [dPrio,    setDPrio]   = useState("normal");

  const recTasks = state.tasks.filter(t=>t.recurrent);
  const reset = () => { setDraft(""); setDArea(""); setDProject(""); setDStart(todayKey()); setDEnd(""); setHasEnd(false); setDPrio("normal"); setOpen(false); };

  const add = () => {
    const t=draft.trim(); if(!t) return;
    patch(s=>s.tasks.push({
      id:uid(), title:t, recurrent:true, done:false,
      days:[...dDays], startDate:dStart||todayKey(), endDate:hasEnd&&dEnd?dEnd:null,
      areaId:dArea||null, projectId:dProject||null, priority:dPrio,
      date:dStart||todayKey() // compatibilidade
    }));
    reset();
  };

  const del = id => patch(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});

  const fmtEnd = t => {
    if(!t.endDate) return "sem fim";
    const diff=Math.ceil((keyToDate(t.endDate)-new Date())/(864e5));
    if(diff<0) return "encerrada";
    if(diff===0) return "termina hoje";
    return `até ${t.endDate.split("-").reverse().join("/")}`;
  };

  return (
    <>
      <Section label="Tarefas recorrentes">
        {recTasks.length===0&&<Faint>Nenhuma tarefa recorrente ainda.</Faint>}
        {recTasks.map(t=>{ const ended=t.endDate&&todayKey()>t.endDate; const area=areaOf(state,t.areaId); return (
          <Item key={t.id} className="row" style={{opacity:ended?.5:1}}>
            {area&&<AreaDot color={area.color} size={10}/>}
            <div style={{flex:1}}>
              <div style={{fontWeight:500,color:ended?COL.mute:COL.ink}}>{t.title}</div>
              <div style={{fontSize:11,color:COL.faint,marginTop:2}}>
                {t.days?.length===7?"todo dia":t.days?.map(d=>WD[d]).join(" · ")}
                {" · "}<span style={{color:ended?COL.warn:COL.faint}}>{fmtEnd(t)}</span>
              </div>
            </div>
            <button onClick={()=>onEdit({type:"task",id:t.id})} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
            <button onClick={()=>del(t.id)} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
          </Item>
        );})}
      </Section>

      {open ? (
        <Section label="Nova tarefa recorrente">
          <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ex: Revisar emails, Pagar conta…"
            style={{...inputStyle,marginBottom:10}} autoFocus/>
          <AreaProjectSelect state={state} areaId={dArea} projectId={dProject} onArea={setDArea} onProject={setDProject}/>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Prioridade</div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {Object.entries(PRIORITY).map(([k,v])=>(
              <button key={k} onClick={()=>setDPrio(k)} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                border:`1px solid ${dPrio===k?(v.color||COL.accent):COL.line}`,background:dPrio===k?(v.bg||COL.accentDim):"transparent",color:dPrio===k?(v.color||COL.accent):COL.mute}}>{v.label}</button>
            ))}
          </div>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Dias da semana</div>
          <div style={{display:"flex",gap:5,marginBottom:12}}>
            {WD.map((w,i)=>{ const on=dDays.includes(i); return (<button key={i} onClick={()=>setDDays(p=>on?p.filter(x=>x!==i):[...p,i])} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11,fontWeight:600,fontFamily:"inherit",border:`1px solid ${on?COL.accent:COL.line}`,background:on?COL.accentDim:"transparent",color:on?COL.accent:COL.mute,cursor:"pointer"}}>{w}</button>); })}
          </div>
          <div style={{fontSize:11.5,color:COL.faint,marginBottom:6}}>Período</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            <div>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
              <input type="date" value={dStart} onChange={e=>setDStart(e.target.value)} style={{...inputStyle,width:"100%"}}/>
            </div>
            <div>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim (opcional)</div>
              {hasEnd?(
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="date" value={dEnd} onChange={e=>setDEnd(e.target.value)} min={dStart} style={{...inputStyle,flex:1}}/>
                  <button onClick={()=>{setHasEnd(false);setDEnd("");}} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer",padding:4}}><X size={16}/></button>
                </div>
              ):(
                <button onClick={()=>setHasEnd(true)} style={{...inputStyle,cursor:"pointer",color:COL.faint,textAlign:"left",display:"flex",alignItems:"center",gap:6,background:COL.surface2}}>
                  <Plus size={14}/> Definir data de fim
                </button>
              )}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={add} style={{...addBtn,flex:1,height:42,borderRadius:10}}>Criar</button>
            <button onClick={reset} style={{...addBtn,flex:1,height:42,borderRadius:10,background:COL.surface2,color:COL.mute}}>Cancelar</button>
          </div>
        </Section>
      ) : (
        <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",border:`1.5px dashed ${COL.line}`,borderRadius:12,padding:"11px 14px",color:COL.faint,fontSize:14,fontFamily:"inherit",cursor:"pointer",marginTop:8}}>
          <Plus size={16}/> Nova tarefa recorrente
        </button>
      )}
    </>
  );
}

// ─── ÁREAS ─────────────────────────────────────────────────────
function Areas({ state, patch, onProject }) {
  const [newArea,setNewArea]=useState(""); const [newColor,setNewColor]=useState(AREA_COLORS[0]);
  const [newProject,setNewProject]=useState({}); const [expanded,setExpanded]=useState({});
  const addArea=()=>{ const t=newArea.trim(); if(!t)return; patch(s=>s.areas.push({id:uid(),name:t,color:newColor,projects:[]})); setNewArea(""); setNewColor(AREA_COLORS[Math.floor(Math.random()*AREA_COLORS.length)]); };
  const delArea=id=>patch(s=>{ s.areas=s.areas.filter(a=>a.id!==id); ["tasks","habits","events","goals"].forEach(k=>s[k]=s[k].map(x=>x.areaId===id?{...x,areaId:null,projectId:null}:x)); });
  const addProject=aid=>{ const t=(newProject[aid]||"").trim(); if(!t)return; patch(s=>{const a=s.areas.find(a=>a.id===aid);a.projects.push({id:uid(),name:t});}); setNewProject(p=>({...p,[aid]:""})); };
  const delProject=(aid,pid)=>patch(s=>{const a=s.areas.find(a=>a.id===aid);a.projects=a.projects.filter(p=>p.id!==pid);});
  const toggle=id=>setExpanded(e=>({...e,[id]:!e[id]}));
  const countFor=(aid,pid=null)=>{ const t=state.tasks.filter(x=>x.areaId===aid&&(pid===null||x.projectId===pid)).length; const h=state.habits.filter(x=>x.areaId===aid&&(pid===null||x.projectId===pid)).length; return t+h; };
  return (
    <>
      <Section label="Suas áreas">
        {state.areas.length===0&&<Faint>Crie sua primeira área.</Faint>}
        {state.areas.map(a=>{ const isExp=expanded[a.id]; return (
          <div key={a.id} className="row" style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,marginBottom:8,overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer"}} onClick={()=>toggle(a.id)}>
              <AreaDot color={a.color} size={12}/><div style={{flex:1}}><div style={{fontWeight:600}}>{a.name}</div><div style={{fontSize:11,color:COL.faint}}>{countFor(a.id)} itens · {a.projects.length} projeto(s)</div></div>
              <ChevronRight size={16} style={{color:COL.faint,transform:isExp?"rotate(90deg)":"none",transition:"transform .2s"}}/>
              <button onClick={e=>{e.stopPropagation();delArea(a.id);}} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
            </div>
            {isExp&&(
              <div style={{borderTop:`1px solid ${COL.line}`,padding:"10px 14px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:COL.faint,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Projetos</div>
                {a.projects.map(p=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${COL.line}`,cursor:"pointer"}} onClick={()=>onProject({areaId:a.id,projectId:p.id})}><FolderOpen size={13} color={a.color}/><div style={{flex:1,fontSize:13,fontWeight:500}}>{p.name}</div><div style={{fontSize:11,color:COL.faint}}>{countFor(a.id,p.id)} tarefas</div><ChevronRight size={13} color={COL.faint}/></div>))}
                <div style={{display:"flex",gap:8,marginTop:10}}><input value={newProject[a.id]||""} onChange={e=>setNewProject(p=>({...p,[a.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addProject(a.id)} placeholder="Novo projeto…" style={{...inputStyle,fontSize:13}}/><button onClick={()=>addProject(a.id)} style={{...addBtn,width:38,height:38,minWidth:38,borderRadius:8}}><Plus size={15}/></button></div>
              </div>
            )}
          </div>
        );})}
      </Section>
      <Section label="Nova área">
        <input value={newArea} onChange={e=>setNewArea(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addArea()} placeholder="Ex: Espiritual, Trabalho, Saúde…" style={{...inputStyle,marginBottom:10}}/>
        <div style={{marginBottom:10}}><div style={{fontSize:11.5,color:COL.faint,marginBottom:8}}>Cor da área</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{AREA_COLORS.map(c=>(<button key={c} onClick={()=>setNewColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${newColor===c?COL.ink:"transparent"}`,cursor:"pointer"}}/>))}</div></div>
        <button onClick={addArea} style={{...addBtn,width:"100%",height:44,borderRadius:10}}><Plus size={18}/><span style={{marginLeft:6,fontWeight:600}}>Criar área</span></button>
      </Section>
    </>
  );
}

// ─── METAS ─────────────────────────────────────────────────────
function Metas({ state, patch, onEdit }) {
  const [draft,setDraft]=useState(""); const [dArea,setDArea]=useState(""); const [dProject,setDProject]=useState("");
  const add=()=>{ const t=draft.trim(); if(!t)return; patch(s=>s.goals.push({id:uid(),title:t,progress:0,areaId:dArea||null,projectId:dProject||null})); setDraft(""); setDArea(""); setDProject(""); };
  const set=(id,v)=>patch(s=>{s.goals.find(g=>g.id===id).progress=v;});
  const del=id=>patch(s=>{s.goals=s.goals.filter(g=>g.id!==id);});
  return (
    <>
      <Section label="Metas de longo prazo">
        {state.goals.length===0&&<Faint>Defina uma direção.</Faint>}
        {state.goals.map(g=>{ const area=areaOf(state,g.areaId); return (
          <div key={g.id} className="row" style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
              {area&&<AreaDot color={area.color} size={10}/>}
              <div style={{fontWeight:600,flex:1}}>{g.title}</div>
              <div style={{color:COL.accent,fontWeight:800,fontSize:15}}>{g.progress}%</div>
              <button onClick={()=>onEdit({type:"goal",id:g.id})} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
              <button onClick={()=>del(g.id)} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
            </div>
            {area&&<div style={{fontSize:11,color:COL.faint,marginTop:4}}>{area.name}{projectOf(state,g.areaId,g.projectId)?` · ${projectOf(state,g.areaId,g.projectId).name}`:""}</div>}
            <input type="range" min="0" max="100" value={g.progress} onChange={e=>set(g.id,+e.target.value)} style={{width:"100%",marginTop:10,accentColor:area?.color||COL.accent}}/>
          </div>
        );})}
      </Section>
      <Section label="Nova meta">
        <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Ex: Correr 5km, Lançar produto…" style={{...inputStyle,marginBottom:10}}/>
        <AreaProjectSelect state={state} areaId={dArea} projectId={dProject} onArea={setDArea} onProject={setDProject}/>
        <button onClick={add} style={{...addBtn,width:"100%",height:44,borderRadius:10}}><Plus size={18}/><span style={{marginLeft:6,fontWeight:600}}>Criar meta</span></button>
      </Section>
    </>
  );
}

// ─── REVIEW ────────────────────────────────────────────────────
function Review({ state, checkins, onCheckin, recLog }) {
  const [filter,setFilter]=useState("all");
  const tk = todayKey();
  const thisWeek = weekKey();
  const hasCheckinThisWeek = checkins.some(c=>c.week===thisWeek);

  const days7=useMemo(()=>{ const out=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const k=todayKey(d),dow=d.getDay(); const tasks=state.tasks.filter(t=>t.date===k&&(filter==="all"||t.areaId===filter)); const habits=state.habits.filter(h=>isHabitActive(h,k)&&(filter==="all"||h.areaId===filter)); const total=tasks.length+habits.length,done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length; out.push({k,label:WD[dow],pct:total?Math.round((done/total)*100):0,done,total}); } return out; },[state,filter]);
  const avg=Math.round(days7.reduce((a,b)=>a+b.pct,0)/7);

  // streak de dias completos (≥70%)
  const dayStreak = useMemo(()=>{
    let n=0;
    for(let i=0;i<60;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=todayKey(d),dow=d.getDay();
      const tasks=state.tasks.filter(t=>t.date===k);
      const habits=state.habits.filter(h=>isHabitActive(h,k));
      const total=tasks.length+habits.length;
      const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length;
      const pct=total?Math.round((done/total)*100):0;
      if(total>0&&pct>=70) n++; else if(total>0) break;
    }
    return n;
  },[state]);

  const bestHabit=useMemo(()=>[...state.habits].filter(h=>filter==="all"||h.areaId===filter).map(h=>({title:h.title,hits:Object.values(h.log).filter(Boolean).length,area:areaOf(state,h.areaId)})).sort((a,b)=>b.hits-a.hits)[0],[state,filter]);

  const overdueCount = state.tasks.filter(t=>!t.done&&t.date<tk).length;

  return (
    <>
      {/* Filtros por área */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("all")} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,fontFamily:"inherit",border:"none",background:filter==="all"?COL.accentDim:"transparent",color:filter==="all"?COL.accent:COL.mute,cursor:"pointer"}}>Tudo</button>
        {state.areas.map(a=>(<button key={a.id} onClick={()=>setFilter(a.id)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,fontFamily:"inherit",border:"none",background:filter===a.id?a.color+"33":"transparent",color:filter===a.id?a.color:COL.mute,cursor:"pointer"}}>{a.name}</button>))}
      </div>

      {/* Cards de destaque */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:14,padding:16}}>
          <div style={{fontSize:11,color:COL.mute,marginBottom:4}}>Média 7 dias</div>
          <div style={{fontSize:32,fontWeight:800,color:COL.accent,lineHeight:1}}>{avg}%</div>
        </div>
        <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:14,padding:16}}>
          <div style={{fontSize:11,color:COL.mute,marginBottom:4}}>Dias acesos 🔥</div>
          <div style={{fontSize:32,fontWeight:800,color:COL.warn,lineHeight:1}}>{dayStreak}</div>
          <div style={{fontSize:10,color:COL.faint,marginTop:2}}>seguidos ≥70%</div>
        </div>
      </div>

      {/* Alerta de atrasadas */}
      {overdueCount>0&&(
        <div style={{background:"#1E0E0E",border:"1px solid #5A2020",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
          <AlertTriangle size={16} color="#F87171"/>
          <div style={{flex:1,fontSize:13,color:"#F8B4B4"}}><b>{overdueCount}</b> tarefa{overdueCount>1?"s":""} atrasada{overdueCount>1?"s":""}. Acesse Hoje pra resolver.</div>
        </div>
      )}

      <Section label="O que você fez (e o que não)">
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130,padding:"8px 0"}}>
          {days7.map(d=>(<div key={d.k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}><div style={{fontSize:9,color:COL.faint}}>{d.total?`${d.done}/${d.total}`:"—"}</div><div style={{width:"100%",height:90,background:COL.surface2,borderRadius:6,display:"flex",alignItems:"flex-end",overflow:"hidden"}}><div style={{width:"100%",height:`${d.pct}%`,background:d.pct>=70?COL.accent:d.pct>=40?COL.warn:COL.done,transition:"height .4s ease"}}/></div><div style={{fontSize:10.5,color:COL.mute}}>{d.label}</div></div>))}
        </div>
      </Section>

      {bestHabit&&bestHabit.hits>0&&(<Section label="Hábito destaque"><Item>{bestHabit.area&&<AreaDot color={bestHabit.area.color} size={10}/>}<Flame size={16} color={COL.warn}/><div style={{flex:1,marginLeft:4}}><b>{bestHabit.title}</b> — {bestHabit.hits}× concluído.</div></Item></Section>)}

      {/* Check-in semanal */}
      <Section label="Check-in semanal">
        <div style={{background:COL.surface,border:`1px solid ${hasCheckinThisWeek?COL.done:COL.accent}`,borderRadius:14,padding:16,marginBottom:10}}>
          {hasCheckinThisWeek?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:COL.accentDim,display:"grid",placeItems:"center"}}>
                <Check size={16} color={COL.accent} strokeWidth={3}/>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:14}}>Semana registrada</div>
                <div style={{fontSize:12,color:COL.faint,marginTop:2}}>Você já fez o check-in desta semana.</div>
              </div>
            </div>
          ):(
            <>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <MessageSquare size={20} color={COL.accent}/>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>Como foi sua semana?</div>
                  <div style={{fontSize:12,color:COL.faint,marginTop:2}}>3 perguntas, 2 minutos.</div>
                </div>
              </div>
              <button onClick={onCheckin}
                style={{...addBtn,width:"100%",height:44,borderRadius:10,fontSize:14,fontWeight:700}}>
                Fazer check-in
              </button>
            </>
          )}
        </div>

        {/* Histórico de check-ins */}
        {checkins.length>0&&(
          <div>
            <div style={{fontSize:11.5,color:COL.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Histórico</div>
            {[...checkins].reverse().slice(0,5).map((c,i)=>(
              <div key={i} style={{background:COL.surface2,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:8}}>
                <div style={{fontSize:11,color:COL.accent,fontWeight:700,marginBottom:8}}>Semana de {c.week?.split("-").reverse().join("/")}</div>
                {[
                  {q:"O que foi bem?",   a:c.q1, color:COL.accent},
                  {q:"O que não foi?",   a:c.q2, color:"#F87171"},
                  {q:"O que melhorar?",  a:c.q3, color:COL.warn},
                ].map((r,j)=>r.a&&(
                  <div key={j} style={{marginBottom:8}}>
                    <div style={{fontSize:10.5,color:r.color,fontWeight:700,marginBottom:3}}>{r.q}</div>
                    <div style={{fontSize:13,color:COL.mute,lineHeight:1.5}}>{r.a}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Faint style={{marginTop:16,lineHeight:1.5}}>Barras cheias e acesas = você manteve a chama. Não é sobre 100% todo dia — é sobre não deixar apagar.</Faint>

      {/* Retrospectiva mensal */}
      <RetroMensal state={state} recLog={recLog||{}}/>

      {/* Streak de projetos */}
      <StreakProjetos state={state}/>
    </>
  );
}

// ─── RETROSPECTIVA MENSAL ──────────────────────────────────────
function RetroMensal({ state, recLog }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();

  const stats = useMemo(()=>{
    let total=0, done=0, habitDays=0, habitPossible=0;
    const daysInMonth = new Date(year, month+1, 0).getDate();
    for(let d=1; d<=daysInMonth; d++){
      const k=todayKey(new Date(year,month,d));
      if(k>todayKey()) break;
      const tasks=state.tasks.filter(t=>!t.recurrent&&t.date===k);
      const recTasks=state.tasks.filter(t=>t.recurrent&&isTaskActive(t,k));
      const habits=state.habits.filter(h=>isHabitActive(h,k));
      const t2=tasks.length+recTasks.length+habits.length;
      const d2=tasks.filter(t=>t.done).length
              +recTasks.filter(t=>recLog[`${t.id}_${k}`]).length
              +habits.filter(h=>h.log[k]).length;
      total+=t2; done+=d2;
      if(t2>0){ habitPossible++; if(Math.round((d2/t2)*100)>=70) habitDays++; }
    }
    return { pct: total?Math.round((done/total)*100):0, habitDays, habitPossible, total, done };
  },[state, recLog, year, month]);

  const monthLabel = new Date(year,month,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});

  return (
    <Section label="Retrospectiva mensal">
      <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,textTransform:"capitalize"}}>{monthLabel}</div>
            <div style={{fontSize:11,color:COL.faint,marginTop:2}}>{stats.done} de {stats.total} itens concluídos</div>
          </div>
          <div style={{fontSize:28,fontWeight:800,color:COL.accent}}>{stats.pct}%</div>
        </div>
        <div style={{height:6,background:COL.surface2,borderRadius:3,overflow:"hidden",marginBottom:12}}>
          <div style={{height:"100%",width:`${stats.pct}%`,background:COL.accent,borderRadius:3,transition:"width .4s ease"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:COL.surface2,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:COL.warn}}>{stats.habitDays}</div>
            <div style={{fontSize:10.5,color:COL.faint,marginTop:2}}>dias acesos</div>
          </div>
          <div style={{background:COL.surface2,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:COL.accent}}>{stats.habitPossible>0?Math.round((stats.habitDays/stats.habitPossible)*100):0}%</div>
            <div style={{fontSize:10.5,color:COL.faint,marginTop:2}}>consistência</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── STREAK DE PROJETOS ────────────────────────────────────────
function StreakProjetos({ state }) {
  const projStreaks = useMemo(()=>{
    const result=[];
    state.areas.forEach(area=>{
      area.projects?.forEach(proj=>{
        const tasks=state.tasks.filter(t=>t.projectId===proj.id&&t.areaId===area.id);
        if(tasks.length===0) return;
        const done=tasks.filter(t=>t.done).length;
        const pct=Math.round((done/tasks.length)*100);
        // streak: dias consecutivos com pelo menos 1 tarefa do projeto concluída
        let streak=0;
        for(let i=0;i<30;i++){
          const d=new Date(); d.setDate(d.getDate()-i);
          const k=todayKey(d);
          const hadDone=tasks.some(t=>t.done&&t.date===k);
          if(hadDone) streak++; else break;
        }
        result.push({area,proj,tasks:tasks.length,done,pct,streak});
      });
    });
    return result.sort((a,b)=>b.streak-a.streak).slice(0,5);
  },[state]);

  if(projStreaks.length===0) return null;

  return (
    <Section label="Projetos em destaque">
      {projStreaks.map((p,i)=>(
        <div key={i} style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <AreaDot color={p.area.color} size={10}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>{p.proj.name}</div>
              <div style={{fontSize:11,color:COL.faint}}>{p.area.name}</div>
            </div>
            {p.streak>0&&<div style={{display:"flex",alignItems:"center",gap:3,color:COL.warn,fontSize:13,fontWeight:700}}><Flame size={13}/>{p.streak}d</div>}
            <div style={{fontSize:13,fontWeight:700,color:p.area.color}}>{p.pct}%</div>
          </div>
          <div style={{height:4,background:COL.surface2,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${p.pct}%`,background:p.area.color,borderRadius:2,transition:"width .4s ease"}}/>
          </div>
          <div style={{fontSize:10.5,color:COL.faint,marginTop:4}}>{p.done} de {p.tasks} tarefas</div>
        </div>
      ))}
    </Section>
  );
}

// ─── MODAL CHECK-IN SEMANAL ────────────────────────────────────
function CheckinModal({ state, onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [q1,   setQ1]   = useState("");
  const [q2,   setQ2]   = useState("");
  const [q3,   setQ3]   = useState("");

  const tk = todayKey();
  const wk = weekKey();

  // stats da semana
  const weekStats = useMemo(()=>{
    const days=[]; let totalD=0,totalT=0;
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=todayKey(d),dow=d.getDay();
      const tasks=state.tasks.filter(t=>t.date===k);
      const habits=state.habits.filter(h=>isHabitActive(h,k));
      const total=tasks.length+habits.length;
      const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length;
      totalD+=done; totalT+=total;
      days.push({k,pct:total?Math.round((done/total)*100):null});
    }
    return { pct:totalT?Math.round((totalD/totalT)*100):0, days };
  },[state]);

  const STEPS = [
    { q:"O que foi bem essa semana?",              key:"q1", val:q1, set:setQ1, color:COL.accent,    icon:"✨" },
    { q:"O que não foi como esperado?",            key:"q2", val:q2, set:setQ2, color:"#F87171",     icon:"🎯" },
    { q:"O que você quer melhorar na próxima?",   key:"q3", val:q3, set:setQ3, color:COL.warn,      icon:"🔥" },
  ];

  const cur = STEPS[step];
  const isLast = step === STEPS.length-1;

  const advance = () => {
    if (!cur.val.trim()) return;
    if (isLast) {
      onSave({ week:wk, q1, q2, q3, date:tk });
    } else {
      setStep(s=>s+1);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)",animation:"fadeIn .2s ease"}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:COL.surface,borderRadius:"24px 24px 0 0",
          padding:"24px 20px 40px",animation:"fadeUp .25s ease both"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:16}}>Check-in semanal</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:COL.mute,cursor:"pointer"}}><X size={20}/></button>
        </div>

        {/* Stats rápidas */}
        <div style={{display:"flex",gap:4,marginBottom:20}}>
          {weekStats.days.map((d,i)=>(
            <div key={i} style={{flex:1,height:28,borderRadius:4,
              background:d.pct===null?COL.surface2:d.pct>=70?COL.accent:d.pct>=40?COL.warn:COL.done,
              opacity:d.pct===null?.3:1}}/>
          ))}
        </div>
        <div style={{fontSize:12,color:COL.faint,marginBottom:24,textAlign:"center"}}>
          Você completou <b style={{color:COL.accent}}>{weekStats.pct}%</b> do que planejou essa semana.
        </div>

        {/* Pergunta */}
        <div key={step} style={{animation:"fadeUp .2s ease both"}}>
          {/* Dots */}
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {STEPS.map((_,i)=>(
              <div key={i} style={{flex:i===step?2:1,height:4,borderRadius:2,
                background:i===step?cur.color:i<step?COL.accentDim:COL.line,
                transition:"all .3s ease"}}/>
            ))}
          </div>

          <div style={{fontSize:18,fontWeight:700,marginBottom:16,lineHeight:1.3}}>
            <span style={{marginRight:8}}>{cur.icon}</span>{cur.q}
          </div>
          <textarea value={cur.val} onChange={e=>cur.set(e.target.value)}
            placeholder="Escreva livremente…"
            style={{...inputStyle,height:120,resize:"none",fontSize:14,lineHeight:1.6}}
            autoFocus/>
        </div>

        <button onClick={advance} disabled={!cur.val.trim()}
          style={{...addBtn,width:"100%",height:50,borderRadius:12,marginTop:16,fontSize:15,fontWeight:700,
            background:cur.val.trim()?cur.color||COL.accent:COL.done,
            color:cur.val.trim()?COL.bg:COL.faint,
            opacity:cur.val.trim()?1:.6}}>
          {isLast?"Salvar check-in →":"Próxima →"}
        </button>
      </div>
    </div>
  );
}

// ─── PERFIL ────────────────────────────────────────────────────
function Perfil({ profile, setProfile, state, theme, toggleTheme, patch }) {
  const [editing,    setEditing]    = useState(false);
  const [name,       setName]       = useState("");
  const [age,        setAge]        = useState("");
  const [weight,     setWeight]     = useState("");
  const [height,     setHeight]     = useState("");
  const [showPwa,    setShowPwa]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [confirmRst, setConfirmRst] = useState(false);
  const [importing,  setImporting]  = useState(false);
  const photoRef = useRef();
  const fileRef  = useRef();

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const startEdit = () => {
    setName(profile.name||""); setAge(profile.age||"");
    setWeight(profile.weight||""); setHeight(profile.height||"");
    setEditing(true);
  };
  const saveP = () => { setProfile(p=>({...p,name,age,weight,height})); setEditing(false); };

  const onPhoto = e => {
    const f=e.target.files?.[0]; if(!f)return;
    const r=new FileReader(); r.onload=ev=>setProfile(p=>({...p,photo:ev.target.result})); r.readAsDataURL(f);
  };

  const exportar = () => {
    try {
      const raw=lsGet(DB_KEY); if(!raw){showToast("Nenhum dado.",false);return;}
      const backup = {
        state: JSON.parse(raw),
        notes: loadNotes(),
        recLog: loadRecLog(),
        tags: loadTags(),
        checkins: loadCheckins(),
        version: 2,
        exportDate: todayKey(),
      };
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download=`lume-backup-${todayKey()}.json`; a.click();
      URL.revokeObjectURL(url); showToast("Exportado!");
    } catch { showToast("Erro ao exportar.",false); }
  };

  const exportPDF = () => {
    const tk = todayKey();
    const tasks7 = [];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=todayKey(d);
      const dayTasks=state.tasks.filter(t=>!t.recurrent&&t.date===k);
      if(dayTasks.length>0) tasks7.push({date:k,tasks:dayTasks});
    }

    const accentHex = "#E07A1F";
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Lume — Planejamento ${tk}</title>
<style>
  body{font-family:Georgia,serif;max-width:700px;margin:40px auto;color:#2B2017;padding:0 24px;}
  h1{font-size:28px;font-weight:800;color:${accentHex};margin-bottom:4px;}
  .sub{font-size:13px;color:#8A7868;margin-bottom:32px;}
  h2{font-size:16px;font-weight:700;border-bottom:2px solid #E3D7C5;padding-bottom:6px;margin:24px 0 12px;color:#2B2017;}
  .area-badge{display:inline-block;background:#F1E8DA;border-radius:12px;padding:2px 10px;font-size:11px;color:#8A7868;margin-left:8px;}
  .task{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #F1E8DA;}
  .check{width:16px;height:16px;border-radius:4px;border:2px solid #E3D7C5;flex-shrink:0;margin-top:2px;background:${accentHex};display:grid;place-items:center;}
  .check.open{background:transparent;}
  .done{color:#B3A493;text-decoration:line-through;}
  .sub-list{margin:4px 0 0 26px;font-size:12px;color:#8A7868;}
  .tag{background:#FBE6CE;color:${accentHex};border-radius:20px;padding:1px 8px;font-size:10px;margin-left:4px;}
  .habit-row{display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #F1E8DA;font-size:13px;}
  .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
  .goal-row{padding:8px 0;border-bottom:1px solid #F1E8DA;}
  .prog-bar{height:6px;background:#F1E8DA;border-radius:3px;margin-top:4px;overflow:hidden;}
  .prog-fill{height:100%;background:${accentHex};border-radius:3px;}
  .note-card{background:#FFFDF9;border:1px solid #E3D7C5;border-radius:8px;padding:12px;margin-bottom:8px;}
  .note-title{font-size:14px;font-weight:700;margin-bottom:4px;}
  .note-body{font-size:12px;color:#8A7868;white-space:pre-wrap;line-height:1.5;}
  @media print{body{margin:0;padding:16px;}}
</style>
</head>
<body>
<h1>🔥 Lume</h1>
<div class="sub">Gerado em ${tk.split("-").reverse().join("/")} · ${profile.name||"Meu planejamento"}</div>

<h2>Áreas</h2>
${state.areas.map(a=>`
  <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
    <div class="dot" style="background:${a.color}"></div>
    <strong>${a.name}</strong>
    <span style="font-size:12px;color:#8A7868">${a.projects?.length||0} projeto(s)</span>
  </div>
`).join("")||"<p style='color:#B3A493'>Nenhuma área</p>"}

<h2>Tarefas — últimos 7 dias</h2>
${tasks7.length===0?"<p style='color:#B3A493'>Nenhuma tarefa nos últimos 7 dias</p>":
  tasks7.map(({date,tasks})=>`
    <div style="font-size:11px;font-weight:700;color:#B3A493;text-transform:uppercase;margin:12px 0 6px;">${fmtShort(date)}</div>
    ${tasks.map(t=>`
      <div class="task">
        <div class="check ${t.done?"":"open"}">${t.done?'<span style="color:white;font-size:10px;">✓</span>':""}</div>
        <div>
          <span class="${t.done?"done":""}">${t.title}</span>
          ${(t.tags||[]).map(tg=>`<span class="tag">#${tg}</span>`).join("")}
          ${(t.subtasks||[]).length>0?`<div class="sub-list">${t.subtasks.map(s=>`• ${s.done?"<s>":""}${s.title}${s.done?"</s>":""}`).join("  ")}</div>`:""}
        </div>
      </div>
    `).join("")}
  `).join("")}

<h2>Hábitos</h2>
${state.habits.map(h=>{
  const area=state.areas.find(a=>a.id===h.areaId);
  const hits=Object.values(h.log).filter(Boolean).length;
  return `<div class="habit-row">
    <div class="dot" style="background:${area?.color||accentHex}"></div>
    ${h.title}
    <span style="margin-left:auto;font-size:11px;color:#8A7868">${hits}× concluído</span>
  </div>`;
}).join("")||"<p style='color:#B3A493'>Nenhum hábito</p>"}

<h2>Metas</h2>
${state.goals.map(g=>{
  const area=state.areas.find(a=>a.id===g.areaId);
  return `<div class="goal-row">
    <div style="display:flex;justify-content:space-between;">
      <strong>${g.title}</strong>
      <strong style="color:${accentHex}">${g.progress}%</strong>
    </div>
    ${area?`<span style="font-size:11px;color:#8A7868">${area.name}</span>`:""}
    <div class="prog-bar"><div class="prog-fill" style="width:${g.progress}%"></div></div>
  </div>`;
}).join("")||"<p style='color:#B3A493'>Nenhuma meta</p>"}

<div style="margin-top:40px;font-size:11px;color:#B3A493;text-align:center;">lume · mantenha aceso</div>
</body>
</html>`;

    const win = window.open("","_blank");
    if(!win){ showToast("Permita popups para exportar PDF",false); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 500);
    showToast("PDF aberto para impressão!");
  };

  const onImport = e => {
    const f=e.target.files?.[0]; if(!f)return; setImporting(true);
    const r=new FileReader();
    r.onload=ev=>{
      try {
        const parsed=JSON.parse(ev.target.result);
        // Suporte ao novo formato v2 (com state aninhado) e antigo (direto)
        const s = parsed.version===2 ? parsed.state : parsed;
        if(!s.areas||!s.tasks||!s.habits||!s.events||!s.goals) throw new Error();
        patch(st=>{st.areas=s.areas;st.tasks=s.tasks;st.habits=s.habits;st.events=s.events;st.goals=s.goals;});
        // Restaurar dados extras se existirem
        if(parsed.notes) { saveNotes(parsed.notes); }
        if(parsed.recLog) { saveRecLog(parsed.recLog); }
        if(parsed.tags)   { saveTags(parsed.tags); }
        showToast("Restaurado! Recarregue o app.");
      } catch { showToast("Arquivo inválido.",false); }
      finally { setImporting(false); setConfirmRst(false); if(fileRef.current)fileRef.current.value=""; }
    };
    r.readAsText(f);
  };

  const totalStreak = useMemo(()=>{
    let n=0;
    for(let i=0;i<60;i++){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=todayKey(d);
      const tasks=state.tasks.filter(t=>t.date===k);
      const habits=state.habits.filter(h=>isHabitActive(h,k));
      const total=tasks.length+habits.length;
      const done=tasks.filter(t=>t.done).length+habits.filter(h=>h.log[k]).length;
      if(total>0&&Math.round((done/total)*100)>=70)n++; else if(total>0)break;
    }
    return n;
  },[state]);

  const IS = inputStyle;
  const AB = addBtn;

  const CRow = ({icon:I,title,sub,action,onAction,accent}) => (
    <div style={{display:"flex",alignItems:"center",gap:12,background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:"13px 16px",marginBottom:10}}>
      <div style={{width:34,height:34,borderRadius:9,background:COL.surface2,display:"grid",placeItems:"center",flexShrink:0}}><I size={17} color={accent||COL.accent}/></div>
      <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13.5}}>{title}</div>{sub&&<div style={{fontSize:11,color:COL.faint,marginTop:2}}>{sub}</div>}</div>
      {action&&<button onClick={onAction} style={{background:COL.accentDim,color:COL.accent,border:"none",borderRadius:8,padding:"5px 12px",fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>{action}</button>}
    </div>
  );

  return (
    <>
      {toast&&<div style={{position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:toast.ok?"#1E3B1E":"#3A1414",color:toast.ok?COL.accent:"#F87171",border:`1px solid ${toast.ok?"#2A5A2A":"#5A2020"}`,borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:100,whiteSpace:"nowrap"}}>{toast.ok?"✓":"✕"} {toast.msg}</div>}
      <input ref={photoRef} type="file" accept="image/*" onChange={onPhoto} style={{display:"none"}}/>
      <input ref={fileRef}  type="file" accept=".json"  onChange={onImport} style={{display:"none"}}/>

      {/* Avatar */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 0 24px"}}>
        <div style={{position:"relative",marginBottom:16}}>
          {profile.photo
            ?<img src={profile.photo} alt="foto" style={{width:96,height:96,borderRadius:"50%",objectFit:"cover",border:`3px solid ${COL.accent}`}}/>
            :<div style={{width:96,height:96,borderRadius:"50%",background:COL.accentDim,border:`3px solid ${COL.accent}`,display:"grid",placeItems:"center"}}><User size={40} color={COL.accent}/></div>}
          <button onClick={()=>photoRef.current?.click()} style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:COL.accent,border:`2px solid ${COL.bg}`,display:"grid",placeItems:"center",cursor:"pointer"}}><Camera size={13} color={COL.bg}/></button>
        </div>
        {!editing ? (
          <>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:-0.5}}>{profile.name||"Seu nome"}</div>
            <div style={{fontSize:13,color:COL.mute,marginTop:4}}>
              {[profile.age&&`${profile.age} anos`,profile.weight&&`${profile.weight}kg`,profile.height&&`${profile.height}cm`].filter(Boolean).join(" · ")||"Adicione seus dados"}
            </div>
            <button onClick={startEdit} style={{marginTop:12,background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.mute,borderRadius:20,padding:"6px 16px",fontSize:12,fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <Edit2 size={12}/> Editar perfil
            </button>
          </>
        ) : (
          <div style={{width:"100%",marginTop:8}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome completo" style={{...IS,marginBottom:8}}/>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={age}    onChange={e=>setAge(e.target.value)}    placeholder="Idade"       type="number" style={{...IS,flex:1}}/>
              <input value={weight} onChange={e=>setWeight(e.target.value)} placeholder="Peso (kg)"   type="number" style={{...IS,flex:1}}/>
              <input value={height} onChange={e=>setHeight(e.target.value)} placeholder="Altura (cm)" type="number" style={{...IS,flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={saveP}              style={{...AB,flex:1,height:42,borderRadius:10,fontSize:13,fontWeight:700}}>Salvar</button>
              <button onClick={()=>setEditing(false)} style={{...AB,flex:1,height:42,borderRadius:10,background:COL.surface2,color:COL.mute,fontSize:13}}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
        {[
          {label:"Tarefas",    value:`${state.tasks.filter(t=>t.done).length}/${state.tasks.length}`},
          {label:"Hábitos",    value:state.habits.length},
          {label:"Dias acesos",value:`${totalStreak}🔥`},
        ].map((s,i)=>(
          <div key={i} style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:COL.accent}}>{s.value}</div>
            <div style={{fontSize:10.5,color:COL.faint,marginTop:3}}>{s.label}</div>
          </div>
        ))}
      </div>

      <Section label="Aparência">
        <CRow icon={theme==="dark"?Moon:Sun} title="Tema" sub={theme==="dark"?"Escuro ativo":"Claro ativo"} action="Alternar" onAction={toggleTheme}/>
      </Section>

      <Section label="Backup">
        <CRow icon={Download} title="Exportar backup" sub="Baixa .json com todos os dados" action="Exportar" onAction={exportar}/>
        <CRow icon={FileText} title="Exportar PDF" sub="Relatório de planejamento para impressão" action="PDF" onAction={exportPDF}/>
        {!confirmRst
          ? <CRow icon={Upload} title="Restaurar backup" sub="Importa .json exportado anteriormente" action="Restaurar" onAction={()=>setConfirmRst(true)}/>
          : <div style={{background:"#3A1414",border:"1px solid #5A2020",borderRadius:12,padding:16,marginBottom:10}}>
              <div style={{fontWeight:700,fontSize:14,color:"#F87171",marginBottom:6}}>⚠️ Substitui todos os dados atuais.</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>fileRef.current?.click()} disabled={importing} style={{flex:1,height:42,borderRadius:10,background:"#F87171",color:"#1A0808",border:"none",fontFamily:"inherit",fontWeight:700,fontSize:13,cursor:"pointer"}}>{importing?"Importando…":"Escolher arquivo"}</button>
                <button onClick={()=>setConfirmRst(false)} style={{flex:1,height:42,borderRadius:10,background:COL.surface2,color:COL.mute,border:"none",fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              </div>
            </div>
        }
      </Section>

      <Section label="Instalar como app">
        <CRow icon={Smartphone} title="Instalar no celular" sub="Tela inicial, sem precisar do navegador" action={showPwa?"Fechar":"Ver guia"} onAction={()=>setShowPwa(v=>!v)}/>
        {showPwa&&(
          <div style={{background:COL.surface2,border:`1px solid ${COL.line}`,borderRadius:12,padding:16,marginBottom:10}}>
            {[
              {os:"iPhone (Safari)",steps:["Abra no Safari","Toque Compartilhar ↑","'Adicionar à Tela de Início'","'Adicionar'"]},
              {os:"Android (Chrome)",steps:["Abra no Chrome","Menu ⋮ → 'Adicionar à tela inicial'","'Adicionar'"]},
            ].map(({os,steps})=>(
              <div key={os} style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:COL.accent,marginBottom:6}}>{os}</div>
                {steps.map((s,i)=>(
                  <div key={i} style={{display:"flex",gap:8,marginBottom:4,alignItems:"flex-start"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:COL.accentDim,color:COL.accent,fontSize:9,fontWeight:700,display:"grid",placeItems:"center",flexShrink:0,marginTop:1}}>{i+1}</div>
                    <div style={{fontSize:12,color:COL.mute}}>{s}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section label="Privacidade">
        <CRow icon={Shield} title="100% local" sub="Seus dados ficam só no seu dispositivo."/>
      </Section>

      <div style={{textAlign:"center",marginTop:24,marginBottom:8,color:COL.faint,fontSize:11}}>lume · mantenha aceso · v1.0</div>
    </>
  );
}

// ─── AGENDA ────────────────────────────────────────────────────
function Agenda({ state, patch, onEdit }) {
  const [open,    setOpen]    = useState(false);
  const [draft,   setDraft]   = useState("");
  const [dDate,   setDDate]   = useState(todayKey());
  const [dTime,   setDTime]   = useState(()=>defaultTime());
  const [dArea,   setDArea]   = useState("");
  const [dProj,   setDProj]   = useState("");

  const IS = inputStyle;
  const AB = addBtn;

  const reset = () => { setDraft(""); setDDate(todayKey()); setDTime(defaultTime()); setDArea(""); setDProj(""); setOpen(false); };
  const add = () => {
    const t=draft.trim(); if(!t)return;
    patch(s=>s.events.push({id:uid(),title:t,date:dDate,time:dTime,areaId:dArea||null,projectId:dProj||null}));
    reset();
  };
  const del = id => patch(s=>{s.events=s.events.filter(e=>e.id!==id);});

  const grouped = useMemo(()=>{
    const g={};
    [...state.events].sort((a,b)=>(a.date+"|"+(a.time||"99")).localeCompare(b.date+"|"+(b.time||"99")))
      .forEach(e=>{(g[e.date]=g[e.date]||[]).push(e);});
    return g;
  },[state.events]);

  const tk = todayKey();

  return (
    <>
      {open ? (
        <div style={{background:COL.surface,border:`1px solid ${COL.accent}`,borderRadius:14,padding:16,marginBottom:14,marginTop:8}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>Novo evento</div>
          <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
            placeholder="Título do evento…" style={{...IS,marginBottom:10}} autoFocus/>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input type="date" value={dDate} onChange={e=>setDDate(e.target.value)} style={{...IS,flex:2}}/>
            <input type="time" value={dTime} onChange={e=>setDTime(e.target.value)} style={{...IS,flex:1}}/>
          </div>
          <AreaProjectSelect state={state} areaId={dArea} projectId={dProj} onArea={setDArea} onProject={setDProj}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={add}   style={{...AB,flex:1,height:42,borderRadius:10}}>Adicionar</button>
            <button onClick={reset} style={{...AB,flex:1,height:42,borderRadius:10,background:COL.surface2,color:COL.mute}}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",border:`1.5px dashed ${COL.line}`,borderRadius:12,padding:"12px 14px",color:COL.faint,fontSize:14,fontFamily:"inherit",cursor:"pointer",marginTop:8,marginBottom:6}}>
          <Plus size={16}/> Novo evento
        </button>
      )}

      {Object.keys(grouped).length===0 && <Faint style={{marginTop:12}}>Nenhum evento agendado.</Faint>}
      {Object.entries(grouped).map(([date,evs])=>{
        const isPast=date<tk, isToday=date===tk;
        return (
          <div key={date} style={{marginBottom:16}}>
            <div style={{fontSize:11.5,fontWeight:700,color:isToday?COL.accent:isPast?COL.faint:COL.mute,textTransform:"capitalize",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
              {isToday&&<div style={{width:6,height:6,borderRadius:"50%",background:COL.accent}}/>}
              {fmtShort(date)}
              {isPast&&!isToday&&<span style={{fontSize:10,color:COL.faint}}>(passado)</span>}
            </div>
            {evs.map(e=>(
              <Item key={e.id} className="row" style={{opacity:isPast&&!isToday?.6:1}}>
                <div style={{width:44,textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,color:COL.warn}}>{e.time||"—"}</div></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14}}>{e.title}</div>
                  {e.areaId&&<AreaBadge state={state} areaId={e.areaId} projectId={e.projectId}/>}
                </div>
                <button onClick={()=>onEdit({type:"event",id:e.id})} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
                <button onClick={()=>del(e.id)} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
              </Item>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ─── BUSCA GLOBAL ──────────────────────────────────────────────
function BuscaModal({ state, notes, patch, recLog, toggleRecLog, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef();

  useEffect(() => { setTimeout(()=>inputRef.current?.focus(), 100); }, []);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    const out = [];
    state.tasks.forEach(t => {
      if (t.title.toLowerCase().includes(q))
        out.push({ type:"task", item:t, label:t.title, sub:t.date?.split("-").reverse().join("/"), done:t.done, area:areaOf(state,t.areaId) });
    });
    state.habits.forEach(h => {
      if (h.title.toLowerCase().includes(q))
        out.push({ type:"habit", item:h, label:h.title, sub:"Hábito", area:areaOf(state,h.areaId) });
    });
    state.events.forEach(e => {
      if (e.title.toLowerCase().includes(q))
        out.push({ type:"event", item:e, label:e.title, sub:e.date?.split("-").reverse().join("/")+(e.time?" "+e.time:""), area:areaOf(state,e.areaId) });
    });
    state.goals.forEach(g => {
      if (g.title.toLowerCase().includes(q))
        out.push({ type:"goal", item:g, label:g.title, sub:`Meta · ${g.progress}%`, area:areaOf(state,g.areaId) });
    });
    notes.forEach(n => {
      if ((n.title||"").toLowerCase().includes(q)||(n.content||"").toLowerCase().includes(q))
        out.push({ type:"note", item:n, label:n.title||"Sem título", sub:"Nota · "+n.date?.split("-").reverse().join("/"), area:areaOf(state,n.areaId) });
    });
    return out.slice(0,20);
  }, [q, state, notes]);

  const typeIcon = {task:"✓",habit:"↻",event:"📅",goal:"🎯",note:"📝"};

  return (
    <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",flexDirection:"column"}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:COL.surface,borderRadius:"0 0 20px 20px",
          paddingTop:"max(env(safe-area-inset-top),18px)",maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 16px 12px"}}>
          <Search size={18} color={COL.mute}/>
          <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Buscar tarefas, hábitos, notas…"
            style={{flex:1,background:"transparent",border:"none",outline:"none",
              fontSize:17,color:COL.ink,fontFamily:"inherit"}}/>
          {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer"}}><X size={16}/></button>}
          <button onClick={onClose} style={{background:"none",border:"none",color:COL.mute,fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>Fechar</button>
        </div>
        <div style={{height:1,background:COL.line}}/>
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          {!q&&<div style={{padding:"24px 20px",textAlign:"center",color:COL.faint,fontSize:14}}>Digite para buscar em tudo</div>}
          {q&&results.length===0&&<div style={{padding:"24px 20px",textAlign:"center",color:COL.faint,fontSize:14}}>Nenhum resultado para "{query}"</div>}
          {results.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 20px",
              borderBottom:`1px solid ${COL.line}`,cursor:"pointer"}}
              onClick={()=>onClose()}>
              <div style={{width:28,height:28,borderRadius:8,background:r.area?r.area.color+"22":COL.surface2,
                display:"grid",placeItems:"center",fontSize:14,flexShrink:0}}>
                {typeIcon[r.type]}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,color:r.done?COL.mute:COL.ink,
                  textDecoration:r.done?"line-through":"none",
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</div>
                <div style={{fontSize:11.5,color:COL.faint,marginTop:2}}>
                  {r.area&&<span style={{color:r.area.color,marginRight:6}}>●</span>}
                  {r.sub}
                </div>
              </div>
              {r.type==="task"&&!r.item.recurrent&&(
                <button onClick={e=>{e.stopPropagation();patch(s=>{const t=s.tasks.find(x=>x.id===r.item.id);t.done=!t.done;});}}
                  style={{background:r.done?COL.accent:COL.surface2,border:"none",borderRadius:6,
                    padding:"4px 8px",fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                    color:r.done?COL.bg:COL.mute}}>
                  {r.done?"✓ Feito":"Marcar"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MODO FOCO ─────────────────────────────────────────────────
function FocoMode({ state, cursor, patch, recLog, toggleRecLog, onExit }) {
  const tk = todayKey();
  const allTasks = [
    ...state.tasks.filter(t=>!t.recurrent&&t.date===cursor&&!t.done),
    ...state.tasks.filter(t=>t.recurrent&&isTaskActive(t,cursor)&&!recLog[`${t.id}_${cursor}`]),
  ];
  // top 3: alta prioridade primeiro
  const top3 = [...allTasks].sort((a,b)=>{
    const po={alta:0,media:1,normal:2};
    return (po[a.priority||"normal"])-(po[b.priority||"normal"]);
  }).slice(0,3);

  const total = state.tasks.filter(t=>!t.recurrent&&t.date===cursor).length
              + state.habits.filter(h=>isHabitActive(h,cursor)).length
              + state.tasks.filter(t=>t.recurrent&&isTaskActive(t,cursor)).length;
  const done  = state.tasks.filter(t=>!t.recurrent&&t.date===cursor&&t.done).length
              + state.habits.filter(h=>isHabitActive(h,cursor)&&h.log[cursor]).length
              + state.tasks.filter(t=>t.recurrent&&isTaskActive(t,cursor)&&recLog[`${t.id}_${cursor}`]).length;
  const pct   = total?Math.round((done/total)*100):0;

  const toggle = t => {
    if (t.recurrent) toggleRecLog(t.id, cursor);
    else patch(s=>{const x=s.tasks.find(x=>x.id===t.id);x.done=!x.done;});
  };

  return (
    <div style={{minHeight:"60vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:11,fontWeight:700,color:COL.accent,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>
        ⚡ Modo Foco
      </div>
      <div style={{fontSize:13,color:COL.faint,marginBottom:32}}>Só o que importa agora</div>

      {/* Anel de progresso */}
      <div style={{marginBottom:32}}>
        <svg width="100" height="100" style={{transform:"rotate(-90deg)"}}>
          <circle cx="50" cy="50" r="42" fill="none" stroke={COL.line} strokeWidth="8"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke={COL.accent} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={2*Math.PI*42}
            strokeDashoffset={2*Math.PI*42-(2*Math.PI*42*pct)/100}
            style={{transition:"stroke-dashoffset .5s ease"}}/>
        </svg>
        <div style={{position:"relative",marginTop:-68,fontSize:28,fontWeight:800,color:COL.accent}}>{pct}%</div>
        <div style={{marginTop:32,fontSize:12,color:COL.faint}}>{done} de {total} concluídos</div>
      </div>

      {/* Top 3 tarefas */}
      {top3.length===0?(
        <div style={{padding:"24px",color:COL.accent,fontSize:16,fontWeight:700}}>
          🔥 Tudo feito! Dia aceso.
        </div>
      ):(
        <div style={{width:"100%",maxWidth:360}}>
          {top3.map((t,i)=>(
            <div key={t.id} onClick={()=>toggle(t)} style={{display:"flex",alignItems:"center",gap:14,
              background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:14,
              padding:"16px 18px",marginBottom:10,cursor:"pointer",textAlign:"left"}}>
              <div style={{width:28,height:28,borderRadius:8,background:COL.accentDim,
                display:"grid",placeItems:"center",flexShrink:0,
                fontSize:13,fontWeight:800,color:COL.accent}}>{i+1}</div>
              <div style={{flex:1,fontSize:15,fontWeight:500}}>{t.title}</div>
            </div>
          ))}
          {allTasks.length>3&&(
            <div style={{fontSize:12,color:COL.faint,marginTop:8}}>+{allTasks.length-3} outras tarefas</div>
          )}
        </div>
      )}

      <button onClick={onExit} style={{marginTop:32,background:"transparent",border:`1px solid ${COL.line}`,
        color:COL.mute,borderRadius:20,padding:"8px 24px",fontSize:13,fontFamily:"inherit",cursor:"pointer"}}>
        Sair do foco
      </button>
    </div>
  );
}

// ─── Componentes base ──────────────────────────────────────────
function ProgressRing({ pct, done, total }) {
  const r=26,c=2*Math.PI*r;
  return (
    <div style={{display:"flex",alignItems:"center",gap:16,background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:16,padding:16,margin:"8px 0 4px"}}>
      <svg width="64" height="64" style={{transform:"rotate(-90deg)"}}>
        <circle cx="32" cy="32" r={r} fill="none" stroke={COL.line} strokeWidth="6"/>
        <circle cx="32" cy="32" r={r} fill="none" stroke={COL.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c-(c*pct)/100} style={{transition:"stroke-dashoffset .5s ease"}}/>
      </svg>
      <div>
        <div style={{fontSize:26,fontWeight:800,lineHeight:1}}>{pct}%</div>
        <div style={{fontSize:13,color:COL.mute,marginTop:4}}>{total===0?"nada agendado":`${done} de ${total} concluídos`}</div>
      </div>
    </div>
  );
}
function Section({ label, children }) {
  return (<section style={{marginTop:18}}><div style={{fontSize:11.5,fontWeight:700,color:COL.faint,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{label}</div>{children}</section>);
}
function Item({ children, onClick, clickable, className, style }) {
  return (<div className={className} onClick={onClick} role={clickable?"button":undefined} style={{display:"flex",alignItems:"center",gap:10,background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:COL.shadow,cursor:clickable?"pointer":"default",...style}}>{children}</div>);
}
function Toggle({ on, color }) {
  const c=color||COL.accent;
  return on
    ?<div style={{width:22,height:22,borderRadius:7,background:c,display:"grid",placeItems:"center",animation:"pop .2s ease",flexShrink:0}}><Check size={15} color={COL.bg} strokeWidth={3}/></div>
    :<div style={{width:22,height:22,borderRadius:7,border:`2px solid ${COL.line}`,flexShrink:0}}/>;
}
function Faint({ children, style }) { return <div style={{color:COL.faint,fontSize:13.5,padding:"4px 2px",...style}}>{children}</div>; }
function IconBtn({ children, onClick, "aria-label":al }) {
  return (<button onClick={onClick} aria-label={al} style={{background:"none",border:"none",color:COL.mute,padding:6,display:"grid",placeItems:"center",borderRadius:8,cursor:"pointer"}}>{children}</button>);
}

const inputStyle = { flex:1,background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.ink,borderRadius:10,padding:"11px 13px",fontSize:16,fontFamily:"inherit",outline:"none",width:"100%" };
const addBtn     = { background:COL.accent,color:COL.bg,border:"none",borderRadius:10,width:44,minWidth:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",cursor:"pointer",fontSize:14 };

// ─── Nav ───────────────────────────────────────────────────────
function Nav({ mainTabs, moreTabs, tab, setTab }) {
  const [showMore, setShowMore] = useState(false);
  const isMore = moreTabs.some(t => t.id === tab);

  return (
    <>
      {/* Menu "..." overlay */}
      {showMore && (
        <div style={{position:"fixed",inset:0,zIndex:20}} onClick={()=>setShowMore(false)}>
          <div style={{position:"absolute",bottom:"calc(env(safe-area-inset-bottom) + 72px)",left:"50%",transform:"translateX(-50%)",
            width:"calc(100% - 32px)",maxWidth:448,background:COL.surface,
            border:`1px solid ${COL.line}`,borderRadius:16,padding:8,
            boxShadow:"0 -4px 24px rgba(0,0,0,.3)",animation:"fadeUp .2s ease"}}
            onClick={e=>e.stopPropagation()}>
            {moreTabs.map(t=>{
              const on=tab===t.id, I=t.icon;
              return (
                <button key={t.id} onClick={()=>{setTab(t.id);setShowMore(false);}}
                  style={{display:"flex",alignItems:"center",gap:14,width:"100%",
                    background:on?COL.accentDim:"none",border:"none",borderRadius:10,
                    padding:"12px 16px",color:on?COL.accent:COL.ink,
                    fontFamily:"inherit",fontSize:15,fontWeight:on?700:400,cursor:"pointer"}}>
                  <I size={20} strokeWidth={on?2.4:1.8}/>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,display:"flex",background:`${COL.surface}F2`,
        backdropFilter:"blur(12px)",borderTop:`1px solid ${COL.line}`,
        paddingTop:8,paddingLeft:2,paddingRight:2,
        paddingBottom:"max(env(safe-area-inset-bottom), 14px)",zIndex:10}}>
        {mainTabs.map(t=>{
          const on=tab===t.id, I=t.icon;
          return (
            <button key={t.id} onClick={()=>{setTab(t.id);setShowMore(false);}}
              style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",
                alignItems:"center",gap:3,color:on?COL.accent:COL.faint,
                fontFamily:"inherit",padding:"4px 0",cursor:"pointer"}}>
              <I size={18} strokeWidth={on?2.4:1.8}/>
              <span style={{fontSize:9,fontWeight:on?700:500}}>{t.label}</span>
            </button>
          );
        })}
        {/* Botão "..." */}
        <button onClick={()=>setShowMore(v=>!v)}
          style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,color:isMore||showMore?COL.accent:COL.faint,
            fontFamily:"inherit",padding:"4px 0",cursor:"pointer"}}>
          <MoreHorizontal size={18} strokeWidth={isMore||showMore?2.4:1.8}/>
          <span style={{fontSize:9,fontWeight:isMore||showMore?700:500}}>Mais</span>
        </button>
      </nav>
    </>
  );
}

// ─── TELA DE PROJETO ───────────────────────────────────────────
function ProjetoView({ state, patch, notes, patchNotes, areaId, projectId, onBack, onHome }) {
  const [activeTab, setActiveTab] = useState("tarefas"); // tarefas | notas
  const [draft,     setDraft]     = useState("");
  const [dPrio,     setDPrio]     = useState("normal");
  const [openTask,  setOpenTask]  = useState(false);
  const [editNote,  setEditNote]  = useState(null); // null | {id} | "new"

  const area    = areaOf(state, areaId);
  const project = projectOf(state, areaId, projectId);
  if (!area || !project) { onBack(); return null; }

  const tasks      = state.tasks.filter(t=>t.projectId===projectId&&t.areaId===areaId);
  const projNotes  = notes.filter(n=>n.projectId===projectId&&n.areaId===areaId);
  const total      = tasks.length;
  const done       = tasks.filter(t=>t.done).length;
  const pct        = total ? Math.round((done/total)*100) : 0;

  const addTask = () => {
    const t=draft.trim(); if(!t) return;
    patch(s=>s.tasks.push({id:uid(),title:t,date:todayKey(),done:false,areaId,projectId,priority:dPrio}));
    setDraft(""); setOpenTask(false); setDPrio("normal");
  };
  const toggleTask = id => patch(s=>{const x=s.tasks.find(t=>t.id===id);x.done=!x.done;});
  const delTask    = id => patch(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});
  const sortedTasks = [...tasks].sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    const po={alta:0,media:1,normal:2};
    return (po[a.priority||"normal"])-(po[b.priority||"normal"]);
  });

  const IS=inputStyle, AB=addBtn;

  // Se está editando uma nota, mostra o editor
  if (editNote) {
    return (
      <NoteEditor
        note={editNote==="new" ? null : notes.find(n=>n.id===editNote)}
        areaId={areaId} projectId={projectId}
        area={area}
        onSave={n=>{
          if(editNote==="new") patchNotes(ns=>ns.push({...n,id:uid(),areaId,projectId,date:todayKey()}));
          else patchNotes(ns=>{const i=ns.findIndex(x=>x.id===editNote);if(i>=0)ns[i]={...ns[i],...n};});
          setEditNote(null);
        }}
        onDelete={()=>{ patchNotes(ns=>ns.filter(x=>x.id!==editNote)); setEditNote(null); }}
        onBack={()=>setEditNote(null)}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{padding:"max(env(safe-area-inset-top),18px) 16px 0",
        background:`linear-gradient(${COL.bg},${COL.bg}E0)`,backdropFilter:"blur(8px)",
        position:"sticky",top:0,zIndex:5}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:COL.mute,padding:4,cursor:"pointer"}}>
            <ChevronLeft size={22}/>
          </button>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <AreaDot color={area.color} size={9}/>
              <div style={{fontSize:12,color:COL.mute}}>{area.name}</div>
            </div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:-0.5,marginTop:1}}>{project.name}</div>
          </div>
          <button onClick={onHome}
            style={{background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.mute,
              borderRadius:10,padding:"6px 12px",fontSize:12,fontFamily:"inherit",cursor:"pointer",
              display:"flex",alignItems:"center",gap:5}}>
            <Sun size={13}/> Hoje
          </button>
        </div>

        {/* Progresso */}
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <div style={{fontSize:11.5,color:COL.mute}}>{done} de {total} tarefas</div>
            <div style={{fontSize:11.5,fontWeight:700,color:area.color}}>{pct}%</div>
          </div>
          <div style={{height:5,background:COL.surface2,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:area.color,borderRadius:3,transition:"width .4s ease"}}/>
          </div>
        </div>

        {/* Abas */}
        <div style={{display:"flex",gap:6,paddingBottom:12}}>
          {[{id:"tarefas",label:`Tarefas (${tasks.length})`},{id:"notas",label:`Notas (${projNotes.length})`}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{flex:1,padding:"8px 0",borderRadius:10,fontSize:13,fontWeight:600,
                fontFamily:"inherit",border:"none",cursor:"pointer",
                background:activeTab===t.id?area.color+"22":"transparent",
                color:activeTab===t.id?area.color:COL.mute}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{flex:1,overflowY:"auto",padding:"8px 16px 0",paddingBottom:"max(calc(env(safe-area-inset-bottom)+40px),60px)"}}>

        {/* ── TAREFAS ── */}
        {activeTab==="tarefas" && (
          <>
            {sortedTasks.length===0&&!openTask&&(
              <div style={{textAlign:"center",padding:"40px 20px",color:COL.faint}}>
                <div style={{fontSize:32,marginBottom:12}}>🎯</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Nenhuma tarefa ainda</div>
                <div style={{fontSize:13}}>Adicione a primeira tarefa deste projeto</div>
              </div>
            )}
            {sortedTasks.map(t=>(
              <div key={t.id} className="row" style={{display:"flex",alignItems:"center",gap:10,
                background:COL.surface,border:`1px solid ${t.done?COL.line:area.color+"40"}`,
                borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer"}}
                onClick={()=>toggleTask(t.id)}>
                <Toggle on={t.done} color={area.color}/>
                <div style={{flex:1}}>
                  <div style={{color:t.done?COL.mute:COL.ink,textDecoration:t.done?"line-through":"none",fontSize:14}}>{t.title}</div>
                  {t.priority&&t.priority!=="normal"&&!t.done&&(
                    <div style={{fontSize:9.5,fontWeight:700,color:PRIORITY[t.priority].color,
                      background:PRIORITY[t.priority].bg,padding:"2px 7px",borderRadius:20,
                      display:"inline-block",marginTop:4}}>{PRIORITY[t.priority].label}</div>
                  )}
                </div>
                <button onClick={e=>{e.stopPropagation();delTask(t.id);}} style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
              </div>
            ))}
            {openTask ? (
              <div style={{background:COL.surface,border:`1px solid ${area.color}`,borderRadius:12,padding:14,marginBottom:8}}>
                <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                  placeholder="Título da tarefa…" style={{...IS,marginBottom:10}} autoFocus/>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {Object.entries(PRIORITY).map(([k,v])=>(
                    <button key={k} onClick={()=>setDPrio(k)} style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:11.5,
                      fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                      border:`1px solid ${dPrio===k?(v.color||area.color):COL.line}`,
                      background:dPrio===k?(v.bg||area.color+"22"):"transparent",
                      color:dPrio===k?(v.color||area.color):COL.mute}}>{v.label}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={addTask} style={{...AB,flex:1,borderRadius:10,height:42,background:area.color}}>Adicionar</button>
                  <button onClick={()=>{setOpenTask(false);setDPrio("normal");}} style={{...AB,flex:1,borderRadius:10,height:42,background:COL.surface2,color:COL.mute}}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setOpenTask(true)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",
                background:"transparent",border:`1.5px dashed ${area.color}60`,borderRadius:12,
                padding:"11px 14px",color:area.color,fontSize:14,fontFamily:"inherit",cursor:"pointer",marginTop:4}}>
                <Plus size={16}/> Nova tarefa
              </button>
            )}
          </>
        )}

        {/* ── NOTAS ── */}
        {activeTab==="notas" && (
          <>
            {projNotes.length===0 && (
              <div style={{textAlign:"center",padding:"40px 20px",color:COL.faint}}>
                <div style={{fontSize:32,marginBottom:12}}>📝</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Nenhuma nota ainda</div>
                <div style={{fontSize:13}}>Capture ideias, contexto ou referências do projeto</div>
              </div>
            )}
            {projNotes.map(n=>(
              <div key={n.id} className="row" onClick={()=>setEditNote(n.id)}
                style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:8,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{fontWeight:700,fontSize:14,flex:1,paddingRight:8}}>{n.title||"Sem título"}</div>
                  <div style={{fontSize:10.5,color:COL.faint,flexShrink:0}}>{n.date?.split("-").reverse().join("/")}</div>
                </div>
                {n.content&&<div style={{fontSize:12.5,color:COL.mute,lineHeight:1.5,WebkitLineClamp:2,display:"-webkit-box",WebkitBoxOrient:"vertical",overflow:"hidden"}}>{n.content}</div>}
              </div>
            ))}
            <button onClick={()=>setEditNote("new")} style={{display:"flex",alignItems:"center",gap:8,width:"100%",
              background:"transparent",border:`1.5px dashed ${area.color}60`,borderRadius:12,
              padding:"11px 14px",color:area.color,fontSize:14,fontFamily:"inherit",cursor:"pointer",marginTop:4}}>
              <Plus size={16}/> Nova nota
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ─── EDITOR DE NOTA ────────────────────────────────────────────
function NoteEditor({ note, areaId, projectId, area, onSave, onDelete, onBack }) {
  const [title,   setTitle]   = useState(note?.title||"");
  const [content, setContent] = useState(note?.content||"");
  const isNew = !note;

  const save = () => {
    onSave({ title: title.trim()||"Sem título", content });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
      {/* Header */}
      <div style={{padding:"max(env(safe-area-inset-top),18px) 16px 12px",
        background:COL.bg,borderBottom:`1px solid ${COL.line}`,
        display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:COL.mute,padding:4,cursor:"pointer"}}>
          <ChevronLeft size={22}/>
        </button>
        <div style={{flex:1,fontSize:13,color:COL.mute}}>
          <span style={{color:area.color}}>{area.name}</span>
        </div>
        {!isNew&&(
          <button onClick={onDelete} style={{background:"none",border:"none",color:"#F87171",padding:6,cursor:"pointer"}}>
            <Trash2 size={17}/>
          </button>
        )}
        <button onClick={save}
          style={{background:area.color,color:"#fff",border:"none",borderRadius:10,
            padding:"7px 18px",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
          Salvar
        </button>
      </div>

      {/* Editor */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",paddingBottom:"max(env(safe-area-inset-bottom),24px)"}}>
        <input value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Título da nota…"
          style={{width:"100%",background:"transparent",border:"none",outline:"none",
            fontSize:22,fontWeight:800,color:COL.ink,fontFamily:"inherit",
            letterSpacing:-0.5,marginBottom:12}}/>
        <div style={{fontSize:11.5,color:COL.faint,marginBottom:16}}>
          {todayKey().split("-").reverse().join("/")} · {area.name}
        </div>
        <textarea value={content} onChange={e=>setContent(e.target.value)}
          placeholder="Escreva aqui… ideias, contexto, referências, o que precisar."
          style={{width:"100%",background:"transparent",border:"none",outline:"none",
            fontSize:15,color:COL.mute,fontFamily:"inherit",lineHeight:1.7,
            minHeight:300,resize:"none"}}/>
      </div>
    </div>
  );
}

// ─── NOTAS (aba global) ────────────────────────────────────────
function Notas({ state, notes, patchNotes }) {
  const [filterArea, setFilterArea] = useState("all");
  const [editNote,   setEditNote]   = useState(null); // null | "new" | id
  const [newArea,    setNewArea]    = useState("");
  const [newProj,    setNewProj]    = useState("");

  const filtered = notes.filter(n=>filterArea==="all"||n.areaId===filterArea)
    .sort((a,b)=>b.date?.localeCompare(a.date||"")||0);

  const area = editNote&&editNote!=="new" ? areaOf(state, notes.find(n=>n.id===editNote)?.areaId) : areaOf(state, newArea);

  if (editNote) {
    const existingNote = editNote==="new" ? null : notes.find(n=>n.id===editNote);
    const noteArea = editNote==="new" ? areaOf(state, newArea) : areaOf(state, existingNote?.areaId);
    return (
      <NoteEditor
        note={existingNote}
        areaId={editNote==="new"?newArea:existingNote?.areaId}
        projectId={editNote==="new"?newProj:existingNote?.projectId}
        area={noteArea||{name:"Geral",color:COL.accent}}
        onSave={n=>{
          if(editNote==="new") patchNotes(ns=>ns.push({...n,id:uid(),areaId:newArea||null,projectId:newProj||null,date:todayKey()}));
          else patchNotes(ns=>{const i=ns.findIndex(x=>x.id===editNote);if(i>=0)ns[i]={...ns[i],...n};});
          setEditNote(null);
        }}
        onDelete={()=>{ patchNotes(ns=>ns.filter(x=>x.id!==editNote)); setEditNote(null); }}
        onBack={()=>setEditNote(null)}
      />
    );
  }

  return (
    <>
      {/* Filtros por área */}
      <div style={{display:"flex",gap:6,marginBottom:14,marginTop:4,flexWrap:"wrap"}}>
        <button onClick={()=>setFilterArea("all")} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,
          fontFamily:"inherit",border:"none",background:filterArea==="all"?COL.accentDim:"transparent",
          color:filterArea==="all"?COL.accent:COL.mute,cursor:"pointer"}}>Todas</button>
        {state.areas.map(a=>(
          <button key={a.id} onClick={()=>setFilterArea(a.id)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,
            fontFamily:"inherit",border:"none",background:filterArea===a.id?a.color+"33":"transparent",
            color:filterArea===a.id?a.color:COL.mute,cursor:"pointer"}}>{a.name}</button>
        ))}
      </div>

      {/* Lista de notas */}
      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:COL.faint}}>
          <div style={{fontSize:32,marginBottom:12}}>📝</div>
          <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Nenhuma nota ainda</div>
          <div style={{fontSize:13}}>Capture pensamentos, ideias e referências</div>
        </div>
      )}
      {filtered.map(n=>{
        const a=areaOf(state,n.areaId), p=projectOf(state,n.areaId,n.projectId);
        return (
          <div key={n.id} className="row" onClick={()=>setEditNote(n.id)}
            style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:8,cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{fontWeight:700,fontSize:14,flex:1,paddingRight:8}}>{n.title||"Sem título"}</div>
              <div style={{fontSize:10.5,color:COL.faint,flexShrink:0}}>{n.date?.split("-").reverse().join("/")}</div>
            </div>
            {n.content&&<div style={{fontSize:12.5,color:COL.mute,lineHeight:1.5,WebkitLineClamp:2,display:"-webkit-box",WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:8}}>{n.content}</div>}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {a&&<><AreaDot color={a.color} size={7}/><span style={{fontSize:11,color:COL.faint}}>{a.name}</span></>}
              {p&&<span style={{fontSize:11,color:COL.faint}}>· {p.name}</span>}
            </div>
          </div>
        );
      })}

      {/* Nova nota */}
      <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginTop:8}}>
        <div style={{fontSize:11.5,color:COL.faint,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Nova nota</div>
        <AreaProjectSelect state={state} areaId={newArea} projectId={newProj} onArea={setNewArea} onProject={setNewProj}/>
        <button onClick={()=>setEditNote("new")} style={{...addBtn,width:"100%",height:44,borderRadius:10}}>
          <Plus size={18}/><span style={{marginLeft:6,fontWeight:600}}>Criar nota</span>
        </button>
      </div>
    </>
  );
}
