const endpoint = "https://lindas-cached.cluster.ldbar.ch/query";

const query = `
PREFIX cube: <https://cube.link/>
PREFIX schema: <http://schema.org/>
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX elcom: <https://energy.ld.admin.ch/elcom/electricityprice/dimension/>

SELECT * WHERE {
  # Just a broad query to see the shape of the data for municipality 351 (Bern)
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/351> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> "2024"^^<http://www.w3.org/2001/XMLSchema#gYear> .
       
  ?obs ?p ?o .
} LIMIT 20
`;

async function testQuery() {
    console.log("Fetching...");
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/sparql-results+json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'query=' + encodeURIComponent(query)
        });

        if (!res.ok) {
            console.error("HTTP Error:", res.status, await res.text());
            return;
        }
        const data = await res.json();
        console.log(JSON.stringify(data.results.bindings, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testQuery();
