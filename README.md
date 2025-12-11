# 🎵 Ultimate Local Music Player

> A powerful, feature-rich offline music player with AI-powered playlists, visualizers, lyrics, and EQ

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20PWA%20%7C%20Chrome%20OS-green.svg)]()

---

## 🌟 Features Overview

### 🎼 Core Playback
- **Multi-Format Support**: MP3, WAV, OGG, M4A, FLAC, AAC, WMA
- **Advanced Playlist Management**: Load, shuffle, loop (all/one), search, smart filtering
- **Smart Folder Loading**: One-click folder selection with auto-reload on startup
- **Hardware Media Controls**: Works with keyboard shortcuts, media keys, headphone buttons, lock screen controls
- **Persistent Storage**: Remembers your playlist, settings, folder location, and custom metadata across sessions
- **Background Playback**: Continues playing when tab/app is minimized (PWA mode)

### 🎨 Visual Experience
- **4 Professional Visualizer Modes**:
  - 🎚️ **Bars** - Classic frequency spectrum bars with smooth gradients
  - ⭕ **Circular** - Radial spectrum analyzer with pulsing center
  - 🌊 **Waveform** - Dual mirrored wave display
  - ✨ **Particles** - Interactive particle system that reacts to music
- **Fullscreen Visualizer**: Immersive full-window visualization with auto-hide controls
- **Fullscreen Lyrics Mode**: Dedicated lyrics view with edge visualizer effects
- **Dynamic Backgrounds**: Album art colors automatically influence UI theme
- **Custom Backgrounds**: Upload your own background images or use URLs

### 🎤 Lyrics System
- **WebVTT Support**: Time-synced lyrics with precise millisecond timing
- **Auto-Scroll**: Automatically follows current playback position
- **Click-to-Jump**: Tap any lyric line to seek to that position
- **Export Options**: Download lyrics as text file or copy to clipboard
- **Fullscreen Lyrics View**: Dedicated immersive lyrics mode with visualizer
- **🆕 Automatic Lyrics Fetcher**: Standalone tool to bulk-download synced lyrics from LRCLIB API

### 🎛️ Audio Controls
- **10-Band EQ Presets**: Flat, Bass Boost, Rock, Jazz, Electronic, Vocal, Classical, Acoustic, Podcast, Treble Boost
- **3-Band Manual EQ**: Bass (200Hz), Mid (1kHz), Treble (3kHz) with ±12dB range
- **Volume Control**: Slider, keyboard shortcuts, mouse wheel scroll support
- **Mute Toggle**: Quick mute/unmute with volume memory

### ✏️ Metadata System
- **Custom Metadata Editor**: Edit title, artist, album, year, genre, composer, comments
- **Persistent Custom Tags**: Survives browser restarts using localStorage
- **ID3 Tag Reading**: Automatic extraction from audio files (via jsmediatags)
- **Playlist Integration**: Updates display instantly across all views
- **Album Art Extraction**: Automatic extraction and display from ID3 tags

### 🧠 Smart Playlist Generator
- **AI-Powered Analysis**: Analyzes BPM, energy, mood, key, danceability, loudness
- **8 Intelligent Templates**:
  - 💪 **High Energy Workout** - Energetic tracks to power through workouts
  - 📚 **Focus & Study** - Calm, consistent tracks for concentration
  - 🎧 **Seamless DJ Mix** - BPM and key-matched for smooth transitions
  - ☀️ **Gentle Wake Up** - Gradually increasing energy
  - 🎉 **Party Mix** - High energy, danceable tracks
  - 😌 **Chill Vibes** - Relaxed, mellow atmosphere
  - 🏃 **Running Pace** - Consistent tempo for running (150-180 BPM)
  - 😴 **Sleep & Relaxation** - Descending energy for winding down
- **Analysis Caching**: Save analysis results to localStorage for instant playlist generation
- **Detailed Stats**: Track count, duration, average BPM, energy levels, mood distribution

### 📱 Mobile Optimizations
- **Touch Gestures**: 
  - Swipe right/left on cover art for previous/next track
  - Pull-to-refresh on playlist to reload folder
  - Long-press on tracks for context menu
- **Haptic Feedback**: Physical button feel on all interactions
- **Responsive UI**: Adapts perfectly to any screen size
- **PWA Support**: Install as native app on iOS/Android
- **Status Bar Auto-Hide**: Fullscreen experience on Android

### 🖥️ Chrome OS Features
- **Extension Mode**: Runs as Chrome extension with dedicated window
- **PWA Mode**: Installable web app with offline support
- **Folder Persistence**: Remembers last used folder with auto-reload
- **Optimized Keyboard Shortcuts**: Chrome OS-specific shortcuts
- **Hybrid Input Support**: Optimized for touchscreen + keyboard usage

### 🎯 Advanced Features
- **Picture-in-Picture**: Floating mini-player always on top (Chrome/Edge)
- **Sticky Mini Player**: Keeps controls visible while scrolling
- **3 View Modes**: Full, Compact, Mini for different workflows
- **Debug Console**: Real-time logging for troubleshooting
- **Performance Manager**: Adaptive frame rates based on visibility and mode
- **Color Extraction**: Dominant color extraction from album art with caching
- **Drag & Drop**: Drop audio/VTT files anywhere to load instantly

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
4. **Next time**: Automatically reloads last folder on startup

### 📲 Progressive Web App (Mobile)

**Android:**
1. Chrome → Menu (⋮) → "Add to Home Screen"
2. Tap icon to launch fullscreen app

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
| **C** | Cycle compact mode (Full → Compact → Mini) |
| **S** | Toggle sticky player |
| **F** | Picture-in-Picture |
| **V** | Fullscreen visualizer |
| **D** | Debug panel |

**Chrome OS Exclusive:**
- **Alt+M**: Toggle mini player
- **Ctrl+Shift+L**: Open folder picker

---

## 📖 Detailed Usage Guide

### 🎵 Loading Music

**Method 1: File Picker**
```
Click "📂 Load Music & Lyrics"
→ Select files (Ctrl+Click for multiple)
→ Include .vtt files for lyrics
→ Player loads automatically
```

**Method 2: Folder Picker** (Desktop/Chrome OS only)
```
Click "📁 Select Music Folder"
→ Grant permission
→ All music auto-loads
→ Enable auto-reload to remember folder
```

**Method 3: Drag & Drop**
```
Drag music files onto page
→ Drop anywhere
→ Instant load
```

### 🎤 Adding Lyrics

#### Manual Method:

1. **Name your VTT file** to match audio:
   ```
   Song.mp3
   Song.vtt  ← Must match exactly!
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

#### 🆕 Automatic Method (Lyrics Fetcher):

1. **Open** `lyrics-fetcher.html` in your browser
2. **Click** "📁 Select Music Folder"
3. **Choose** your music folder
4. **Click** "🎤 Fetch Lyrics for All Songs"
5. **Wait** for automatic processing (uses LRCLIB API)
6. **Download** generated VTT files as ZIP
7. **Extract** ZIP and place VTT files in your music folder
8. **Reload** music player - lyrics appear automatically!

**Lyrics Fetcher Features:**
- Scans entire music folder for MP3/M4A/FLAC files
- Reads ID3 tags for accurate search
- Queries LRCLIB database for synced lyrics
- Converts LRC format to VTT format
- Downloads all lyrics as convenient ZIP file
- Shows real-time progress and statistics
- Handles missing lyrics gracefully

### 🎛️ Using the Equalizer

**Quick Presets:**
1. Click dropdown → Select preset
2. Instant apply (saved automatically)

**Manual Adjustment:**
1. Drag vertical sliders
2. Bass: Low frequencies (drums, bass)
3. Mid: Vocals, guitars
4. Treble: High frequencies (cymbals, hi-hats)
5. Reset: Click "Reset" button

### ✏️ Editing Metadata

1. **Hover** over track in playlist
2. **Click** ✏️ (edit button)
3. **Modify** title, artist, album, year, genre, composer, comments
4. **Click** "💾 Save Changes"
5. Changes persist across sessions via localStorage

### 🧠 Smart Playlists

1. **Click** "🧠 Smart Playlists" button
2. **Analyze** your music library (one-time process)
3. **Choose** a playlist template:
   - Workout, Study, DJ Mix, Wake Up, Party, Chill, Running, Sleep
4. **Review** generated playlist with stats
5. **Load** to main player with one click
6. **Save** analysis cache for instant future generation

### 🖼️ Custom Background

1. **Click** "🎨 Background"
2. **Choose**:
   - "📤 Upload Image" → Select file (under 5MB)
   - "🌐 Use Image URL" → Paste link
3. **Reset** anytime to default gradient

---

## 🎨 View Modes

### Full View (Default)
- All features visible
- Visualizer, EQ, lyrics, playlist
- Best for desktop

### Compact Mode
- Hides visualizer, EQ, lyrics
- Shows player essentials + playlist
- Good for multitasking

### Mini Mode
- Minimal: Now playing + progress bar only
- Maximum space savings
- Perfect for background music

**Toggle:** Click "📐 Full View" button or press **C**

---

## 📌 Sticky Player

**Enable sticky mode:**
1. Click "📌 Sticky Off"
2. Player sticks to bottom of window
3. Stays visible while scrolling
4. Perfect with mini mode

**Use case:** Browse playlist while controlling playback

---

## 🌌 Fullscreen Features

### Fullscreen Visualizer
1. **Click** "🌌 Fullscreen Visualizer"
2. **Controls**:
   - 🎨 Mode: Switch visualization style
   - ◀ ▶: Previous/Next track
   - ⏸ ▶: Play/Pause
   - ✕ Close (or press ESC)
3. **Auto-hide**: Move mouse to show controls
4. **Force Hide**: Click 👁️ button to manually hide/show controls

### Fullscreen Lyrics
1. **Click** "🎤 Fullscreen Lyrics"
2. Features edge-based visualizer
3. **Click** any lyric line to jump to that time
4. **Controls** appear at bottom (◀ Previous / Next ▶)
5. **Close** with ✕ button or ESC key

---

## 🔧 Advanced Features

### Picture-in-Picture (Desktop)
1. Click "📺 Float"
2. Creates draggable mini window
3. Always on top of other windows
4. Shows track info and visualizer
5. **Multi-strategy fallback system** for maximum compatibility:
   - Primary: Uses main video element
   - Fallback 1: Creates custom video stream
   - Fallback 2: Minimal audio-only approach
6. Works on Chrome, Edge, and Chrome OS

### Debug Mode
- Press **D** or click "🛠 Debug"
- Shows real-time console logs
- Displays metadata extraction info
- Helpful for troubleshooting

### Performance Optimization
- **Adaptive Frame Rates**: Adjusts based on visibility
- **Tab Hidden**: Reduces CPU usage when tab not visible
- **Compact/Mini Mode**: Disables visualizer to save resources
- **Smart Caching**: Color extraction, analysis results, metadata

---

## 📱 Mobile Gestures

| Gesture | Action |
|---------|--------|
| **Swipe Right** on cover art | Previous track |
| **Swipe Left** on cover art | Next track |
| **Pull Down** on playlist | Refresh folder |
| **Long Press** on track | Context menu |
| **Tap** lyric line | Jump to that time |

**Haptic Feedback:**
- Light: Play/pause, volume
- Medium: Track change
- Heavy: Long press detection
- Success: Playlist loaded
- Error: Operation failed

---

## 🎯 Tips & Tricks

### 🎵 Best Audio Quality
- Use FLAC or high-bitrate MP3 (320kbps)
- Enable Bass Boost preset for EDM/Electronic
- Use Vocal preset for podcasts
- Use Classical preset for orchestral music

### 🎤 Perfect Lyrics
- Use the **Lyrics Fetcher** tool for bulk downloads
- Manual VTT files: Match filename exactly with audio
- Create VTT files with proper timestamps (HH:MM:SS.mmm)
- Example: `Song.mp3` needs `Song.vtt` (exact match)
- Any filename difference prevents VTT matching

### 🧠 Smart Playlists
- Analyze your library once, reuse forever
- Save analysis cache to localStorage
- Try different templates for same music
- Adjust criteria by generating custom playlists
- Perfect for different activities and moods

### ⚡ Performance
- Use Compact or Mini mode if visualizer lags
- Close unused browser tabs
- Disable visualizer in settings for maximum battery life
- Smart Playlists: Analyze in batches if you have 100+ tracks

### 💾 Storage
- Browser cache: ~50 tracks
- Folder mode: Unlimited (direct file access)
- Playlists persist in localStorage
- Custom metadata stored separately
- Smart playlist analysis cached for speed

### 🔒 Privacy
- All processing happens locally on your device
- No data sent to servers (except LRCLIB for lyrics fetching)
- Music files never leave your device
- No tracking, no analytics, no ads

---

## 🌐 Browser Support

| Browser | Desktop | Mobile | Features |
|---------|---------|--------|----------|
| **Chrome** | ✅ Full | ✅ Full | All features including PiP, folder access |
| **Edge** | ✅ Full | ✅ Full | All features including PiP, folder access |
| **Firefox** | ✅ Most | ✅ Most | No folder picker, PiP support varies |
| **Safari** | ⚠️ Limited | ⚠️ Limited | No folder picker, no PiP, basic features only |

**Recommended:** Chrome 86+ or Edge 86+ for best experience

**Minimum Requirements:**
- ES6+ JavaScript support
- Web Audio API
- Canvas API
- FileReader API
- LocalStorage API

---

## 📂 Project Structure

```
├── index.html                      # Main app HTML
├── style.css                       # All styling
├── script.js                       # Main app logic
├── manifest.webmanifest            # PWA manifest
├── service-worker.js               # PWA service worker
├── sw-init.js                      # Service worker initialization
│
├── Core Modules:
├── audio-presets-manager.js        # EQ preset system
├── visualizer-manager.js           # Visualizer rendering
├── metadata-parser.js              # ID3 tag reading
├── vtt-parser.js                   # Lyrics parsing
├── error-recovery.js               # Error handling
├── performance-manager.js          # CPU optimization
├── config-constants.js             # App configuration
│
├── Smart Playlists:
├── music-analyzer.js               # Audio analysis (BPM, energy, mood)
├── smart-playlist-generator.js     # AI playlist generation
│
├── UI Enhancements:
├── metadata-editor.js              # Metadata editing UI
├── custom-background.js            # Background manager
├── mobile.js                       # Mobile optimizations
│
├── Platform Support:
├── chromeOS-detector.js            # Platform detection
├── background.js                   # Chrome extension service worker
├── background-audio-handler.js     # Background playback
├── gh-pages-config.js              # GitHub Pages support
│
├── Tools:
├── lyrics-fetcher.html             # Standalone lyrics downloader
│
└── Icons & Assets:
    ├── icon-192.png
    ├── icon-512.png
    └── (custom backgrounds stored in localStorage)
```

---

## 🆕 What's New

### Latest Features (v3.0)
- ✨ **Smart Playlist Generator**: AI-powered playlist creation with 8 templates
- 🎤 **Automatic Lyrics Fetcher**: Standalone tool for bulk lyrics download
- 🎨 **Custom Background System**: Upload images or use URLs
- 📱 **Enhanced Mobile Experience**: Haptic feedback, pull-to-refresh, gesture indicators
- 🌌 **Fullscreen Lyrics Mode**: Dedicated lyrics view with edge visualizer
- 💾 **Smart Caching**: Analysis results, color extraction, metadata
- 🎭 **Multiple Visualizer Modes**: Bars, Circular, Waveform, Particles
- ✏️ **Metadata Editor**: Full tag editing with persistence
- 📺 **Improved Picture-in-Picture**: Multi-strategy fallback for compatibility
- ⚡ **Performance Optimizations**: Adaptive frame rates, smarter resource usage

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Test thoroughly across browsers
4. Commit changes (`git commit -m 'Add AmazingFeature'`)
5. Push to branch (`git push origin feature/AmazingFeature`)
6. Submit pull request

**Areas for Contribution:**
- Additional visualizer modes
- More EQ presets
- Smart playlist templates
- Mobile gesture improvements
- Browser compatibility fixes
- Performance optimizations
- Translation/localization

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

This means you can:
- ✅ Use commercially
- ✅ Modify freely
- ✅ Distribute
- ✅ Use privately

---

## 🙏 Credits

**Libraries Used:**
- [jsmediatags](https://github.com/aadsm/jsmediatags) - Metadata tag reading
- [JSZip](https://stuk.github.io/jszip/) - ZIP file generation (lyrics fetcher)

**APIs Used:**
- [LRCLIB](https://lrclib.net) - Synced lyrics database (free, no API key required)

**Inspiration:**
Built with ❤️ for music lovers who want complete control over their listening experience without cloud dependencies or subscriptions.

---

## 📞 Support

Found a bug? Have a feature request?

- 🐛 [Report Issues](https://github.com/your-username/your-repo/issues)
- 💡 [Request Features](https://github.com/your-username/your-repo/discussions)
- 📧 Email: pieredino@gmail.com

**Common Issues:**
- **No sound**: Check browser audio permissions
- **Folder not loading**: Grant filesystem permissions
- **Lyrics not showing**: Ensure VTT filename matches audio exactly
- **PiP not working**: Use Chrome/Edge, try refreshing page
- **Slow performance**: Try Compact/Mini mode

---

## 🔮 Roadmap

**Planned Features:**
- [ ] Playlist import/export (M3U, PLS)
- [ ] Audio effects (reverb, echo, etc.)
- [ ] Podcast support with chapters
- [ ] Radio streaming support
- [ ] Wrapped-Like Listening Reports
- [ ] More smart playlist templates

---

## ⭐ Show Your Support

If you like this project:
- ⭐ Star this repository
- 🍴 Fork and customize
- 📢 Share with friends
- 💖 Contribute improvements

---

**Enjoy your music! 🎵🎧🎶**

*Built for offline freedom. Enhanced with intelligence. Powered by the web.*