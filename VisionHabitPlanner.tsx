import React, { useState, useEffect, useMemo } from "react";
import { Plus, Image, Video, FileText, Type, Trash2, Sparkles, X, Check, StickyNote } from "lucide-react";

const PASTELS = ["#E8A0BF", "#A8CEE0", "#B0616B", "#A8C6A0", "#E3C16F", "#C3B1D6"];
const MODES = [
  { key: "estudio", label: "Estudio", accents: PASTELS, defaultAccent: "#B0616B" },
  { key: "vida", label: "Vida diaria", accents: PASTELS, defaultAccent: "#A8C6A0" },
  { key: "actividad", label: "Actividad especial", accents: PASTELS, defaultAccent: "#E8A0BF" },
];

const HABIT_SUGGESTIONS = [
  { keywords: ["lectura", "leer", "libro", "libros"], title: "Leer 20 minutos" },
  { keywords: ["estudio", "parcial", "examen", "cursada", "apuntes"], title: "Repasar apuntes 30 minutos" },
  { keywords: ["arte", "mosaico", "manualidad", "creativ"], title: "Avanzar 30 min con un proyecto creativo" },
  { keywords: ["cocina", "receta"], title: "Cocinar algo nuevo" },
  { keywords: ["ejercicio", "gym", "entrenar", "correr"], title: "Mover el cuerpo 20 minutos" },
  { keywords: ["relax", "descanso", "meditar"], title: "Tomarme 10 minutos para desconectar" },
  { keywords: ["organizacion", "orden", "planificar"], title: "Organizar pendientes del dia" },
];

const TYPE_ICONS = { image: Image, video: Video, text: Type, doc: FileText };
const shellBg = "#FAF6F0";
const ink = "#413A3E";
const cardBg = "#FFFFFF";
const lineMuted = "#E5DFE2";

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function loadKey(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("storage error", e);
  }
}

export default function VisionHabitPlanner() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("tablero");
  const [currentMode, setCurrentMode] = useState("estudio");
  const [boardItems, setBoardItems] = useState([]);
  const [habits, setHabits] = useState([]);
  const [calendar, setCalendar] = useState({});
  const [accentByMode, setAccentByMode] = useState({ estudio: MODES[0].defaultAccent, vida: MODES[1].defaultAccent, actividad: MODES[2].defaultAccent });
  const [suggestions, setSuggestions] = useState([]);
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [newItem, setNewItem] = useState({ title: "", type: "image", content: "", tag: "" });
  const [newHabitTitle, setNewHabitTitle] = useState("");

  useEffect(() => {
    setBoardItems(loadKey("vhp-board-items", []));
    setHabits(loadKey("vhp-habits", []));
    setCalendar(loadKey("vhp-calendar-entries", {}));
    setAccentByMode(loadKey("vhp-accents", accentByMode));
    setLoaded(true);
    // eslint-disable-next-line
  }, []);

  useEffect(() => { if (loaded) saveKey("vhp-board-items", boardItems); }, [boardItems, loaded]);
  useEffect(() => { if (loaded) saveKey("vhp-habits", habits); }, [habits, loaded]);
  useEffect(() => { if (loaded) saveKey("vhp-calendar-entries", calendar); }, [calendar, loaded]);
  useEffect(() => { if (loaded) saveKey("vhp-accents", accentByMode); }, [accentByMode, loaded]);

  const modeOf = (key) => MODES.find((m) => m.key === key);
  const accentOf = (key) => accentByMode[key] || modeOf(key).defaultAccent;

  function addBoardItem() {
    if (!newItem.title.trim()) return;
    const item = { id: Date.now().toString(), mode: currentMode, ...newItem };
    setBoardItems([item, ...boardItems]);
    setNewItem({ title: "", type: "image", content: "", tag: "" });
  }

  function removeBoardItem(id) {
    setBoardItems(boardItems.filter((b) => b.id !== id));
  }

  function generateSuggestions() {
    const found = [];
    boardItems.forEach((item) => {
      const tag = (item.tag || "").toLowerCase();
      const match = HABIT_SUGGESTIONS.find((h) => h.keywords.some((k) => tag.includes(k)));
      const title = match ? match.title : `Dedicarle tiempo a: ${item.title}`;
      if (!found.some((f) => f.title === title && f.mode === item.mode)) {
        found.push({ title, mode: item.mode, id: item.id + "-sugg" });
      }
    });
    setSuggestions(found);
  }

  function acceptSuggestion(s) {
    if (habits.some((h) => h.title === s.title && h.mode === s.mode)) return;
    setHabits([...habits, { id: Date.now().toString() + Math.random(), title: s.title, mode: s.mode }]);
    setSuggestions(suggestions.filter((x) => x.id !== s.id));
  }

  function addCustomHabit() {
    if (!newHabitTitle.trim()) return;
    setHabits([...habits, { id: Date.now().toString(), title: newHabitTitle, mode: currentMode }]);
    setNewHabitTitle("");
  }

  function removeHabit(id) {
    setHabits(habits.filter((h) => h.id !== id));
  }

  function toggleHabitDone(dayKey, habitId) {
    setCalendar((prev) => {
      const day = prev[dayKey] || { done: [], note: "" };
      const done = day.done.includes(habitId) ? day.done.filter((x) => x !== habitId) : [...day.done, habitId];
      return { ...prev, [dayKey]: { ...day, done } };
    });
  }

  function setDayNote(dayKey, note) {
    setCalendar((prev) => ({ ...prev, [dayKey]: { ...(prev[dayKey] || { done: [] }), note } }));
  }

  function streakFor(habitId) {
    let streak = 0;
    let d = new Date();
    while (true) {
      const k = dateKey(d);
      if (calendar[k] && calendar[k].done.includes(habitId)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return streak;
  }

  const monthDays = useMemo(() => {
    const total = daysInMonth(viewMonth);
    const first = startOfMonth(viewMonth);
    const leadBlank = (first.getDay() + 6) % 7; // lunes-first
    const arr = [];
    for (let i = 0; i < leadBlank; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return arr;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div style={{ background: shellBg, minHeight: "100vh", color: ink, fontFamily: "Georgia, 'Iowan Old Style', serif" }} className="p-4 md:p-8">
      <header className="mb-6">
        <h1 style={{ letterSpacing: "-0.02em" }} className="text-3xl md:text-4xl font-bold">LifeActs</h1>
        <p style={{ fontFamily: "system-ui, sans-serif" }} className="text-sm opacity-70 mt-1">
          Guardas ideas, las convertis en habitos, las segui en el calendario.
        </p>
      </header>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setCurrentMode(m.key)}
            style={{
              fontFamily: "system-ui, sans-serif",
              background: currentMode === m.key ? accentOf(m.key) : cardBg,
              color: currentMode === m.key ? "#fff" : ink,
              border: `1px solid ${lineMuted}`,
            }}
            className="px-3 py-1.5 rounded-full text-sm font-medium transition"
          >
            {m.label}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {modeOf(currentMode).accents.map((c) => (
            <button
              key={c}
              onClick={() => setAccentByMode({ ...accentByMode, [currentMode]: c })}
              style={{ background: c, border: accentOf(currentMode) === c ? "2px solid #2E2A26" : "2px solid transparent" }}
              className="w-5 h-5 rounded-full flex-shrink-0"
              title="elegir tono"
            />
          ))}
        </div>
      </div>

      {/* Main section tabs */}
      <div style={{ fontFamily: "system-ui, sans-serif" }} className="flex gap-4 border-b mb-6" >
        {[["tablero", "Tablero"], ["habitos", "Habitos"], ["calendario", "Calendario"]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{ borderColor: tab === k ? accentOf(currentMode) : "transparent", color: tab === k ? accentOf(currentMode) : ink }}
            className="pb-2 border-b-2 font-semibold text-sm"
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tablero" && (
        <div>
          <div style={{ background: cardBg, border: `1px solid ${lineMuted}` }} className="rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              placeholder="Titulo (ej: mate con libro)"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              style={{ fontFamily: "system-ui, sans-serif", border: `1px solid ${lineMuted}` }}
              className="px-3 py-2 rounded"
            />
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              style={{ fontFamily: "system-ui, sans-serif", border: `1px solid ${lineMuted}` }}
              className="px-3 py-2 rounded"
            >
              <option value="image">Imagen (URL)</option>
              <option value="video">Video (link)</option>
              <option value="text">Texto</option>
              <option value="doc">Documento (link)</option>
            </select>
            <input
              placeholder="Contenido (URL o texto)"
              value={newItem.content}
              onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              style={{ fontFamily: "system-ui, sans-serif", border: `1px solid ${lineMuted}` }}
              className="px-3 py-2 rounded md:col-span-2"
            />
            <input
              placeholder="Tag corto (ej: lectura, mosaico, estudio)"
              value={newItem.tag}
              onChange={(e) => setNewItem({ ...newItem, tag: e.target.value })}
              style={{ fontFamily: "system-ui, sans-serif", border: `1px solid ${lineMuted}` }}
              className="px-3 py-2 rounded"
            />
            <button
              onClick={addBoardItem}
              style={{ background: accentOf(currentMode) }}
              className="text-white px-3 py-2 rounded flex items-center justify-center gap-1 font-semibold"
            >
              <Plus size={16} /> Guardar en {modeOf(currentMode).label}
            </button>
          </div>

          <div style={{ columns: "220px", columnGap: "1rem" }}>
            {boardItems.map((item) => {
              const Icon = TYPE_ICONS[item.type] || FileText;
              return (
                <div
                  key={item.id}
                  style={{ background: cardBg, border: `1px solid ${lineMuted}`, borderLeft: `4px solid ${accentOf(item.mode)}`, breakInside: "avoid" }}
                  className="rounded-lg p-3 mb-4"
                >
                  <div className="flex justify-between items-start">
                    <div style={{ fontFamily: "system-ui, sans-serif" }} className="flex items-center gap-1 text-xs opacity-60 mb-1">
                      <Icon size={13} /> {modeOf(item.mode).label}
                    </div>
                    <button onClick={() => removeBoardItem(item.id)} className="opacity-40 hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="font-semibold mb-1">{item.title}</div>
                  {item.type === "image" && item.content && (
                    <img src={item.content} alt={item.title} className="rounded w-full mb-2" />
                  )}
                  {item.type !== "image" && item.content && (
                    <p style={{ fontFamily: "system-ui, sans-serif" }} className="text-sm opacity-80 break-words mb-2">{item.content}</p>
                  )}
                  {item.tag && (
                    <span style={{ background: accentOf(item.mode) + "22", color: accentOf(item.mode), fontFamily: "system-ui, sans-serif" }} className="text-xs px-2 py-0.5 rounded-full">
                      #{item.tag}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {boardItems.length === 0 && (
            <p style={{ fontFamily: "system-ui, sans-serif" }} className="opacity-50 text-sm">Todavia no guardaste nada. Arranca sumando una imagen o idea arriba.</p>
          )}
        </div>
      )}

      {tab === "habitos" && (
        <div>
          <button
            onClick={generateSuggestions}
            style={{ background: accentOf(currentMode), fontFamily: "system-ui, sans-serif" }}
            className="text-white px-4 py-2 rounded flex items-center gap-2 font-semibold mb-4"
          >
            <Sparkles size={16} /> Generar sugerencias desde el tablero
          </button>

          {suggestions.length > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${lineMuted}` }} className="rounded-lg p-4 mb-6">
              <p style={{ fontFamily: "system-ui, sans-serif" }} className="text-sm font-semibold mb-2">Sugerencias:</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span style={{ fontFamily: "system-ui, sans-serif" }} className="text-sm">
                      {s.title} <em className="opacity-50">({modeOf(s.mode).label})</em>
                    </span>
                    <button onClick={() => acceptSuggestion(s)} style={{ color: accentOf(s.mode) }} className="text-xs font-semibold flex items-center gap-1">
                      <Check size={14} /> agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: cardBg, border: `1px solid ${lineMuted}` }} className="rounded-lg p-4 mb-6 flex gap-2">
            <input
              placeholder={`Nuevo habito para ${modeOf(currentMode).label}`}
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              style={{ fontFamily: "system-ui, sans-serif", border: `1px solid ${lineMuted}` }}
              className="px-3 py-2 rounded flex-1"
            />
            <button onClick={addCustomHabit} style={{ background: accentOf(currentMode) }} className="text-white px-3 py-2 rounded">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {habits.map((h) => (
              <div key={h.id} style={{ background: cardBg, border: `1px solid ${lineMuted}`, borderLeft: `4px solid ${accentOf(h.mode)}` }} className="rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{h.title}</div>
                  <div style={{ fontFamily: "system-ui, sans-serif" }} className="text-xs opacity-60">{modeOf(h.mode).label} · racha: {streakFor(h.id)} dias</div>
                </div>
                <button onClick={() => removeHabit(h.id)} className="opacity-40 hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {habits.length === 0 && <p style={{ fontFamily: "system-ui, sans-serif" }} className="opacity-50 text-sm">Todavia no tenes habitos. Generá sugerencias o agrega uno manual.</p>}
          </div>
        </div>
      )}

      {tab === "calendario" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <button style={{ fontFamily: "system-ui, sans-serif" }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="px-3 py-1 rounded" >←</button>
            <h2 style={{ textTransform: "capitalize" }} className="font-bold text-xl">{monthLabel}</h2>
            <button style={{ fontFamily: "system-ui, sans-serif" }} onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="px-3 py-1 rounded">→</button>
          </div>

          <div style={{ fontFamily: "system-ui, sans-serif" }} className="flex gap-3 mb-3 text-xs flex-wrap">
            {MODES.map((m) => (
              <span key={m.key} className="flex items-center gap-1"><span style={{ background: accentOf(m.key) }} className="w-2.5 h-2.5 rounded-full inline-block" />{m.label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1" style={{ fontFamily: "system-ui, sans-serif" }}>
            {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((d) => (
              <div key={d} className="text-xs opacity-50 font-semibold">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = dateKey(d);
              const dayData = calendar[k] || { done: [], note: "" };
              return (
                <button
                  key={k}
                  onClick={() => setSelectedDay(k)}
                  style={{ background: cardBg, border: `1px solid ${lineMuted}` }}
                  className="rounded-lg p-1.5 min-h-[64px] flex flex-col items-start text-left hover:brightness-95"
                >
                  <span className="text-xs font-semibold">{d.getDate()}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayData.done.map((hid) => {
                      const h = habits.find((x) => x.id === hid);
                      if (!h) return null;
                      return <span key={hid} style={{ background: accentOf(h.mode) }} className="w-2 h-2 rounded-full inline-block" />;
                    })}
                  </div>
                  {dayData.note && <StickyNote size={11} className="mt-auto opacity-50" />}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDay(null)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: cardBg, fontFamily: "system-ui, sans-serif" }} className="rounded-lg p-5 max-w-sm w-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold" style={{ fontFamily: "Georgia, serif" }}>{selectedDay}</h3>
                  <button onClick={() => setSelectedDay(null)}><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  {habits.map((h) => {
                    const dayData = calendar[selectedDay] || { done: [] };
                    const done = dayData.done.includes(h.id);
                    return (
                      <label key={h.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={done} onChange={() => toggleHabitDone(selectedDay, h.id)} />
                        <span style={{ color: accentOf(h.mode) }}>●</span> {h.title}
                      </label>
                    );
                  })}
                  {habits.length === 0 && <p className="text-xs opacity-50">Agrega habitos primero en la pestaña Habitos.</p>}
                </div>
                <textarea
                  placeholder="Nota del dia (opcional)"
                  value={(calendar[selectedDay] || {}).note || ""}
                  onChange={(e) => setDayNote(selectedDay, e.target.value)}
                  style={{ border: `1px solid ${lineMuted}` }}
                  className="w-full rounded p-2 text-sm"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
