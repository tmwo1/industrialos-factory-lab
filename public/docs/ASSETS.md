# Asset sources and licenses

- Equipment, conveyor, floor layout and warehouse geometry: original procedural geometry authored for IndustrialOS Factory Lab. No manufacturer CAD, proprietary models or paid asset packs.
- Floor and paint textures: original deterministic Canvas2D procedural textures generated locally. No remote texture requests.
- Lighting: an environment generated at runtime using Three.js RoomEnvironment; no downloaded HDRI.
- Machine labels and logo: original local SVG/Canvas shapes and text.
- IBM Plex Sans Arabic and Inter: self-hosted font files from Google Fonts. SIL Open Font License. See `/fonts/IBM-Plex-OFL.txt`, `/fonts/Inter-OFL.txt`, and `/fonts/manifest.json` for exact source URLs.
- Interface icons: Lucide React, ISC license, dependency locked in package-lock.json.
- Three.js, React and React Three Fiber: their respective open-source licenses remain in npm packages. Camera controls use Three.js OrbitControls directly. The repository does not claim ownership over third-party libraries.

No Poly Haven assets are used in this release. The plan permitted them, but locally generated materials eliminate a runtime asset dependency.

The equipment's visual appearance is illustrative, not manufacturer-certified. Unlimited queues may be represented by a limited number of visible parts; the interface gives exact counts.
