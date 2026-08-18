// public/js/admin-revenue.js
(function () {
  const WEEKDAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  let chartInstance = null;
  let currentRange = '7d';

  function formatVND(amount) {
    return Math.round(amount).toLocaleString('vi-VN') + 'đ';
  }

  function formatAxisDate(dateStr, range) {
    const d = new Date(dateStr + 'T00:00:00');
    if (range === '7d' || range === 'today') return WEEKDAY_VN[d.getDay()];
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  // Đọc đúng màu thật từ Tailwind class có sẵn (brown/accent) thay vì hard-code
  // hex sai lệch với theme — nếu bạn đổi màu trong tailwind.config, chart tự khớp theo.
  function getThemeColor(className) {
    const probe = document.createElement('div');
    probe.className = className;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  }

  async function fetchRevenue(range) {
    const res = await fetch(`/admin/api/revenue?range=${range}`);
    if (!res.ok) throw new Error('Fetch revenue failed');
    return res.json();
  }

  function renderSummary(data) {
    const totalEl = document.getElementById('revenue-total');
    const trendEl = document.getElementById('revenue-trend');
    totalEl.textContent = formatVND(data.totalRevenue);

    if (data.percentChange === null || data.percentChange === undefined) {
      trendEl.textContent = 'Chưa có dữ liệu so sánh';
      trendEl.className = 'text-xs text-cream/60 mt-1';
    } else {
      const up = data.percentChange > 0;
      const down = data.percentChange < 0;
      const arrow = up ? '↑' : down ? '↓' : '→';
      trendEl.textContent = `${arrow} ${Math.abs(data.percentChange)}% so với kỳ trước`;
      trendEl.className = `text-xs mt-1 ${up ? 'text-green-300' : down ? 'text-red-300' : 'text-cream/60'}`;
    }
  }

  function renderChart(data, range) {
    const canvas = document.getElementById('revenue-chart');
    const emptyState = document.getElementById('revenue-empty');
    const isEmpty = data.series.every((d) => d.revenue === 0);

    if (isEmpty) {
      canvas.style.display = 'none';
      emptyState.style.display = 'flex';
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
      return;
    }
    canvas.style.display = 'block';
    emptyState.style.display = 'none';

    const todayStr = new Date().toISOString().slice(0, 10);
    const accentColor = getThemeColor('text-accent');
    const brownColor = getThemeColor('text-brown');
    const greenColor = '#22c55e';
    const redColor = '#ef4444';

    const labels = data.series.map((d) => formatAxisDate(d.date, range));
    const values = data.series.map((d) => d.revenue);
    const colors = data.series.map((d, index) => {
      if (d.date === todayStr) return brownColor;
      if (index === 0) return accentColor;
      const prevValue = values[index - 1];
      if (d.revenue > prevValue) return greenColor;
      if (d.revenue < prevValue) return redColor;
      return accentColor;
    });

    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#c8a27a',
          backgroundColor: 'rgba(200, 162, 122, 0.14)',
          pointBackgroundColor: colors,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 6,
          borderWidth: 3,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `${items[0].label}`,
              label: (ctx) => `Doanh thu: ${formatVND(ctx.parsed.y)}`
            }
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { callback: (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v) }
          }
        }
      },
    });
  }

  async function loadRange(range) {
    currentRange = range;
    document.querySelectorAll('.revenue-range-btn').forEach((btn) => {
      const active = btn.dataset.range === range;
      btn.classList.toggle('bg-white', active);
      btn.classList.toggle('shadow-sm', active);
      btn.classList.toggle('font-medium', active);
      btn.classList.toggle('text-brown', active);
      btn.classList.toggle('text-gray-500', !active);
    });
    try {
      const data = await fetchRevenue(range);
      renderSummary(data);
      renderChart(data, range);
    } catch (err) {
      console.error('[admin-revenue] fetch failed:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.revenue-range-btn').forEach((btn) => {
      btn.addEventListener('click', () => loadRange(btn.dataset.range));
    });
    loadRange(currentRange);
  });
})();