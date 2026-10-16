// ═══════════════════════════════════════════════════
// LYCÉE MAROC AI — ADMIN.JS (النسخة الاحترافية)
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
    await loadAuditLog();

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
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${s.out_total}</div><div class="stat-label">إجمالي المستعملين</div></div>
      <div class="stat-card"><div class="stat-icon">👨‍🏫</div><div class="stat-value">${s.out_teachers}</div><div class="stat-label">الأساتذة</div></div>
      <div class="stat-card"><div class="stat-icon">🎓</div><div class="stat-value">${s.out_students}</div><div class="stat-label">التلاميذ</div></div>
      <div class="stat-card"><div class="stat-icon">👨‍👦</div><div class="stat-value">${s.out_parents}</div><div class="stat-label">الآباء</div></div>
      <div class="stat-card"><div class="stat-icon">🛡️</div><div class="stat-value">${s.out_guards}</div><div class="stat-label">الحراس</div></div>
      <div class="stat-card"><div class="stat-icon">🏛️</div><div class="stat-value">${s.out_directors}</div><div class="stat-label">المدراء</div></div>
      <div class="stat-card"><div class="stat-icon">👑</div><div class="stat-value">${s.out_admins}</div><div class="stat-label">الأدمن</div></div>
      <div class="stat-card"><div class="stat-icon">💳</div><div class="stat-value">${s.out_active_subs}</div><div class="stat-label">اشتراكات نشطة</div></div>
      <div class="stat-card"><div class="stat-icon">🎟️</div><div class="stat-value">${s.out_total_codes}</div><div class="stat-label">إجمالي الأكواد</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${s.out_active_codes}</div><div class="stat-label">أكواد نشطة</div></div>
    `;
  } catch (err) {
    console.error('Stats error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
}

// ═══════════ Load Users (عبر RPC) ═══════════
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
    attachUserActions();
  } catch (err) {
    console.error('Users error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
}

function renderUsers(users) {
  const container = $('usersList');

  container.innerHTML = users.map(u => {
    let statusHtml = '';
    if (u.out_is_blocked) {
      if (u.out_ban_expires_at && new Date(u.out_ban_expires_at) < new Date()) {
        statusHtml = `<span class="user-role" style="background-color: rgba(245, 158, 11, 0.2); color: #fbbf24;">⏰ حظر منتهي</span>`;
      } else {
        statusHtml = `<span class="user-role" style="background-color: rgba(239, 68, 68, 0.2); color: #ef4444;">🚫 محظور</span>`;
      }
    } else {
      statusHtml = `<span class="user-role" style="background-color: rgba(16, 185, 129, 0.2); color: #10b981;">✅ نشط</span>`;
    }

    const isSelf = u.out_id === currentAdmin.id;
    const isAdmin = u.out_role === 'admin';

    return `
    <div class="user-card" data-role="${u.out_role}" data-name="${(u.out_full_name || '').toLowerCase()}" data-email="${(u.out_email || '').toLowerCase()}" data-user-id="${u.out_id}">
      <div class="user-info">
        <div class="user-name">👤 ${u.out_full_name || 'بدون اسم'} ${isSelf ? '(أنت)' : ''}</div>
        <div class="user-meta">
          <span>📧 ${u.out_email || ''}</span>
          ${u.out_phone ? `<span>📱 ${u.out_phone}</span>` : ''}
          ${u.out_institution ? `<span>🏫 ${u.out_institution}</span>` : ''}
        </div>
        <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          <span class="user-role ${u.out_role}">${roleLabel(u.out_role)}</span>
          ${statusHtml}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; min-width: 110px;">
        ${isSelf || isAdmin ? `<span style="font-size: 11px; color: #64748b; text-align: center;">—</span>` : `
          ${u.out_is_blocked
            ? `<button class="btn-action btn-unblock" data-action="unblock" data-id="${u.out_id}" style="background: #10b981; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit;">🔓 فك الحظر</button>`
            : `<button class="btn-action btn-block" data-action="block" data-id="${u.out_id}" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit;">🚫 حظر</button>`
          }
          <button class="btn-action btn-delete" data-action="delete" data-id="${u.out_id}" style="background: #6b7280; color: white; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit;">🗑️ حذف</button>
        `}
      </div>
    </div>
    `;
  }).join('');
}

// ═══════════ Attach User Actions ═══════════
function attachUserActions() {
  document.querySelectorAll('.btn-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const userId = btn.dataset.id;

      if (action === 'block') await handleBlock(userId);
      if (action === 'unblock') await handleUnblock(userId);
      if (action === 'delete') await handleDelete(userId);
    });
  });
}

// ═══════════ Block User ═══════════
async function handleBlock(userId) {
  const reason = prompt('📝 سبب الحظر (اختياري):');
  if (reason === null) return;

  const daysStr = prompt('⏱️ مدة الحظر بالأيام (خليه فارغ = دائم):', '');
  if (daysStr === null) return;

  let expiresAt = null;
  if (daysStr && !isNaN(daysStr) && parseInt(daysStr) > 0) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(daysStr));
    expiresAt = d.toISOString();
  }

  if (!confirm('⚠️ متأكد من حظر هاد المستعمل؟')) return;

  try {
    const { error } = await supabase.rpc('admin_block_user', {
      p_user_id: userId,
      p_reason: reason || 'بدون سبب',
      p_expires_at: expiresAt
    });
    if (error) throw error;

    toast('✅ تم حظر المستعمل', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
    console.error('Block error:', err);
    toast('❌ ' + err.message, 'error');
  }
}

// ═══════════ Unblock User ═══════════
async function handleUnblock(userId) {
  if (!confirm('🔓 متأكد من فك الحظر؟')) return;

  try {
    const { error } = await supabase.rpc('admin_unblock_user', { p_user_id: userId });
    if (error) throw error;

    toast('✅ تم فك الحظر', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
    console.error('Unblock error:', err);
    toast('❌ ' + err.message, 'error');
  }
}

// ═══════════ Soft Delete User ═══════════
async function handleDelete(userId) {
  const reason = prompt('📝 سبب الحذف (اختياري):');
  if (reason === null) return;

  if (!confirm('⚠️ ⚠️ متأكد من الحذف؟\n\nالحساب غادي يختفي من القائمة، ولكن البيانات كاملة باقية فـ قاعدة البيانات.')) return;

  try {
    const { error } = await supabase.rpc('admin_soft_delete_user', { p_user_id: userId });
    if (error) throw error;

    toast('✅ تم حذف المستعمل', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
    console.error('Delete error:', err);
    toast('❌ ' + err.message, 'error');
  }
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

// ═══════════ Load Audit Log ═══════════
async function loadAuditLog() {
  const container = $('logsList');
  container.innerHTML = '<div class="loading">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        id, action, details, created_at,
        admin:admin_id ( full_name ),
        target:target_user_id ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const logs = data || [];

    if (!logs.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">📋</span>ما كاينش سجل</div>';
      return;
    }

    container.innerHTML = logs.map(log => {
      let icon = '📌';
      if (log.action.includes('حظر')) icon = '🚫';
      if (log.action.includes('فك')) icon = '🔓';
      if (log.action.includes('حذف')) icon = '🗑️';

      const date = new Date(log.created_at).toLocaleString('ar-MA', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const detailsText = log.details && log.details.reason
        ? `سبب: ${log.details.reason}`
        : '';

      return `
        <div class="code-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
          <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
            <span style="font-size: 18px;">${icon}</span>
            <span style="font-weight: 700; font-size: 14px; flex: 1;">${log.action}</span>
            <span style="font-size: 11px; color: #64748b;">${date}</span>
          </div>
          <div style="font-size: 12px; color: #94a3b8;">
            👑 <strong>${log.admin?.full_name || 'الأدمن'}</strong>
            ${log.target ? ` • 👤 <strong>${log.target.full_name || 'مستخدم'}</strong>` : ''}
          </div>
          ${detailsText ? `<div style="font-size: 11px; color: #64748b; background: #0f172a; padding: 6px 10px; border-radius: 6px; width: 100%;">${detailsText}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Audit log error:', err);
    container.innerHTML = '<div class="empty-admin">❌ ' + err.message + '</div>';
  }
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
    await loadAuditLog();
  } catch (err) {
    console.error('Session error:', err);
  }
});
