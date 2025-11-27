# 🎵 Ultimate Local Music Player

> A powerful, feature-rich music player with visualizers, lyrics, and EQ

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Chrome%20OS-green.svg)]()

---

## 🌟 Features

### 🎼 Core Playback
- **Multi-Format Support**: MP3, WAV, OGG, M4A, FLAC, AAC, WMA
- **Playlist Management**: Load, shuffle, loop (all/one), search
- **Smart Folder Loading**: One-click folder selection with auto-reload
- **Hardware Controls**: Works with media keys, headphone buttons, lock screen controls
- **Persistent Storage**: Remembers your playlist and settings

### 🎨 Visual Experience
- **4 Visualizer Modes**:
  - 🎚️ Bars - Classic frequency bars
  - ⭕ Circular - Radial spectrum analyzer
  - 🌊 Waveform - Dual wave display
  - ✨ Particles - Interactive particle system
- **Fullscreen Visualizer**: Immersive visualization with auto-hide controls
- **Dynamic Backgrounds**: Album art colors influence UI theme
- **Custom Backgrounds**: Upload your own images

### 🎤 Lyrics System
- **WebVTT Support**: Time-synced lyrics (.vtt files)
- **Auto-Scroll**: Follows current position
- **Click to Jump**: Tap any lyric to seek
- **Export**: Download lyrics as text or copy to clipboard

### 🎛️ Audio Controls
- **10-Band Presets**: Flat, Bass Boost, Rock, Jazz, Electronic, Vocal, Classical, Acoustic, Podcast, Treble Boost
- **3-Band EQ**: Bass (200Hz), Mid (1kHz), Treble (3kHz)
- **Range**: ±12dB per band
- **Volume Control**: Slider, keyboard shortcuts, scroll wheel

### ✏️ Metadata Editor
- **Custom Tags**: Edit title, artist, album, year, genre, composer
- **Persistent**: Survives browser restarts
- **Playlist Integration**: Updates display instantly

### 📱 Mobile Optimizations
- **Touch Gestures**: Swipe for next/previous track
- **Pull-to-Refresh**: Reload folder on playlist
- **Haptic Feedback**: Physical button feel
- **Responsive UI**: Adapts to screen size
- **PWA Support**: Install as native app

### 🖥️ Chrome OS Features
- **Extension Mode**: Runs as Chrome extension
- **PWA Mode**: Installable web app
- **Folder Persistence**: Remembers last used folder
- **Keyboard Shortcuts**: Optimized for Chrome OS

---

## 🚀 Quick Start

### 🌐 Web Browser (Any Device)

1. **Open** `index.html` in any modern browser
2. **Click** "📂 Load Music & Lyrics"
3. **Select** your music files (+ optional .vtt lyric files)
4. **Enjoy!** 🎉

### 📁 Folder Mode (Desktop/Chrome OS)

1. **Click** "📁 Select Music Folder"
2. **Grant permission** when prompted
3. **Auto-loads** all music in folder
4. **Next time**: Automatically reloads last folder

### 📲 Progressive Web App (Mobile)

**Android:**
1. Chrome → Menu (⋮) → "Add to Home Screen"
2. Tap icon to launch

**iOS:**
1. Safari → Share → "Add to Home Screen"
2. Tap icon to launch

### 🔌 Chrome Extension (Chrome OS)

1. Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select project folder
5. Click extension icon to open

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause |
| **N** | Next track |
| **P** | Previous track |
| **M** | Mute/Unmute |
| **↑** | Skip forward 5s |
| **↓** | Rewind 5s |
| **C** | Cycle compact mode |
| **S** | Toggle sticky player |
| **F** | Picture-in-Picture |
| **V** | Fullscreen visualizer |
| **D** | Debug panel |

**Chrome OS Exclusive:**
- **Alt+M**: Toggle mini player
- **Ctrl+Shift+L**: Open folder picker

---

## 📖 How to Use

### 🎵 Loading Music

**Method 1: File Picker**
```
Click "📂 Load Music & Lyrics"
→ Select files (Ctrl+Click for multiple)
→ Include .vtt files for lyrics
→ Player loads automatically
```

**Method 2: Folder Picker** (Desktop only)
```
Click "📁 Select Music Folder"
→ Grant permission
→ All music auto-loads
→ Enable "Auto-reload" to remember folder
```

**Method 3: Drag & Drop**
```
Drag music files onto page
→ Drop anywhere
→ Instant load
```

### 🎤 Adding Lyrics

1. **Name your VTT file** to match audio:
   ```
   Song.mp3
   Song.vtt  ← Must match!
   ```

2. **VTT Format:**
   ```
   WEBVTT

   00:00:00.000 --> 00:00:05.000
   First line of lyrics

   00:00:05.000 --> 00:00:10.000
   Second line of lyrics
   ```

3. **Load together** with music files

### 🎛️ Using the Equalizer

**Quick Presets:**
1. Click dropdown → Select preset
2. Instant apply

**Manual Adjustment:**
1. Drag vertical sliders
2. Bass: Low frequencies (drums, bass)
3. Mid: Vocals, guitars
4. Treble: High frequencies (cymbals, hi-hats)

**Reset:** Click "Reset" button

### ✏️ Editing Metadata

1. **Hover** over track in playlist
2. **Click** ✏️ (edit button)
3. **Modify** title, artist, album, etc.
4. **Click** "💾 Save Changes"
5. Changes saved across sessions

### 🖼️ Custom Background

1. **Click** "🎨 Background"
2. **Choose**:
   - "📤 Upload Image" → Select file
   - "🌐 Use Image URL" → Paste link
3. **Reset** anytime to default gradient

---

## 🎨 View Modes

### Full View (Default)
- All features visible
- Best for desktop

### Compact Mode
- Hides visualizer, EQ, lyrics
- Shows player essentials
- Good for multitasking

### Mini Mode
- Minimal: Now playing + progress
- Maximum space savings
- Perfect for background music

**Toggle:** Click "📦 Full View" button or press **C**

---

## 📌 Sticky Player

**Enable sticky mode:**
1. Click "📌 Sticky Off"
2. Player sticks to bottom
3. Stays visible while scrolling
4. Perfect with mini mode

**Use case:** Browse playlist while controlling playback

---

## 🌌 Fullscreen Visualizer

1. **Click** "🌌 Fullscreen Visualizer"
2. **Controls**:
   - 🎨 Mode: Switch visualization
   - ◀ ▶: Previous/Next track
   - ⏸ ▶: Play/Pause
   - ✕ Close (or press ESC)
3. **Auto-hide**: Move mouse to show controls

**Modes:**
- **Bars**: Classic frequency analyzer
- **Circular**: Radial spectrum
- **Waveform**: Dual wave display
- **Particles**: Interactive particles

---

## 🔧 Advanced Features

### Picture-in-Picture (Desktop)
1. Click "🖼️ Float"
2. Draggable mini window
3. Always on top
4. Shows visualizer or track info

### Debug Mode
- Press **D** or click "🛠 Debug"
- Shows console logs
- Helpful for troubleshooting

### Performance Modes
- **Full**: 60 FPS visualizer
- **Compact**: Visualizer off, saves CPU
- **Mini**: Maximum power saving

---

## 📱 Mobile Gestures

| Gesture | Action |
|---------|--------|
| **Swipe Right** on cover art | Previous track |
| **Swipe Left** on cover art | Next track |
| **Pull Down** on playlist | Refresh folder |
| **Long Press** on track | Context menu |
| **Tap** lyric line | Jump to that time |

---

## 🎯 Tips & Tricks

### 🎵 Best Audio Quality
- Use FLAC or high-bitrate MP3 (320kbps)
- Enable Bass Boost preset for EDM
- Use Vocal preset for podcasts

### 🎤 Perfect Lyrics
- Create VTT files with proper timestamps
- Match filename exactly with audio
- Example: If audio is `coolaudio.mp3`, VTT should be `coolaudio.vtt`
- Any filename difference will prevent VTT from matching to audio

### ⚡ Performance
- Disable visualizer if laggy (compact mode)
- Close unused browser tabs
- Use mini mode when not watching

### 💾 Storage
- Browser cache: ~50 tracks
- Folder mode: Unlimited (direct file access)
- Playlists persist in localStorage

### 🔒 Privacy
- All processing happens locally
- No data sent to servers
- Music files never leave your device

---

## 🌐 Browser Support

| Browser | Desktop | Mobile | Features |
|---------|---------|--------|----------|
| **Chrome** | ✅ Full | ✅ Full | All features |
| **Edge** | ✅ Full | ✅ Full | All features |
| **Firefox** | ✅ Most | ✅ Most | No folder picker |
| **Safari** | ⚠️ Limited | ⚠️ Limited | No folder picker |

**Recommended:** Chrome 86+ or Edge 86+

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Test thoroughly
4. Submit pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Credits

**Libraries Used:**
- [jsmediatags](https://github.com/aadsm/jsmediatags) - Metadata tag reading

**Inspiration:**
Built by a music lover with ❤️ for music lovers who want complete control over their listening experience.

---

## 📞 Support

Found a bug? Have a feature request?

- 🛠 [Report Issues](https://github.com/your-username/your-repo/issues)
- 📧 Email: pieredino@gmail.com

---

## ⭐ Show Your Support

If you like this project:
- ⭐ Star this repository
- 🍴 Fork and customize
- 📢 Share with friends

---

**Enjoy your music! 🎵🎧🎶**