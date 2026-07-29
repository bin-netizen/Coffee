// ====== middleware/auth.js ======

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }

  const isApiRequest =
    req.xhr ||
    req.headers.accept === 'application/json' ||
    req.headers['content-type'] === 'application/json';

  // ⚠️ QUAN TRỌNG:
  // Với request gọi từ fetch (ví dụ POST /cart/add), req.originalUrl là chính API
  // endpoint đó (/cart/add) - route này CHỈ có POST, không có GET.
  // Nếu dùng /cart/add làm redirect, sau khi login xong trình duyệt sẽ GET
  // /cart/add -> không khớp route nào -> 404.
  //
  // Giải pháp: với API request, lấy trang ĐÃ GỌI request này (header Referer,
  // ví dụ /menu) làm điểm quay lại, thay vì chính API endpoint.
  let targetUrl = req.originalUrl;

  if (isApiRequest) {
    const referer = req.get('Referer');
    if (referer) {
      try {
        targetUrl = new URL(referer).pathname; // ví dụ: /menu
      } catch (e) {
        targetUrl = '/';
      }
    } else {
      targetUrl = '/';
    }
  }

  const redirectUrl = `/login?redirect=${encodeURIComponent(targetUrl)}`;

  if (isApiRequest) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục.',
      redirectUrl
    });
  }

  return res.redirect(redirectUrl);
}

module.exports = { isAuthenticated };