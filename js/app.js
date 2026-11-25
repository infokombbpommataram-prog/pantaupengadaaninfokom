/**
 * app.js - Main Router, Sidebar, Modal Helper & Inisialisasi SPA
 */

const Modal = {
  open(htmlContent, maxWidthClass = 'max-w-3xl') {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (!container || !content) return;
    content.className = `bg-white rounded-xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto`;
    content.innerHTML = htmlContent;
    container.classList.remove('hidden');
  },

  close() {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if (container) container.classList.add('hidden');
    if (content) content.innerHTML = '';
  }
};

const App = {
  currentPage: 'dashboard',
  currentParams: {},

  init() {
    // Tutup modal saat klik backdrop
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) Modal.close();
      });
    }

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('mobile-open');
      });
    }

    if (Auth.isLoggedIn()) {
      this.navigate('dashboard');
    } else {
      this.navigate('login');
    }
  },

  navigate(page, params = {}) {
    if (page !== 'login' && !Auth.isLoggedIn()) {
      page = 'login';
    }
    if (page === 'login' && Auth.isLoggedIn()) {
      page = 'dashboard';
    }

    this.currentPage = page;
    this.currentParams = params;

    // Tutup mobile sidebar
    document.getElementById('sidebar')?.classList.remove('mobile-open');

    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('mobile-topbar');

    if (page === 'login') {
      sidebar?.classList.add('hidden');
      topbar?.classList.add('hidden');
    } else {
      sidebar?.classList.remove('hidden');
      sidebar?.classList.add('flex');
      topbar?.classList.remove('hidden');
      this.renderSidebar();
    }

    const appEl = document.getElementById('app');
    if (!appEl) return;

    switch (page) {
      case 'login':
        LoginPage.render(appEl);
        break;
      case 'dashboard':
        DashboardPage.render(appEl);
        break;
      case 'tickets':
        TicketListPage.render(appEl, params);
        break;
      case 'ticket-new':
        if (!Auth.hasRole(['user', 'admin'])) {
          Toast.error('Hanya User atau Admin yang dapat membuat usulan pengadaan.');
          return this.navigate('tickets');
        }
        TicketFormPage.render(appEl);
        break;
      case 'ticket-detail':
        TicketDetailPage.render(appEl, params);
        break;
      case 'anggaran':
        AnggaranPage.render(appEl);
        break;
      case 'upload-fa':
        if (!Auth.hasRole('admin')) {
          Toast.error('Hanya Admin yang dapat mengupload FA Detail.');
          return this.navigate('anggaran');
        }
        UploadFaPage.render(appEl);
        break;
      case 'harga-ref':
        if (!Auth.hasRole(['admin', 'pbj'])) {
          Toast.error('Akses terbatas untuk Admin dan PBJ.');
          return this.navigate('dashboard');
        }
        HargaRefPage.render(appEl);
        break;
      case 'ai-settings':
        if (!Auth.hasRole('admin')) {
          Toast.error('Hanya Admin yang dapat mengakses pengaturan sistem.');
          return this.navigate('dashboard');
        }
        AiSettingsPage.render(appEl);
        break;
      case 'users':
        if (!Auth.hasRole('admin')) {
          Toast.error('Hanya Admin yang dapat mengelola user.');
          return this.navigate('dashboard');
        }
        UsersPage.render(appEl);
        break;
      default:
        DashboardPage.render(appEl);
    }
  },

  renderSidebar() {
    const user = Auth.getUser();
    if (!user) return;

    const navEl = document.getElementById('sidebar-nav');
    const userEl = document.getElementById('sidebar-user');

    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'user', 'pbj'] },
      { id: 'tickets', label: 'Daftar Ticket', icon: '🎫', roles: ['admin', 'user', 'pbj'] },
      { id: 'ticket-new', label: '+ Usulan Pengadaan', icon: '📝', roles: ['admin', 'user'] },
      { id: 'anggaran', label: 'Anggaran & MAK', icon: '💰', roles: ['admin', 'user', 'pbj'] },
      { id: 'upload-fa', label: 'Upload FA Detail (AI)', icon: '📤', roles: ['admin'] },
      { id: 'harga-ref', label: 'Harga Referensi', icon: '⚡', roles: ['admin', 'pbj'] },
      { id: 'ai-settings', label: 'Pengaturan AI & Drive', icon: '⚙️', roles: ['admin'] },
      { id: 'users', label: 'Kelola User', icon: '👥', roles: ['admin'] }
    ];

    if (navEl) {
      navEl.innerHTML = menuItems
        .filter(m => m.roles.includes(user.role))
        .map(m => `
          <div class="nav-link ${this.currentPage === m.id ? 'active' : ''}" onclick="App.navigate('${m.id}')">
            <span>${m.icon}</span>
            <span>${m.label}</span>
          </div>
        `).join('');
    }

    if (userEl) {
      const roleBadge = {
        admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        pbj: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        user: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      }[user.role] || 'bg-slate-700 text-slate-300';

      userEl.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-white truncate">${Formatter.escapeHtml(user.nama)}</p>
            <span class="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-medium rounded border uppercase ${roleBadge}">
              ${Formatter.escapeHtml(user.role)}
            </span>
          </div>
          <button onclick="Auth.logout()" title="Logout" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-xs transition">
            Keluar
          </button>
        </div>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
