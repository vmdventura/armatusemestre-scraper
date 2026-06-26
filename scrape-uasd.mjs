import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://app.uasd.edu.do/ProgramacionPorAsignatura/Default.aspx/";
const CAMPUS = process.env.CAMPUS ?? "CSA";
const DELAY_MS = 200;

const headers = {
  "Content-Type": "application/json; charset=UTF-8",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/javascript, */*; q=0.01",
};

async function post(method, body) {
  const res = await fetch(BASE + method, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${method}`);
  const wrapper = await res.json();
  // ASP.NET WebMethods wrap the payload in {"d": "..."}
  return typeof wrapper.d === "string" ? JSON.parse(wrapper.d) : wrapper.d;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Fetching subject list for campus ${CAMPUS}…`);
  const subjects = await post("getAsignaturas", { campus: CAMPUS, clave: "" });
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error("getAsignaturas returned no subjects");
  }
  console.log(`Found ${subjects.length} subjects. Fetching schedules…`);

  const results = [];
  for (let i = 0; i < subjects.length; i++) {
    const subj = subjects[i];
    const clave = subj.Clave ?? subj.clave ?? subj.CLAVE;
    process.stdout.write(`\r  [${i + 1}/${subjects.length}] ${clave}   `);

    try {
      const sections = await post("getData", { campus: CAMPUS, clave });
      results.push({ ...subj, sections: Array.isArray(sections) ? sections : [] });
    } catch (err) {
      process.stderr.write(`\nWARN: ${clave} – ${err.message}\n`);
      results.push({ ...subj, sections: [], error: err.message });
    }

    if (i < subjects.length - 1) await sleep(DELAY_MS);
  }

  console.log("\nSaving…");
  await mkdir("data", { recursive: true });

  const output = {
    updated_at: new Date().toISOString(),
    campus: CAMPUS,
    total: results.length,
    subjects: results,
  };

  const outPath = `data/uasd-schedule-${CAMPUS.toLowerCase()}.json`;
  await writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Done. Saved ${results.length} subjects to ${outPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
