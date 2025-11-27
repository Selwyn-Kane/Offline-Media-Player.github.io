/* ============================================
   GitHub Pages Configuration - FIXED
   ============================================ */

// Detect if running on GitHub Pages
const isGitHubPages = window.location.hostname.includes('github.io');

// Check if it's a USER/ORG site (username.github.io) or PROJECT site (username.github.io/repo)
const isUserSite = window.location.hostname.split('.')[0] === window.location.pathname.split('/')[1]?.replace('.github', '');

if (isGitHubPages) {
    if (isUserSite || window.location.pathname === '/') {
        // User/Org site - no base path needed
        window.BASE_PATH = '';
        console.log('🌐 Running on GitHub Pages (User Site) - No base path');
    } else {
        // Project site - use repo name
        const repoName = window.location.pathname.split('/')[1];
        window.BASE_PATH = `/${repoName}`;
        console.log('🌐 Running on GitHub Pages (Project Site), base path:', window.BASE_PATH);
    }
} else {
    window.BASE_PATH = '';
    console.log('🏠 Running locally');
}

window.getPath = function(path) {
    return window.BASE_PATH + path;
};