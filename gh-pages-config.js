/* ============================================
   GitHub Pages Configuration
   ============================================ */

// Detect if running on GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');
const repoName = 'Offline-Media-Player.github.io';

if (isGitHubPages) {
    window.BASE_PATH = `/${repoName}`;
    console.log('🌐 Running on GitHub Pages, base path:', window.BASE_PATH);
} else {
    window.BASE_PATH = '';
    console.log('🏠 Running locally');
}

window.getPath = function(path) {
    return window.BASE_PATH + path;
};