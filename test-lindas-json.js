async function testLindas() {
    const q = `
PREFIX cube: <https://cube.link/>
PREFIX schema: <http://schema.org/>
SELECT ?operator ?total ?energy ?gridusage ?charge ?aidfee ?period WHERE {
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/351> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/product> <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> .
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/operator> ?opUri . ?opUri schema:name ?operator . }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> ?period }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/total> ?total }
} ORDER BY DESC(?period) LIMIT 2
`;
    const r = await fetch('https://lindas-cached.cluster.ldbar.ch/query', {
        method: 'POST',
        headers: { 'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'query=' + encodeURIComponent(q)
    });
    const data = await r.json();
    console.log(JSON.stringify(data.results.bindings, null, 2));
}

testLindas();
