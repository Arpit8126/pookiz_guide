document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------
  // State Initialization
  // -----------------------------------------------------------
  const state = {
    currentCategoryId: '',
    currentChapterId: '',
    collapsedSidebars: {
      category: false,
      chapters: false
    },
    textSize: 100, // percentage
    theme: 'dark',
    searchActive: false,
    searchResults: []
  };

  // Icon mapping helper
  const categoryIcons = {
    frontend: 'layout',
    backend: 'server',
    database: 'database',
    project_explanation_and_qa: 'help-circle',
    general: 'file-text'
  };

  // DOM Cache
  const htmlEl = document.documentElement;
  const categoryListEl = document.getElementById('category-list');
  const chaptersListEl = document.getElementById('chapters-list');
  const activeCategoryNameEl = document.getElementById('active-category-name');
  const chaptersCountBadgeEl = document.getElementById('chapters-count-badge');
  const markdownViewerEl = document.getElementById('markdown-viewer');
  const welcomeDashboardEl = document.getElementById('welcome-dashboard');
  const markdownBodyEl = document.getElementById('markdown-body');
  
  const categorySidebarEl = document.getElementById('category-sidebar');
  const chaptersSidebarEl = document.getElementById('chapters-sidebar');
  const toggleCategoryBtn = document.getElementById('toggle-category-btn');
  const toggleChaptersBtn = document.getElementById('toggle-chapters-btn');
  const restoreCategoryBtn = document.getElementById('restore-category-btn');
  const restoreChaptersBtn = document.getElementById('restore-chapters-btn');
  
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  const chapterSearchInput = document.getElementById('chapter-search');
  const globalSearchInput = document.getElementById('global-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  
  const contentAreaEl = document.getElementById('content-area');
  const scrollToTopBtn = document.getElementById('scroll-to-top');
  const readingProgressBar = document.getElementById('reading-progress-bar');
  
  const breadcrumbCategory = document.getElementById('breadcrumb-category');
  const breadcrumbChapter = document.getElementById('breadcrumb-chapter');

  // Mobile Drawer DOM
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileDrawerClose = document.getElementById('mobile-drawer-close');
  const tabCategoriesBtn = document.getElementById('tab-categories');
  const tabChaptersBtn = document.getElementById('tab-chapters');
  const drawerCategoriesView = document.getElementById('drawer-categories-view');
  const drawerChaptersView = document.getElementById('drawer-chapters-view');
  const mobileCategoryList = document.getElementById('mobile-category-list');
  const mobileChaptersList = document.getElementById('mobile-chapters-list');
  const mobileBackToCategories = document.getElementById('mobile-back-to-categories');
  const mobileCategoryTitleBack = document.getElementById('mobile-category-title-back');
  const mobileChapterSearch = document.getElementById('mobile-chapter-search');

  // Welcome Stats DOM
  const statCategoriesCount = document.getElementById('stat-categories-count');
  const statChaptersCount = document.getElementById('stat-chapters-count');
  const statFilesSize = document.getElementById('stat-files-size');
  const quickCategoryPills = document.getElementById('quick-category-pills');

  // -----------------------------------------------------------
  // Verify Data Integrity
  // -----------------------------------------------------------
  if (!window.learningData || !window.learningData.categories) {
    console.error('Learning data is not loaded. Please ensure data.js is generated.');
    markdownBodyEl.innerHTML = '<div class="alert error">Failed to load learning data. Please verify that "data.js" is compiled and present.</div>';
    welcomeDashboardEl.style.display = 'none';
    markdownViewerEl.style.display = 'block';
    return;
  }

  const db = window.learningData;

  // -----------------------------------------------------------
  // Bootstrap Application
  // -----------------------------------------------------------
  initApp();

  function initApp() {
    // Theme setup
    const savedTheme = localStorage.getItem('pookiz-theme') || 'light';
    setTheme(savedTheme);

    // Font size setup
    const savedSize = parseInt(localStorage.getItem('pookiz-text-size'), 10) || 100;
    setTextSize(savedSize);

    // Setup Sidebar minimize saved state
    const savedCategoryCollapse = localStorage.getItem('pookiz-collapse-category') === 'true';
    const savedChaptersCollapse = localStorage.getItem('pookiz-collapse-chapters') === 'true';
    if (savedCategoryCollapse) toggleSidebar(categorySidebarEl, toggleCategoryBtn, restoreCategoryBtn, 'category', true);
    if (savedChaptersCollapse) toggleSidebar(chaptersSidebarEl, toggleChaptersBtn, restoreChaptersBtn, 'chapters', true);

    // Render static parts
    renderCategorySidebars();
    calculateStats();
    
    // Lucide Icons Render
    lucide.createIcons();

    // Event Listeners
    setupEventListeners();

    // Route initially from URL Hash
    routeFromHash();
  }

  // -----------------------------------------------------------
  // Calculate welcome dashboard statistics
  // -----------------------------------------------------------
  function calculateStats() {
    let totalChapters = 0;
    db.categories.forEach(cat => {
      totalChapters += cat.chapters.length;
    });

    statCategoriesCount.textContent = db.categories.length;
    statChaptersCount.textContent = totalChapters;
    statFilesSize.textContent = 'ONLINE';

    // Populate quick pills
    quickCategoryPills.innerHTML = '';
    db.categories.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = 'category-pill';
      pill.textContent = cat.name;
      pill.addEventListener('click', () => {
        selectCategory(cat.id);
        // Focus first chapter or open list
        if (cat.chapters.length > 0) {
          selectChapter(cat.id, cat.chapters[0].id);
        }
      });
      quickCategoryPills.appendChild(pill);
    });
  }

  // -----------------------------------------------------------
  // Setters & UI Handlers
  // -----------------------------------------------------------
  function setTheme(theme) {
    state.theme = theme;
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('pookiz-theme', theme);

    // Dynamic Prism Theme Toggle
    const prismThemeEl = document.getElementById('prism-theme');
    if (prismThemeEl) {
      if (theme === 'dark') {
        prismThemeEl.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css');
      } else {
        prismThemeEl.setAttribute('href', 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css');
      }
    }
  }

  function setTextSize(size) {
    state.textSize = Math.min(Math.max(size, 80), 160); // 80% to 160%
    markdownBodyEl.style.setProperty('--body-font-size', `${state.textSize / 100}rem`);
    localStorage.setItem('pookiz-text-size', state.textSize);
  }

  function toggleSidebar(sidebarEl, buttonEl, restoreBtnEl, type, forceCollapse = null) {
    const isCollapsed = forceCollapse !== null ? forceCollapse : !sidebarEl.classList.contains('collapsed');
    
    state.collapsedSidebars[type] = isCollapsed;
    localStorage.setItem(`pookiz-collapse-${type}`, isCollapsed);

    if (isCollapsed) {
      sidebarEl.classList.add('collapsed');
      restoreBtnEl.style.display = 'flex';
    } else {
      sidebarEl.classList.remove('collapsed');
      restoreBtnEl.style.display = 'none';
    }

    // Refresh icon state on button
    const icon = buttonEl.querySelector('i');
    if (icon) {
      if (isCollapsed) {
        icon.setAttribute('data-lucide', 'chevron-right');
      } else {
        icon.setAttribute('data-lucide', 'chevron-left');
      }
      lucide.createIcons({
        attrs: {
          'data-lucide': true
        },
        nameAttr: 'data-lucide'
      });
    }
  }

  // -----------------------------------------------------------
  // Sidebar Rendering (Desktop & Mobile)
  // -----------------------------------------------------------
  function renderCategorySidebars() {
    categoryListEl.innerHTML = '';
    mobileCategoryList.innerHTML = '';

    db.categories.forEach(cat => {
      const iconName = categoryIcons[cat.id] || 'folder';
      
      // Desktop Category Link
      const desktopItem = document.createElement('a');
      desktopItem.className = 'nav-item';
      desktopItem.setAttribute('data-cat-id', cat.id);
      desktopItem.innerHTML = `<i data-lucide="${iconName}"></i> <span>${cat.name}</span>`;
      desktopItem.addEventListener('click', () => selectCategory(cat.id));
      categoryListEl.appendChild(desktopItem);

      // Mobile Category Link
      const mobileItem = document.createElement('a');
      mobileItem.className = 'nav-item';
      mobileItem.innerHTML = `<i data-lucide="${iconName}"></i> <span>${cat.name}</span>`;
      mobileItem.addEventListener('click', () => selectCategoryMobile(cat));
      mobileCategoryList.appendChild(mobileItem);
    });
  }

  function populateChaptersSidebar(catId, filterText = '') {
    const category = db.categories.find(c => c.id === catId);
    if (!category) return;

    chaptersListEl.innerHTML = '';
    activeCategoryNameEl.textContent = category.name;

    const filteredChapters = category.chapters.filter(ch => 
      ch.title.toLowerCase().includes(filterText.toLowerCase()) ||
      ch.filename.toLowerCase().includes(filterText.toLowerCase())
    );

    chaptersCountBadgeEl.textContent = filteredChapters.length;

    filteredChapters.forEach(ch => {
      const isRootFile = catId === 'general';
      const parsedNum = parseChapterNumber(ch.filename, isRootFile);

      const chItem = document.createElement('div');
      chItem.className = 'chapter-item';
      chItem.setAttribute('data-ch-id', ch.id);
      if (state.currentChapterId === ch.id) {
        chItem.classList.add('active');
      }

      chItem.innerHTML = `
        <span class="chapter-num">${parsedNum}</span>
        <span class="chapter-title">${ch.title}</span>
      `;
      chItem.addEventListener('click', () => selectChapter(catId, ch.id));
      chaptersListEl.appendChild(chItem);
    });
  }

  function populateChaptersMobile(category, filterText = '') {
    mobileChaptersList.innerHTML = '';
    mobileCategoryTitleBack.textContent = category.name;

    const filteredChapters = category.chapters.filter(ch => 
      ch.title.toLowerCase().includes(filterText.toLowerCase()) ||
      ch.filename.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredChapters.forEach(ch => {
      const isRootFile = category.id === 'general';
      const parsedNum = parseChapterNumber(ch.filename, isRootFile);

      const chItem = document.createElement('div');
      chItem.className = 'chapter-item';
      chItem.setAttribute('data-ch-id', ch.id);
      if (state.currentChapterId === ch.id) {
        chItem.classList.add('active');
      }

      chItem.innerHTML = `
        <span class="chapter-num">${parsedNum}</span>
        <span class="chapter-title">${ch.title}</span>
      `;
      chItem.addEventListener('click', () => {
        selectChapter(category.id, ch.id);
        closeMobileDrawer();
      });
      mobileChaptersList.appendChild(chItem);
    });
  }

  function parseChapterNumber(filename, isRoot = false) {
    if (isRoot) return 'RESOURCE';
    const match = filename.match(/^(\d+)/);
    if (match) {
      return `CHAPTER ${match[1]}`;
    }
    return 'EXTRA';
  }

  // -----------------------------------------------------------
  // Action Handlers
  // -----------------------------------------------------------
  function selectCategory(catId, shouldRestoreSidebar = true) {
    state.currentCategoryId = catId;
    state.searchActive = false;
    globalSearchInput.value = '';
    clearSearchBtn.style.display = 'none';

    // Update Category active class on desktop
    document.querySelectorAll('#category-list .nav-item').forEach(item => {
      if (item.getAttribute('data-cat-id') === catId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Populate chapters
    populateChaptersSidebar(catId);
    
    // Automatically expand the chapters sidebar if category changes
    if (shouldRestoreSidebar && state.collapsedSidebars.chapters) {
      toggleSidebar(chaptersSidebarEl, toggleChaptersBtn, restoreChaptersBtn, 'chapters', false);
    }
  }

  function selectCategoryMobile(category) {
    state.currentCategoryId = category.id;
    populateChaptersMobile(category);
    
    // Toggle active tabs
    tabCategoriesBtn.classList.remove('active');
    tabChaptersBtn.classList.add('active');
    tabChaptersBtn.removeAttribute('disabled');

    // Slide screens
    drawerCategoriesView.classList.add('slide-out');
    drawerCategoriesView.classList.remove('active');
    drawerChaptersView.classList.add('active');
  }

  function selectChapter(catId, chId) {
    state.currentCategoryId = catId;
    state.currentChapterId = chId;

    // Synchronize UI components
    selectCategory(catId, false);

    // Update chapter active items
    document.querySelectorAll('#chapters-list .chapter-item').forEach(item => {
      if (item.getAttribute('data-ch-id') === chId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Load content
    const category = db.categories.find(c => c.id === catId);
    const chapter = category ? category.chapters.find(ch => ch.id === chId) : null;
    if (chapter) {
      renderMarkdownChapter(category, chapter);
      // Update hash in URL
      window.location.hash = `${catId}/${chId}`;
    }
  }

  // -----------------------------------------------------------
  // Markdown & Highlight Rendering
  // -----------------------------------------------------------
  function renderMarkdownChapter(category, chapter) {
    state.currentChapter = chapter;

    // Breadcrumbs
    breadcrumbCategory.textContent = category.name;
    breadcrumbChapter.textContent = chapter.title;

    // Hide welcome panel, show viewer
    welcomeDashboardEl.style.display = 'none';
    markdownViewerEl.style.display = 'block';

    // Parse Markdown to HTML
    // Configure marked to parse cleanly
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });

    // Parse equations or code blocks safely
    const rawHtml = marked.parse(chapter.content);
    markdownBodyEl.innerHTML = rawHtml;

    // Syntax highlight under the element
    Prism.highlightAllUnder(markdownBodyEl);

    // Post-process HTML to wrap code blocks with header and copy button
    wrapCodeBlocks();

    // Intercept internal markdown links and route dynamically
    interceptMarkdownLinks();

    // Scroll to top of content area
    contentAreaEl.scrollTop = 0;
    updateReadingProgress();
  }

  function interceptMarkdownLinks() {
    const links = markdownBodyEl.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      // Check if it's a relative link pointing to a markdown file
      if (href.endsWith('.md') && !href.startsWith('http') && !href.startsWith('file://')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();

          // Normalize the relative path (remove leading "./" or "../")
          const cleanPath = href.replace(/^(\.\/|\.\.\/)+/, '');
          const parts = cleanPath.split('/');
          
          if (parts.length >= 2) {
            const catFolder = parts[parts.length - 2];
            const file = parts[parts.length - 1];
            const fileBaseName = file.replace(/\.md$/, '');

            const catId = catFolder;
            const chId = `${catFolder}-${fileBaseName}`;

            // Check if this chapter exists in our database
            const category = db.categories.find(c => c.id === catId);
            const chapter = category ? category.chapters.find(ch => ch.id === chId) : null;

            if (chapter) {
              selectChapter(catId, chId);
            } else {
              console.warn(`Chapter not found in data: ${catId}/${chId}`);
            }
          }
        });
      }
    });
  }

  function wrapCodeBlocks() {
    const preElements = markdownBodyEl.querySelectorAll('pre');
    preElements.forEach(pre => {
      // Find language from child code element
      const code = pre.querySelector('code');
      let lang = 'Code';
      if (code) {
        const classNames = code.className.split(' ');
        const langClass = classNames.find(c => c.startsWith('language-'));
        if (langClass) {
          lang = langClass.replace('language-', '').toUpperCase();
        }
      }

      // Check if already wrapped
      if (pre.parentElement.classList.contains('code-block-wrapper')) return;

      // Create wrapping markup
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span>${lang}</span>
        <button class="copy-code-btn" title="Copy code snippet">
          <i data-lucide="copy"></i>
          <span>Copy</span>
        </button>
      `;

      // Structure elements in DOM
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      // Event listener on copy button
      const copyBtn = header.querySelector('.copy-code-btn');
      copyBtn.addEventListener('click', () => {
        const textToCopy = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = '<i data-lucide="check"></i> <span>Copied!</span>';
          lucide.createIcons({
            attrs: { 'data-lucide': true },
            nameAttr: 'data-lucide'
          });

          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<i data-lucide="copy"></i> <span>Copy</span>';
            lucide.createIcons({
              attrs: { 'data-lucide': true },
              nameAttr: 'data-lucide'
            });
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
      });
    });

    // Re-initialize lucide icons inside wraps
    lucide.createIcons({
      attrs: { 'data-lucide': true },
      nameAttr: 'data-lucide'
    });
  }

  // -----------------------------------------------------------
  // Global & Sidebar Searches
  // -----------------------------------------------------------
  function performGlobalSearch(query) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      clearGlobalSearch();
      return;
    }

    state.searchActive = true;
    clearSearchBtn.style.display = 'flex';
    activeCategoryNameEl.textContent = 'Search Results';

    const matches = [];
    db.categories.forEach(cat => {
      cat.chapters.forEach(ch => {
        const titleMatch = ch.title.toLowerCase().includes(cleanQuery);
        const contentMatch = ch.content.toLowerCase().includes(cleanQuery);
        if (titleMatch || contentMatch) {
          matches.push({
            category: cat,
            chapter: ch,
            titleScore: titleMatch ? 10 : 0,
            contentScore: (ch.content.toLowerCase().split(cleanQuery).length - 1)
          });
        }
      });
    });

    // Sort matches: titles first, then by frequency of query in content
    matches.sort((a, b) => {
      const scoreA = a.titleScore + a.contentScore;
      const scoreB = b.titleScore + b.contentScore;
      return scoreB - scoreA;
    });

    chaptersListEl.innerHTML = '';
    chaptersCountBadgeEl.textContent = matches.length;

    if (matches.length === 0) {
      chaptersListEl.innerHTML = '<div class="nav-item select-none text-center">No results found</div>';
      return;
    }

    matches.forEach(match => {
      const isRootFile = match.category.id === 'general';
      const parsedNum = parseChapterNumber(match.chapter.filename, isRootFile);

      const chItem = document.createElement('div');
      chItem.className = 'chapter-item';
      chItem.setAttribute('data-ch-id', match.chapter.id);
      if (state.currentChapterId === match.chapter.id) {
        chItem.classList.add('active');
      }

      chItem.innerHTML = `
        <span class="chapter-num">${match.category.name} • ${parsedNum}</span>
        <span class="chapter-title">${match.chapter.title}</span>
      `;
      chItem.addEventListener('click', () => {
        // Desktop select category silently
        state.currentCategoryId = match.category.id;
        // Select chapter
        selectChapter(match.category.id, match.chapter.id);
      });
      chaptersListEl.appendChild(chItem);
    });

    // Highlight active category elements off
    document.querySelectorAll('#category-list .nav-item').forEach(item => {
      item.classList.remove('active');
    });
  }

  function clearGlobalSearch() {
    state.searchActive = false;
    globalSearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    
    if (state.currentCategoryId) {
      selectCategory(state.currentCategoryId);
    } else if (db.categories.length > 0) {
      selectCategory(db.categories[0].id);
    }
  }

  // -----------------------------------------------------------
  // URL Hashing/Routing Handler
  // -----------------------------------------------------------
  function routeFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) {
      welcomeDashboardEl.style.display = 'block';
      markdownViewerEl.style.display = 'none';
      return;
    }

    const parts = hash.split('/');
    if (parts.length === 2) {
      const catId = parts[0];
      const chId = parts[1];
      
      const category = db.categories.find(c => c.id === catId);
      if (category) {
        const chapter = category.chapters.find(ch => ch.id === chId);
        if (chapter) {
          selectChapter(catId, chId);
          return;
        }
      }
    }
    // Fail-safe
    welcomeDashboardEl.style.display = 'block';
    markdownViewerEl.style.display = 'none';
  }

  // -----------------------------------------------------------
  // Reading Progress indicator
  // -----------------------------------------------------------
  function updateReadingProgress() {
    const scrollTop = contentAreaEl.scrollTop;
    const scrollHeight = contentAreaEl.scrollHeight;
    const clientHeight = contentAreaEl.clientHeight;

    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) {
      readingProgressBar.style.width = '0%';
      return;
    }

    const progress = (scrollTop / totalScrollable) * 100;
    readingProgressBar.style.width = `${progress}%`;
  }

  // -----------------------------------------------------------
  // Mobile drawer controls
  // -----------------------------------------------------------
  function openMobileDrawer() {
    mobileDrawer.classList.add('active');
    mobileOverlay.classList.add('active');
  }

  function closeMobileDrawer() {
    mobileDrawer.classList.remove('active');
    mobileOverlay.classList.remove('active');
  }

  function backToMobileCategories() {
    tabChaptersBtn.classList.remove('active');
    tabCategoriesBtn.classList.add('active');

    drawerChaptersView.classList.remove('active');
    drawerCategoriesView.classList.remove('slide-out');
    drawerCategoriesView.classList.add('active');
  }

  // -----------------------------------------------------------
  // Event Listeners Setup
  // -----------------------------------------------------------
  function setupEventListeners() {
    // Theme Switcher
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });



    // Desktop Collapse Category
    toggleCategoryBtn.addEventListener('click', () => {
      toggleSidebar(categorySidebarEl, toggleCategoryBtn, restoreCategoryBtn, 'category');
    });

    // Desktop Collapse Chapters
    toggleChaptersBtn.addEventListener('click', () => {
      toggleSidebar(chaptersSidebarEl, toggleChaptersBtn, restoreChaptersBtn, 'chapters');
    });

    // Desktop Restore Floating Panels
    restoreCategoryBtn.addEventListener('click', () => {
      toggleSidebar(categorySidebarEl, toggleCategoryBtn, restoreCategoryBtn, 'category', false);
    });
    restoreChaptersBtn.addEventListener('click', () => {
      toggleSidebar(chaptersSidebarEl, toggleChaptersBtn, restoreChaptersBtn, 'chapters', false);
    });

    // Filters / Search fields
    chapterSearchInput.addEventListener('input', (e) => {
      if (state.currentCategoryId) {
        populateChaptersSidebar(state.currentCategoryId, e.target.value);
      }
    });

    globalSearchInput.addEventListener('input', (e) => {
      performGlobalSearch(e.target.value);
    });

    clearSearchBtn.addEventListener('click', () => {
      clearGlobalSearch();
    });

    // Mobile View Interactions
    mobileMenuToggle.addEventListener('click', openMobileDrawer);
    mobileDrawerClose.addEventListener('click', closeMobileDrawer);
    mobileOverlay.addEventListener('click', closeMobileDrawer);

    tabCategoriesBtn.addEventListener('click', () => {
      backToMobileCategories();
    });

    tabChaptersBtn.addEventListener('click', () => {
      if (state.currentCategoryId) {
        tabCategoriesBtn.classList.remove('active');
        tabChaptersBtn.classList.add('active');
        drawerCategoriesView.classList.add('slide-out');
        drawerCategoriesView.classList.remove('active');
        drawerChaptersView.classList.add('active');
      }
    });

    mobileBackToCategories.addEventListener('click', backToMobileCategories);

    mobileChapterSearch.addEventListener('input', (e) => {
      if (state.currentCategoryId) {
        const category = db.categories.find(c => c.id === state.currentCategoryId);
        if (category) {
          populateChaptersMobile(category, e.target.value);
        }
      }
    });

    // Window Resize Handler
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileDrawer();
      }
    });

    // Content area scroll / Floating action elements
    contentAreaEl.addEventListener('scroll', () => {
      updateReadingProgress();

      // Scroll to top button visibility
      if (contentAreaEl.scrollTop > 200) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    });

    scrollToTopBtn.addEventListener('click', () => {
      contentAreaEl.scrollTop = 0;
    });

    // Route on back/forward browser navigation
    window.addEventListener('hashchange', routeFromHash);
  }

  // -----------------------------------------------------------
  // Sidebar Resizing Logic
  // -----------------------------------------------------------
  setupSidebarResizers();

  function setupSidebarResizers() {
    const categoryResizer = document.getElementById('category-resizer');
    const chaptersResizer = document.getElementById('chapters-resizer');

    // Load saved custom widths from localStorage
    const savedCategoryWidth = localStorage.getItem('pookiz-width-category');
    const savedChaptersWidth = localStorage.getItem('pookiz-width-chapters');

    if (savedCategoryWidth) {
      categorySidebarEl.style.width = savedCategoryWidth + 'px';
    }
    if (savedChaptersWidth) {
      chaptersSidebarEl.style.width = savedChaptersWidth + 'px';
    }

    initResizer(categoryResizer, categorySidebarEl, 180, 400, 'category');
    initResizer(chaptersResizer, chaptersSidebarEl, 200, 500, 'chapters');
  }

  function initResizer(resizerEl, sidebarEl, minWidth, maxWidth, storageKey) {
    if (!resizerEl) return;

    let startX = 0;
    let startWidth = 0;

    resizerEl.addEventListener('mousedown', onMouseDown);

    function onMouseDown(e) {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebarEl.getBoundingClientRect().width;
      
      resizerEl.classList.add('resizing');
      document.body.classList.add('resizing');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
      const deltaX = e.clientX - startX;
      let newWidth = startWidth + deltaX;

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      sidebarEl.style.width = newWidth + 'px';
      localStorage.setItem(`pookiz-width-${storageKey}`, newWidth);
    }

    function onMouseUp() {
      resizerEl.classList.remove('resizing');
      document.body.classList.remove('resizing');

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  }
});
