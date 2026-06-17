document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const lastUpdated = document.getElementById('lastUpdated');
    const searchInput = document.getElementById('searchInput');
    const filterPills = document.querySelectorAll('.filter-pills .pill');
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    const releasesGrid = document.getElementById('releasesGrid');
    const emptyState = document.getElementById('emptyState');
    
    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweetModal');
    const tweetContent = document.getElementById('tweetContent');
    const charCount = document.getElementById('charCount');
    const tweetPreviewText = document.getElementById('tweetPreviewText');
    const shareOnXBtn = document.getElementById('shareOnXBtn');
    const cancelTweetBtn = document.getElementById('cancelTweetBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // App State
    let allReleaseCards = []; // Cache of all extracted sub-notes
    let currentFilter = 'all';
    let searchQuery = '';

    // Fetch Release Notes
    async function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        hideError();
        
        try {
            const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
                if (data.releases) {
                    processReleases(data.releases);
                }
            } else {
                processReleases(data.releases);
                updateLastUpdatedTime(data.last_fetched);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            showError(`Failed to fetch release notes: ${err.message}. Please try again.`);
            releasesGrid.innerHTML = '';
            emptyState.classList.remove('hidden');
        } finally {
            setLoadingState(false);
        }
    }

    // Process Raw Feed Entries to Extract Sub-Notes
    function processReleases(rawEntries) {
        allReleaseCards = [];
        
        rawEntries.forEach(entry => {
            const subNotes = extractSubNotesFromHTML(entry.content);
            
            subNotes.forEach(subNote => {
                allReleaseCards.push({
                    id: `${entry.id}-${subNote.type}-${Math.random().toString(36).substr(2, 5)}`,
                    date: entry.date,
                    rawDate: entry.updated,
                    link: entry.link,
                    type: subNote.type,
                    html: subNote.html,
                    text: subNote.text
                });
            });
        });
        
        // Sort cards by date descending
        allReleaseCards.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        
        renderCards();
    }

    // Parse Atom Entry HTML content to separate updates by <h3>
    function extractSubNotesFromHTML(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const subNotes = [];
        
        let currentHeader = 'General';
        let currentParagraphs = [];
        
        // Loop through children elements in content body
        Array.from(doc.body.children).forEach(child => {
            if (child.tagName === 'H3') {
                // Save previous section if it had content
                if (currentParagraphs.length > 0) {
                    subNotes.push({
                        type: normalizeType(currentHeader),
                        html: currentParagraphs.map(p => p.outerHTML).join(''),
                        text: currentParagraphs.map(p => p.textContent).join('\n')
                    });
                }
                currentHeader = child.textContent.trim();
                currentParagraphs = [];
            } else {
                currentParagraphs.push(child);
            }
        });
        
        // Push the last section
        if (currentParagraphs.length > 0) {
            subNotes.push({
                type: normalizeType(currentHeader),
                html: currentParagraphs.map(p => p.outerHTML).join(''),
                text: currentParagraphs.map(p => p.textContent).join('\n')
            });
        }
        
        // Fallback if no children were found
        if (subNotes.length === 0 && htmlContent.trim() !== '') {
            subNotes.push({
                type: 'General',
                html: htmlContent,
                text: doc.body.textContent || ''
            });
        }
        
        return subNotes;
    }

    // Normalize type string into standard categories
    function normalizeType(typeStr) {
        const lower = typeStr.toLowerCase();
        if (lower.includes('feature')) return 'Feature';
        if (lower.includes('announcement')) return 'Announcement';
        if (lower.includes('change') || lower.includes('issue') || lower.includes('bug')) return 'Change';
        if (lower.includes('deprecat')) return 'Deprecated';
        return 'General';
    }

    // Render cards list with filters and search query applied
    function renderCards() {
        releasesGrid.innerHTML = '';
        
        const filtered = allReleaseCards.filter(card => {
            // Type Filter
            const matchesType = currentFilter === 'all' || card.type.toLowerCase() === currentFilter;
            
            // Search Query Filter
            const textToSearch = `${card.type} ${card.date} ${card.text}`.toLowerCase();
            const matchesSearch = textToSearch.includes(searchQuery);
            
            return matchesType && matchesSearch;
        });

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        filtered.forEach(card => {
            const cardEl = createCardElement(card);
            releasesGrid.appendChild(cardEl);
        });
    }

    // Create a release note card DOM Element
    function createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = `release-card`;
        
        // CSS properties custom for styling card top borders based on type
        let borderGlow = 'rgba(0, 242, 254, 0.3)';
        let gradientColor = 'var(--primary-gradient)';
        
        if (card.type === 'Feature') {
            gradientColor = 'var(--gradient-feature)';
            borderGlow = 'var(--border-feature)';
        } else if (card.type === 'Announcement') {
            gradientColor = 'var(--gradient-announcement)';
            borderGlow = 'var(--border-announcement)';
        } else if (card.type === 'Change') {
            gradientColor = 'var(--gradient-change)';
            borderGlow = 'var(--border-change)';
        } else if (card.type === 'Deprecated') {
            gradientColor = 'var(--gradient-deprecated)';
            borderGlow = 'var(--border-deprecated)';
        }
        
        cardDiv.style.setProperty('--card-badge-gradient', gradientColor);
        cardDiv.style.setProperty('--card-border-hover', borderGlow);
        
        const badgeClass = `badge badge-${card.type.toLowerCase()}`;
        
        cardDiv.innerHTML = `
            <div>
                <div class="card-header">
                    <span class="${badgeClass}">${card.type}</span>
                    <span class="card-date">${card.date}</span>
                </div>
                <div class="card-body">
                    ${card.html}
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-tweet" aria-label="Tweet about this update">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet Update
                </button>
            </div>
        `;
        
        // Event listener for tweeting
        const tweetBtn = cardDiv.querySelector('.btn-tweet');
        tweetBtn.addEventListener('click', () => openTweetModal(card));
        
        return cardDiv;
    }

    // Generate Twitter-friendly content and open modal
    function openTweetModal(card) {
        const header = `📢 BigQuery ${card.type} (${card.date}):\n"`;
        const footer = `"\n\nDetails: ${card.link}\n#BigQuery #GoogleCloud`;
        
        // Max space for the quote inside X's 280-char limit
        const baseLength = header.length + footer.length;
        const maxQuoteLength = 280 - baseLength - 3; // -3 for '...'
        
        let quote = card.text.replace(/\s+/g, ' ').trim();
        if (quote.length > maxQuoteLength) {
            quote = quote.substring(0, maxQuoteLength) + '...';
        }
        
        const fullTweet = `${header}${quote}${footer}`;
        
        tweetContent.value = fullTweet;
        updateTweetPreview(fullTweet);
        
        tweetModal.classList.remove('hidden');
        tweetContent.focus();
    }

    // Close Modal
    function closeTweetModal() {
        tweetModal.classList.add('hidden');
    }

    // Update character counters and preview UI
    function updateTweetPreview(text) {
        tweetPreviewText.textContent = text;
        const length = text.length;
        charCount.textContent = `${length}/280`;
        
        // Update character count indicator colors
        charCount.className = 'char-count';
        if (length > 250 && length <= 280) {
            charCount.classList.add('warning');
        } else if (length > 280) {
            charCount.classList.add('error');
        }
        
        // Disable post button if text is empty or exceeds character limits
        shareOnXBtn.disabled = length === 0 || length > 280;
    }

    // Set Loading and Animation states
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            
            // Show Skeletons
            releasesGrid.innerHTML = `
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            `;
            emptyState.classList.add('hidden');
        } else {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
        }
    }

    // Formatting timestamps
    function updateLastUpdatedTime(timestamp) {
        if (!timestamp) return;
        const dateObj = new Date(timestamp * 1000);
        const formatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        lastUpdated.textContent = `Last updated: Today at ${dateObj.toLocaleTimeString(undefined, formatOptions)}`;
    }

    // Error banners
    function showError(msg) {
        errorMessage.textContent = msg;
        errorBanner.classList.remove('hidden');
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    closeErrorBtn.addEventListener('click', hideError);
    
    // Search input handler (with simple debounce)
    let searchDebounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderCards();
        }, 150);
    });

    // Pill filter toggles
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            currentFilter = pill.getAttribute('data-filter');
            renderCards();
        });
    });

    // Share on Twitter/X action
    shareOnXBtn.addEventListener('click', () => {
        const text = tweetContent.value;
        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(xUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    });

    // Modal dismiss triggers
    cancelTweetBtn.addEventListener('click', closeTweetModal);
    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Typing listener on textarea
    tweetContent.addEventListener('input', (e) => {
        updateTweetPreview(e.target.value);
    });

    // Click outside modal card to close
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Esc key to dismiss modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Initial Load
    fetchReleases();
});
