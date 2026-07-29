require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { engine } = require('express-handlebars');
const connectDB = require('./config/db');
const { getCartQuantityByUserId } = require('./controllers/cartController');

const app = express();

// ====== Kết nối MongoDB ======
connectDB();

// ====== Middleware cơ bản ======
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // đọc được dữ liệu từ <form method="POST">
app.use(express.static(path.join(__dirname, 'public')));

// ====== Session (lưu vào MongoDB qua connect-mongo, không mất khi restart) ======
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 ngày
    }
  })
);

// ====== Handlebars ======
app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    eq: (a, b) => a === b,
    gt: (a, b) => a > b
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views/pages'));

// ====== Middleware toàn cục: gắn thông tin user + số lượng giỏ hàng vào mọi view ======
// Nhờ middleware này, header.hbs (partial dùng chung) luôn có {{isLoggedIn}} và {{cartCount}}
// mà KHÔNG cần mỗi route phải tự truyền vào res.render()
app.use(async (req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.userFullname = req.session.userFullname || null;
  res.locals.cartCount = await getCartQuantityByUserId(req.session.userId);
  next();
});

// ====== Routes trang (view) ======
app.get('/', (req, res) => res.render('index', { activePage: 'home' }));
app.get('/menu', (req, res) => res.render('menu', { activePage: 'menu' }));
app.get('/about', (req, res) => res.render('about', { activePage: 'about' }));
app.get('/contact', (req, res) => res.render('contact', { activePage: 'contact' }));
// ⚠️ Route '/cart' KHÔNG khai báo ở đây - đã chuyển vào routes/cartRoutes.js
// để dùng dữ liệu thật từ MongoDB (cartController.showCartPage) thay vì HTML tĩnh

// ====== Routes auth (login/register/logout) ======
const authRoutes = require('./routes/authRoutes');
app.use(authRoutes);

// ====== Routes cart (trang /cart, add, update, remove, api/cart) ======
const cartRoutes = require('./routes/cartRoutes');
app.use(cartRoutes);

// ====== Routes checkout ======
const checkoutRoutes = require('./routes/checkout');
app.use(checkoutRoutes);

// ====== 404 Handler (luôn đặt CUỐI CÙNG, sau mọi route khác) ======
app.use((req, res) => {
  res.status(404).render('404', { activePage: '' });
});

// ====== Start server ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));