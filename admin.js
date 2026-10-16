// ═══════════════════════════════════════════════════
// LYCÉE MAROC AI — ADMIN.JS
// ═══════════════════════════════════════════════════

import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

let currentAdmin = null;

// ═══════════ Toast ═══════════
function toast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  show(t);
  setTimeout(() => hide(t), 3000);
}

// ═══════════ Role Labels ═══════════
function roleLabel(role) {
  const m = {
    teacher: '👨‍🏫 أستاذ',
    student: '🎓 تلميذ',
    parent: '👨‍👦 ولي أمر',
    guard: '🛡️ حارس',
    director: '🏛️ مدير',
    admin: '👑 أدمن'
  };
  return m[role] || role;
}

// ═══════════ Login ═══════════
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));

  const email = $('adminEmail').value.trim().toLowerCase();
  const password = $('adminPassword').value;

  if (!email || !password) {
    $('errorMsg').textContent = 'المرجو إدخال الإيميل وكلمة السر';
    show($('errorMsg'));
    return;
  }

  $('loginBtn').disabled = true;
  $('loginBtn').textContent = '⏳ جاري الدخول...';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (error) throw error;
    if (!data.user) throw new Error('لم يتم تسجيل الدخول');

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) throw new Error('لم يتم العثور على الحساب');

    if (profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('❌ ماشي مسموح — هاد الصفحة للأدمن فقط');
    }

    currentAdmin = profile;

    hide($('loginScreen'));
    show($('adminPanel'));
    $('adminName').textContent = '👤 ' + (profile.full_name || 'الأدمن');

    toast('✅ مرحباً ' + profile.full_name, 'success');

    await loadStats();
    await loadUsers();
    await loadCodes();

  } catch (err) {
    console.error('Login error:', err);
    $('errorMsg').textContent = err.message;
    show($('errorMsg'));
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = '🔐 دخول';
  }
});

// ═══════════ Logout ═══════════
$('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ═══════════ Navigation ═══════════
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const section = btn.dataset.section;

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('section-' + section).classList.add('active');
  });
});

// ═══════════ Load Stats ═══════════
async function loadStats() {
  const container = $('statsGrid');
  container.innerHTML = '<div class="loading">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase.rpc('admin_get_stats');
    if (error) throw error;

    const s = data && data[0];
    if (!s) throw new Error('لا توجد بيانات');

    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">${s.out_total}</div>
        <div class="stat-label">إجمالي المستعملين</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍🏫</div>
        <div class="stat-value">${s.out_teachers}</div>
        <div class="stat-label">الأساتذة</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎓</div>
        <div class="stat-value">${s.out_students}</div>
        <div class="stat-label">التلاميذ</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍👦</div>
        <div class="stat-value">${s.out_parents}</div>
        <div class="stat-label">الآباء</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛡️</div>
        <div class="stat-value">${s.out_guards}</div>
        <div class="stat-label">الحراس</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏛️</div>
        <div class="stat-value">${s.out_directors}</div>
        <div class="stat-label">المدراء</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👑</div>
        <div class="stat-value">${s.out_admins}</div>
        <div class="stat-label">الأدمن</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💳</div>
        <div class="stat-value">${s.out_active_subs}</div>
        <div class="stat-label">اشتراكات نشطة</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🎟️</div>
        <div class="stat-value">${s.out_total_codes}</div>
        <div class="stat-label">إجمالي الأكواد</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${s.out_active_codes}</div>
        <div class="stat-label">أكواد نشطة</div>
      </div>
    `;
  } catch (err) {
    console.error('Stats error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
}

// ═══════════ Load Users ═══════════
async function loadUsers() {
  const container = $('usersList');
  container.innerHTML = '<div class="loading">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase.rpc('admin_get_all_users');
    if (error) throw error;

    const users = data || [];

    if (!users.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">👥</span>ما كاينش مستعملين</div>';
      return;
    }

    renderUsers(users);
  } catch (err) {
    console.error('Users error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
}

function renderUsers(users) {
  const container = $('usersList');

  container.innerHTML = users.map(u => `
    <div class="user-card" data-role="${u.out_role}" data-name="${(u.out_full_name || '').toLowerCase()}" data-email="${(u.out_email || '').toLowerCase()}">
      <div class="user-info">
        <div class="user-name">👤 ${u.out_full_name || 'بدون اسم'}</div>
        <div class="user-meta">
          <span>📧 ${u.out_email || ''}</span>
          ${u.out_phone ? `<span>📱 ${u.out_phone}</span>` : ''}
          ${u.out_institution ? `<span>🏫 ${u.out_institution}</span>` : ''}
        </div>
      </div>
      <span class="user-role ${u.out_role}">${roleLabel(u.out_role)}</span>
    </div>
  `).join('');
}

// ═══════════ Filters ═══════════
$('userSearch').addEventListener('input', filterUsers);
$('userRoleFilter').addEventListener('change', filterUsers);

function filterUsers() {
  const search = $('userSearch').value.toLowerCase().trim();
  const role = $('userRoleFilter').value;

  document.querySelectorAll('.user-card').forEach(card => {
    const name = card.dataset.name || '';
    const email = card.dataset.email || '';
    const cardRole = card.dataset.role || '';

    const matchSearch = !search || name.includes(search) || email.includes(search);
    const matchRole = !role || cardRole === role;

    card.style.display = (matchSearch && matchRole) ? 'flex' : 'none';
  });
}

// ═══════════ Load Codes ═══════════
async function loadCodes() {
  const container = $('codesList');
  container.innerHTML = '<div class="loading">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase.rpc('admin_get_codes');
    if (error) throw error;

    const codes = data || [];

    if (!codes.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">🎟️</span>ما كاينش أكواد</div>';
      return;
    }

    container.innerHTML = codes.map(c => `
      <div class="code-item">
        <div>
          <div class="code-text">${c.out_code}</div>
          <div class="user-meta" style="margin-top: 6px;">
            <span>📅 ${c.out_duration_days} يوم</span>
            ${c.out_for_email ? `<span>📧 ${c.out_for_email}</span>` : ''}
          </div>
        </div>
        <span class="code-status ${c.out_status}">${c.out_status === 'active' ? '✅ نشط' : c.out_status === 'used' ? '📌 مستعمل' : '⏰ منتهي'}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Codes error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
}

// ═══════════ Generate Code ═══════════
$('generateCodeBtn').addEventListener('click', async () => {
  const type = $('codeType').value;
  const forEmail = $('codeForEmail').value.trim() || null;

  $('generateCodeBtn').disabled = true;
  $('generateCodeBtn').textContent = '⏳ جاري التوليد...';
  hide($('generatedCodeBox'));

  try {
    const { data, error } = await supabase.rpc('admin_generate_code', {
      p_type: type,
      p_for_email: forEmail
    });

    if (error) throw error;

    const result = data && data[0];
    if (!result) throw new Error('فشل التوليد');

    $('generatedCode').textContent = result.out_code;
    show($('generatedCodeBox'));

    toast('✅ تم توليد الكود', 'success');

    await loadCodes();
    await loadStats();

  } catch (err) {
    console.error('Generate error:', err);
    toast('❌ ' + err.message, 'error');
  }

  $('generateCodeBtn').disabled = false;
  $('generateCodeBtn').textContent = '🎟️ توليد الكود';
});

// ═══════════ Copy Code ═══════════
$('copyCodeBtn').addEventListener('click', async () => {
  const code = $('generatedCode').textContent;
  try {
    await navigator.clipboard.writeText(code);
    toast('✅ تم النسخ', 'success');
  } catch {
    toast('❌ فشل النسخ', 'error');
  }
});

// ═══════════ Session Check ═══════════
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (!session || !session.user) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      return;
    }

    currentAdmin = profile;
    hide($('loginScreen'));
    show($('adminPanel'));
    $('adminName').textContent = '👤 ' + (profile.full_name || 'الأدمن');

    await loadStats();
    await loadUsers();
    await loadCodes();

  } catch (err) {
    console.error('Session error:', err);
  }
});
