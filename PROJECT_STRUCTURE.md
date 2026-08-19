# CoffeeWeb — Project Structure

> File này mô tả cấu trúc thư mục của project để cung cấp ngữ cảnh cho AI assistant
> ở các cuộc trò chuyện mới. Cập nhật file này mỗi khi thêm/xóa/đổi tên file.

## Tech stack
- Backend: Node.js + Express
- View engine: Handlebars (.hbs)
- Database: MongoDB (Mongoose — dựa trên các file trong `models/`)
- Có hệ thống admin riêng (layout, controller, middleware riêng)

## Cấu trúc thư mục

```
COFFEEWEB/
│
├── .vscode/
│   └── settings.json
│
├── config/
│   ├── db.js
│   └── products.js
│
├── controllers/
│   ├── adminController.js
│   ├── authController.js
│   ├── cartController.js
│   ├── chatController.js
│   ├── contactController.js
│   ├── discountController.js
│   ├── menuController.js
│   ├── orderController.js
│   ├── productController.js
│   ├── revenueController.js
│   └── toppingController.js
│
├── jobs/
│   └── closeDailyRevenue.js
│
├── middleware/
│   ├── admin.js
│   └── auth.js
│
├── models/
│   ├── Cart.js
│   ├── ContactMessage.js
│   ├── DailyRevenue.js
│   ├── DiscountCode.js
│   ├── JobLock.js
│   ├── Message.js
│   ├── Order.js
│   ├── Product.js
│   ├── Topping.js
│   └── User.js
│
├── node_modules/
│
├── public/
│   ├── img/
│   │
│   ├── models/
│   │   └── coffee_bean.glb
│   │
│   └── test-3d.html
│
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   ├── chatRoutes.js
│   ├── checkout.js
│   ├── contactRoutes.js
│   ├── index.js
│   ├── orderRoutes.js
│   └── products.js
│
├── scripts/
│   ├── createAdmin.js
│   └── seedProducts.js
│
├── services/
│   └── revenueService.js
│
├── socket/
│   └── chatSocket.js
│
├── utils/
│   ├── dateVN.js
│   └── mailer.js
│
├── views/
│   ├── layouts/
│   │   ├── admin.hbs
│   │   ├── auth.hbs
│   │   └── main.hbs
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── chat.hbs
│   │   │   ├── dashboard.hbs
│   │   │   ├── discounts.hbs
│   │   │   ├── messages.hbs
│   │   │   ├── orders.hbs
│   │   │   ├── product-form.hbs
│   │   │   ├── products.hbs
│   │   │   ├── toppings.hbs
│   │   │   └── users.hbs
│   │   │
│   │   ├── 403.hbs
│   │   ├── 404.hbs
│   │   ├── about.hbs
│   │   ├── auth.hbs
│   │   ├── cart.hbs
│   │   ├── contact.hbs
│   │   ├── index.hbs
│   │   ├── menu.hbs
│   │   ├── orders.hbs
│   │   └── product.hbs
│   │
│   └── partials/
│       ├── chatWidget.hbs
│       ├── footer.hbs
│       └── header.hbs
│
├── .env
├── .gitignore
├── app.js
├── package-lock.json
├── package.json
├── PROJECT_STRUCTURE.md
└── README.md