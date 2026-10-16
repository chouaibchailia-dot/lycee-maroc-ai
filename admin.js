// ═══════════════════════════════════════════════════
// LYCÉE MAROC AI — ADMIN.JS (النسخة النهائية الكاملة)
// ═══════════════════════════════════════════════════

import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

let currentAdmin = null;
let currentSettings = {};

// ═══════════ Helpers ═══════════
function toast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  show(t);
  setTimeout(() => hide(t), 3000);
}

function roleLabel(role) {
  const m = {
    teacher: '👨‍🏫 أستاذ', student: '🎓 تلميذ',
    parent: '👨‍👦 ولي أمر', guard: '🛡️ حارس',
    director: '🏛️ مدير', admin: '👑 أدمن'
  };
  return m[role] || role;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    const { data: profile } = await supabase
      .from('profiles').select('id, role, full_name, email')
      .eq('id', data.user.id).maybeSingle();

    if (!profile) throw new Error('لم يتم العثور على الحساب');
    if (profile.role !== 'admin') {
      await supabase.auth.signOut();
      throw new Error('❌ ماشي مسموح');
    }

    currentAdmin = profile;
    hide($('loginScreen'));
    show($('adminPanel'));
    $('adminName').textContent = '👤 ' + (profile.full_name || 'الأدمن');
    toast('✅ مرحباً ' + profile.full_name, 'success');

    await loadAllData();

  } catch (err) {
    console.error('Login error:', err);
    $('errorMsg').textContent = err.message;
    show($('errorMsg'));
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = '🔐 دخول';
  }
});

async function loadAllData() {
  await loadStats();
  await loadUsers();
  await loadCodes();
  await loadAuditLog();
  await loadSecurityStats();
  await loadSubscriptions();
  await loadMessages();
  await loadSettings();
}

$('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

$('refreshBtn').addEventListener('click', async () => {
  toast('🔄 جاري التحديث...', 'info');
  await loadAllData();
  toast('✅ تم التحديث', 'success');
});

// ═══════════ Navigation ═══════════
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const section = btn.dataset.section;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('section-' + section).classList.add('active');

    if (section === 'security') loadSecurityStats();
    if (section === 'subscriptions') loadSubscriptions();
    if (section === 'messages') loadMessages();
    if (section === 'settings') loadSettings();
  });
});

// ═══════════ Load Stats ═══════════
async function loadStats() {
  const container = $('statsGrid');
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';

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
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ Load Users ═══════════
async function loadUsers() {
  const container = $('usersList');
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase.rpc('admin_get_all_users');
    if (error) throw error;
    const users = data || [];

    if (!users.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">👥</span>ما كاينش مستعملين</div>';
      return;
    }

    container.innerHTML = users.map(u => {
      let statusHtml = '';
      if (u.out_is_blocked) {
        if (u.out_ban_expires_at && new Date(u.out_ban_expires_at) < new Date()) {
          statusHtml = `<span class="user-role" style="background:rgba(245,158,11,0.2);color:#fbbf24;">⏰ حظر منتهي</span>`;
        } else {
          statusHtml = `<span class="user-role" style="background:rgba(239,68,68,0.2);color:#ef4444;">🚫 محظور</span>`;
        }
      } else {
        statusHtml = `<span class="user-role" style="background:rgba(16,185,129,0.2);color:#10b981;">✅ نشط</span>`;
      }

      const isSelf = u.out_id === currentAdmin.id;
      const isAdmin = u.out_role === 'admin';

      return `
        <div class="user-card" data-role="${u.out_role}" data-name="${escapeHtml((u.out_full_name || '').toLowerCase())}" data-email="${escapeHtml((u.out_email || '').toLowerCase())}">
          <div class="user-info">
            <div class="user-name">👤 ${escapeHtml(u.out_full_name || 'بدون اسم')} ${isSelf ? '(أنت)' : ''}</div>
            <div class="user-meta">
              <span>📧 ${escapeHtml(u.out_email || '')}</span>
              ${u.out_phone ? `<span>📱 ${escapeHtml(u.out_phone)}</span>` : ''}
              ${u.out_institution ? `<span>🏫 ${escapeHtml(u.out_institution)}</span>` : ''}
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
              <span class="user-role ${u.out_role}">${roleLabel(u.out_role)}</span>
              ${statusHtml}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;min-width:110px;">
            ${isSelf || isAdmin ? `<span style="font-size:11px;color:#64748b;text-align:center;">—</span>` : `
              ${u.out_is_blocked
                ? `<button class="btn-action" data-action="unblock" data-id="${u.out_id}" style="background:#10b981;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;">🔓 فك الحظر</button>`
                : `<button class="btn-action" data-action="block" data-id="${u.out_id}" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;">🚫 حظر</button>`
              }
              <button class="btn-action" data-action="delete" data-id="${u.out_id}" style="background:#6b7280;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;">🗑️ حذف</button>
              <button class="btn-action" data-action="hard-delete" data-id="${u.out_id}" style="background:#7f1d1d;color:white;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;">🔥 نهائي</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const userId = btn.dataset.id;
        if (action === 'block') await handleBlock(userId);
        if (action === 'unblock') await handleUnblock(userId);
        if (action === 'delete') await handleDelete(userId);
        if (action === 'hard-delete') await handleHardDelete(userId);
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ User Actions ═══════════
async function handleBlock(userId) {
  const reason = prompt('📝 سبب الحظر (اختياري):');
  if (reason === null) return;
  const daysStr = prompt('⏱️ المدة بالأيام (فارغ = دائم):', '');
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
      p_user_id: userId, p_reason: reason || 'بدون سبب', p_expires_at: expiresAt
    });
    if (error) throw error;
    toast('✅ تم حظر المستعمل', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }
}

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
    toast('❌ ' + err.message, 'error');
  }
}

async function handleDelete(userId) {
  if (!confirm('⚠️ حذف ناعم؟ (الحساب كيتخبى، ولكن باقي فـ DB)')) return;
  try {
    const { error } = await supabase.rpc('admin_soft_delete_user', { p_user_id: userId });
    if (error) throw error;
    toast('✅ تم الحذف الناعم', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }
}

async function handleHardDelete(userId) {
  if (!confirm('🔥 ⚠️ حذف نهائي!\n\nكل البيانات غادي تتحيد.\n\nما يمكن الرجوع. متأكد؟')) return;
  const txt = prompt('اكتب "حذف" باش تأكد:');
  if (txt !== 'حذف') { toast('تم الإلغاء', 'info'); return; }
  try {
    const { error } = await supabase.rpc('admin_hard_delete_user', { p_user_id: userId });
    if (error) throw error;
    toast('✅ تم الحذف النهائي', 'success');
    await loadUsers();
    await loadAuditLog();
    await loadStats();
  } catch (err) {
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

// ═══════════ Load Codes ═══════════
async function loadCodes() {
  const container = $('codesList');
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';
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
          <div class="code-text">${escapeHtml(c.out_code)}</div>
          <div class="user-meta" style="margin-top:6px;">
            <span>📅 ${c.out_duration_days} يوم</span>
            ${c.out_for_email ? `<span>📧 ${escapeHtml(c.out_for_email)}</span>` : ''}
          </div>
        </div>
        <span class="code-status ${c.out_status}">${c.out_status === 'active' ? '✅ نشط' : c.out_status === 'used' ? '📌 مستعمل' : '⏰ منتهي'}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
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
    const { data, error } = await supabase.rpc('admin_generate_code', { p_type: type, p_for_email: forEmail });
    if (error) throw error;
    const result = data && data[0];
    if (!result) throw new Error('فشل التوليد');
    $('generatedCode').textContent = result.out_code;
    show($('generatedCodeBox'));
    toast('✅ تم توليد الكود', 'success');
    await loadCodes();
    await loadStats();
  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }
  $('generateCodeBtn').disabled = false;
  $('generateCodeBtn').textContent = '🎟️ توليد الكود';
});

$('copyCodeBtn').addEventListener('click', async () => {
  const code = $('generatedCode').textContent;
  try {
    await navigator.clipboard.writeText(code);
    toast('✅ تم النسخ', 'success');
  } catch {
    toast('❌ فشل النسخ', 'error');
  }
});

// ═══════════ Load Subscriptions ═══════════
async function loadSubscriptions() {
  const container = $('subscriptionsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';
  try {
    const { data, error } = await supabase.rpc('admin_get_subscriptions');
    if (error) throw error;
    const subs = data || [];
    if (!subs.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">💳</span>ما كاينش اشتراكات</div>';
      return;
    }
    container.innerHTML = subs.map(s => {
      const daysLeft = s.out_days_left || 0;
      const statusColor = daysLeft <= 0 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : '#10b981';
      return `
        <div class="code-item">
          <div>
            <div style="font-weight:700;font-size:14px;">👤 ${escapeHtml(s.out_full_name || '')}</div>
            <div class="user-meta" style="margin-top:4px;">
              <span>📧 ${escapeHtml(s.out_email || '')}</span>
              <span class="user-role ${s.out_role}">${roleLabel(s.out_role)}</span>
            </div>
          </div>
          <div style="text-align:left;">
            <div style="color:${statusColor};font-weight:700;font-size:13px;">${daysLeft} يوم</div>
            <div style="font-size:11px;color:#64748b;">${s.out_subscription_type || ''}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ Load Messages ═══════════
async function loadMessages() {
  const container = $('messagesList');
  if (!container) return;
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';
  try {
    const { data, error } = await supabase.rpc('admin_get_messages');
    if (error) throw error;
    const msgs = data || [];
    if (!msgs.length) {
      container.innerHTML = '<div class="empty-admin"><span class="empty-icon">💬</span>ما كاينش رسائل</div>';
      return;
    }
    container.innerHTML = msgs.map(m => `
      <div class="code-item" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <div style="display:flex;justify-content:space-between;width:100%;gap:10px;">
          <div style="font-weight:700;font-size:14px;">👤 ${escapeHtml(m.out_sender_name || 'مجهول')}</div>
          <div style="font-size:11px;color:#64748b;">${new Date(m.out_created_at).toLocaleString('ar-MA')}</div>
        </div>
        <div style="font-weight:700;font-size:13px;color:#f9a825;">📝 ${escapeHtml(m.out_subject || 'بدون عنوان')}</div>
        <div style="font-size:13px;color:#94a3b8;">${escapeHtml(m.out_body || '')}</div>
        <span class="user-role ${m.out_sender_role}">${roleLabel(m.out_sender_role)}</span>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ Send Notification ═══════════
$('sendNotifBtn').addEventListener('click', async () => {
  const target = $('notifTarget').value;
  const title = $('notifTitle').value.trim();
  const body = $('notifBody').value.trim();

  if (!title || !body) {
    toast('⚠️ المرجو إدخال العنوان والرسالة', 'error');
    return;
  }

  if (!confirm('⚠️ متأكد من إرسال الإشعار؟')) return;

  $('sendNotifBtn').disabled = true;
  $('sendNotifBtn').textContent = '⏳ جاري الإرسال...';

  try {
    const { data, error } = await supabase.rpc('admin_send_notification', {
      p_target: target, p_title: title, p_body: body
    });
    if (error) throw error;
    const result = data && data[0];
    if (!result || !result.out_success) throw new Error(result?.out_message || 'فشل');
    toast('✅ ' + result.out_message, 'success');
    $('notifTitle').value = '';
    $('notifBody').value = '';
    await loadAuditLog();
  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }

  $('sendNotifBtn').disabled = false;
  $('sendNotifBtn').textContent = '📤 إرسال';
});

// ═══════════ Load Settings ═══════════
async function loadSettings() {
  const container = $('settingsList');
  if (!container) return;
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';
  try {
    const { data, error } = await supabase.rpc('admin_get_settings');
    if (error) throw error;
    const settings = data || [];

    if (!settings.length) {
      container.innerHTML = '<div class="empty-admin">ما كاينش إعدادات</div>';
      return;
    }

    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.out_category]) grouped[s.out_category] = [];
      grouped[s.out_category].push(s);
    });

    const catLabels = {
      general: '🌍 عام', institution: '🏫 المؤسسة', grading: '📊 التقييم',
      subscription: '💳 الاشتراكات', security: '🔐 الأمان', ai: '🤖 AI',
      communication: '📧 التواصل'
    };

    container.innerHTML = Object.keys(grouped).map(cat => `
      <div class="card-modern" style="margin-bottom:16px;">
        <h3 class="card-title-modern">${catLabels[cat] || cat}</h3>
        ${grouped[cat].map(s => {
          const val = s.out_value;
          const strVal = typeof val === 'string' ? val : JSON.stringify(val);
          const isBool = typeof val === 'boolean';
          return `
            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label-modern">${escapeHtml(s.out_description || s.out_key)}</label>
              ${isBool
                ? `<select class="input-modern" data-setting-cat="${cat}" data-setting-key="${s.out_key}">
                    <option value="true" ${val === true ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${val === false ? 'selected' : ''}>❌ معطل</option>
                  </select>`
                : `<input type="text" class="input-modern" data-setting-cat="${cat}" data-setting-key="${s.out_key}" value="${escapeHtml(strVal.replace(/"/g, ''))}">`
              }
            </div>
          `;
        }).join('')}
        <button class="btn-primary-modern" data-save-cat="${cat}" style="margin-top:10px;">💾 حفظ ${catLabels[cat] || cat}</button>
      </div>
    `).join('');

    document.querySelectorAll('[data-save-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cat = btn.dataset.saveCat;
        const inputs = document.querySelectorAll(`[data-setting-cat="${cat}"]`);
        btn.disabled = true;
        btn.textContent = '⏳ جاري الحفظ...';

        try {
          for (const inp of inputs) {
            const key = inp.dataset.settingKey;
            let value;
            if (inp.tagName === 'SELECT') value = inp.value === 'true';
            else {
              const raw = inp.value.trim();
              if (!isNaN(raw) && raw !== '') value = parseFloat(raw);
              else value = raw;
            }
            await supabase.rpc('admin_update_setting', {
              p_category: cat, p_key: key, p_value: value
            });
          }
          toast('✅ تم الحفظ', 'success');
          await loadAuditLog();
        } catch (err) {
          toast('❌ ' + err.message, 'error');
        }

        btn.disabled = false;
        btn.textContent = '💾 حفظ ' + (catLabels[cat] || cat);
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ Save Appearance ═══════════
$('saveAppearanceBtn').addEventListener('click', async () => {
  const primary = $('colorPrimary').value;
  const gold = $('colorGold').value;

  try {
    await supabase.rpc('admin_update_setting', {
      p_category: 'appearance', p_key: 'color_primary', p_value: primary
    });
    await supabase.rpc('admin_update_setting', {
      p_category: 'appearance', p_key: 'color_gold', p_value: gold
    });
    document.documentElement.style.setProperty('--red', primary);
    document.documentElement.style.setProperty('--gold', gold);
    localStorage.setItem('admin_primary', primary);
    localStorage.setItem('admin_gold', gold);
    toast('✅ تم حفظ المظهر', 'success');
  } catch (err) {
    toast('❌ ' + err.message, 'error');
  }
});

// ═══════════ Load Audit Log ═══════════
async function loadAuditLog() {
  const container = $('logsList');
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`id, action, details, created_at, admin:admin_id ( full_name ), target:target_user_id ( full_name )`)
      .order('created_at', { ascending: false }).limit(50);

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
      if (log.action.includes('إشعار')) icon = '📢';
      if (log.action.includes('إعداد')) icon = '⚙️';
      const date = new Date(log.created_at).toLocaleString('ar-MA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="code-item" style="flex-direction:column;align-items:flex-start;gap:8px;">
          <div style="display:flex;gap:10px;align-items:center;width:100%;">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-weight:700;font-size:14px;flex:1;">${escapeHtml(log.action)}</span>
            <span style="font-size:11px;color:#64748b;">${date}</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;">
            👑 <strong>${escapeHtml(log.admin?.full_name || 'الأدمن')}</strong>
            ${log.target ? ` • 👤 <strong>${escapeHtml(log.target.full_name || 'مستخدم')}</strong>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }
}

// ═══════════ Load Security Stats ═══════════
async function loadSecurityStats() {
  const container = $('securityStatsGrid');
  if (!container) return;
  container.innerHTML = '<div class="loading-modern">⏳ كيتحمل...</div>';

  try {
    const { data, error } = await supabase.rpc('admin_get_security_stats');
    if (error) throw error;
    const s = data && data[0];
    if (!s) throw new Error('لا توجد بيانات');

    container.innerHTML = `
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${s.total_attempts}</div><div class="stat-label">محاولات (24س)</div></div>
      <div class="stat-card"><div class="stat-icon">❌</div><div class="stat-value">${s.failed_attempts}</div><div class="stat-label">فاشلة</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${s.successful_attempts}</div><div class="stat-label">ناجحة</div></div>
      <div class="stat-card"><div class="stat-icon">🔒</div><div class="stat-value">${s.locked_accounts}</div><div class="stat-label">حسابات مقفولة</div></div>
      <div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value">${s.blocked_ips}</div><div class="stat-label">IPs محظورة</div></div>
      <div class="stat-card"><div class="stat-icon">🌐</div><div class="stat-value">${s.unique_ips}</div><div class="stat-label">IPs فريدة</div></div>
    `;
  } catch (err) {
    container.innerHTML = '<div class="empty-admin">❌ ' + escapeHtml(err.message) + '</div>';
  }

  try {
    const { data } = await supabase
      .from('login_attempts').select('*')
      .order('attempted_at', { ascending: false }).limit(30);
    const list = $('loginAttemptsList');
    if (list) {
      if (!data || !data.length) {
        list.innerHTML = '<div class="empty-admin">ما كاينش محاولات</div>';
      } else {
        list.innerHTML = data.map(a => `
          <div class="code-item">
            <div>
              <div style="font-weight:700;font-size:13px;">${escapeHtml(a.email)}</div>
              <div class="user-meta" style="margin-top:4px;"><span>🌐 ${escapeHtml(a.ip_address || 'unknown')}</span></div>
            </div>
            <span class="code-status ${a.success ? 'active' : 'expired'}">${a.success ? '✅' : '❌'}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) { console.error(err); }

  try {
    const { data } = await supabase
      .from('blocked_ips').select('*')
      .gt('blocked_until', new Date().toISOString())
      .order('blocked_at', { ascending: false }).limit(30);
    const list = $('blockedIPsList');
    if (list) {
      if (!data || !data.length) {
        list.innerHTML = '<div class="empty-admin">ما كاينش IPs محظورة</div>';
      } else {
        list.innerHTML = data.map(b => `
          <div class="code-item">
            <div>
              <div style="font-weight:700;font-size:13px;font-family:monospace;">${escapeHtml(b.ip_address)}</div>
              <div class="user-meta" style="margin-top:4px;"><span>📝 ${escapeHtml(b.reason || '')}</span></div>
            </div>
            <span class="code-status expired">🚫</span>
          </div>
        `).join('');
      }
    }
  } catch (err) { console.error(err); }

  try {
    const { data } = await supabase
      .from('locked_accounts').select('*')
      .gt('locked_until', new Date().toISOString())
      .order('locked_at', { ascending: false }).limit(30);
    const list = $('lockedAccountsList');
    if (list) {
      if (!data || !data.length) {
        list.innerHTML = '<div class="empty-admin">ما كاينش حسابات مقفولة</div>';
      } else {
        list.innerHTML = data.map(l => `
          <div class="code-item">
            <div>
              <div style="font-weight:700;font-size:13px;">${escapeHtml(l.email)}</div>
              <div class="user-meta" style="margin-top:4px;"><span>📝 ${escapeHtml(l.reason || '')}</span></div>
            </div>
            <span class="code-status expired">🔒</span>
          </div>
        `).join('');
      }
    }
  } catch (err) { console.error(err); }
}

// ═══════════ Emergency Lock ═══════════
const emergencyBtn = $('emergencyLockBtn');
if (emergencyBtn) {
  emergencyBtn.addEventListener('click', async () => {
    const txt = prompt('⚠️ قفل طوارئ\n\nاكتب "قفل" باش تقفل، أو "فتح" باش تفتح:');
    if (txt !== 'قفل' && txt !== 'فتح') { toast('تم الإلغاء', 'info'); return; }
    const lock = txt === 'قفل';
    if (!confirm('متأكد؟')) return;
    try {
      const { error } = await supabase.rpc('admin_emergency_lock', { p_lock: lock });
      if (error) throw error;
      toast(lock ? '🚨 تم تفعيل القفل' : '✅ تم إلغاء القفل', lock ? 'error' : 'success');
      await loadAuditLog();
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
  });
}

// ═══════════ Session Check ═══════════
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (!session || !session.user) return;
  try {
    const { data: profile } = await supabase
      .from('profiles').select('id, role, full_name, email')
      .eq('id', session.user.id).maybeSingle();
    if (!profile || profile.role !== 'admin') {
      await supabase.auth.signOut();
      return;
    }
    currentAdmin = profile;
    hide($('loginScreen'));
    show($('adminPanel'));
    $('adminName').textContent = '👤 ' + (profile.full_name || 'الأدمن');
    await loadAllData();
  } catch (err) {
    console.error('Session error:', err);
  }
});
