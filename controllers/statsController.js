// ====== controllers/statsController.js ======
const Order = require('../models/Order');
const Product = require('../models/Product');
const Topping = require('../models/Topping');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7, Việt Nam không có DST

// Tính mốc 00:00:00 -> 23:59:59.999 theo giờ Việt Nam, quy đổi ra UTC để query MongoDB.
// Dùng thuần Date.UTC()/getUTC*() để KHÔNG phụ thuộc timezone thật của server (Render chạy UTC),
// tránh đúng lỗi "đơn 00:30 VN bị tính nhầm sang ngày hôm trước".
function getVietnamDayRangeUTC(now = new Date()) {
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS); // dịch "đồng hồ" sang giờ VN
  const y = vnNow.getUTCFullYear();
  const m = vnNow.getUTCMonth();
  const d = vnNow.getUTCDate();

  // 00:00:00 giờ VN của ngày (y,m,d) = (00:00:00 UTC của ngày đó) - 7h
  const startUTC = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - VN_OFFSET_MS);
  const endUTC = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - VN_OFFSET_MS);

  const label = `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
  return { startUTC, endUTC, label };
}

async function showDailyStats(req, res) {
  try {
    const { startUTC, endUTC, label } = getVietnamDayRangeUTC();

    // Chỉ tính đơn 'completed' — đồng bộ đúng logic đang dùng để tính doanh thu
    // ở adminController.showDashboard, không tự tạo trạng thái mới.
    const match = {
      status: 'completed',
      createdAt: { $gte: startUTC, $lte: endUTC }
    };

    const [productAgg, toppingAgg, products, toppings] = await Promise.all([
      // Gom số lượng bán theo từng (productId, size)
      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
          $group: {
            _id: { productId: '$items.productId', size: '$items.size' },
            quantity: { $sum: '$items.quantity' }
          }
        }
      ]),
      // Gom số lượng topping đã bán (mỗi item có topping X -> topping X +quantity của item đó)
      Order.aggregate([
        { $match: match },
        { $unwind: '$items' },
        { $unwind: '$items.toppings' },
        {
          $group: {
            _id: '$items.toppings.toppingId',
            quantity: { $sum: '$items.quantity' }
          }
        }
      ]),
      Product.find({ isActive: true }).sort({ category: 1, name: 1 }).lean(),
      Topping.find({ isActive: true }).sort({ name: 1 }).lean()
    ]);

    // Map: productId (slug) -> { S, M, L, noSize }
    const productSizeMap = {};
    for (const row of productAgg) {
      const pid = row._id.productId;
      if (!pid) continue; // đơn hàng cũ trước khi có field productId -> không thống kê được theo món
      const size = row._id.size;

      if (!productSizeMap[pid]) productSizeMap[pid] = { S: 0, M: 0, L: 0, noSize: 0 };

      if (size === 'S' || size === 'M' || size === 'L') {
        productSizeMap[pid][size] += row.quantity;
      } else {
        productSizeMap[pid].noSize += row.quantity; // dessert: không có size
      }
    }

    let totalCups = 0;
    let sizeS = 0, sizeM = 0, sizeL = 0;

    // Lấy TOÀN BỘ sản phẩm đang active trong Menu -> sản phẩm nào không bán = 0, không bỏ sót
    const productStats = products.map((p) => {
      const stat = productSizeMap[p.productId] || { S: 0, M: 0, L: 0, noSize: 0 };
      const isDrink = p.category !== 'dessert';
      const total = isDrink ? (stat.S + stat.M + stat.L) : stat.noSize;

      if (isDrink) {
        totalCups += total;
        sizeS += stat.S;
        sizeM += stat.M;
        sizeL += stat.L;
      }

      return {
        name: p.name,
        category: p.category,
        isDrink,
        S: isDrink ? stat.S : null,
        M: isDrink ? stat.M : null,
        L: isDrink ? stat.L : null,
        total
      };
    });

    // Map: toppingId (string) -> quantity
    const toppingCountMap = {};
    for (const row of toppingAgg) {
      if (!row._id) continue;
      toppingCountMap[row._id.toString()] = row.quantity;
    }

    let totalToppings = 0;
    // Lấy TOÀN BỘ topping đang active -> topping nào không bán = 0
    const toppingStats = toppings.map((t) => {
      const qty = toppingCountMap[t._id.toString()] || 0;
      totalToppings += qty;
      return { name: t.name, quantity: qty };
    });

    res.render('admin/stats', {
      layout: 'admin',
      activeAdminPage: 'stats',
      dateLabel: label,
      totalCups,
      sizeS,
      sizeM,
      sizeL,
      totalToppings,
      productStats,
      toppingStats
    });

  } catch (error) {
    console.error('Lỗi thống kê bán hàng theo ngày:', error);
    res.render('admin/stats', {
      layout: 'admin',
      activeAdminPage: 'stats',
      dateLabel: '',
      totalCups: 0,
      sizeS: 0,
      sizeM: 0,
      sizeL: 0,
      totalToppings: 0,
      productStats: [],
      toppingStats: [],
      error: 'Có lỗi xảy ra khi tải thống kê, vui lòng thử lại.'
    });
  }
}

module.exports = { showDailyStats };