// ═══════════════════════════════════════════════════
// LYCÉE MAROC AI — APP.JS (مع Validation + Fingerprint)
// ═══════════════════════════════════════════════════

import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

let selectedRole = null;
let currentUser = null;
let currentProfile = null;

// ═══════════════════════════════════════════════════
// 🛡️ Device Fingerprint
// ═══════════════════════════════════════════════════

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Lycée Maroc AI 🎓', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Lycée Maroc AI 🎓', 4, 17);
    return canvas.toDataURL();
  } catch { return 'no-canvas'; }
}

function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'no-info';
  } catch { return 'no-webgl'; }
}

async function hashString(str) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: hashing بسيط
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16).padStart(64, '0');
  }
}

async function getDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages ? navigator.languages.join(',') : '',
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 'unknown',
    navigator.platform || '',
    navigator.maxTouchPoints || 0,
    getCanvasFingerprint(),
    getWebGLFingerprint()
  ];
  const str = components.join('|');
  return await hashString(str);
}

async function getUserIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    const data = await res.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ═══════════════════════════════════════════════════
// 🛡️ Validation Functions
// ═══════════════════════════════════════════════════

const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'temp-mail.org', '10minutemail.com',
  'guerrillamail.com', 'guerrillamail.info', 'grr.la',
  'mailinator.com', 'maildrop.cc', 'yopmail.com',
  'throwaway.email', 'sharklasers.com', 'getnada.com',
  'dispostable.com', 'trashmail.com', 'spam4.me',
  'mailmetrash.com', 'spam.la', 'tyldd.com', '0-mail.com',
  '0clickemail.com', '10mail.org', '20minutemail.com',
  'emailondeck.com', 'fakeinbox.com', 'filzmail.com',
  'getairmail.com', 'throwam.com', 'trbvm.com',
  'wegwerfemail.de', 'wegwerfmail.de',
  'yopmail.fr', 'yopmail.net', 'jetable.fr.nf',
  'tempmail.net', 'tempinbox.com', 'tempinbox.co.uk',
  'trash-mail.com', 'trashmail.me', 'trashymail.com',
  'yopmail.gq', 'yopmail.tk', 'mailsac.com', 'moakt.com',
  'mailcatch.com', 'mailnesia.com', 'spambox.us',
  'spamgourmet.com', 'mailnull.com', 'spamex.com',
  'mytemp.email', 'tempsky.com', 'tempemail.com'
];

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, msg: 'الإيميل غالط — تأكد من الصيغة (name@domain.com)' };
  }
  const domain = email.split('@')[1].toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, msg: 'هاد الإيميل مؤقت ولا مقبول' };
  }
  if (email.includes('..') || email.includes('@@')) {
    return { valid: false, msg: 'الإيميل فيه رموز غالطة' };
  }
  if (email.length < 6 || email.length > 100) {
    return { valid: false, msg: 'طول الإيميل غالط' };
  }
  return { valid: true };
}

function validatePhone(phone) {
  if (!phone) return { valid: false, msg: 'المرجو إدخال رقم الهاتف' };
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const moroccoRegex = /^(?:\+212|0)([5-7])\d{8}$/;
  if (!moroccoRegex.test(cleanPhone)) {
    return { valid: false, msg: 'الرقم خاصو يبدا بـ 06 ولا 07 ولا 05 ويكون 10 أرقام' };
  }
  return { valid: true, clean: cleanPhone };
}

function validateName(name) {
  if (!name || name.length < 3) {
    return { valid: false, msg: 'الاسم خاصو 3 أحرف على الأقل' };
  }
  if (name.length > 60) {
    return { valid: false, msg: 'الاسم طويل بزاف' };
  }
  if (!/^[\u0600-\u06FFa-zA-Z\s'-]+$/.test(name)) {
    return { valid: false, msg: 'الاسم فيه رموز غير مقبولة' };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════

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

// ═══════════ Live Validation ═══════════

$('suEmail')?.addEventListener('blur', () => {
  const email = $('suEmail').value.trim();
  if (!email) return;
  const check = validateEmail(email);
  $('suEmail').style.borderColor = check.valid ? '#4CAF50' : '#E53935';
});

$('suPhone')?.addEventListener('blur', () => {
  const phone = $('suPhone').value.trim();
  if (!phone) return;
  const check = validatePhone(phone);
  $('suPhone').style.borderColor = check.valid ? '#4CAF50' : '#E53935';
});

$('suParentPhone')?.addEventListener('blur', () => {
  const phone = $('suParentPhone').value.trim();
  if (!phone) return;
  const check = validatePhone(phone);
  $('suParentPhone').style.borderColor = check.valid ? '#4CAF50' : '#E53935';
});

$('suName')?.addEventListener('blur', () => {
  const name = $('suName').value.trim();
  if (!name) return;
  const check = validateName(name);
  $('suName').style.borderColor = check.valid ? '#4CAF50' : '#E53935';
});

$('suPhone')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9+]/g, '');
});

$('suParentPhone')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9+]/g, '');
});

// ═══════════ Role Selection ═══════════
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedRole = btn.dataset.role;
    $('signupBtn').disabled = false;

    hide($('teacherFields'));
    if ($('studentFields')) hide($('studentFields'));

    if (selectedRole === 'teacher') {
      show($('teacherFields'));
    } else if (selectedRole === 'student') {
      if ($('studentFields')) show($('studentFields'));
    }
  });
});

// ═══════════ Signup (مع Fingerprint Check) ═══════════
$('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));
  hide($('successMsg'));

  const name = $('suName').value.trim();
  const email = $('suEmail').value.trim().toLowerCase();
  const phone = $('suPhone') ? $('suPhone').value.trim() : '';
  const password = $('suPassword').value;

  if (!selectedRole) { showError('المرجو اختيار الدور'); return; }

  // ═══ Validation ═══
  const nameCheck = validateName(name);
  if (!nameCheck.valid) { showError(nameCheck.msg); return; }

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) { showError(emailCheck.msg); return; }

  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) { showError(phoneCheck.msg); return; }

  if (password.length < 8) { showError('كلمة المرور خاصها 8 أحرف على الأقل'); return; }

  let subject = null, level = null, institution = null, parentPhone = null;

  // ═══ حقول الأستاذ ═══
  if (selectedRole === 'teacher') {
    subject = $('suSubject') ? $('suSubject').value : null;
    level = $('suLevel') ? $('suLevel').value : null;
    institution = $('suSchool') ? $('suSchool').value.trim() : null;
    if (!subject) { showError('المرجو اختيار المادة'); return; }
    if (!level) { showError('المرجو اختيار المستوى'); return; }
    if (!institution || institution.length < 3) { showError('المرجو إدخال اسم المؤسسة'); return; }
  }

  // ═══ حقول التلميذ ═══
  if (selectedRole === 'student') {
    parentPhone = $('suParentPhone') ? $('suParentPhone').value.trim() : null;
    level = $('suStudentLevel') ? $('suStudentLevel').value : null;
    institution = $('suStudentInstitution') ? $('suStudentInstitution').value.trim() : null;

    if (!level) { showError('المرجو اختيار المستوى'); return; }
    if (!institution || institution.length < 3) { showError('المرجو إدخال اسم المؤسسة'); return; }

    const parentPhoneCheck = validatePhone(parentPhone);
    if (!parentPhoneCheck.valid) { showError('رقم الوالد: ' + parentPhoneCheck.msg); return; }
    parentPhone = parentPhoneCheck.clean;
  }

  $('signupBtn').disabled = true;
  $('signupBtn').textContent = 'جاري التحقق...';

  try {
    // ═══════════════════════════════════════════════════
    // 🛡️ Fingerprint Check
    // ═══════════════════════════════════════════════════
    const fingerprint = await getDeviceFingerprint();
    const userIP = await getUserIP();

    const { data: trialCheck, error: trialErr } = await supabase
      .rpc('check_trial_eligibility', {
        p_fingerprint: fingerprint,
        p_ip: userIP
      });

    if (trialErr) {
      console.error('Trial check error:', trialErr);
      // نتجاهلو الخطأ ونكملو (باش ما نوقفوش المستعمل)
    } else if (trialCheck && trialCheck[0] && !trialCheck[0].can_start) {
      showError(trialCheck[0].reason || '⛔ هاد الجهاز سبق استعمل الفترة المجانية');
      $('signupBtn').disabled = false;
      $('signupBtn').textContent = 'إنشاء حسابي';
      return;
    }

    // ═══════════════════════════════════════════════════
    // 🚀 إنشاء الحساب
    // ═══════════════════════════════════════════════════
    $('signupBtn').textContent = 'جاري التسجيل...';

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, role: selectedRole } }
    });
    if (authErr) throw authErr;
    if (!authData.user) throw new Error('لم يتم إنشاء الحساب');

    let shareCode = null;
    if (selectedRole === 'teacher') {
      shareCode = genCode(6);
    }

    // ═══ INSERT فـ profiles ═══
    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      role: selectedRole,
      full_name: name,
      email: email,
      phone: phoneCheck.clean,
      subject: subject,
      level: level,
      institution: institution,
      parent_phone: parentPhone,
      share_code: shareCode
    });
    if (profErr) throw profErr;

    // ═══ بدء التجربة (trials) ═══
    try {
      const { data: trialStart, error: startErr } = await supabase
        .rpc('start_trial', {
          p_fingerprint: fingerprint,
          p_ip: userIP,
          p_user_id: authData.user.id,
          p_email: email,
          p_phone: phoneCheck.clean,
          p_days: 15
        });

      if (startErr) {
        console.error('Start trial error:', startErr);
      } else if (trialStart && trialStart[0]) {
        console.log('✅ Trial started:', trialStart[0].message);
      }
    } catch (trialError) {
      console.error('Trial error:', trialError);
      // ما كنوقفوش التسجيل، غير كنكملو
    }

    $('successMsg').textContent = '✅ تم إنشاء الحساب بنجاح — 15 يوم مجانية';
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
