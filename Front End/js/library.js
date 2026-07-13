/* Plant Diseases Library — 6-disease dataset. Images are real symptom
   photos sourced from university extension services (NC State, UW-Madison),
   not generic stock photos, so they actually match the disease shown. */

const diseases = [
  {
    id: 1, name: "Early Blight", scientificName: "Alternaria solani", category: "Fungal",
    affectedPlants: ["Tomato", "Potato", "Pepper"], severity: "Moderate",
    image: "https://content.ces.ncsu.edu/media/images/IMG_1302.jpeg",
    imageCredit: "Inga Meadows, NC State Extension",
    description: "A common fungal disease that affects tomatoes and potatoes, causing dark spots with concentric rings on leaves.",
    symptoms: ["Dark spots on older leaves", "Concentric rings pattern", "Yellow halos around spots", "Premature leaf drop"],
    treatment: ["Remove infected leaves", "Apply copper-based fungicide", "Improve air circulation", "Water at soil level"],
    prevention: ["Crop rotation", "Resistant varieties", "Proper spacing", "Mulching"],
  },
  {
    id: 2, name: "Powdery Mildew", scientificName: "Erysiphe cichoracearum", category: "Fungal",
    affectedPlants: ["Cucumber", "Squash", "Pumpkin", "Rose"], severity: "Mild",
    image: "https://content.ces.ncsu.edu/media/images/IMG_0702.jpg",
    imageCredit: "Dr. Lina Quesada, NC State Vegetable Pathology Lab",
    description: "A fungal disease characterized by white powdery spots on leaves and stems.",
    symptoms: ["White powdery coating", "Distorted leaves", "Stunted growth", "Reduced yield"],
    treatment: ["Neem oil spray", "Baking soda solution", "Remove infected parts", "Improve ventilation"],
    prevention: ["Adequate spacing", "Avoid overhead watering", "Good air circulation", "Regular monitoring"],
  },
  {
    id: 3, name: "Black Spot", scientificName: "Diplocarpon rosae", category: "Fungal",
    affectedPlants: ["Rose"], severity: "Severe",
    image: "https://hort.extension.wisc.edu/files/2014/11/Black-Spot.png",
    imageCredit: "UW-Madison Plant Disease Diagnostics Clinic",
    description: "A serious fungal disease that primarily affects roses, causing black spots and yellowing leaves.",
    symptoms: ["Black circular spots", "Yellow leaves", "Premature defoliation", "Weakened plants"],
    treatment: ["Fungicide application", "Remove infected leaves", "Prune affected areas", "Sanitize tools"],
    prevention: ["Disease-resistant varieties", "Good air flow", "Avoid wetting foliage", "Fall cleanup"],
  },
  {
    id: 4, name: "Bacterial Spot", scientificName: "Xanthomonas campestris", category: "Bacterial",
    affectedPlants: ["Pepper", "Tomato"], severity: "Moderate",
    image: "https://content.ces.ncsu.edu/media/images/spot_3.jpeg",
    imageCredit: "Erin Eure, NC State Extension",
    description: "A bacterial disease causing small dark spots on leaves and fruit.",
    symptoms: ["Small dark spots", "Water-soaked lesions", "Leaf drop", "Fruit lesions"],
    treatment: ["Copper sprays", "Remove infected plants", "Sanitize equipment", "Avoid overhead irrigation"],
    prevention: ["Use certified seeds", "Crop rotation", "Resistant varieties", "Drip irrigation"],
  },
  {
    id: 5, name: "Downy Mildew", scientificName: "Peronospora destructor", category: "Fungal",
    affectedPlants: ["Lettuce", "Spinach", "Cucumber"], severity: "Mild",
    image: "https://content.ces.ncsu.edu/media/images/Downy_mildew_cucumber2.JPG",
    imageCredit: "Dr. Lina Quesada, NC State Vegetable Pathology Lab",
    description: "A fungal-like disease causing yellowing and downy growth on leaf undersides.",
    symptoms: ["Yellow patches on leaves", "Fuzzy growth underneath", "Stunted growth", "Leaf curling"],
    treatment: ["Fungicide application", "Remove infected plants", "Improve drainage", "Reduce humidity"],
    prevention: ["Resistant varieties", "Proper spacing", "Avoid wet foliage", "Good ventilation"],
  },
  {
    id: 6, name: "Root Rot", scientificName: "Phytophthora spp.", category: "Fungal",
    affectedPlants: ["Various"], severity: "Severe",
    image: "https://content.ces.ncsu.edu/media/images/Pansy%20Phytophthora.jpg",
    imageCredit: "NCSU Plant Disease and Insect Clinic",
    description: "A serious soil-borne disease affecting plant roots and causing wilting.",
    symptoms: ["Wilting despite watering", "Brown mushy roots", "Yellowing leaves", "Plant death"],
    treatment: ["Improve drainage", "Reduce watering", "Remove infected plants", "Soil treatment"],
    prevention: ["Well-draining soil", "Proper watering", "Avoid overwatering", "Sterilized containers"],
  },
];

let activeCategory = "all";
const searchInput = document.getElementById("searchInput");
const grid = document.getElementById("diseaseGrid");
const emptyState = document.getElementById("libraryEmpty");

function severityBadgeClass(sev) {
  switch (sev.toLowerCase()) {
    case "mild": return "badge-green";
    case "moderate": return "badge-orange";
    case "severe": return "badge-red";
    default: return "badge-gray";
  }
}

function render() {
  const q = (searchInput.value || "").toLowerCase();
  const filtered = diseases.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(q) ||
      d.scientificName.toLowerCase().includes(q) ||
      d.affectedPlants.some((p) => p.toLowerCase().includes(q));
    const matchesCategory = activeCategory === "all" || d.category.toLowerCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  document.getElementById("statTotal").textContent = diseases.length;
  document.getElementById("statFungal").textContent = diseases.filter((d) => d.category === "Fungal").length;
  document.getElementById("statBacterial").textContent = diseases.filter((d) => d.category === "Bacterial").length;
  document.getElementById("statSevere").textContent = diseases.filter((d) => d.severity === "Severe").length;

  grid.innerHTML = "";
  emptyState.classList.toggle("hidden", filtered.length !== 0);

  filtered.forEach((d) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";
    card.style.overflow = "hidden";
    card.innerHTML = `
      <img src="${d.image}" alt="${d.name}" style="width:100%;height:12rem;object-fit:cover">
      <p class="text-xs text-muted" style="padding:0.25rem 1rem 0">Photo: ${d.imageCredit}</p>
      <div class="card-header">
        <div class="flex items-center justify-between" style="align-items:flex-start">
          <div>
            <div class="card-title">${d.name}</div>
            <div class="card-description" style="font-style:italic">${d.scientificName}</div>
          </div>
          <span class="badge ${severityBadgeClass(d.severity)}">${d.severity}</span>
        </div>
      </div>
      <div class="card-content">
        <p class="text-sm font-medium mb-1">Category</p>
        <span class="badge badge-outline">${d.category}</span>
        <p class="text-sm font-medium mt-3 mb-1">Affected Plants</p>
        <div class="flex gap-1" style="flex-wrap:wrap">
          ${d.affectedPlants.map((p) => `<span class="badge badge-gray text-xs">${p}</span>`).join("")}
        </div>
      </div>
    `;
    card.addEventListener("click", () => showDetail(d));
    grid.appendChild(card);
  });
}

function showDetail(d) {
  document.getElementById("modalTitle").textContent = d.name;
  document.getElementById("modalSub").textContent = d.scientificName;
  document.getElementById("modalBody").innerHTML = `
    <img src="${d.image}" alt="${d.name}" style="width:100%;height:16rem;object-fit:cover;border-radius:var(--radius);margin-bottom:0.25rem">
    <p class="text-xs text-muted mb-4">Photo: ${d.imageCredit}</p>
    <div class="flex gap-2 mb-4">
      <span class="badge ${severityBadgeClass(d.severity)}">${d.severity}</span>
      <span class="badge badge-outline">${d.category}</span>
    </div>
    <h4 class="font-semibold mb-1">Description</h4>
    <p class="text-sm text-muted mb-4">${d.description}</p>
    <h4 class="font-semibold mb-1">Affected Plants</h4>
    <div class="flex gap-2 mb-4" style="flex-wrap:wrap">${d.affectedPlants.map((p) => `<span class="badge badge-gray">${p}</span>`).join("")}</div>
    <h4 class="font-semibold mb-1">Symptoms</h4>
    <ul class="plain dot mb-4">${d.symptoms.map((s) => `<li>${s}</li>`).join("")}</ul>
    <h4 class="font-semibold mb-1">Treatment</h4>
    <ul class="plain dot mb-4">${d.treatment.map((s) => `<li>${s}</li>`).join("")}</ul>
    <h4 class="font-semibold mb-1">Prevention</h4>
    <ul class="plain dot">${d.prevention.map((s) => `<li>${s}</li>`).join("")}</ul>
  `;
  openModal("diseaseModal");
}

document.querySelectorAll("#categoryTabs .tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#categoryTabs .tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCategory = btn.dataset.value;
    render();
  });
});
searchInput.addEventListener("input", render);

render();