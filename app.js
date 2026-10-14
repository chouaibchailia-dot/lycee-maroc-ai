// ═══════════════════════════════════════════════════
// LYCÉE MAROC AI — APP.JS (النسخة الكاملة النهائية)
// ═══════════════════════════════════════════════════

import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

let selectedRole = null;
let currentUser = null;
let currentProfile = null;

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

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

function toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    toast('✅ تم النسخ', 'success');
  } catch {
    toast('❌ فشل النسخ', 'error');
  }
}

function showError(msg) {
  $('errorMsg').textContent = msg;
  show($('errorMsg'));
}

setTimeout(() => {
  hide($('splash'));
  show($('langScreen'));
}, 1500);

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    hide($('langScreen'));
    show($('welcomeScreen'));
  });
});

$('goLogin').addEventListener('click', () => {
  hide($('welcomeScreen'));
  show($('authScreen'));
  hide($('signupForm'));
  show($('loginForm'));
  $('authTitle').textContent = 'تسجيل الدخول';
});

$('goSignup').addEventListener('click', () => {
  hide($('welcomeScreen'));
  show($('authScreen'));
  show($('signupForm'));
  hide($('loginForm'));
  $('authTitle').textContent = 'إنشاء حساب جديد';
});

$('backBtn').addEventListener('click', () => {
  hide($('authScreen'));
  show($('welcomeScreen'));
  hide($('errorMsg'));
  hide($('successMsg'));
});

// ═══════════ Role Selection ═══════════
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedRole = btn.dataset.role;
    $('signupBtn').disabled = false;

    // إخفاء الكل أولاً
    hide($('teacherFields'));
    if ($('studentFields')) hide($('studentFields'));

    // إظهار حسب الدور
    if (selectedRole === 'teacher') {
      show($('teacherFields'));
    } else if (selectedRole === 'student') {
      if ($('studentFields')) show($('studentFields'));
    }
  });
});

// ═══════════ Signup ═══════════
$('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));
  hide($('successMsg'));

  const name = $('suName').value.trim();
  const email = $('suEmail').value.trim();
  const phone = $('suPhone') ? $('suPhone').value.trim() : '';
  const password = $('suPassword').value;

  if (!selectedRole) { showError('المرجو اختيار الدور'); return; }
  if (password.length < 8) { showError('كلمة المرور خاصها 8 أحرف على الأقل'); return; }

  let subject = null, level = null, institution = null, parentPhone = null;

  // ═══ حقول الأستاذ ═══
  if (selectedRole === 'teacher') {
    subject = $('suSubject') ? $('suSubject').value : null;
    level = $('suLevel') ? $('suLevel').value : null;
    institution = $('suSchool') ? $('suSchool').value.trim() : null;
    if (!subject) { showError('المرجو اختيار المادة'); return; }
    if (!level) { showError('المرجو اختيار المستوى'); return; }
    if (!institution) { showError('المرجو إدخال اسم المؤسسة'); return; }
  }

  // ═══ حقول التلميذ ═══
  if (selectedRole === 'student') {
    parentPhone = $('suParentPhone') ? $('suParentPhone').value.trim() : null;
    level = $('suStudentLevel') ? $('suStudentLevel').value : null;
    institution = $('suStudentInstitution') ? $('suStudentInstitution').value.trim() : null;
    if (!parentPhone) { showError('المرجو إدخال رقم هاتف الوالد'); return; }
    if (!level) { showError('المرجو اختيار المستوى'); return; }
    if (!institution) { showError('المرجو إدخال اسم المؤسسة'); return; }
  }

  $('signupBtn').disabled = true;
  $('signupBtn').textContent = 'جاري التسجيل...';

  try {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, role: selectedRole } }
    });
    if (authErr) throw authErr;
    if (!authData.user) throw new Error('لم يتم إنشاء الحساب');

    // توليد share_code للأستاذ
    let shareCode = null;
    if (selectedRole === 'teacher') {
      shareCode = genCode(6);
    }

    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      role: selectedRole,
      full_name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      level: level,
      institution: institution,
      parent_phone: parentPhone,
      share_code: shareCode
    });
    if (profErr) throw profErr;

    $('successMsg').textContent = '✅ تم إنشاء الحساب بنجاح';
    show($('successMsg'));

    setTimeout(() => {
      if (selectedRole === 'teacher' && shareCode) {
        hide($('authScreen'));
        show($('codeRevealScreen'));
        $('revealCode').textContent = shareCode;
      } else {
        loadUserAndDashboard(authData.user.id);
      }
    }, 1200);

  } catch (err) {
    console.error('Signup error:', err);
    showError(err.message || 'حدث خطأ أثناء التسجيل');
    $('signupBtn').disabled = false;
    $('signupBtn').textContent = 'إنشاء حسابي';
  }
});

// ═══════════ Code Reveal ═══════════
$('copyRevealBtn').addEventListener('click', () => {
  copyText($('revealCode').textContent);
});

$('continueBtn').addEventListener('click', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await loadUserAndDashboard(user.id);
});

// ═══════════ Login ═══════════
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));
  hide($('successMsg'));

  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadUserAndDashboard(data.user.id);
  } catch (err) {
    console.error('Login error:', err);
    showError(err.message || 'فشل تسجيل الدخول');
  }
});

// ═══════════ Logout ═══════════
$('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ═══════════ Settings ═══════════
$('settingsBtn').addEventListener('click', () => {
  toast('⚙️ الإعدادات قريباً...', 'info');
});

// ═══════════ Load User + Dashboard ═══════════
async function loadUserAndDashboard(userId) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!profile) throw new Error('لم يتم العثور على الحساب');

    currentUser = { id: userId, email: profile.email };
    currentProfile = profile;

    hide($('splash'));
    hide($('langScreen'));
    hide($('welcomeScreen'));
    hide($('authScreen'));
    hide($('codeRevealScreen'));
    show($('dashboardScreen'));

    $('dashGreeting').textContent = 'مرحباً ' + (profile.full_name || '');
    $('dashRole').textContent = roleLabel(profile.role);

    await renderDashboard(profile.role);

  } catch (err) {
    console.error('Load error:', err);
    toast('خطأ: ' + err.message, 'error');
  }
}

// ═══════════ Render Dashboard ═══════════
async function renderDashboard(role) {
  const c = $('dashContent');
  c.innerHTML = '<div class="empty"><span class="loader"></span></div>';

  try {
    if (role === 'teacher') await renderTeacherDash(c);
    else if (role === 'student') await renderStudentDash(c);
    else c.innerHTML = '<div class="empty"><span class="empty-icon">🚧</span>قريباً...</div>';
  } catch (err) {
    console.error('Dashboard error:', err);
    c.innerHTML = '<div class="empty">❌ ' + err.message + '</div>';
  }
}

// ═══════════ Teacher Dashboard ═══════════
async function renderTeacherDash(c) {
  const shareCode = currentProfile.share_code || '------';

  const { data: requests } = await supabase
    .rpc('get_join_requests_for_teacher', { p_teacher_id: currentUser.id });

  const { data: students } = await supabase
    .rpc('get_students_for_teacher', { p_teacher_id: currentUser.id });

  const reqList = requests || [];
  const stuList = students || [];

  c.innerHTML = `
    <div class="ai-card">
      <h3>🤖 AI المساعد</h3>
      <p>قريباً: تصحيح الأوراق، توليد الجذاذات، وتوليد الأسئلة</p>
    </div>

    <div class="card">
      <div class="card-title">🎟️ كود المشاركة ديالك</div>
      <div class="code-box">
        <p class="code-hint">عطي هاد الكود للتلاميذ باش ينضمو ليك</p>
        <div class="code-text">${shareCode}</div>
      </div>
      <div class="btn-row">
        <button class="btn-sm btn-copy" id="copyCodeBtn">📋 نسخ</button>
        <button class="btn-sm btn-share" id="shareCodeBtn">📤 مشاركة</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="requests">📥 الطلبات (${reqList.length})</button>
      <button class="tab" data-tab="students">👥 التلاميذ (${stuList.length})</button>
    </div>

    <div id="tabRequests">${renderRequests(reqList)}</div>
    <div id="tabStudents" class="hidden">${renderStudents(stuList)}</div>
  `;

  $('copyCodeBtn').addEventListener('click', () => copyText(shareCode));
  $('shareCodeBtn').addEventListener('click', () => {
    const txt = `انضم ليا فـ Lycée Maroc AI بكود الأستاذ: ${shareCode}\nhttps://lycee-maroc-ai.vercel.app`;
    if (navigator.share) {
      navigator.share({ title: 'Lycée Maroc AI', text: txt }).catch(() => {});
    } else {
      copyText(txt);
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.tab === 'requests') {
        show($('tabRequests'));
        hide($('tabStudents'));
      } else {
        hide($('tabRequests'));
        show($('tabStudents'));
      }
    });
  });

  document.querySelectorAll('[data-accept]').forEach(btn => {
    btn.addEventListener('click', () => acceptRequest(btn.dataset.accept, btn));
  });
  document.querySelectorAll('[data-reject]').forEach(btn => {
    btn.addEventListener('click', () => rejectRequest(btn.dataset.reject, btn));
  });
}

// ═══════════ Render Requests ═══════════
function renderRequests(requests) {
  if (!requests.length) {
    return '<div class="empty"><span class="empty-icon">📭</span>ما كاينش طلبات جديدة</div>';
  }
  return requests.map(r => `
    <div class="request-item">
      <div class="request-info">
        <div class="request-name">👤 ${r.out_student_name || 'بدون اسم'}</div>
        <div class="request-email">📧 ${r.out_student_email || ''}</div>
        ${r.out_student_phone ? `<div class="request-email">📱 ${r.out_student_phone}</div>` : ''}
        ${r.out_parent_phone ? `<div class="request-email">👨‍👦 هاتف الوالد: ${r.out_parent_phone}</div>` : ''}
        ${r.out_student_level ? `<div class="request-email">🎓 ${r.out_student_level}</div>` : ''}
        ${r.out_student_institution ? `<div class="request-email">🏫 ${r.out_student_institution}</div>` : ''}
      </div>
      <div class="request-actions">
        <button class="btn-accept" data-accept="${r.out_request_id}">✅ قبول</button>
        <button class="btn-reject" data-reject="${r.out_request_id}">❌ رفض</button>
      </div>
    </div>
  `).join('');
}

// ═══════════ Render Students ═══════════
function renderStudents(students) {
  if (!students.length) {
    return '<div class="empty"><span class="empty-icon">👥</span>مازال ما عندكش تلاميذ</div>';
  }
  return students.map(s => `
    <div class="student-card">
      <h4>👤 ${s.out_student_name || 'بدون اسم'}</h4>
      <div class="student-meta">
        <span>📧 ${s.out_student_email || ''}</span>
        <span>👥 ${s.out_group_name || 'عام'}</span>
      </div>
    </div>
  `).join('');
}

// ═══════════ Accept Request ═══════════
async function acceptRequest(requestId, btn) {
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const { data, error } = await supabase
      .rpc('accept_join_request', { p_request_id: requestId });

    if (error) throw error;

    const result = data && data[0];
    if (!result || !result.out_success) {
      throw new Error(result ? result.out_message : 'فشل القبول');
    }

    toast('✅ تم قبول التلميذ', 'success');
    setTimeout(() => renderDashboard('teacher'), 800);

  } catch (err) {
    console.error('Accept error:', err);
    toast('خطأ: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '✅ قبول';
  }
}

// ═══════════ Reject Request ═══════════
async function rejectRequest(requestId, btn) {
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const { error } = await supabase
      .rpc('reject_join_request', { p_request_id: requestId });

    if (error) throw error;

    toast('تم رفض الطلب', 'info');
    setTimeout(() => renderDashboard('teacher'), 800);

  } catch (err) {
    console.error('Reject error:', err);
    toast('خطأ: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '❌ رفض';
  }
}

// ═══════════ Student Dashboard ═══════════
async function renderStudentDash(c) {
  c.innerHTML = `
    <div class="card">
      <div class="card-title">🎟️ انضم لأستاذ</div>
      <p style="color: var(--text-2); font-size: 13px; margin-bottom: 12px;">
        دخل كود الأستاذ اللي عطاه ليك
      </p>
      <div class="input-group">
        <input type="text" id="teacherCodeInput" placeholder="T19X4K" maxlength="10">
      </div>
      <button class="btn-primary" id="joinBtn">🔍 بحث</button>
    </div>
    <div id="teacherResult"></div>
  `;

  $('joinBtn').addEventListener('click', async () => {
    const code = $('teacherCodeInput').value.trim().toUpperCase();
    if (!code) { toast('دخل الكود', 'error'); return; }

    $('joinBtn').disabled = true;
    $('joinBtn').textContent = '...';
    $('teacherResult').innerHTML = '';

    try {
      const { data, error } = await supabase
        .rpc('find_teacher_by_code', { p_code: code });

      if (error) throw error;

      if (!data || !data.length) {
        $('teacherResult').innerHTML = '<div class="empty">❌ ما لقيناش هاد الأستاذ</div>';
      } else {
        const t = data[0];
        $('teacherResult').innerHTML = `
          <div class="card">
            <div class="card-title">✅ لقينا الأستاذ</div>
            <h4 style="margin-bottom: 10px;">👨‍🏫 ${t.out_full_name}</h4>
            <p style="color: var(--text-2); font-size: 13px;">
              ${t.out_subject || ''} • ${t.out_level || ''} • ${t.out_institution || ''}
            </p>
            <button class="btn-primary" id="confirmJoinBtn" style="margin-top: 12px;">📩 إرسال طلب انضمام</button>
          </div>
        `;
        $('confirmJoinBtn').addEventListener('click', () => sendJoinRequest(t.out_teacher_id, code));
      }

    } catch (err) {
      console.error('Find error:', err);
      $('teacherResult').innerHTML = '<div class="empty">خطأ: ' + err.message + '</div>';
    }

    $('joinBtn').disabled = false;
    $('joinBtn').textContent = '🔍 بحث';
  });
}

// ═══════════ Send Join Request ═══════════
async function sendJoinRequest(teacherId, code) {
  try {
    const { data: existing } = await supabase
      .from('join_requests')
      .select('id, status')
      .eq('from_user', currentUser.id)
      .eq('to_teacher', teacherId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') {
        toast('عندك طلب معلق مع هاد الأستاذ', 'info');
        return;
      }
      if (existing.status === 'accepted') {
        toast('راك مقبول من هاد الأستاذ', 'success');
        return;
      }
    }

    const { error } = await supabase.from('join_requests').insert({
      from_user: currentUser.id,
      to_teacher: teacherId,
      type: 'student',
      status: 'pending',
      message: `طلب انضمام بكود ${code}`
    });
    if (error) throw error;

    toast('✅ تم إرسال الطلب للأستاذ', 'success');

  } catch (err) {
    console.error('Send request error:', err);
    toast('خطأ: ' + err.message, 'error');
  }
}

// ═══════════ Session Check ═══════════
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session && session.user) {
    loadUserAndDashboard(session.user.id);
  }
});
