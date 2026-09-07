document.addEventListener("DOMContentLoaded", function () {

    const tableBody = document.getElementById("payslipTable");
    const totalEl = document.getElementById("ps-total-count");
    const latestEl = document.getElementById("ps-latest");
    const latestMonth = document.getElementById("ps-latest-month");
    const yearFilter = document.getElementById("ps-year-filter");

    if (!tableBody) return;

    let allPayslips = [];
    let loaded = false;

    // ---------- Load data ----------
    function loadPayslips() {
        if (loaded) return;
        loaded = true;

        fetch("/payslip/list")
            .then(r => {
                if (!r.ok) throw new Error("Failed to load");
                return r.json();
            })
            .then(data => {
                allPayslips = Array.isArray(data) ? data : [];
                render(allPayslips);
            })
            .catch(err => {
                console.error(err);
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            Unable to load payslips
                        </td>
                    </tr>`;
            });
    }

    // ---------- Render ----------
    function render(list) {

        // ================= Cards =================

        totalEl.textContent = list.length;

        if (list.length > 0) {

            const latest = list[0];

            latestEl.textContent = "Available";
            latestMonth.textContent = `${latest.month} ${latest.year}`;

            document.getElementById("ps-year").textContent =
                latest.year;

        } else {

            latestEl.textContent = "—";
            latestMonth.textContent = "—";

            document.getElementById("ps-year").textContent = "—";
        }

        // Total Earnings

        const totalSalary = list.reduce((sum, p) => {

            return sum + Number(p.net_salary || 0);

        }, 0);

        document.getElementById("ps-earnings").textContent =
            "₹" + totalSalary.toLocaleString("en-IN");


        // ================= Year Filter =================

        const years = [...new Set(list.map(p => String(p.year)))].sort((a, b) => b - a);

        if (yearFilter) {

            yearFilter.innerHTML = years.length
                ? years.map(y => `<option value="${y}">${y}</option>`).join("")
                : `<option value="">All</option>`;

        }

        // ================= Empty =================

        if (list.length === 0) {

            tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5">

                No Payslips Available

            </td>
        </tr>
        `;

            return;

        }

        // ================= Table =================

        tableBody.innerHTML = list.map(p => `

<tr data-year="${p.year}">

    <td><strong>${p.month}</strong></td>

    <td>${p.year}</td>

    <td>

        ₹${Number(p.net_salary || 0).toLocaleString("en-IN")}

    </td>

    <td>

        <span class="badge bg-success">

            Available

        </span>

    </td>

    <td>

        <a
            href="/payslip/view/${p.id}"
            target="_blank"
            class="btn btn-info btn-sm me-2">

            <i class="fas fa-eye"></i>

            View

        </a>

        <a
            href="/payslip/download/${p.id}"
            class="btn btn-primary btn-sm">

            <i class="fas fa-download"></i>

            Download

        </a>

    </td>

</tr>

`).join("");

    }

    // ---------- Year filter ----------
    if (yearFilter) {
        yearFilter.addEventListener("change", function () {
            const y = this.value;
            tableBody.querySelectorAll("tr").forEach(row => {
                if (!row.dataset.year) return;
                row.style.display = (row.dataset.year === y) ? "" : "none";
            });
        });
    }

    // ---------- Section switching ----------
    function setActiveSection(sectionId) {
        // hide all sections
        document.querySelectorAll(".content-section").forEach(s => {
            s.classList.remove("active");
            s.style.display = "none";
        });

        // show target
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add("active");
            target.style.display = "block";
        }

        // toggle body class for header hiding
        document.body.classList.toggle("payslips-active", sectionId === "payslips");

        // load data when payslips is shown
        if (sectionId === "payslips") {
            loadPayslips();
        }
    }

    // Sidebar clicks
    document.querySelectorAll(".sidebar-nav li[data-section]").forEach(li => {
        li.addEventListener("click", function (e) {
            e.preventDefault();
            const section = this.getAttribute("data-section");

            // update active class on sidebar
            document.querySelectorAll(".sidebar-nav li").forEach(l => l.classList.remove("active"));
            this.classList.add("active");

            setActiveSection(section);
        });
    });

    // Quick action buttons
    document.querySelectorAll("[data-goto]").forEach(btn => {
        btn.addEventListener("click", function () {
            const section = this.getAttribute("data-goto");
            const sidebarItem = document.querySelector(`.sidebar-nav li[data-section="${section}"]`);
            if (sidebarItem) sidebarItem.click();
        });
    });

    // If page loads already on payslips
    if (document.getElementById("payslips")?.classList.contains("active")) {
        document.body.classList.add("payslips-active");
        loadPayslips();
    }
});