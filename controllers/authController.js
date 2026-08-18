// ====== controllers/authController.js ======
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { sendOTPEmail } = require('../utils/mailer');

// ---------- GET /login ----------
function showLoginPage(req, res) {
  const redirect = req.query.redirect || '/';
  const justRegistered = req.query.registered === '1';
  const justReset = req.query.reset === '1';

  let successMessage = null;
  if (justRegistered) {
    successMessage = 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.';
  } else if (justReset) {
    successMessage = 'Đổi mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.';
  }

  res.render('auth', {
    layout: 'auth',
    activePage: 'login',
    mode: 'login',
    redirect,
    successMessage
  });
}

// ---------- GET /register ----------
function showRegisterPage(req, res) {
  const redirect = req.query.redirect || '/';
  res.render('auth', {
    layout: 'auth',
    activePage: 'register',
    mode: 'register',
    redirect
  });
}

// ---------- POST /login ----------
async function login(req, res) {
  try {
    const { email, password, redirect } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.render('auth', {
        layout: 'auth', mode: 'login', redirect,
        error: 'Email hoặc mật khẩu không đúng.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth', {
        layout: 'auth', mode: 'login', redirect,
        error: 'Email hoặc mật khẩu không đúng.'
      });
    }

    req.session.userId = user._id;
    req.session.userFullname = user.fullname;
    req.session.userRole = user.role;

    const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/';
    res.redirect(safeRedirect);

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.render('auth', {
      layout: 'auth', mode: 'login',
      error: 'Có lỗi xảy ra, vui lòng thử lại.'
    });
  }
}

// ---------- POST /register ----------
async function register(req, res) {
  try {
    const { fullname, email, password, confirmPassword, redirect } = req.body;

    if (password !== confirmPassword) {
      return res.render('auth', {
        layout: 'auth', mode: 'register', redirect,
        error: 'Mật khẩu nhập lại không khớp.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.render('auth', {
        layout: 'auth', mode: 'register', redirect,
        error: 'Email này đã được đăng ký.'
      });
    }

    await User.create({
      fullname,
      email: email.toLowerCase().trim(),
      password
    });

    const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/';
    res.redirect(`/login?redirect=${encodeURIComponent(safeRedirect)}&registered=1`);

  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.render('auth', {
      layout: 'auth', mode: 'register',
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

// ---------- Tạo mã OTP 6 số ----------
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ---------- GET /forgot-password ----------
function showForgotPasswordPage(req, res) {
  res.render('auth', {
    layout: 'auth',
    activePage: 'forgot-password',
    mode: 'forgot-password'
  });
}

// ---------- POST /forgot-password ----------
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Không tiết lộ email có tồn tại hay không (tránh user enumeration)
    const genericMessage = 'Nếu email tồn tại trong hệ thống, mã xác thực đã được gửi.';

    if (!user) {
      return res.render('auth', {
        layout: 'auth', mode: 'forgot-password',
        successMessage: genericMessage
      });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.resetOTP = hashedOTP;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // hết hạn sau 10 phút
    user.resetAttempts = 0;
    await user.save();

    await sendOTPEmail(normalizedEmail, otp);

    // Chuyển sang trang nhập OTP, giữ email để điền sẵn vào form ẩn
    return res.render('auth', {
      layout: 'auth', mode: 'reset-password',
      email: normalizedEmail,
      successMessage: genericMessage
    });

  } catch (error) {
    console.error('Lỗi quên mật khẩu:', error);
    res.render('auth', {
      layout: 'auth', mode: 'forgot-password',
      error: 'Có lỗi xảy ra, vui lòng thử lại.'
    });
  }
}

// ---------- GET /reset-password ----------
function showResetPasswordPage(req, res) {
  res.render('auth', {
    layout: 'auth',
    activePage: 'reset-password',
    mode: 'reset-password',
    email: req.query.email || ''
  });
}

// ---------- POST /reset-password ----------
async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (newPassword !== confirmNewPassword) {
      return res.render('auth', {
        layout: 'auth', mode: 'reset-password', email: normalizedEmail,
        error: 'Mật khẩu nhập lại không khớp.'
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.render('auth', {
        layout: 'auth', mode: 'reset-password', email: normalizedEmail,
        error: 'Mật khẩu mới phải từ 8 ký tự.'
      });
    }

    // .select('+resetOTP...') vì các field này có select: false trong schema
    const user = await User.findOne({ email: normalizedEmail })
      .select('+resetOTP +resetOTPExpires +resetAttempts');

    if (!user || !user.resetOTP || user.resetOTPExpires < Date.now()) {
      return res.render('auth', {
        layout: 'auth', mode: 'reset-password', email: normalizedEmail,
        error: 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
      });
    }

    // Chặn brute-force: tối đa 5 lần nhập sai
    if (user.resetAttempts >= 5) {
      return res.render('auth', {
        layout: 'auth', mode: 'reset-password', email: normalizedEmail,
        error: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.'
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetOTP);
    if (!isMatch) {
      user.resetAttempts += 1;
      await user.save();
      return res.render('auth', {
        layout: 'auth', mode: 'reset-password', email: normalizedEmail,
        error: 'Mã xác thực không đúng.'
      });
    }

    // QUAN TRỌNG: gán password PLAIN TEXT (giống hàm register() ở trên),
    // vì models/User.js chắc hẳn có pre('save') hook tự hash password.
    // Nếu tự bcrypt.hash() ở đây nữa sẽ bị double-hash -> login sẽ fail.
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    user.resetAttempts = 0;
    await user.save();

    return res.redirect('/login?reset=1');

  } catch (error) {
    console.error('Lỗi đổi mật khẩu:', error);
    res.render('auth', {
      layout: 'auth', mode: 'reset-password',
      error: 'Có lỗi xảy ra, vui lòng thử lại.'
    });
  }
}

module.exports = {
  showLoginPage, showRegisterPage, login, register, logout,
  showForgotPasswordPage, forgotPassword,
  showResetPasswordPage, resetPassword
};