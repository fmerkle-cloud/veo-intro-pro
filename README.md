# Veo Intro Pro Hybrid Final

Kompletter Hybrid-Umbau:
- Firestore speichert nur kleine Daten + Bild-URLs.
- Firebase Storage speichert Bilder.
- Die App lädt Bilder lokal als eingebettete Daten für stabilen Canvas-PNG-Export.
- Vereinslogos werden freigestellt.
- Sponsorlogo bleibt original mit weißem Hintergrund.
- Neues VS-Logo ist in `public/vs-logo.png`.
- Nur ein Torschützen-Dropdown pro Zeile.
- Kein SVG/Proxy-Export mehr.

Update:
```powershell
git add .
git commit -m "hybrid storage final rebuild"
git push
```

Hinweis:
Nach dem Deployment einmal Cloud laden und Bilder ggf. neu hochladen, damit Storage-URLs sauber gespeichert sind.
