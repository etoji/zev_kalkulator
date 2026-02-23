async function testLindas() {
    const bfsNr = 351; // Bern
    console.log(`Testing LINDAS for BFS ${bfsNr}...`);

    const query = `
PREFIX cube: <https://cube.link/>
PREFIX schema: <http://schema.org/>

SELECT ?operator ?total ?energy ?gridusage ?charge ?aidfee ?period WHERE {
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/${bfsNr}> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/product> <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> .
       
  OPTIONAL { 
    ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/operator> ?opUri .
    ?opUri schema:name ?operator .
  }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> ?period }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/total> ?total }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/energy> ?energy }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/gridusage> ?gridusage }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/charge> ?charge }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/aidfee> ?aidfee }
} ORDER BY DESC(?period) LIMIT 5
`;

    try {
        const r = await fetch('https://lindas-cached.cluster.ldbar.ch/query', {
            method: 'POST',
            headers: {
                'Accept': 'application/sparql-results+json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'query=' + encodeURIComponent(query)
        });

        console.log('Status:', r.status, r.statusText);
        const text = await r.text();
        console.log('Response Length:', text.length);
        if (text.length > 500) {
            console.log('Sample:', text.substring(0, 500) + '...');
        } else {
            console.log('Content:', text);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testLindas();
