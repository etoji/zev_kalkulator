$endpoint = "https://lindas-cached.cluster.ldbar.ch/query"
$query = @"
PREFIX cube: <https://cube.link/>
PREFIX schema: <http://schema.org/>

SELECT ?operator ?total ?energy ?gridusage ?charge ?aidfee WHERE {
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/351> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/product> <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> "2025"^^<http://www.w3.org/2001/XMLSchema#gYear> .
       
  OPTIONAL { 
    ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/operator> ?opUri .
    ?opUri schema:name ?operator .
  }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/total> ?total }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/energy> ?energy }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/gridusage> ?gridusage }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/charge> ?charge }
  OPTIONAL { ?obs <https://energy.ld.admin.ch/elcom/electricityprice/dimension/aidfee> ?aidfee }
} LIMIT 1
"@

$body = "query=" + [System.Uri]::EscapeDataString($query)
$response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $body -ContentType "application/x-www-form-urlencoded" -Headers @{"Accept" = "application/sparql-results+json" }
$response.results.bindings | ConvertTo-Json -Depth 5 | Out-File latest.json
