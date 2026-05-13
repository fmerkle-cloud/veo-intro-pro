
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Cloud, CloudOff, Download, Image as ImageIcon, Monitor, Plus, RotateCcw, Save, Smartphone, Trash2, Upload } from "lucide-react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "./style.css";

const firebaseConfig = {
  apiKey: "AIzaSyC6nu0Wb8WD47dGO3mqJ_sdwHJEncdK6v8",
  authDomain: "veo-intro-pro.firebaseapp.com",
  projectId: "veo-intro-pro",
  storageBucket: "veo-intro-pro.firebasestorage.app",
  messagingSenderId: "471749371379",
  appId: "1:471749371379:web:b7698d6192146dbef8de86"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

const DEFAULT_HOME_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260"><circle cx="130" cy="130" r="122" fill="white" stroke="#15935e" stroke-width="12"/><text x="130" y="105" text-anchor="middle" font-size="34" font-family="Arial Black" fill="#15935e">HEIM</text><text x="130" y="165" text-anchor="middle" font-size="54" font-family="Arial Black" fill="#111">SGM</text></svg>`);
const DEFAULT_AWAY_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260"><path d="M40 30 H220 V195 Q130 245 40 195 Z" fill="#35568e" stroke="white" stroke-width="8"/><text x="130" y="108" text-anchor="middle" font-size="62" font-family="Arial Black" fill="white">SV</text><text x="130" y="165" text-anchor="middle" font-size="30" font-family="Arial Black" fill="white">GAST</text></svg>`);
const DEFAULT_SPONSOR = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180"><rect width="420" height="180" rx="20" fill="#ef2e2e"/><text x="210" y="78" text-anchor="middle" font-size="44" font-family="Arial Black" fill="white">RÃ–STER</text><text x="210" y="126" text-anchor="middle" font-size="44" font-family="Arial Black" fill="white">NEST</text></svg>`);

const defaultState = {
  match: {
    competition: "KREISLIGA B3 DONAU/ILLER",
    date: new Date().toISOString().slice(0, 10),
    homeTeam: "SGM Balzheim/Dietenheim",
    awayTeam: "SV Pfaffenhofen",
    homeGoals: "1",
    awayGoals: "1",
    homeLogo: DEFAULT_HOME_LOGO,
    awayLogo: DEFAULT_AWAY_LOGO,
    sponsorLogo: DEFAULT_SPONSOR,
    backgroundImage: "",
    homeLogoUrl: "",
    awayLogoUrl: "",
    sponsorLogoUrl: "",
    backgroundImageUrl: "",
    primaryColor: "#e30622",
    darkColor: "#111111",
    lightColor: "#fbfbf6",
    backgroundOpacity: 100,
    showSponsor: true,
    sponsorScale: 145,
    logoScale: 100
  },
  scorers: [
    { team: "home", minute: "23'", name: "A. Rechtsteiner" },
    { team: "away", minute: "68'", name: "(E) N. Lerch" }
  ],
  scorerNames: ["F. Merkle", "A. Rechtsteiner", "N. Lerch"],
  teams: [
    { name: "SGM Balzheim/Dietenheim", logo: DEFAULT_HOME_LOGO, logoUrl: "" },
    { name: "SV Pfaffenhofen", logo: DEFAULT_AWAY_LOGO, logoUrl: "" }
  ],
  sponsors: [{ name: "RÃ¶ster Nest", logo: DEFAULT_SPONSOR, logoUrl: "" }],
  backgrounds: []
};

function migrateState(input) {
  const old = input || defaultState;
  return {
    ...defaultState,
    ...old,
    match: { ...defaultState.match, ...(old.match || {}) },
    scorers: old.scorers || defaultState.scorers,
    scorerNames: old.scorerNames || defaultState.scorerNames,
    teams: old.teams || defaultState.teams,
    sponsors: old.sponsors || defaultState.sponsors,
    backgrounds: old.backgrounds || []
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem("veoIntroProHybrid");
    return raw ? migrateState(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function processImage(file, { maxSize = 1600, quality = 0.88, removeWhite = false } = {}) {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (isSvg) return { blob: file, dataUrl: await fileToDataUrl(file), ext: "svg", contentType: "image/svg+xml" };

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.src = objectUrl;
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(objectUrl);

  if (removeWhite) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const brightness = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness > 246 && spread < 18) d[i + 3] = 0;
      else if (brightness > 235 && spread < 28) d[i + 3] = Math.min(d[i + 3], Math.max(0, (246 - brightness) * 24));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const mime = removeWhite ? "image/png" : "image/webp";
  const ext = removeWhite ? "png" : "webp";
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
  return { blob, dataUrl: await blobToDataUrl(blob), ext, contentType: mime };
}

async function urlToDataUrl(url) {
  if (!url || url.startsWith("data:")) return url;
  const response = await fetch(url, { mode: "cors", cache: "force-cache" });
  if (!response.ok) throw new Error("Bild konnte nicht geladen werden.");
  return await blobToDataUrl(await response.blob());
}

function stripForCloud(state) {
  const s = JSON.parse(JSON.stringify(state));
  if (s.match) {
    delete s.match.homeLogo;
    delete s.match.awayLogo;
    delete s.match.sponsorLogo;
    delete s.match.backgroundImage;
  }
  s.teams = (s.teams || []).map(t => ({ name: t.name || "", logoUrl: t.logoUrl || "" }));
  s.sponsors = (s.sponsors || []).map(sp => ({ name: sp.name || "", logoUrl: sp.logoUrl || "" }));
  s.backgrounds = (s.backgrounds || []).map(bg => ({ name: bg.name || "", imageUrl: bg.imageUrl || "" }));
  return s;
}

function safeFileName(text) {
  return (text || "intro").toLowerCase().replace(/Ã¤/g,"ae").replace(/Ã¶/g,"oe").replace(/Ã¼/g,"ue").replace(/ÃŸ/g,"ss").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function UploadBox({ label, onUpload, busy }) {
  return (
    <label className={busy ? "uploadBox busy" : "uploadBox"}>
      <Upload size={18} />
      <span>{busy ? "Wird verarbeitet..." : label}</span>
      <input disabled={busy} type="file" accept="image/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onUpload(file);
        e.target.value = "";
      }} />
    </label>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return <label className="field"><span>{label}</span><input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function LibrarySelect({ label, items, onPick, empty }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select defaultValue="" onChange={(e) => { const item = items[Number(e.target.value)]; if (item) onPick(item); }}>
        <option value="">{empty}</option>
        {items.map((item, idx) => <option key={idx} value={idx}>{item.name}</option>)}
      </select>
    </label>
  );
}

function App() {
  const svgRef = useRef(null);
  const [state, setState] = useState(readLocal());
  const [ratio, setRatio] = useState("portrait");
  const [activeTab, setActiveTab] = useState("match");
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [projectCode, setProjectCode] = useState(localStorage.getItem("veoIntroProjectCode") || "sgm-bd");
  const [cloudStatus, setCloudStatus] = useState(`Cloud: ${localStorage.getItem("veoIntroProjectCode") || "sgm-bd"}`);
  const [newScorerName, setNewScorerName] = useState("");

  const m = state.match;
  const homeScorers = state.scorers.filter(s => s.team === "home");
  const awayScorers = state.scorers.filter(s => s.team === "away");
  const fileBase = useMemo(() => `intro_${safeFileName(m.homeTeam)}_vs_${safeFileName(m.awayTeam)}`, [m.homeTeam, m.awayTeam]);

  useEffect(() => { localStorage.setItem("veoIntroProHybrid", JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem("veoIntroProjectCode", projectCode); }, [projectCode]);

  function updateMatch(key, value) {
    setState(s => ({ ...s, match: { ...s.match, [key]: value } }));
  }

  function setScorers(next) { setState(s => ({ ...s, scorers: next })); }
  function updateScorer(i, key, value) { setScorers(state.scorers.map((row, idx) => idx === i ? { ...row, [key]: value } : row)); }

  function saveScorerName(name) {
    const clean = (name || "").trim();
    if (!clean) return;
    setState(s => ({ ...s, scorerNames: [clean, ...(s.scorerNames || []).filter(n => n.toLowerCase() !== clean.toLowerCase())].slice(0, 120) }));
    setNewScorerName("");
  }

  async function persistCloud(nextState = state) {
    try {
      setError("");
      const code = (projectCode || "sgm-bd").trim().toLowerCase();
      await setDoc(doc(db, "sharedProjects", code), {
        state: stripForCloud(nextState),
        updatedAt: serverTimestamp()
      });
      setCloudStatus("Gespeichert");
      setTimeout(() => setCloudStatus(`Cloud: ${code}`), 1200);
    } catch (err) {
      setError(`Cloud-Speicherfehler: ${err.code || ""} ${err.message || ""}`);
    }
  }

  async function hydrateImages(cloudState, localState) {
    const merged = migrateState({
      ...localState,
      ...cloudState,
      match: {
        ...(localState.match || {}),
        ...(cloudState.match || {}),
        homeLogo: localState.match?.homeLogo || DEFAULT_HOME_LOGO,
        awayLogo: localState.match?.awayLogo || DEFAULT_AWAY_LOGO,
        sponsorLogo: localState.match?.sponsorLogo || DEFAULT_SPONSOR,
        backgroundImage: localState.match?.backgroundImage || ""
      }
    });

    const tasks = [];
    const setImg = (key, urlKey) => {
      const url = merged.match?.[urlKey];
      if (url) tasks.push(urlToDataUrl(url).then(data => { merged.match[key] = data; }).catch(() => {}));
    };
    setImg("homeLogo", "homeLogoUrl");
    setImg("awayLogo", "awayLogoUrl");
    setImg("sponsorLogo", "sponsorLogoUrl");
    setImg("backgroundImage", "backgroundImageUrl");

    merged.teams = cloudState.teams?.length ? cloudState.teams.map(t => ({ ...t, logo: "" })) : localState.teams;
    merged.sponsors = cloudState.sponsors?.length ? cloudState.sponsors.map(sp => ({ ...sp, logo: "" })) : localState.sponsors;
    merged.backgrounds = cloudState.backgrounds?.length ? cloudState.backgrounds.map(bg => ({ ...bg, image: "" })) : localState.backgrounds;

    await Promise.all(tasks);
    return merged;
  }

  async function loadCloudProject() {
    try {
      setError("");
      const code = (projectCode || "sgm-bd").trim().toLowerCase();
      setProjectCode(code);
      setCloudStatus("Lade Cloud...");
      const snap = await getDoc(doc(db, "sharedProjects", code));
      if (snap.exists()) {
        const hydrated = await hydrateImages(snap.data().state || {}, readLocal());
        setState(hydrated);
        setCloudStatus(`Cloud: ${code}`);
      } else {
        await persistCloud(state);
        setCloudStatus(`Cloud neu: ${code}`);
      }
    } catch (err) {
      setError(`Cloud-Ladefehler: ${err.code || ""} ${err.message || ""}`);
      setCloudStatus("Cloud Fehler");
    }
  }

  async function uploadToStorage(kind, processed) {
    const code = (projectCode || "sgm-bd").trim().toLowerCase();
    const filePath = `shared/${code}/media/${kind}-${Date.now()}.${processed.ext}`;
    const fileRef = ref(storage, filePath);
    await uploadBytes(fileRef, processed.blob, { contentType: processed.contentType });
    return await getDownloadURL(fileRef);
  }

  async function handleImageUpload(kind, file) {
    try {
      setUploading(kind);
      setError("");
      const isBackground = kind === "backgroundImage";
      const removeWhite = kind === "homeLogo" || kind === "awayLogo"; // Sponsor bleibt original!
      const processed = await processImage(file, { maxSize: isBackground ? 2400 : 1000, quality: 0.9, removeWhite });
      const url = await uploadToStorage(kind, processed);

      const urlKey = kind === "backgroundImage" ? "backgroundImageUrl" : `${kind}Url`;
      const next = { ...state, match: { ...state.match, [kind]: processed.dataUrl, [urlKey]: url } };
      setState(next);
      await persistCloud(next);
    } catch (err) {
      setError(`Upload-Fehler: ${err.code || ""} ${err.message || ""}`);
    } finally {
      setUploading("");
    }
  }

  function saveCurrentTeam(side) {
    const name = side === "home" ? m.homeTeam : m.awayTeam;
    const logo = side === "home" ? m.homeLogo : m.awayLogo;
    const logoUrl = side === "home" ? m.homeLogoUrl : m.awayLogoUrl;
    if (!name) return;
    setState(s => ({ ...s, teams: [{ name, logo, logoUrl }, ...s.teams.filter(t => t.name !== name)].slice(0, 80) }));
  }

  function saveCurrentSponsor() {
    const name = prompt("Sponsorname:", "Sponsor");
    if (!name) return;
    setState(s => ({ ...s, sponsors: [{ name, logo: m.sponsorLogo, logoUrl: m.sponsorLogoUrl }, ...s.sponsors.filter(sp => sp.name !== name)].slice(0, 80) }));
  }

  function saveCurrentBackground() {
    const name = prompt("Name der Hintergrundgrafik:", "Hintergrund");
    if (!name || !m.backgroundImageUrl) return;
    setState(s => ({ ...s, backgrounds: [{ name, image: m.backgroundImage, imageUrl: m.backgroundImageUrl }, ...s.backgrounds.filter(bg => bg.name !== name)].slice(0, 80) }));
  }

  async function applyImageFromUrl(kind, dataUrlKey, url) {
    if (!url) return;
    const data = await urlToDataUrl(url).catch(() => "");
    updateMatch(kind, data || "");
    updateMatch(dataUrlKey, url);
  }

  function loadCanvasImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Ein Bild konnte nicht geladen werden."));
      img.src = src;
    });
  }

  function drawImageContain(ctx, img, x, y, w, h) {
    if (!img) return;
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawImageCover(ctx, img, x, y, w, h) {
    if (!img) return;
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  async function exportPngCanvas() {
    try {
      setError("");
      const canvas = document.createElement("canvas");
      if (ratio === "story") { canvas.width = 1080; canvas.height = 1920; }
      else if (ratio === "landscape") { canvas.width = 1920; canvas.height = 1080; }
      else { canvas.width = 1080; canvas.height = 1350; }

      const ctx = canvas.getContext("2d");
      const stageWidth = canvas.width, stageHeight = canvas.height;
      const scoreY = ratio === "story" ? 780 : ratio === "landscape" ? 510 : 610;
      const [bgImg, homeImg, awayImg, sponsorImg, vsImg] = await Promise.all([
        loadCanvasImage(m.backgroundImage),
        loadCanvasImage(m.homeLogo),
        loadCanvasImage(m.awayLogo),
        loadCanvasImage(m.sponsorLogo),
        loadCanvasImage("/vs-logo.png")
      ]);

      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, stageWidth, stageHeight);
      if (bgImg) {
        ctx.save();
        ctx.globalAlpha = (m.backgroundOpacity || 100) / 100;
        drawImageCover(ctx, bgImg, 0, 0, stageWidth, stageHeight);
        ctx.restore();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = m.darkColor || "#111";
      ctx.font = "bold 39px Impact, Arial Black, sans-serif";
      ctx.fillText(String(m.competition || "").toUpperCase(), stageWidth / 2, scoreY - 150);

      const logoSize = Math.round(192 * (m.logoScale || 100) / 100);
      drawImageContain(ctx, homeImg, stageWidth / 2 - 380 - logoSize / 2, scoreY - logoSize / 2, logoSize, logoSize);
      drawImageContain(ctx, awayImg, stageWidth / 2 + 380 - logoSize / 2, scoreY - logoSize / 2, logoSize, logoSize);

      ctx.fillStyle = "#000";
      ctx.fillRect(stageWidth / 2 - 225, scoreY - 110, 185, 275);
      ctx.fillRect(stageWidth / 2 + 40, scoreY - 110, 185, 275);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 200px Impact, Arial Black, sans-serif";
      ctx.fillText(String(m.homeGoals || ""), stageWidth / 2 - 132, scoreY + 42);
      ctx.fillText(String(m.awayGoals || ""), stageWidth / 2 + 132, scoreY + 42);

      if (vsImg) drawImageContain(ctx, vsImg, stageWidth / 2 - 55, scoreY - 50, 110, 130);
      else {
        ctx.fillStyle = m.primaryColor || "#e30622";
        ctx.font = "bold 84px Impact, Arial Black, sans-serif";
        ctx.fillText("vs", stageWidth / 2, scoreY + 5);
      }

      ctx.fillStyle = m.darkColor || "#111";
      ctx.font = "bold 34px Impact, Arial Black, sans-serif";
      ctx.fillText(String(m.homeTeam || "").toUpperCase(), stageWidth / 2 - 290, scoreY + 225);
      ctx.fillText(String(m.awayTeam || "").toUpperCase(), stageWidth / 2 + 290, scoreY + 225);

      ctx.font = "bold 38px Impact, Arial Black, sans-serif";
      homeScorers.forEach((s, i) => ctx.fillText(`${s.minute ? s.minute + " " : ""}${s.name || ""}`.toUpperCase(), stageWidth / 2 - 300, scoreY + 290 + i * 52));
      awayScorers.forEach((s, i) => ctx.fillText(`${s.minute ? s.minute + " " : ""}${s.name || ""}`.toUpperCase(), stageWidth / 2 + 300, scoreY + 290 + i * 52));

      if (m.showSponsor && sponsorImg) {
        const sw = Math.round(180 * (m.sponsorScale || 145) / 100);
        const sh = Math.round(88 * (m.sponsorScale || 145) / 100);
        drawImageContain(ctx, sponsorImg, stageWidth / 2 - sw / 2, stageHeight - sh - 28, sw, sh);
      }

      canvas.toBlob((blob) => downloadBlob(blob, `${fileBase}.png`), "image/png", 1);
    } catch (err) {
      setError(`Export-Fehler: ${err.message || err}`);
    }
  }
  async function pickTeamFromLibrary(side, team) {
    try {
      setError("");

      const nameKey = side === "home" ? "homeTeam" : "awayTeam";
      const imgKey = side === "home" ? "homeLogo" : "awayLogo";
      const urlKey = side === "home" ? "homeLogoUrl" : "awayLogoUrl";

      const nextMatch = {
        ...state.match,
        [nameKey]: team.name || state.match[nameKey],
        [urlKey]: team.logoUrl || state.match[urlKey]
      };

      if (team.logo) {
        nextMatch[imgKey] = team.logo;
      } else if (team.logoUrl) {
        nextMatch[imgKey] = await urlToDataUrl(team.logoUrl);
      }

      setState((s) => ({
        ...s,
        match: {
          ...s.match,
          ...nextMatch
        }
      }));
    } catch (err) {
      setError(`Bibliothek-Fehler: ${err.message || err}`);
    }
  }

  async function pickSponsorFromLibrary(sponsor) {
    try {
      setError("");

      const nextMatch = {
        ...state.match,
        sponsorLogoUrl: sponsor.logoUrl || state.match.sponsorLogoUrl
      };

      if (sponsor.logo) {
        nextMatch.sponsorLogo = sponsor.logo;
      } else if (sponsor.logoUrl) {
        nextMatch.sponsorLogo = await urlToDataUrl(sponsor.logoUrl);
      }

      setState((s) => ({
        ...s,
        match: {
          ...s.match,
          ...nextMatch
        }
      }));
    } catch (err) {
      setError(`Bibliothek-Fehler: ${err.message || err}`);
    }
  }

  async function pickBackgroundFromLibrary(background) {
    try {
      setError("");

      const nextMatch = {
        ...state.match,
        backgroundImageUrl: background.imageUrl || state.match.backgroundImageUrl
      };

      if (background.image) {
        nextMatch.backgroundImage = background.image;
      } else if (background.imageUrl) {
        nextMatch.backgroundImage = await urlToDataUrl(background.imageUrl);
      }

      setState((s) => ({
        ...s,
        match: {
          ...s.match,
          ...nextMatch
        }
      }));
    } catch (err) {
      setError(`Bibliothek-Fehler: ${err.message || err}`);
    }
  }

  const viewBox = ratio === "story" ? "0 0 1080 1920" : ratio === "landscape" ? "0 0 1920 1080" : "0 0 1080 1350";
  const stageHeight = ratio === "story" ? 1920 : ratio === "landscape" ? 1080 : 1350;
  const stageWidth = ratio === "landscape" ? 1920 : 1080;
  const scoreY = ratio === "story" ? 780 : ratio === "landscape" ? 510 : 610;
  const logoSize = Math.round(192 * (m.logoScale || 100) / 100);
  const logoHalf = logoSize / 2;
  const sponsorWidth = Math.round(180 * (m.sponsorScale || 145) / 100);
  const sponsorHeight = Math.round(88 * (m.sponsorScale || 145) / 100);
  const sponsorY = stageHeight - sponsorHeight - 28;

  return (
    <main className="app">
      <aside className="panel">
        <header className="top">
          <div><h1>Veo Intro Pro</h1><p>Hybrid: Firestore + Storage + stabiler Export.</p></div>
          <div className="cloudBadge"><Cloud size={16}/> {cloudStatus}</div>
        </header>

        {error && <div className="errorBox"><span>âš ï¸</span><span>{error}</span></div>}

        <div className="cloudProjectBox">
          <label><span>Cloud-Projekt-Code</span><input value={projectCode} onChange={(e) => setProjectCode(e.target.value.trim().toLowerCase())} /></label>
          <button className="secondary" onClick={loadCloudProject}>Cloud laden</button>
          <button className="ghost" onClick={() => persistCloud(state)}>Speichern</button>
        </div>

        <div className="tabs">
          {["match","media","design","library","export"].map(tab => (
            <button key={tab} className={activeTab === tab ? "on" : ""} onClick={() => setActiveTab(tab)}>{tab === "match" ? "Match" : tab === "media" ? "Medien" : tab === "design" ? "Design" : tab === "library" ? "Bibliothek" : "Export"}</button>
          ))}
        </div>

        {activeTab === "match" && (
          <section>
            <div className="grid">
              <Field label="Wettbewerb" value={m.competition} onChange={(v) => updateMatch("competition", v)} />
              <Field label="Datum" type="date" value={m.date} onChange={(v) => updateMatch("date", v)} />
              <Field label="Heimteam" value={m.homeTeam} onChange={(v) => updateMatch("homeTeam", v)} />
              <Field label="Gegner" value={m.awayTeam} onChange={(v) => updateMatch("awayTeam", v)} />
              <Field label="Tore Heim" value={m.homeGoals} onChange={(v) => updateMatch("homeGoals", v)} />
              <Field label="Tore Gegner" value={m.awayGoals} onChange={(v) => updateMatch("awayGoals", v)} />
            </div>

            <div className="scorerSaveBox">
              <input value={newScorerName} onChange={(e) => setNewScorerName(e.target.value)} placeholder="Torschütze speichern, z. B. F. Merkle" />
              <button className="secondary" onClick={() => saveScorerName(newScorerName)}><Save size={16}/> Speichern</button>
            </div>

            <div className="scorerHead"><h2>Torschützen</h2><button className="secondary" onClick={() => setScorers([...state.scorers, { team: "home", minute: "", name: "" }])}><Plus size={16}/> Zeile</button></div>
            <div className="scorers">
              {state.scorers.map((s, i) => (
                <div className="scorerRow" key={i}>
                  <select value={s.team} onChange={(e) => updateScorer(i, "team", e.target.value)}><option value="home">Heim</option><option value="away">Gast</option></select>
                  <input placeholder="Min." value={s.minute} onChange={(e) => updateScorer(i, "minute", e.target.value)} />
                  <div className="scorerNameWrap">
                    <input placeholder="Name" value={s.name} onChange={(e) => updateScorer(i, "name", e.target.value)} onBlur={() => saveScorerName(s.name)} />
                    <select value="" onChange={(e) => e.target.value && updateScorer(i, "name", e.target.value)}>
                      <option value="">Torschütze auswählen</option>
                      {(state.scorerNames || []).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <button className="iconBtn" onClick={() => setScorers(state.scorers.filter((_, idx) => idx !== i))}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "media" && (
          <section>
            <div className="notice">Hybrid: Bilder werden in Firebase Storage gespeichert und lokal fÃ¼r stabilen Export eingebettet. Vereinslogos werden freigestellt; Sponsor bleibt original.</div>
            <div className="uploadGrid">
              <UploadBox busy={uploading === "homeLogo"} label="Heimlogo hochladen" onUpload={(file) => handleImageUpload("homeLogo", file)} />
              <UploadBox busy={uploading === "awayLogo"} label="Gegnerlogo hochladen" onUpload={(file) => handleImageUpload("awayLogo", file)} />
              <UploadBox busy={uploading === "sponsorLogo"} label="Sponsorlogo hochladen" onUpload={(file) => handleImageUpload("sponsorLogo", file)} />
              <UploadBox busy={uploading === "backgroundImage"} label="Hintergrund hochladen" onUpload={(file) => handleImageUpload("backgroundImage", file)} />
            </div>
            <div className="buttonStack">
              <button className="secondary" onClick={() => saveCurrentTeam("home")}><Save size={17}/> Heimteam speichern</button>
              <button className="secondary" onClick={() => saveCurrentTeam("away")}><Save size={17}/> Gegner speichern</button>
              <button className="secondary" onClick={saveCurrentSponsor}><Save size={17}/> Sponsor speichern</button>
              <button className="secondary" onClick={saveCurrentBackground}><Save size={17}/> Hintergrund speichern</button>
            </div>
          </section>
        )}

        {activeTab === "design" && (
          <section>
            <label className="sliderField"><span>Hintergrund-Deckkraft: {m.backgroundOpacity}%</span><input type="range" min="10" max="100" value={m.backgroundOpacity} onChange={(e) => updateMatch("backgroundOpacity", Number(e.target.value))} /></label>
            <label className="sliderField"><span>Logo-Größe: {m.logoScale}%</span><input type="range" min="50" max="180" value={m.logoScale} onChange={(e) => updateMatch("logoScale", Number(e.target.value))} /></label>
            <label className="sliderField"><span>SponsorGröße: {m.sponsorScale}%</span><input type="range" min="60" max="260" value={m.sponsorScale} onChange={(e) => updateMatch("sponsorScale", Number(e.target.value))} /></label>
          </section>
        )}

        {activeTab === "library" && (
          <section>
            <LibrarySelect label="Heimteam aus Bibliothek" items={state.teams} empty="Team auswählen" onPick={(t) => pickTeamFromLibrary("home", t)} />
            <LibrarySelect label="Gegner aus Bibliothek" items={state.teams} empty="Team auswählen" onPick={(t) => pickTeamFromLibrary("away", t)} />
            <LibrarySelect label="Sponsor aus Bibliothek" items={state.sponsors} empty="Sponsor auswählen" onPick={(s) => pickSponsorFromLibrary(s)} />
            <LibrarySelect label="Hintergrund aus Bibliothek" items={state.backgrounds} empty="Hintergrund auswählen" onPick={(b) => pickBackgroundFromLibrary(b)} />
            <div className="libraryStats"><div><span>Teams</span><b>{state.teams.length}</b></div><div><span>Sponsoren</span><b>{state.sponsors.length}</b></div><div><span>Torschützen</span><b>{state.scorerNames.length}</b></div></div>
          </section>
        )}

        {activeTab === "export" && (
          <section>
            <div className="ratioGrid">
              <button className={ratio === "portrait" ? "choice on" : "choice"} onClick={() => setRatio("portrait")}><Smartphone size={18}/> 1080×1350</button>
              <button className={ratio === "story" ? "choice on" : "choice"} onClick={() => setRatio("story")}><Smartphone size={18}/> Story 1080×1920</button>
              <button className={ratio === "landscape" ? "choice on" : "choice"} onClick={() => setRatio("landscape")}><Monitor size={18}/> 1920×1080</button>
            </div>
            <div className="buttonStack">
              <button className="primary" onClick={exportPngCanvas}><Download size={18}/> PNG exportieren</button>
              <button className="secondary" onClick={() => persistCloud(state)}><Cloud size={18}/> In Cloud speichern</button>
              <button className="ghost" onClick={() => setState(defaultState)}><RotateCcw size={18}/> Alles zurücksetzen</button>
            </div>
          </section>
        )}
      </aside>

      <section className="previewWrap">
        <div className={`preview ${ratio}`}>
          <svg ref={svgRef} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
            <rect width={stageWidth} height={stageHeight} fill={m.backgroundImage ? "#fff" : m.lightColor} />
            {m.backgroundImage && <image href={m.backgroundImage} x="0" y="0" width={stageWidth} height={stageHeight} preserveAspectRatio="xMidYMid slice" opacity={(m.backgroundOpacity || 100) / 100} />}

            <text x={stageWidth/2} y={scoreY - 150} textAnchor="middle" fontSize="39" fontFamily="Impact, Arial Black, sans-serif" fill={m.darkColor}>{String(m.competition || "").toUpperCase()}</text>

            <g transform={`translate(${stageWidth/2 - 380} ${scoreY})`}><image href={m.homeLogo} x={-logoHalf} y={-logoHalf} width={logoSize} height={logoSize} preserveAspectRatio="xMidYMid meet" /></g>
            <g transform={`translate(${stageWidth/2 + 380} ${scoreY})`}><image href={m.awayLogo} x={-logoHalf} y={-logoHalf} width={logoSize} height={logoSize} preserveAspectRatio="xMidYMid meet" /></g>

            <rect x={stageWidth/2 - 225} y={scoreY - 110} width="185" height="275" fill="#000" />
            <rect x={stageWidth/2 + 40} y={scoreY - 110} width="185" height="275" fill="#000" />
            <text x={stageWidth/2 - 132} y={scoreY + 107} textAnchor="middle" fontSize="200" fontFamily="Impact, Arial Black, sans-serif" fill="#fff">{m.homeGoals}</text>
            <text x={stageWidth/2 + 132} y={scoreY + 107} textAnchor="middle" fontSize="200" fontFamily="Impact, Arial Black, sans-serif" fill="#fff">{m.awayGoals}</text>
            <image href="/vs-logo.png" x={stageWidth/2 - 55} y={scoreY - 50} width="110" height="130" preserveAspectRatio="xMidYMid meet" />

            <text x={stageWidth/2 - 290} y={scoreY + 225} textAnchor="middle" fontSize="34" fontFamily="Impact, Arial Black, sans-serif" fill={m.darkColor}>{String(m.homeTeam || "").toUpperCase()}</text>
            <text x={stageWidth/2 + 290} y={scoreY + 225} textAnchor="middle" fontSize="34" fontFamily="Impact, Arial Black, sans-serif" fill={m.darkColor}>{String(m.awayTeam || "").toUpperCase()}</text>

            <g fontFamily="Impact, Arial Black, sans-serif" fontSize="38" fill={m.darkColor}>
              {homeScorers.map((s, i) => <text key={`h-${i}`} x={stageWidth/2 - 300} y={scoreY + 290 + i * 52} textAnchor="middle">{`${s.minute ? s.minute + " " : ""}${s.name}`.toUpperCase()}</text>)}
              {awayScorers.map((s, i) => <text key={`a-${i}`} x={stageWidth/2 + 300} y={scoreY + 290 + i * 52} textAnchor="middle">{`${s.minute ? s.minute + " " : ""}${s.name}`.toUpperCase()}</text>)}
            </g>

            {m.showSponsor && <image href={m.sponsorLogo} x={stageWidth/2 - sponsorWidth/2} y={sponsorY} width={sponsorWidth} height={sponsorHeight} preserveAspectRatio="xMidYMid meet" />}
          </svg>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);





