// ⚡ Config Supabase
const SUPABASE_URL = "https://trnquwaidbxjzfrisdnu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybnF1d2FpZGJ4anpmcmlzZG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NzMyMTIsImV4cCI6MjA3MzU0OTIxMn0.uvpkuzw0JzQPj53hNlU4d0Db-TIvnfdVzBtkvhsMZhM";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------- VARIABLES GLOBALES ----------------------
let electeurs = [];      // Tous les électeurs depuis Supabase
let filtered = [];       // Liste filtrée
let currentPage = 1;
let pageSize = 1000;
let sortColumn = "composite";
let sortAsc = true;

// ---------------------- CHARGEMENT INIT ----------------------
async function refresh() {
  const { data, error } = await supabaseClient.from("electeurs").select("*");
  if (error) {
    console.error("Erreur chargement :", error.message);
    document.getElementById("progress").innerText = "❌ Erreur chargement Supabase.";
    return;
  }
  electeurs = data;
  applyFilters();
  document.querySelector("footer").innerText = "✅ Données centralisées via Supabase";
}

// ---------------------- FILTRES & TRI ----------------------
function applyFilters() {
  const bureau = document.getElementById("bureauFilter").value.toLowerCase();
  const search = document.getElementById("searchInput").value.toLowerCase();

  filtered = electeurs.filter(e => {
    let ok = true;
    if (bureau && e.bureau?.toLowerCase() !== bureau) ok = false;
    if (search) {
      const haystack = `${e.nom} ${e.prenom} ${e.adresse}`.toLowerCase();
      if (!haystack.includes(search)) ok = false;
    }
    return ok;
  });

  applySort();
}

function applySort() {
  filtered.sort((a, b) => {
    let va, vb;
    if (sortColumn === "bureau") {
      va = a.bureau || ""; vb = b.bureau || "";
    } else if (sortColumn === "rue") {
      va = (a.adresse || "").split(" ")[1] || "";
      vb = (b.adresse || "").split(" ")[1] || "";
    } else if (sortColumn === "nom") {
      va = a.nom || ""; vb = b.nom || "";
    } else {
      va = `${a.bureau || ""}${a.adresse || ""}${a.nom || ""}`;
      vb = `${b.bureau || ""}${b.adresse || ""}${b.nom || ""}`;
    }
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  renderTable();
}

// ---------------------- TABLEAU & PAGINATION ----------------------
function renderTable() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  pageRows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.nom || ""}</td>
      <td>${row.prenom || ""}</td>
      <td>${row.bureau || ""}</td>
      <td>${row.adresse || ""}</td>
      <td><input type="text" value="${row.email || ""}" onchange="updateField(${row.id}, 'email', this.value)" class="input w-32"></td>
      <td><input type="text" value="${row.telephone || ""}" onchange="updateField(${row.id}, 'telephone', this.value)" class="input w-28"></td>
      <td><input type="text" value="${row.remarque || ""}" onchange="updateField(${row.id}, 'remarque', this.value)" class="input w-40"></td>
      <td>${row.statut || "-"}</td>
      <td>
        <button onclick="updateStatut(${row.id}, 'Favorable')" class="btn-green">Favorable</button>
        <button onclick="updateStatut(${row.id}, 'Défavorable')" class="btn-red">Défavorable</button>
        <button onclick="updateStatut(${row.id}, 'Indécis')" class="btn-amber">Indécis</button>
        <button onclick="updateStatut(${row.id}, 'Absent')" class="btn-secondary">Absent</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const pageInfo = document.getElementById("pageInfo");
  pageInfo.innerText = `Page ${currentPage} / ${Math.ceil(filtered.length / pageSize)}`;
}

// ---------------------- MISE À JOUR ----------------------
async function updateField(id, field, value) {
  const { error } = await supabaseClient.from("electeurs").update({ [field]: value }).eq("id", id);
  if (error) console.error("Erreur update :", error.message);
}

async function updateStatut(id, statut) {
  const { error } = await supabaseClient.from("electeurs").update({ statut }).eq("id", id);
  if (error) alert("Erreur mise à jour : " + error.message);
  else refresh();
}

// ---------------------- IMPORT CSV ----------------------
async function importCSV(file) {
  Papa.parse(file, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    complete: async function(results) {
      const rows = results.data.map(r => ({
        nom: r["Nom"] || "",
        prenom: r["Prénom"] || "",
        bureau: r["Bureau"] || "",
        adresse: r["Adresse"] || "",
        email: r["Email"] || "",
        telephone: r["Téléphone"] || "",
        remarque: r["Remarque"] || "",
        statut: "-"
      }));

      const { error } = await supabaseClient.from("electeurs").insert(rows);
      if (error) {
        alert("Erreur import : " + error.message);
        console.error(error);
      } else {
        alert("✅ Import réussi !");
        refresh();
      }
    }
  });
}

// ---------------------- EXPORT ----------------------
function exportCSV(rows, filename) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---------------------- EVENTS ----------------------
document.getElementById("fileInput").addEventListener("change", (e) => {
  if (e.target.files.length > 0) importCSV(e.target.files[0]);
});
document.getElementById("btnExport").addEventListener("click", () => exportCSV(electeurs, "electeurs_complet.csv"));
document.getElementById("btnExportView").addEventListener("click", () => exportCSV(filtered, "electeurs_vue.csv"));
document.getElementById("btnExportFav").addEventListener("click", () => exportCSV(electeurs.filter(e => e.statut === "Favorable"), "electeurs_favorables.csv"));
document.getElementById("btnExportFavInd").addEventListener("click", () => exportCSV(electeurs.filter(e => ["Favorable","Indécis"].includes(e.statut)), "electeurs_fav_indecis.csv"));

document.getElementById("btnSearch").addEventListener("click", applyFilters);
document.getElementById("btnClearFilters").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("bureauFilter").value = "";
  applyFilters();
});
document.getElementById("sortToggle").addEventListener("click", () => {
  sortAsc = !sortAsc;
  document.getElementById("sortToggle").innerText = sortAsc ? "Asc" : "Desc";
  applySort();
});
document.getElementById("btnApplySort").addEventListener("click", () => {
  sortColumn = document.getElementById("sortColumn").value;
  applySort();
});
document.getElementById("pageSize").addEventListener("change", (e) => {
  pageSize = parseInt(e.target.value, 10);
  currentPage = 1;
  renderTable();
});
document.getElementById("btnPrev").addEventListener("click", () => {
  if (currentPage > 1) { currentPage--; renderTable(); }
});
document.getElementById("btnNext").addEventListener("click", () => {
  if (currentPage < Math.ceil(filtered.length / pageSize)) { currentPage++; renderTable(); }
});
document.getElementById("btnGoto").addEventListener("click", () => {
  const target = parseInt(document.getElementById("gotoInput").value, 10);
  if (target >= 1 && target <= Math.ceil(filtered.length / pageSize)) {
    currentPage = target;
    renderTable();
  }
});

// ---------------------- START ----------------------
refresh();
