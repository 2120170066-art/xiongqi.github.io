// ===== Data Loading =====
let siteData = null;

async function loadData() {
  if (siteData) return siteData;
  try {
    const response = await fetch('data/articles.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    siteData = await response.json();
    return siteData;
  } catch (err) {
    console.error('Failed to load data:', err);
    showError('Failed to load data. Please ensure data/articles.json exists and is valid.');
    return null;
  }
}

// ===== Navigation =====
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });

  // Close nav on link click (mobile)
  links.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('open');
    });
  });

  // Scroll shadow
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        document.querySelector('.nav').classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  });

  // Highlight active page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  links.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPath) a.classList.add('active');
  });
}

// ===== Common Utilities =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderTags(tags) {
  return tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
}

function renderMeta(article) {
  return `
    <span class="article-card-date">${formatDate(article.date)}</span>
    <span class="article-card-journal">${escapeHtml(article.journal)}</span>
  `;
}

function renderArticleCard(article) {
  return `
    <div class="article-card fade-in">
      <div class="article-card-meta">${renderMeta(article)}</div>
      <div class="article-card-tags">${renderTags(article.tags)}</div>
      <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
      <div class="article-card-authors">${escapeHtml(article.authors)}</div>
      <div class="article-card-footer">
        <a class="article-card-doi" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">${escapeHtml(article.doi)}</a>
      </div>
    </div>
  `;
}

// ===== Homepage =====
function initHome(data) {
  const { profile, articles } = data;

  // Hero
  const heroAvatar = document.getElementById('hero-avatar');
  const heroName = document.getElementById('hero-name');
  const heroNameEn = document.getElementById('hero-name-en');
  const heroTitle = document.getElementById('hero-title');
  const heroAffiliation = document.getElementById('hero-affiliation');
  const heroInterests = document.getElementById('hero-interests');

  if (heroAvatar) heroAvatar.innerHTML = `<img src="${profile.avatar}" alt="${profile.name}">`;
  if (heroName) heroName.textContent = profile.name;
  if (heroNameEn) heroNameEn.textContent = profile.nameEn;
  if (heroTitle) heroTitle.textContent = profile.title;
  if (heroAffiliation) heroAffiliation.textContent = profile.affiliation;
  if (heroInterests) {
    heroInterests.innerHTML = profile.researchInterests.map(i => `<span>${escapeHtml(i)}</span>`).join('');
  }

  // Stats (hide if zero)
  const statsSection = document.querySelector('.stats');
  const statPapers = document.getElementById('stat-papers');
  const statCitations = document.getElementById('stat-citations');
  const statHIndex = document.getElementById('stat-hindex');
  const statSince = document.getElementById('stat-since');

  const hasStats = profile.stats.papers > 0 || profile.stats.citations > 0 || profile.stats.hIndex > 0;
  if (statsSection) statsSection.style.display = hasStats ? 'block' : 'none';
  if (statPapers) statPapers.textContent = profile.stats.papers || '—';
  if (statCitations) statCitations.textContent = profile.stats.citations ? (profile.stats.citations / 1000).toFixed(1) + 'k' : '—';
  if (statHIndex) statHIndex.textContent = profile.stats.hIndex || '—';
  if (statSince) statSince.textContent = 'Since ' + profile.stats.since;

  // Featured articles
  const featuredContainer = document.getElementById('featured-articles');
  if (featuredContainer) {
    const featured = articles.filter(a => a.featured).slice(0, 3);
    if (featured.length > 0) {
      featuredContainer.innerHTML = featured.map(a => renderArticleCard(a)).join('');
    } else {
      featuredContainer.innerHTML = '<div class="empty-state">No featured articles</div>';
    }
  }
}

// ===== Articles Page =====
let currentFilter = 'all';
let currentPage = 1;
const pageSize = 10;

function initArticles(data) {
  const { articles } = data;

  // Render filter buttons (years only)
  const filterContainer = document.getElementById('filter-controls');
  if (filterContainer) {
    let html = '<button class="filter-btn active" data-filter="all">All</button>';
    const years = [...new Set(articles.map(a => a.date.slice(0, 4)))].sort().reverse();
    years.forEach(y => {
      html += `<button class="filter-btn" data-filter="${y}">${y}</button>`;
    });
    filterContainer.innerHTML = html;

    filterContainer.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      renderArticleList(articles);
    });
  }

  renderArticleList(articles);
}

function renderArticleList(articles) {
  const container = document.getElementById('articles-list');
  if (!container) return;

  // Filter
  let filtered = articles;
  if (currentFilter !== 'all') {
    filtered = articles.filter(a => a.date.startsWith(currentFilter));
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No matching articles found</div>';
    return;
  }

  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // Group page items by year
  const grouped = {};
  pageItems.forEach(a => {
    const year = a.date.slice(0, 4);
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(a);
  });

  const years = Object.keys(grouped).sort().reverse();
  let html = '';
  years.forEach(year => {
    html += `<div class="section" style="padding-top:0;padding-bottom:24px;"><div class="section-header" style="margin-bottom:16px;">`;
    html += `<h2 class="section-title" style="font-size:1.2rem;" id="year-${year}">${year}</h2></div>`;
    html += `<div class="articles-grid">`;
    grouped[year].forEach(a => { html += renderArticleCard(a); });
    html += `</div></div>`;
  });

  // Pagination
  if (totalPages > 1) {
    html += '<div class="pagination">';
    // Prev
    html += `<button class="pagination-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>‹</button>`;
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    // Next
    html += `<button class="pagination-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>›</button>`;
    html += '</div>';
  }

  container.innerHTML = html;

  // Pagination handlers
  container.querySelectorAll('.pagination-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      if (target === 'prev' && currentPage > 1) currentPage--;
      else if (target === 'next' && currentPage < totalPages) currentPage++;
      else if (target !== 'prev' && target !== 'next') currentPage = parseInt(target);
      else return;
      renderArticleList(articles);
    });
  });
}

// ===== Article Detail Page =====
async function initArticleDetail() {
  const data = await loadData();
  if (!data) return;

  const params = new URLSearchParams(window.location.search);
  const articleId = params.get('id');

  if (!articleId) {
    showError('No article ID specified');
    return;
  }

  const article = data.articles.find(a => a.id === articleId);
  if (!article) {
    showError('Article not found');
    return;
  }

  document.title = `${article.title} - ${data.profile.name}`;

  // Breadcrumb
  const breadcrumb = document.getElementById('detail-breadcrumb');
  if (breadcrumb) {
    breadcrumb.innerHTML = `
      <a href="index.html">Home</a>
      <span>›</span>
      <a href="index.html#articles">Publications</a>
      <span>›</span>
      <span>${escapeHtml(article.title.slice(0, 40))}...</span>
    `;
  }

  // Header
  const titleEl = document.getElementById('detail-title');
  const metaEl = document.getElementById('detail-meta');
  const doiEl = document.getElementById('detail-doi');
  const tagsEl = document.getElementById('detail-tags');

  if (titleEl) titleEl.textContent = article.title;
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="article-detail-meta-item">${formatDate(article.date)}</span>
      <span class="article-detail-meta-item">${escapeHtml(article.journal)}</span>
      <span class="article-detail-meta-item">${escapeHtml(article.authors)}</span>
    `;
  }
  if (doiEl) {
    doiEl.innerHTML = `DOI: <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener">${escapeHtml(article.doi)}</a>`;
  }
  if (tagsEl) {
    tagsEl.innerHTML = renderTags(article.tags);
  }

  // Content (render simple markdown)
  const bodyEl = document.getElementById('detail-body');
  if (bodyEl) {
    bodyEl.innerHTML = renderMarkdown(article.content);
  }
}

// Simple Markdown Renderer
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ol>$1</ol>');

  // Tables (simple)
  html = html.replace(/\|(.+)\|/g, function(match) {
    const cells = match.split('|').filter(c => c.trim());
    if (cells.length === 0) return match;
    // Check if it's a separator row
    if (cells.every(c => /^[-:\s]+$/.test(c))) return '';
    return '<tr><td>' + cells.map(c => c.trim()).join('</td><td>') + '</td></tr>';
  });
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');

  // Single newlines within paragraphs
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

// ===== About Page =====
function initAbout(data) {
  const { profile } = data;

  // Bio
  const bioEl = document.getElementById('about-bio');
  if (bioEl) bioEl.textContent = profile.bio;

  // Education timeline
  const eduTimeline = document.getElementById('education-timeline');
  if (eduTimeline) {
    eduTimeline.innerHTML = profile.education.map(e => `
      <div class="timeline-item">
        <div class="timeline-period">${escapeHtml(e.period)}</div>
        <div class="timeline-title">${escapeHtml(e.degree)}</div>
        <div class="timeline-org">${escapeHtml(e.school)}</div>
      </div>
    `).join('');
  }

  // Experience timeline
  const expTimeline = document.getElementById('experience-timeline');
  if (expTimeline) {
    expTimeline.innerHTML = profile.experience.map(e => `
      <div class="timeline-item">
        <div class="timeline-period">${escapeHtml(e.period)}</div>
        <div class="timeline-title">${escapeHtml(e.position)}</div>
        <div class="timeline-org">${escapeHtml(e.organization)}</div>
      </div>
    `).join('');
  }

  // Contact info
  const contactEmail = document.getElementById('contact-email');
  const contactOffice = document.getElementById('contact-office');
  const contactScholar = document.getElementById('contact-scholar');

  if (contactEmail) contactEmail.innerHTML = `<a href="mailto:${escapeHtml(profile.email)}">${escapeHtml(profile.email)}</a>`;
  if (contactOffice) contactOffice.textContent = profile.office;
  if (contactScholar) contactScholar.innerHTML = `<a href="${escapeHtml(profile.googleScholar)}" target="_blank" rel="noopener">Google Scholar</a>`;

  // Projects
  const projectsList = document.getElementById('projects-list');
  if (projectsList && profile.projects) {
    projectsList.innerHTML = profile.projects.map(p => {
      const isHost = p.type === 'PI';
      return `
        <div class="project-card fade-in">
          <div class="project-card-header">
            <span class="project-type ${isHost ? '' : 'participate'}">${escapeHtml(p.type)}</span>
            <span class="project-status ${p.status === 'Completed' ? 'closed' : ''}">${escapeHtml(p.status)}</span>
          </div>
          <div class="project-name">${escapeHtml(p.name)}</div>
          <div class="project-meta">
            <span class="project-meta-item">${escapeHtml(p.period)}</span>
            <span class="project-meta-item">${escapeHtml(p.amount)}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// ===== Error Display =====
function showError(message) {
  const main = document.querySelector('.main');
  if (main) {
    main.innerHTML = `
      <div class="error-state">
        <h2>Oops!</h2>
        <p>${escapeHtml(message)}</p>
        <a href="index.html" class="btn btn-primary">Back to Home</a>
      </div>
    `;
  }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  initNav();

  const page = document.body.dataset.page;
  if (page === 'home') {
    const data = await loadData();
    if (!data) return;
    initHome(data);
    initAbout(data);
    initArticles(data);
  } else if (page === 'article') {
    initArticleDetail();
  }
});