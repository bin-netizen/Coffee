// ====== controllers/authController.js ======
const User = require('../models/User');

// ---------- GET /login ----------
function showLoginPage(req, res) {
  const redirect = req.query.redirect || '/';
  const justRegistered = req.query.registered === '1';
  res.render('login', {
    activePage: 'login',
    redirect,
    successMessage: justRegistered ? 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.' : null
  });
}

// ---------- GET /register ----------
function showRegisterPage(req, res) {
  const redirect = req.query.redirect || '/';
  res.render('register', { activePage: 'register', redirect });
}

// ---------- POST /login ----------
async function login(req, res) {
  try {
    const { email, password, redirect } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.render('login', {
        activePage: 'login',
        redirect,
        error: 'Email hoặc mật khẩu không đúng.'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.render('login', {
        activePage: 'login',
        redirect,
        error: 'Email hoặc mật khẩu không đúng.'
      });
    }

    // Đây là bước "đăng nhập" thật sự - lưu userId vào session
    req.session.userId = user._id;
    req.session.userFullname = user.fullname;

    const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/';
    res.redirect(safeRedirect);

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.render('login', {
      activePage: 'login',
      error: 'Có lỗi xảy ra, vui lòng thử lại.'
    });
  }
}

// ---------- POST /register ----------
// ⚠️ Theo yêu cầu: đăng ký xong KHÔNG tự động đăng nhập.
// Bắt buộc quay lại trang Login, tự nhập lại email/password để vào được hệ thống.
async function register(req, res) {
  try {
    const { fullname, email, password, confirmPassword, redirect } = req.body;

    if (password !== confirmPassword) {
      return res.render('register', {
        activePage: 'register',
        redirect,
        error: 'Mật khẩu nhập lại không khớp.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      return res.render('register', {
        activePage: 'register',
        redirect,
        error: 'Email này đã được đăng ký.'
      });
    }

    await User.create({
      fullname,
      email: email.toLowerCase().trim(),
      password // tự hash nhờ pre('save') trong model User
    });

    // KHÔNG set req.session.userId ở đây nữa (bỏ auto-login)
    // Redirect sang trang Login, giữ nguyên "redirect" gốc (vd: /menu),
    // kèm ?registered=1 để login.hbs hiển thị thông báo thành công
    const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/';
    res.redirect(`/login?redirect=${encodeURIComponent(safeRedirect)}&registered=1`);

  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.render('register', {
      activePage: 'register',
      error: 'Có lỗi xảy ra, vui lòng thử lại.'
    });
  }
}

// ---------- POST /logout ----------
function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
}

module.exports = {
  showLoginPage,
  showRegisterPage,
  login,
  register,
  logout
};