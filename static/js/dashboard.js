// static/js/dashboard.js (debug version)
(function () {
  const donutEl = document.getElementById("donutChart");
  const barEl = document.getElementById("barChart");
  const legendEl = document.getElementById("legend");
  const msgEl = document.getElementById("chart-message");

  function showMsg(text) {
    if (msgEl) msgEl.textContent = text;
  }

  if (!donutEl || !barEl) {
    console.warn("Chart canvas elements not found.");
    showMsg("Chart canvas not found on the page.");
    return;
  }

  console.log("Starting chart loader...");

  fetch("/api/summary")
    .then(r => {
      console.log("API response status:", r.status, r.statusText);
      if (!r.ok) throw new Error("Network response not ok: " + r.status);
      return r.json();
    })
    .then(data => {
      console.log("API /api/summary returned:", data);
      if (!Array.isArray(data) || data.length === 0) {
        showMsg("No expense data available yet. Add some expenses and refresh this page.");
        // draw empty placeholders
        const c1 = donutEl.getContext("2d");
        c1.font = "14px sans-serif";
        c1.fillText("No data to display", 40, 120);
        const c2 = barEl.getContext("2d");
        c2.font = "14px sans-serif";
        c2.fillText("No data to display", 20, 100);
        return;
      }

      // proceed to draw charts
      showMsg(""); // clear message
      const labels = data.map(d => d.category);
      const values = data.map(d => Number(d.value || 0));
      console.log("Labels:", labels, "Values:", values);

      // colors
      const PALETTE = [
        "rgba(16,185,129,0.85)",
        "rgba(59,130,246,0.85)",
        "rgba(234,88,12,0.85)",
        "rgba(168,85,247,0.85)",
        "rgba(244,114,182,0.85)",
        "rgba(250,204,21,0.85)"
      ];
      const bg = labels.map((_, i) => PALETTE[i % PALETTE.length]);
      const border = bg.map(c => c.replace("0.85", "1"));

      // legend
      legendEl.innerHTML = "";
      data.forEach((d, i) => {
        const item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "8px";

        const dot = document.createElement("span");
        dot.style.width = "12px";
        dot.style.height = "12px";
        dot.style.borderRadius = "50%";
        dot.style.background = bg[i];
        dot.style.display = "inline-block";

        const text = document.createElement("span");
        text.textContent = `${d.category} — ${Number(d.value).toFixed(2)}`;

        item.appendChild(dot);
        item.appendChild(text);
        legendEl.appendChild(item);
      });

      // create charts
      try {
        new Chart(donutEl.getContext("2d"), {
          type: "doughnut",
          data: { labels, datasets: [{ data: values, backgroundColor: bg, borderColor: border, borderWidth: 1 }] },
          options: { responsive: true, plugins: { legend: { display: false } } }
        });

        new Chart(barEl.getContext("2d"), {
          type: "bar",
          data: { labels, datasets: [{ label: "Total", data: values, backgroundColor: bg, borderColor: border, borderWidth: 1 }] },
          options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });

        console.log("Charts drawn successfully.");
      } catch (e) {
        console.error("Error drawing charts:", e);
        showMsg("Error drawing charts — open browser console for details.");
      }
    })
    .catch(err => {
      console.error("Fetch or JSON error:", err);
      showMsg("Error fetching chart data — check server logs and /api/summary.");
      const c1 = donutEl.getContext("2d");
      c1.clearRect(0,0,donutEl.width, donutEl.height);
      c1.font = "14px sans-serif";
      c1.fillText("Error loading chart", 20, 120);
    });
})();
