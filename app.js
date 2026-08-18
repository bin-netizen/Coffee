require('dotenv').config();

const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { engine } = require('express-handlebars');
const connectDB = require('./config/db');
const { getCartQuantityByUserId } = require('./controllers/cartController');
const { showMenuPage } = require('./controllers/menuController');
require('./jobs/closeDailyRevenue');

const app = express();

(async () => {
  const connected = await connectDB();
  if (!connected) {
    console.log('⚠️ Server starting in degraded mode because MongoDB Atlas is unreachable.');
  }
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ====== Khởi tạo session store ======
let sessionStore;

if (process.env.MONGO_URI) {
  try {
    sessionStore = MongoStore.create({ mongoUrl: process.env.MONGO_URI });
  } catch (error) {
    console.error('⚠️ Mongo session store failed to initialize, falling back to memory store:', error.message);
  }
}

if (!sessionStore) {
  const MemoryStore = session.MemoryStore || require('express-session').MemoryStore;
  sessionStore = new MemoryStore();
  console.log('⚠️ Using in-memory session store as fallback.');
}

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

app.engine('hbs', engine({
  extname: 'hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    eq: function (a, b, options) {
      if (options && typeof options.fn === 'function') {
        return a === b ? options.fn(this) : options.inverse(this);
      }
      return a === b;
    },
    gt: function (a, b, options) {
      if (options && typeof options.fn === 'function') {
        return a > b ? options.fn(this) : options.inverse(this);
      }
      return a > b;
    },
    formatVND: (amount) => {
      const num = Number(amount);
      if (isNaN(num)) return '0₫';
      return num.toLocaleString('vi-VN') + '₫';
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views/pages'));

// ====== Middleware toàn cục ======
app.use(async (req, res, next) => {
  res.locals.isLoggedIn = !!req.session.userId;
  res.locals.userFullname = req.session.userFullname || null;
  res.locals.isAdmin = req.session.userRole === 'admin';
  res.locals.cartCount = await getCartQuantityByUserId(req.session.userId);
  next();
});

// ====== Routes ======
app.get('/', (req, res) => res.render('index', { activePage: 'home' }));
app.get('/menu', showMenuPage);
app.get('/about', (req, res) => res.render('about', { activePage: 'about' }));
app.get('/contact', (req, res) => res.render('contact', { activePage: 'contact' }));

app.use(require('./routes/authRoutes'));
app.use(require('./routes/cartRoutes'));
app.use(require('./routes/orderRoutes'));
app.use(require('./routes/checkout'));
app.use(require('./routes/contactRoutes'));
app.use(require('./routes/chatRoutes'));
app.use(require('./routes/adminRoutes'));

// ====== 404 Handler ======
app.use((req, res) => {
  res.status(404).render('404', { activePage: '' });
});

// ====== Khởi tạo server HTTP + Socket.io ======
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);

// Parse cookies từ header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      if (parts[0] && parts[1]) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  return cookies;
}

// Decode express-session cookie (format: s:payload.signature)
function decodeSessionId(cookieValue) {
  if (!cookieValue) return null;
  // Express-session format: "s:payload.signature"
  // We need to extract just the payload part
  if (cookieValue.startsWith('s:')) {
    return cookieValue.slice(2).split('.')[0];
  }
  return cookieValue;
}

// Socket.io middleware để lấy session từ sessionStore
io.use((socket, next) => {
  const req = socket.request;
  const cookies = parseCookies(req.headers.cookie || '');
  const rawSessionId = cookies['connect.sid'];

  if (!rawSessionId) {
    console.log('[Socket.io] ⚠️ Không tìm thấy session ID trong cookie');
    return next(new Error('No session ID'));
  }

  // Decode express-session format
  const sessionId = decodeSessionId(rawSessionId);
  console.log('[Socket.io] 🔍 Raw cookie:', rawSessionId.substring(0, 30) + '...');
  console.log('[Socket.io] 🔑 Decoded sessionId:', sessionId);

  sessionStore.get(sessionId, (err, sessionData) => {
    if (err) {
      console.error('[Socket.io] ❌ Lỗi lấy session từ store:', err);
      return next(new Error('Session store error'));
    }
    if (!sessionData) {
      console.log('[Socket.io] ⚠️ Session không tồn tại cho ID:', sessionId);
      // Thử lại với raw ID
      return sessionStore.get(rawSessionId, (err2, sessionData2) => {
        if (err2 || !sessionData2) {
          console.log('[Socket.io] ❌ Không tìm được session với cả hai format');
          return next(new Error('Session not found'));
        }
        console.log('[Socket.io] ✅ Session tìm thấy (raw), userId:', sessionData2.userId);
        socket.userId = sessionData2.userId;
        socket.userRole = sessionData2.userRole;
        socket.userFullname = sessionData2.userFullname;
        socket.handshake.auth = {
          userId: sessionData2.userId,
          userRole: sessionData2.userRole,
          userFullname: sessionData2.userFullname
        };
        return next();
      });
    }
    
    console.log('[Socket.io] ✅ Session tìm thấy, userId:', sessionData.userId);
    socket.userId = sessionData.userId;
    socket.userRole = sessionData.userRole;
    socket.userFullname = sessionData.userFullname;
    socket.handshake.auth = {
      userId: sessionData.userId,
      userRole: sessionData.userRole,
      userFullname: sessionData.userFullname
    };
    
    return next();
  });
});

// Import và khởi tạo chat socket
const { initChatSocket } = require('./socket/chatSocket');
initChatSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// ====== Graceful shutdown ======
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Nhận tín hiệu ${signal} — đang dọn dẹp session...`);

  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.collection('sessions').deleteMany({});
      console.log('✅ Đã xóa toàn bộ session — user/admin sẽ phải đăng nhập lại.');
    }
  } catch (err) {
    console.error('❌ Lỗi khi xóa session:', err.message);
  } finally {
    server.close(() => {
      console.log('👋 Server đã tắt hoàn toàn.');
      process.exit(0);
    });
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
