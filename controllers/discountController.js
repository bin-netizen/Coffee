const DiscountCode = require('../models/DiscountCode');

exports.listDiscounts = async (req, res) => {
  const discounts = await DiscountCode.find().sort({ createdAt: -1 }).lean();
  res.render('admin/discounts', {
    layout: 'admin',
    activeAdminPage: 'discounts',
    discounts,
  });
};

exports.createDiscount = async (req, res) => {
  const { code, discountType, discountValue, maxDiscountAmount, usageLimit, minOrderValue, expiryDate } = req.body;

  const value = Number(discountValue);

  // Validate: percent chỉ được từ 1-100, chặn cả trường hợp gọi thẳng API bỏ qua form
  if (discountType === 'percent' && (value < 1 || value > 100)) {
    return res.redirect('/admin/discounts?error=percent_invalid');
  }

  // maxDiscountAmount là TÙY CHỌN — để trống nghĩa là không giới hạn trần
  const hasMaxAmount = maxDiscountAmount && Number(maxDiscountAmount) > 0;

  // Chuẩn hoá ngày hết hạn: input type="date" gửi lên dạng "yyyy-mm-dd" (không có giờ).
  // new Date("yyyy-mm-dd") mặc định parse theo UTC nửa đêm -> quy đổi giờ VN (UTC+7)
  // thành 7h SÁNG cùng ngày, khiến mã bị coi là hết hạn ngay từ sáng sớm ngày đó
  // thay vì còn hiệu lực trọn ngày. Cần tự parse theo giờ địa phương rồi đẩy về
  // cuối ngày (23:59:59.999) để mã dùng được đến hết ngày admin đã chọn.
  const [year, month, day] = expiryDate.split('-').map(Number);
  const endOfDayExpiry = new Date(year, month - 1, day, 23, 59, 59, 999);

  await DiscountCode.create({
    code,
    discountType,
    discountValue: value,
    maxDiscountAmount: discountType === 'percent' && hasMaxAmount ? Number(maxDiscountAmount) : null,
    usageLimit,
    minOrderValue,
    expiryDate: endOfDayExpiry,
  });

  res.redirect('/admin/discounts');
};

exports.toggleActive = async (req, res) => {
  const discount = await DiscountCode.findById(req.params.id);
  discount.isActive = !discount.isActive;
  await discount.save();
  res.redirect('/admin/discounts');
};

exports.deleteDiscount = async (req, res) => {
  await DiscountCode.findByIdAndDelete(req.params.id);
  res.redirect('/admin/discounts');
};