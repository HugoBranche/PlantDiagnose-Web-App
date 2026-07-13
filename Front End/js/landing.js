document.addEventListener("DOMContentLoaded", () => {
  const nav = document.getElementById("landingNav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });

  const toggle = document.getElementById("mobileToggle");
  const menu = document.getElementById("mobileMenu");
  toggle.addEventListener("click", () => menu.classList.toggle("open"));
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));

  const diseases = [
    "Early Blight", "Powdery Mildew", "Leaf Spot", "Apple Scab",
    "Bacterial Spot", "Rust", "Black Spot", "Downy Mildew",
    "Root Rot", "Mosaic Virus", "Fire Blight", "Canker",
  ];
  const shieldIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  const track = document.getElementById("marqueeTrack");
  [...diseases, ...diseases].forEach((d) => {
    const pill = document.createElement("div");
    pill.className = "marquee-pill";
    pill.innerHTML = shieldIcon + d;
    track.appendChild(pill);
  });
});
