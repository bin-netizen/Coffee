document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('dark-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      // Lưu trạng thái vào localStorage
      if (document.body.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
        toggleBtn.textContent = '☀️';
      } else {
        localStorage.setItem('theme', 'light');
        toggleBtn.textContent = '🌙';
      }
    });

    // Load trạng thái từ localStorage
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark');
      toggleBtn.textContent = '☀️';
    }
  }
});
