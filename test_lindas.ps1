$endpoint = "https://lindas-cached.cluster.ldbar.ch/query"
$query = @"
PREFIX cube: <https://cube.link/>

SELECT ?obs ?p ?o WHERE {
  ?obs a cube:Observation ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/municipality> <https://ld.admin.ch/municipality/351> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/category> <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
       <https://energy.ld.admin.ch/elcom/electricityprice/dimension/period> "2025"^^<http://www.w3.org/2001/XMLSchema#gYear> .
       
  ?obs ?p ?o .
} LIMIT 50
"@

$body = "query=" + [System.Uri]::EscapeDataString($query)

$response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $body -ContentType "application/x-www-form-urlencoded" -Headers @{"Accept"="application/sparql-results+json"}
$response.results.bindings | ConvertTo-Json -Depth 5
