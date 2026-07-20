document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // Initialize shared components (present on every page)
    // -------------------------------------------------------------
    if (typeof initNavbar === 'function') initNavbar();
    if (typeof initSidebar === 'function') initSidebar();

    // -------------------------------------------------------------
    // Scroll Progress Bar
    // -------------------------------------------------------------
    const mainContent = document.querySelector('.main-content');
    const header = document.querySelector('.header');
    
    if (mainContent) {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        
        // Append progress bar to header if exists, otherwise to body
        if (header) {
            header.style.position = 'sticky'; // ensure header is sticky
            header.appendChild(progressBar);
        } else {
            progressBar.style.position = 'fixed';
            progressBar.style.top = '0';
            progressBar.style.left = '0';
            progressBar.style.width = '0%';
            progressBar.style.height = '3px';
            progressBar.style.zIndex = '9999';
            document.body.appendChild(progressBar);
        }
        
        mainContent.addEventListener('scroll', () => {
            const scrollTop = mainContent.scrollTop;
            const scrollHeight = mainContent.scrollHeight - mainContent.clientHeight;
            const scrollPercent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressBar.style.width = `${scrollPercent}%`;
        });
    }
});
