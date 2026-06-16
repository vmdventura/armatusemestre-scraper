const BASE = "https://app.uasd.edu.do/ProgramacionPorAsignatura/";
const headers = {
  "Content-Type": "application/json; charset=UTF-8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01"
        };
        async function post(method, body){
          const r = await fetch(BASE+"Default.aspx/"+method, {method:"POST", headers, body: JSON.stringify(body)});
            const t = await r.text();
              return {status:r.status, len:t.length, esJSON: t.trim().startsWith("{")};
              }
              const lista = await post("getAsignaturas", {campus:"CSA", clave:""});
              const data  = await post("getData", {campus:"CSA", clave:"CIV2440"});
              console.log("getAsignaturas:", JSON.stringify(lista));
              console.log("getData:", JSON.stringify(data));
              if (lista.status===200 && lista.esJSON) {
                console.log("OK: la IP de GitHub SI pasa el filtro de la UASD.");
                } else {
                  console.log("FALLO: la IP de GitHub NO pasa (status "+lista.status+").");
                    process.exit(1);
                    }
                    
