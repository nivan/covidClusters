//data
let map = undefined;
let threshold = 0;
let showSingletons = true;
let showPolygons = false;
let defaultStyle = {
    "weight" : 0.5,
    "fillOpacity" : 1.0,
    "radius" : 5
};
let infectedNodes = {};
let colorOption = 'cluster';

//
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7','#ffffb3','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']);

//
let cityNodes = []; // [{name, group}]
let coords    = {}; // name -> [latitude,longitude]
//
let edges = {};     // n1_n2 -> weight
let cityLinks = []; // [{"source", "target", "value"}]
//
let clusterPolygons = [];

//markers
let cityMarkers = {}; // name -> marker
let lines       = {}; // n1_n2-> lineMarker
let polygons    = [];

function retira_acentos(str) 
{

    com_acento = "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝŔÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿŕ";

sem_acento = "AAAAAAACEEEEIIIIDNOOOOOOUUUUYRsBaaaaaaaceeeeiiiionoooooouuuuybyr";
    novastr="";
    for(i=0; i<str.length; i++) {
        troca=false;
        for (a=0; a<com_acento.length; a++) {
            if (str.substr(i,1)==com_acento.substr(a,1)) {
                novastr+=sem_acento.substr(a,1);
                troca=true;
                break;
            }
        }
        if (troca==false) {
            novastr+=str.substr(i,1);
        }
    }
    return novastr;
}


function updateNodes(){
    
    graphCities.cities.forEach(city=>{
	var circle = cityMarkers[city.name];

	// if(option == 'cluster'){
	// }
	// else if(option == 'cases'){
	// }
	// else if(option == 'casesPC'){
	// }
	
	if(!showSingletons){
	    if(circle.options.singleton){
		circle.removeFrom(map);
	    }
	    else{
		circle.removeFrom(map);
		circle.addTo(map);
		circle.bringToFront();
	    }
	}
	else{
	    circle.removeFrom(map);
	    circle.addTo(map);
	    circle.bringToFront();
	}
    });
}

function updateLinks(){
    //add lines
    let opacityScale = d3.scaleLinear().domain([0,100]).range([0,1]);
    for(let key in lines){
	let line = lines[key];
	if(line.options.value > threshold){
	    //
	    //let clusterInfected = cityMarkers[origin].options.clusterInfected;
	    line.options.color = "gray";
	    line.options.opacity = 0.5;
	    //
	    line.removeFrom(map);
	    line.addTo(map);
	}
	else{
	    line.removeFrom(map);
	}
    }
}

function loadInterface(){

    //////// CONTROLS
    d3.select("#threshold").on("change",function(v){
	//console.log(+this.value);
	d3.select("#thSliderValue").text((+this.value)/10 + "%");
	threshold = (+this.value)/10;
	updateThreshold();
    });

    d3.select("#singletonsCB").on("change",function(v){
	showSingletons = this.checked;
	updateThreshold();
    });

    d3.select("#polygonsCB").on("change",function(v){
	showPolygons = this.checked;
	updateThreshold();
    });

    d3.select("#colorSelect")
	.on("change",function(v){
	    colorOption = this.selectedOptions[0].value;
	    updateThreshold();
	});
    
    //////// MAP
    map = L.map('map').setView([-8.716788630258742,-38.1500244140625], 8);

    var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);
    

    updateThreshold();
    
}

function connectedComponents(adj) {
  let numVertices = adj.length
  let visited = new Array(numVertices)
  for(let i=0; i<numVertices; ++i) {
    visited[i] = false
  }
  let components = []
  for(let i=0; i<numVertices; ++i) {
    if(visited[i]) {
      continue
    }
    let toVisit = [i]
    let cc = [i]
    visited[i] = true
    while(toVisit.length > 0) {
      let v = toVisit.pop()
      let nbhd = adj[v]
      for(let j=0; j<nbhd.length; ++j) {
        let u = nbhd[j]
        if(!visited[u]) {
          visited[u] = true
          toVisit.push(u)
          cc.push(u)
        }
      }
    }
    components.push(cc)
  }
  return components
}

function updateGroupIds(){
    //var cc = require("connected-components")

    let mapCityIndex = {};
    let mapIndexCity = {};
    let adjList = [];
    
    cityNodes.forEach((city,i)=>{
	mapCityIndex[city.id] = i;
	mapIndexCity[i]         = city.id;
	adjList.push([]);
    });
    cityLinks.forEach(l=>{
	let source = l.source;
	let target = l.target;
	if(l.value > threshold){
	    let sourceIndex = mapCityIndex[source];
	    let targetIndex = mapCityIndex[target];
	    //
	    adjList[sourceIndex].push(targetIndex);
	    adjList[targetIndex].push(sourceIndex);
	}
    });

    //
    clusterPolygons.forEach(pol=>{
	pol.removeFrom(map);
    });
    clusterPolygons = [];
    
    //
    let ccs = connectedComponents(adjList);
    let count = 0;
    ccs.forEach(cc=>{
	if(cc.length > 1){ //not singleton
	    //update cluster
	    let color = clusterColorScale(d3.min(cc)%11);
	    let clusterInfected = false;
 	    let clusterPoints = [];

	    cc.forEach(index=>{
		let name = mapIndexCity[index];
		cityMarkers[name].options.fillColor = color;
		cityMarkers[name].options.singleton = false;
		clusterInfected = clusterInfected || cityMarkers[name].options.infected;
		//
		let leafletLatLng = cityMarkers[name].getLatLng();
		clusterPoints.push(turf.point([leafletLatLng.lat,leafletLatLng.lng]));
	    });
	    //
	    clusterPoints = turf.featureCollection(clusterPoints);
	    let options = {units: 'kilometers', maxEdge: 150};
	    let myhull = turf.concave(clusterPoints,options);
	    //let myhull = turf.convex(clusterPoints);
	    
	    //
	    if(myhull != undefined){
		let opt = clusterInfected?{color: 'red'}:{color: 'green'};
		let polygon = L.polygon(myhull.geometry.coordinates[0], opt);
		clusterPolygons.push(polygon);
		if(showPolygons)
		    polygon.addTo(map);
		else
		    polygon.removeFrom(map);
	    }
	    
	    //
	    cc.forEach(index=>{
		let name = mapIndexCity[index];
		cityMarkers[name].options.clusterInfected = clusterInfected;
	    });
	    
	    //
	    count += 1;
	}
	else{//singleton
	    let name = mapIndexCity[cc[0]];
	    cityMarkers[name].options.fillColor = "#bebada";
	    cityMarkers[name].options.singleton = true;
	}
    });
}

function sumBySize(d) {
    return d.value;
}

function updateTreemap(){
    let svg = d3.select("#treemap");
    let width = +svg.attr("width");
    let height = +svg.attr("height");
    var treemap = d3.treemap()
	.tile(d3.treemapResquarify.ratio(0.5))
	.size([width, height])
	.round(true)
	.paddingInner(1);

    //
    let xnodes = [{"id":"root", "parent":""}];
    cityNodes.forEach(node=>{
	xnodes.push({"id":node.id, "parent":"root", "value":node.cases});
    });
    
    // stratify the data: reformatting for d3.js
    var root = d3.stratify()
	.id(function(d) { return d.id; })   // Name of the entity (column name is name in csv)
	.parentId(function(d) { return d.parent; })   // Name of the parent (column name is parent in csv)
    (xnodes);
    root.sum(function(d) { return +d.value })   // Compute the numeric value for each entity
   
    
    // var root = d3.hierarchy(leaves)
    //   .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
    //   .sum(sumBySize)
    //   .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
    // //leaves {data: Object, height: 0, depth: 2, parent: zl, id: "Mountains", x: -30, y: 240}
    treemap(root);

    debugger
    
    //
    var cell = svg.selectAll("g")
	.data(root.leaves())
	.enter().append("g")
	.attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; });

    cell.append("rect")
	.attr("id", function(d) { return d.data.id; })
	.attr("width", function(d) { return d.x1 - d.x0; })
	.attr("height", function(d) { return d.y1 - d.y0; })
	.attr("fill", function(d,i) { return clusterColorScale(i%11); });

    cell.append("clipPath")
	.attr("id", function(d) { return "clip-" + d.data.id; })
	.append("use")
	.attr("xlink:href", function(d) { return "#" + d.data.id; });

    // cell.append("text")
    // 	.attr("clip-path", function(d) { return "url(#clip-" + d.data.id + ")"; })
    // 	.selectAll("tspan")
    // 	.data(function(d) { return d.data.name.split(/(?=[A-Z][^A-Z])/g); })
    // 	.enter().append("tspan")
    // 	.attr("x", 4)
    // 	.attr("y", function(d, i) { return 13 + i * 10; })
    // 	.text(function(d) { return d; });

}

//http://www.bde.pe.gov.br/visualizacao/Visualizacao_formato2.aspx?CodInformacao=288&Cod=3

function updateScatter(){
    var svg = d3.select("#scat");
    var scat = new Scatterplot(svg,"scat1",50,0,300,300); //Criacao do primeiro scatterplot a partir de um objeto Scatterplot
    //(definido no script JavaScript scat.js)
    scat.setXAxisLabel("População"); //Informacoes a respeito dos eixos e titulo da visualizacao
    scat.setYAxisLabel("Número de Casos");
    scat.setTitle("População X Casos");
    scat.updatePlot();
    
    var dataset = cityNodes.map(city=>[city.populacao,city.cases]);
    scat.setData(dataset);
}

function updateThreshold() {
    //
    updateGroupIds();
    //
    updateLinks();
    //
    updateNodes();
    //
    //updateScatter();
}

function buildCoords(){

    
    //
    cityNodes = graphCities.cities.map(city=>{
	if(!(city.name in populacaoCidade))
	    debugger
	return {"id":city.name,"group":0, "populacao":populacaoCidade[city.name], "cases": city.estimated_active_cases};
    });

    edges = {};
    //
    graphCities.cities.forEach(city=>{
	coords[city.name] = [-city.lat,city["long"]];
	
	for(let i in city.edge_weights){
	    //
	    let t = i.slice(5);
	    let key = city.name + "_"+t;
	    if(city.name == t)
		continue;

	    //
	    if(city.edge_weights[i]>0){
	    if(!(key in edges)) edges[key] = 0
		edges[key] += 100*city.edge_weights[i];
	    }
	    cityLinks.push({"source": city.name, "target": t, "value": 100*city.edge_weights[i]});
	}

    });

    //
    graphCities.cities.forEach(city=>{
	let coords = [-city.lat,city['long']];
	if(coords != undefined){
	    var circle = L.circleMarker(coords,{
		color: 'black',
		weight: defaultStyle.weight,
		fillColor: '#bebada',
		fillOpacity: defaultStyle.fillOpacity,
		radius: defaultStyle.radius
	    });
	    circle.options.singleton = false; 
	    
	    circle.bindPopup('Nome: ' + city.name + '</br>' + 'Estimativa de Casos Ativos: ' + city.estimated_active_cases);
	    circle.options.infected = (city.estimated_active_cases > 0);
	    circle.options.clusterInfected = true;
	    cityMarkers[city.name] = circle;
	}
	else{
	    console.log(search);
	}
    });
    
    //
    let opacityScale = d3.scaleLinear().domain([0,100]).range([0,1]);
    for(let key in edges){
	let x = key.indexOf("_");
	let origin = key.slice(0,x);
	let destination = key.slice(x+1);
	if(origin != destination && edges[key] > 0){
	    //
	    let latlngs = [coords[origin],coords[destination]];
	    let line = L.polyline(latlngs, {color: '#A0A0A0',weight:10*opacityScale(edges[key])+1,value:edges[key]});
	    lines[key] = line;
	}
    }
}

buildCoords();

loadInterface();
