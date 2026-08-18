// ====== middleware/admin.js ======

/**
 * Middleware kiểm tra người dùng có role 'admin' không.
 * PHẢI dùng SAU middleware isAuthenticated (cần req.session.userId đã tồn tại).
 */
function isAdmin(req, res, next) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }

  // Không phải admin (kể cả khi đã đăng nhập với role customer) -> chặn truy cập
  return res.status(403).render('403', {
    activePage: '',
    message: 'Bạn không có quyền truy cập trang này.'
  });
}

module.exports = { isAdmin };