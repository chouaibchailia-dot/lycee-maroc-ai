// ============================================
// LYCÉE MAROC AI - APP.JS
// ============================================

import { supabase } from './supabase.js';

// ============ Helpers ============
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

let selectedRole = null;

// ============ Splash → Language ============
setTimeout(() => {
  hide($('splash'));
  show($('langScreen'));
}, 1500);

// ============ Language Selection ============
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    hide($('langScreen'));
    show($('welcomeScreen'));
  });
});

// ============ Welcome → Login/Signup ============
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

// ============ Back Button ============
$('backBtn').addEventListener('click', () => {
  hide($('authScreen'));
  show($('welcomeScreen'));
  $('errorMsg').classList.add('hidden');
  $('successMsg').classList.add('hidden');
});

// ============ Role Selection ============
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedRole = btn.dataset.role;
    $('signupBtn').disabled = false;
  });
});

// ============ Signup ============
$('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));
  hide($('successMsg'));

  const name = $('suName').value.trim();
  const email = $('suEmail').value.trim();
  const password = $('suPassword').value;

  if (!selectedRole) {
    showError('المرجو اختيار الدور');
    return;
  }

  if (password.length < 8) {
    showError('كلمة المرور خاصها 8 أحرف على الأقل');
    return;
  }

  $('signupBtn').disabled = true;
  $('signupBtn').textContent = 'جاري التسجيل...';

  try {
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name,
          role: selectedRole
        }
      }
    });

    if (authErr) throw authErr;
    if (!authData.user) throw new Error('لم يتم إنشاء الحساب');

    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      role: selectedRole,
      full_name: name,
      email: email
    });

    if (profErr) {
      console.error('Profile insert error:', profErr);
      throw new Error(profErr.message);
    }

    $('successMsg').textContent = 'تم إنشاء الحساب بنجاح';
    show($('successMsg'));

    setTimeout(() => {
      hide($('authScreen'));
      show($('dashboardScreen'));
      $('userInfo').textContent = 'مرحباً ' + name;
    }, 1500);

  } catch (err) {
    console.error('Signup error:', err);
    showError(err.message || 'حدث خطأ أثناء التسجيل');
    $('signupBtn').disabled = false;
    $('signupBtn').textContent = 'إنشاء حسابي';
  }
});

// ============ Login ============
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  hide($('errorMsg'));
  hide($('successMsg'));

  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    hide($('authScreen'));
    show($('dashboardScreen'));
    $('userInfo').textContent = profile
      ? 'مرحباً ' + profile.full_name
      : 'مرحباً ' + data.user.email;

  } catch (err) {
    console.error('Login error:', err);
    showError(err.message || 'فشل تسجيل الدخول');
  }
});

// ============ Logout ============
$('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ============ Helper: Show Error ============
function showError(msg) {
  $('errorMsg').textContent = msg;
  show($('errorMsg'));
}

// ============ Check Existing Session ============
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    hide($('splash'));
    hide($('langScreen'));
    hide($('welcomeScreen'));
    hide($('authScreen'));
    show($('dashboardScreen'));
    $('userInfo').textContent = 'مرحباً ' + session.user.email;
  }
});
