import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Check, Plus, Repeat, Calendar, Target, Sun, TrendingUp,
  ChevronLeft, ChevronRight, Flame, Trash2, Moon, Layers,
  X, FolderOpen, LayoutGrid, Edit2, Settings, Smartphone,
  Bell, Download, Shield, ArrowRight, Sparkles, Upload, User, Camera,
  AlertCircle, ChevronDown, MessageSquare, AlertTriangle
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
const WD        = ["dom","seg","ter","qua","qui","sex","sáb"];
const WCAP      = ["D","S","T","Q","Q","S","S"];

// ─── Hábito ativo ──────────────────────────────────────────────
const isHabitActive = (h,k) => {
  if (!h.days.includes(keyToDate(k).getDay())) return false;
  if (h.startDate && k < h.startDate) return false;
  if (h.endDate   && k > h.endDate)   return false;
  return true;
};

// ─── Cores de área ─────────────────────────────────────────────
const AREA_COLORS = ["#FF9D42","#5B8EFF","#A78BFA","#34D399","#F87171","#FBBF24","#F472B6","#22D3EE"];

// ─── Estado vazio (novo usuário pós-onboarding) ────────────────
const emptyState = () => ({ areas:[], tasks:[], habits:[], events:[], goals:[] });

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

  useEffect(() => {
    setState(loadState() || emptyState());
    setTheme(loadTheme());
    setOnboarded(loadOnboarded());
    setProfile(loadProfile());
    setCheckins(loadCheckins());
  }, []);

  useEffect(() => { if (state) saveState(state); }, [state]);
  useEffect(() => { saveTheme(theme); }, [theme]);
  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { saveCheckins(checkins); }, [checkins]);

  COL = THEMES[theme] || THEMES.dark;

  const patch       = useCallback(fn => setState(s => { const n=structuredClone(s); fn(n); return n; }), []);
  const toggleTheme = () => setTheme(t => t==="dark"?"light":"dark");
  const finishOnboard = (initialState) => {
    setState(initialState);
    saveOnboarded();
    setOnboarded(true);
  };

  if (!state) return <Splash />;
  if (!onboarded) return <Onboarding theme={theme} toggleTheme={toggleTheme} onDone={finishOnboard} />;

  const tabs = [
    { id:"hoje",    label:"Hoje",    icon:Sun        },
    { id:"tempo",   label:"Tempo",   icon:LayoutGrid },
    { id:"agenda",  label:"Agenda",  icon:Calendar   },
    { id:"habitos", label:"Hábitos", icon:Repeat     },
    { id:"areas",   label:"Áreas",   icon:Layers     },
    { id:"metas",   label:"Metas",   icon:Target     },
    { id:"review",  label:"Review",  icon:TrendingUp },
    { id:"perfil",  label:"Perfil",  icon:User       },
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
        input::placeholder{color:${COL.faint}}
        select{appearance:none;-webkit-appearance:none;}
        input[type=range]{accent-color:${COL.accent};}
        ::-webkit-scrollbar{display:none;}
        html{height:-webkit-fill-available;}
        body{min-height:-webkit-fill-available;}
      `}</style>

      <Header tab={tab} cursor={cursor} setCursor={setCursor} theme={theme} toggleTheme={toggleTheme} profile={profile} onPerfil={()=>setTab("perfil")} />

      <main style={{ flex:1,overflowY:"auto",padding:"8px 16px 110px" }}>
        {tab==="hoje"    && <Hoje    state={state} cursor={cursor} patch={patch} onEdit={setEditTarget}/>}
        {tab==="tempo"   && <Tempo   state={state}/>}
        {tab==="agenda"  && <Agenda  state={state} patch={patch} onEdit={setEditTarget}/>}
        {tab==="habitos" && <Habitos state={state} patch={patch} onEdit={setEditTarget}/>}
        {tab==="areas"   && <Areas   state={state} patch={patch}/>}
        {tab==="metas"   && <Metas   state={state} patch={patch} onEdit={setEditTarget}/>}
        {tab==="review"  && <Review  state={state} checkins={checkins} onCheckin={()=>setShowCheckin(true)}/>}
        {tab==="perfil"  && <Perfil  profile={profile} setProfile={setProfile} state={state} theme={theme} toggleTheme={toggleTheme} patch={patch}/>}
      </main>

      <Nav tabs={tabs} tab={tab} setTab={setTab}/>

      {editTarget && (
        <EditModal
          target={editTarget}
          state={state}
          patch={patch}
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
function Header({ tab, cursor, setCursor, theme, toggleTheme, profile, onPerfil }) {
  const shift = n => { const [y,m,d]=cursor.split("-").map(Number); setCursor(todayKey(new Date(y,m-1,d+n))); };
  const isToday = cursor===todayKey();
  return (
    <header style={{padding:"env(safe-area-inset-top, 18px) 16px 6px",paddingTop:"max(env(safe-area-inset-top), 18px)",position:"sticky",top:0,
      background:`linear-gradient(${COL.bg}, ${COL.bg}E0)`,backdropFilter:"blur(8px)",zIndex:5}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        {/* Avatar / Logo */}
        <button onClick={onPerfil} style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          {profile?.photo ? (
            <img src={profile.photo} alt="perfil"
              style={{width:34,height:34,borderRadius:"50%",objectFit:"cover",border:`2px solid ${COL.accent}`}}/>
          ) : (
            <div style={{width:34,height:34,borderRadius:"50%",background:COL.accentDim,border:`2px solid ${COL.accent}`,display:"grid",placeItems:"center"}}>
              <Flame size={16} color={COL.accent}/>
            </div>
          )}
          {profile?.name && (
            <div style={{fontWeight:700,fontSize:15,letterSpacing:-0.3,color:COL.ink}}>
              {profile.name.split(" ")[0]}
            </div>
          )}
          {!profile?.name && (
            <div style={{fontWeight:800,fontSize:20,letterSpacing:-0.5,color:COL.ink}}>lume</div>
          )}
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
function EditModal({ target, state, patch, onClose }) {
  const { type, id } = target;
  const item = type==="task"  ? state.tasks.find(t=>t.id===id)
             : type==="habit" ? state.habits.find(h=>h.id===id)
             : type==="goal"  ? state.goals.find(g=>g.id===id)
             : type==="event" ? state.events.find(e=>e.id===id)
             : null;
  if (!item) return null;

  const [title,   setTitle]   = useState(item.title);
  const [areaId,  setAreaId]  = useState(item.areaId||"");
  const [projId,  setProjId]  = useState(item.projectId||"");
  const [prio,    setPrio]    = useState(item.priority||"normal");
  // hábito extra
  const [days,    setDays]    = useState(item.days||[]);
  const [start,   setStart]   = useState(item.startDate||todayKey());
  const [end,     setEnd]     = useState(item.endDate||"");
  const [hasEnd,  setHasEnd]  = useState(!!item.endDate);
  // meta extra
  const [prog,    setProg]    = useState(item.progress||0);
  // evento extra
  const [date,    setDate]    = useState(item.date||todayKey());
  const [time,    setTime]    = useState(item.time||"");

  const save = () => {
    patch(s => {
      if (type==="task") {
        const t=s.tasks.find(x=>x.id===id);
        t.title=title; t.areaId=areaId||null; t.projectId=projId||null; t.priority=prio;
      } else if (type==="habit") {
        const h=s.habits.find(x=>x.id===id);
        h.title=title; h.areaId=areaId||null; h.projectId=projId||null;
        h.days=days; h.startDate=start; h.endDate=hasEnd&&end?end:null;
      } else if (type==="goal") {
        const g=s.goals.find(x=>x.id===id);
        g.title=title; g.areaId=areaId||null; g.projectId=projId||null; g.progress=prog;
      } else if (type==="event") {
        const e=s.events.find(x=>x.id===id);
        e.title=title; e.areaId=areaId||null; e.projectId=projId||null; e.date=date; e.time=time;
      }
    });
    onClose();
  };

  const typeLabel = {task:"Tarefa",habit:"Hábito",goal:"Meta",event:"Evento"}[type];

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",animation:"fadeIn .2s ease"}}/>
      <div onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:COL.surface,borderRadius:"20px 20px 0 0",
          padding:"20px 20px 40px",animation:"fadeUp .25s ease both",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{fontWeight:700,fontSize:16}}>Editar {typeLabel}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:COL.mute,padding:4,cursor:"pointer"}}><X size={20}/></button>
        </div>

        <input value={title} onChange={e=>setTitle(e.target.value)}
          style={{...inputStyle,marginBottom:12,fontSize:16}} autoFocus/>
        <AreaProjectSelect state={state} areaId={areaId} projectId={projId} onArea={setAreaId} onProject={setProjId}/>

        {type==="task" && (
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
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
                <input type="date" value={start} onChange={e=>setStart(e.target.value)} style={{...inputStyle,fontSize:13}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim</div>
                {hasEnd?(
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <input type="date" value={end} onChange={e=>setEnd(e.target.value)} min={start} style={{...inputStyle,fontSize:13,flex:1}}/>
                    <button onClick={()=>{setHasEnd(false);setEnd("");}} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer"}}><X size={14}/></button>
                  </div>
                ):(
                  <button onClick={()=>setHasEnd(true)}
                    style={{...inputStyle,cursor:"pointer",color:COL.faint,fontSize:13,textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
                    <Plus size={13}/> Definir fim
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

function Hoje({ state, cursor, patch, onEdit }) {
  const [draft,    setDraft]    = useState("");
  const [dArea,    setDArea]    = useState("");
  const [dProject, setDProject] = useState("");
  const [dPrio,    setDPrio]    = useState("normal");
  const [open,     setOpen]     = useState(false);

  const tk = todayKey();
  const events   = state.events.filter(e=>e.date===cursor).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  const tasks    = state.tasks.filter(t=>t.date===cursor);
  // tarefas atrasadas: dias anteriores, não concluídas
  const overdue  = cursor===tk
    ? state.tasks.filter(t=>!t.done && t.date<tk).sort((a,b)=>b.date.localeCompare(a.date))
    : [];
  const habits   = state.habits.filter(h=>isHabitActive(h,cursor));

  // ordenar tarefas: alta → média → normal, não concluídas primeiro
  const sortedTasks = [...tasks].sort((a,b)=>{
    if (a.done !== b.done) return a.done?1:-1;
    const po = {alta:0,media:1,normal:2};
    return (po[a.priority||"normal"]||2)-(po[b.priority||"normal"]||2);
  });

  const total = tasks.length+habits.length;
  const done  = tasks.filter(t=>t.done).length+habits.filter(h=>h.log[cursor]).length;
  const pct   = total?Math.round((done/total)*100):0;

  const addTask     = () => {
    const t=draft.trim(); if(!t)return;
    patch(s=>s.tasks.push({id:uid(),title:t,date:cursor,done:false,
      areaId:dArea||null,projectId:dProject||null,priority:dPrio}));
    setDraft(""); setOpen(false); setDPrio("normal");
  };
  const toggleTask  = id => patch(s=>{const x=s.tasks.find(t=>t.id===id);x.done=!x.done;});
  const delTask     = id => patch(s=>{s.tasks=s.tasks.filter(t=>t.id!==id);});
  const toggleHabit = id => patch(s=>{const h=s.habits.find(x=>x.id===id);h.log[cursor]=!h.log[cursor];});
  // mover atrasada pro dia atual
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

      <Section label="Tarefas">
        {sortedTasks.length===0&&!open&&<Faint>Sem tarefas pra este dia.</Faint>}
        {sortedTasks.map(t=>(
          <Item key={t.id} className="row" clickable onClick={()=>toggleTask(t.id)}
            style={{opacity:t.done?.65:1}}>
            <Toggle on={t.done} color={areaOf(state,t.areaId)?.color||PRIORITY[t.priority||"normal"]?.color}/>
            <div style={{flex:1}}>
              <div style={{color:t.done?COL.mute:COL.ink,textDecoration:t.done?"line-through":"none",fontSize:14}}>{t.title}</div>
              {t.priority&&t.priority!=="normal"&&!t.done&&<PriorityBadge p={t.priority}/>}
            </div>
            <AreaBadge state={state} areaId={t.areaId} projectId={t.projectId}/>
            <button onClick={e=>{e.stopPropagation();onEdit({type:"task",id:t.id});}}
              style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Edit2 size={14}/></button>
            <button onClick={e=>{e.stopPropagation();delTask(t.id);}}
              style={{background:"none",border:"none",color:COL.faint,padding:4,cursor:"pointer"}}><Trash2 size={14}/></button>
          </Item>
        ))}

        {open?(
          <div style={{background:COL.surface,border:`1px solid ${COL.line}`,borderRadius:12,padding:14,marginBottom:8}}>
            <input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
              placeholder="Título da tarefa…" style={{...inputStyle,marginBottom:10}} autoFocus/>
            <AreaProjectSelect state={state} areaId={dArea} projectId={dProject} onArea={setDArea} onProject={setDProject}/>
            {/* Prioridade */}
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
          <button onClick={()=>setOpen(true)}
            style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",
              border:`1.5px dashed ${COL.line}`,borderRadius:12,padding:"11px 14px",
              color:COL.faint,fontSize:14,fontFamily:"inherit",cursor:"pointer"}}>
            <Plus size={16}/> Nova tarefa
          </button>
        )}
      </Section>

      {total===0&&events.length===0&&overdue.length===0&&
        <Faint style={{marginTop:20}}>Dia livre. Acenda algo pra começar.</Faint>}
    </>
  );
}

// ─── TEMPO ─────────────────────────────────────────────────────
function Tempo({ state }) {
  const [view,setView]=useState("mes");
  const [nav, setNav] =useState(0);
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
      {view==="semana"&&<ViewSemana state={state} nav={nav} setNav={setNav}/>}
      {view==="mes"   &&<ViewMes    state={state} nav={nav} setNav={setNav}/>}
      {view==="ano"   &&<ViewAno    state={state} nav={nav} setNav={setNav}/>}
    </>
  );
}

function ViewSemana({ state, nav, setNav }) {
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
            <div key={k} style={{background:COL.surface,border:`1px solid ${isT?COL.accent:COL.line}`,
              borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
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

function ViewMes({ state, nav, setNav }) {
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
            <div key={k} style={{background:isT?COL.accentDim:bg,border:`1px solid ${isT?COL.accent:COL.line}`,
              borderRadius:8,padding:"6px 4px",textAlign:"center",minHeight:52,display:"flex",
              flexDirection:"column",alignItems:"center",justifyContent:"space-between"}}>
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

function ViewAno({ state, nav, setNav }) {
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
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Início</div>
              <input type="date" value={dStart} onChange={e=>setDStart(e.target.value)} style={{...inputStyle,fontSize:13}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10.5,color:COL.faint,marginBottom:4}}>Fim</div>
              {hasEnd?(<div style={{display:"flex",gap:4,alignItems:"center"}}><input type="date" value={dEnd} onChange={e=>setDEnd(e.target.value)} min={dStart} style={{...inputStyle,fontSize:13,flex:1}}/><button onClick={()=>{setHasEnd(false);setDEnd("");}} style={{background:"none",border:"none",color:COL.faint,cursor:"pointer"}}><X size={14}/></button></div>):(<button onClick={()=>setHasEnd(true)} style={{...inputStyle,cursor:"pointer",color:COL.faint,fontSize:13,textAlign:"left",display:"flex",alignItems:"center",gap:6}}><Plus size={13}/> Definir fim</button>)}
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
    </>
  );
}

// ─── ÁREAS ─────────────────────────────────────────────────────
function Areas({ state, patch }) {
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
                {a.projects.map(p=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${COL.line}`}}><FolderOpen size={13} color={a.color}/><div style={{flex:1,fontSize:13}}>{p.name}</div><div style={{fontSize:11,color:COL.faint}}>{countFor(a.id,p.id)} itens</div><button onClick={()=>delProject(a.id,p.id)} style={{background:"none",border:"none",color:COL.faint,padding:2,cursor:"pointer"}}><X size={13}/></button></div>))}
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
function Review({ state, checkins, onCheckin }) {
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
    </>
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
      const blob=new Blob([raw],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download=`lume-backup-${todayKey()}.json`; a.click();
      URL.revokeObjectURL(url); showToast("Exportado!");
    } catch { showToast("Erro ao exportar.",false); }
  };

  const onImport = e => {
    const f=e.target.files?.[0]; if(!f)return; setImporting(true);
    const r=new FileReader();
    r.onload=ev=>{
      try {
        const p=JSON.parse(ev.target.result);
        if(!p.areas||!p.tasks||!p.habits||!p.events||!p.goals) throw new Error();
        patch(s=>{s.areas=p.areas;s.tasks=p.tasks;s.habits=p.habits;s.events=p.events;s.goals=p.goals;});
        showToast("Restaurado!");
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
  const [dTime,   setDTime]   = useState("");
  const [dArea,   setDArea]   = useState("");
  const [dProj,   setDProj]   = useState("");

  const IS = inputStyle;
  const AB = addBtn;

  const reset = () => { setDraft(""); setDDate(todayKey()); setDTime(""); setDArea(""); setDProj(""); setOpen(false); };
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

const inputStyle = { flex:1,background:COL.surface2,border:`1px solid ${COL.line}`,color:COL.ink,borderRadius:10,padding:"11px 13px",fontSize:14.5,fontFamily:"inherit",outline:"none",width:"100%" };
const addBtn     = { background:COL.accent,color:COL.bg,border:"none",borderRadius:10,width:44,minWidth:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",cursor:"pointer",fontSize:14 };

// ─── Nav ───────────────────────────────────────────────────────
function Nav({ tabs, tab, setTab }) {
  return (
    <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,display:"flex",background:`${COL.surface}F2`,backdropFilter:"blur(12px)",borderTop:`1px solid ${COL.line}`,paddingTop:8,paddingLeft:2,paddingRight:2,paddingBottom:"max(env(safe-area-inset-bottom), 14px)",zIndex:10}}>
      {tabs.map(t=>{ const on=tab===t.id,I=t.icon; return (<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:on?COL.accent:COL.faint,fontFamily:"inherit",padding:"4px 0",cursor:"pointer"}}><I size={18} strokeWidth={on?2.4:1.8}/><span style={{fontSize:9,fontWeight:on?700:500}}>{t.label}</span></button>); })}
    </nav>
  );
}
