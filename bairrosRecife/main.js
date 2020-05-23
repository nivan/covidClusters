//widgets
let map         = undefined;
let barChart    = undefined;
let scatterplot = undefined;

//color scales
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7','#ffffb3','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']);
let casosConfirmadosColorScale = d3.scaleQuantize().range(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#8c2d04']);
let casosPCColorScale = d3.scaleQuantize().range(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#8c2d04']);
let riskExposureColorScale = d3.scaleQuantize().range(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#8c2d04']);

//
let bairrosMode = true;
let option;
let threshold = 0;
let showSingletons = true;
let showPolygons = false;
let showClusterRiskExposure = false;
let defaultStyle = {
    "weight" : 0.5,
    "fillOpacity" : 1.0,
    "radius" : 5
};
let infectedNodes = {};

// graph
let nodes = []; // {name:,{...}}
let links = []; // [{"source", "target", "value"}]

//markers
let nodeMarkers = {}; // name -> marker
let lines       = {}; // n1_n2-> lineMarker
let clusters = [];
let clusterPolygons = [];


/////////////BAR CHART

function scatterplotOptionChanged(opt){
    if(scatterplot){
	let mydata = [];
	clusters.forEach(cluster=>{
	    if(cluster.size > 1 || showSingletons){
		let x = getClusterIndicator(cluster, opt[0]);
		let y = getClusterIndicator(cluster, opt[1]);
		mydata.push([x,y,cluster.color]);
	    }
	});
	//
	scatterplot.setXAxisLabel(opt[2]);
	scatterplot.setYAxisLabel(opt[3]);
	scatterplot.setData(mydata);
    }
}

function barChartOptionChanged(opt){
    let data = [];
    if(opt == 'cases'){
	for(let name in nodes){
	    let node = nodes[name];
	    data.push({'key':name,'value':node.active_cases});
	}	
	barChart.setXAxisLabel('Num Active Cases');
    }
    else if(opt == 'casesPC'){
	for(let name in nodes){
	    let node = nodes[name];
	    data.push({'key':name,'value':node.active_cases/node.population_2010});
	}	
	barChart.setXAxisLabel('Active Cases Per Capita');
    }
    else if(opt == 'riskExposure'){
	for(let name in nodes){
	    let node = nodes[name];
	    data.push({'key':name,'value':node.RiskExposure});
	}
	barChart.setXAxisLabel('Risk Exposure');
    }
    data = data.sort(function(a,b){return b.value-a.value}).slice(0,7);
    barChart.setData(data);
}

function loadBarChart(){
    
    //
    let opts = [{"text":"Active Cases","value":"cases"},
    		{"text":"Active Cases Per Capita","value":"casesPC"},
    		{"text":"Risk Exposure","value":"riskExposure"}];

    let myDiv = d3.select("#barchartDiv");

    barChart = new BarChartWidget(d3.select("#barchartDiv"),opts,"barChart",barChartOptionChanged);

    //
    barChartOptionChanged(barChart.getSelectedOption());
}

function loadScatterplot(){
    let opts = [{"text":"Active Cases","value":"cases"},
		{"text":"Active Cases Per Capita","value":"casesPC"},
		{"text":"Population","value":"population"},
		{"text":"Risk Exposure","value":"riskExposure"}];
    
    scatterplot = new ScatterplotWidget(d3.select("#scatterDiv"),opts,"scat",scatterplotOptionChanged);
}



///////////// MAP

function isInfected(node){
    return node.active_cases > 0;
}

function getClusterIndicator(node, indName){

    if(indName == 'cases'){
	return node.activeCases;
    }
    else if(indName == 'population'){
	return node.population;
    }
    else if(indName == 'casesPC'){	
	return node.activeCases/node.population;
    }
    else if(indName == 'riskExposure'){
	if(isInfected(node))
	    return node.forceOfInfection;
	else
	    return node.riskExposure;
    }
    else{
	debugger
    }
}

function getIndicator(node, indName){
    
    if(indName == 'cases'){
	return node.est_active_cases;
    }
    else if(indName == 'casesPC'){	
	return node.est_active_cases/node.population_2010;
    }
    else if(indName == 'riskExposure'){
	debugger
	if(isInfected(node))
	    return node.forceOfInfection;
	else
	    return node.riskExposure;
    }
    else{
	debugger
    }
}

function updateNodes(){
    for(let name in nodes){
	let node = nodes[name];
	var circle = nodeMarkers[node.name];

	if(option == 'cluster'){
	    circle.options.fillColor = circle.options.clusterColor;
	}
	else{
	    let scale = undefined;
	    if(option == 'cases'){
		scale = casosConfirmadosColorScale;
	    }
	    else if(option == 'casesPC'){
		scale = casosPCColorScale;
	    }
	    else if(option == 'riskExposure'){
		//nao existe
		scale = riskExposureColorScale;
	    }
	    else{
		debugger
	    }
	    circle.options.fillColor = scale(getIndicator(node,option));
	}
	
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
    }
}

function updateLinks(){
    //add lines
    let opacityScale = d3.scaleLinear().domain([0,100]).range([0,1]);
    for(let key in lines){
	let line = lines[key];
	if(line.options.value > threshold){
	    //
	    //let clusterInfected = nodeMarkers[origin].options.clusterInfected;
	    line.options.color = "gray";
	    line.options.opacity = 0.5
	    //
	    line.removeFrom(map);
	    line.decorator.removeFrom(map);
	    line.addTo(map);
	    //line.decorator.addTo(map);
	    line.decorator.bringToBack();
	}
	else{
	    line.removeFrom(map);
	    line.decorator.removeFrom(map);
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
	updatePolygons();
    });

    d3.select("#colorSelect").on("change",function(){
	option = this.selectedOptions[0].value;
	updateNodes();
	
    });

    d3.select("#polygonsRECB").on("change",function(){
	showClusterRiskExposure = this.checked;
	updatePolygons();
    });
    
    //////// MAP
    map = L.map('map').setView([-8.055830293075653, -34.96948242187501], 11);

    var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);

    //
    loadBarChart();

    //
    loadScatterplot();
    
    //
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
    let nodeStrength = {};
    //
    let i = 0;
    for(const name in nodes){
	let node = nodes[name];
	nodeStrength[name]       = 0;
	mapCityIndex[node.name]  = i;
	mapIndexCity[i]          = node.name;
	adjList.push([]);
	i += 1;
    }
    //
    for(const source in nodes){
	let node = nodes[source];
	for(const target in node.outEdges){
	    let weight = node.outEdges[target];
	    if(weight > threshold){
		//
		nodeStrength[source] += weight;
		if(source != target) //garante que arcos só somam uma vez
		    nodeStrength[target] += weight; 
		//
		let sourceIndex = mapCityIndex[source];
		let targetIndex = mapCityIndex[target];
		//
		adjList[sourceIndex].push(targetIndex);
		adjList[targetIndex].push(sourceIndex);
	    }
	}
    }
    
    //
    clusters.forEach(cl=>{
	if(cl.polygon != undefined){
	    cl.polygon.removeFrom(map);
	}
	cl.nodes.forEach(n=>{n.cluster = undefined;});
    });
    clusters = [];


    //
    let ccs = connectedComponents(adjList);
    let count = 0;
    ccs.forEach(cc=>{
	let cluster = {size:cc.length, polygon:undefined, infected:false,riskExposure:0,population:0,activeCases:0,estActiveCases:0,forceOfInfection:0,nodes:[]};
	if(cc.length == 1){
	    //singleton
	    let name = mapIndexCity[cc[0]];
	    let node = nodes[name];
	    node.cluster = cluster;
	    //update clusters
	    cluster.infected         = isInfected(node);
	    cluster.riskExposure     = node.riskExposure;
	    cluster.population       = node.population_2010;
	    cluster.activeCases      = node.active_cases;
	    cluster.estActiveCases   = node.est_active_cases;
	    cluster.forceOfInfection = (cluster.estActiveCases/cluster.population)*(node.name in node.outEdges?node.outEdges[node.name]:0);
	    cluster.nodes = [name];
	    //show cluster as singletons
	    let color = "#bebada";
	    nodeMarkers[name].options.clusterColor = color;
	    nodeMarkers[name].options.singleton    = true;
	    cluster.color                          = color;
	}
	else{
	    //
	    let clusterInfected         = false;
	    let clusterRiskExposure     = 0;
	    let clusterPopulation       = 0;
	    let clusterActiveCases      = 0;
	    let clusterEstActiveCases   = 0;
	    let clusterForceOfInfection = 0;
	    let clusterStrength         = 0;
	    let clusterPoints           = [];
	    let color = clusterColorScale(d3.min(cc)%11);
	    //
	    cluster.nodes = cc.map(i=>mapIndexCity[i]);
	    cc.forEach(index=>{
		let name = mapIndexCity[index];
		let node = nodes[name];
		node.cluster = cluster;
		//
		clusterPopulation     += node.population_2010;
		clusterActiveCases    += node.active_cases;
		clusterEstActiveCases += node.est_active_cases;
		clusterRiskExposure   += node.riskExposure;
		clusterStrength       += nodeStrength[name];
		clusterInfected        = clusterInfected || isInfected(node);
		//
		nodeMarkers[name].options.clusterColor = color;
		nodeMarkers[name].options.singleton = false;
		//
		let leafletLatLng = nodeMarkers[name].getLatLng();
		clusterPoints.push(turf.point([leafletLatLng.lat,leafletLatLng.lng]));
	    });

	    clusterForceOfInfection = (clusterEstActiveCases/clusterPopulation) * (clusterStrength/cc.length);
	    
	    //Compute hull
	    clusterPoints = turf.featureCollection(clusterPoints);
	    let options = {units: 'kilometers', maxEdge: 150};
	    let myhull = turf.concave(clusterPoints,options);
	    //let myhull = turf.convex(clusterPoints);	    
	    //
	    if(myhull == undefined){
		cluster.polygon = undefined;
	    }
	    else{
		//POLYGON
		let opt;
		if(showClusterRiskExposure){
		    let colorScale = d3.scaleQuantize().domain(riskExposureColorScale.domain()) ;
		    if(clusterInfected){
			colorScale.range(d3.schemeReds[5]);
		    }
		    else{
			colorScale.range(d3.schemeBlues[5]);
		    }
		    opt = {color: colorScale(clusterRiskExposure)};
		}
		else{
		    opt = clusterInfected?{color: 'red'}:{color: 'blue'};
		}
		opt['opacity'] = 1;
		opt['riskExposure'] = clusterRiskExposure;
		opt['infected'] = clusterInfected;
		let polygon = L.polygon(myhull.geometry.coordinates[0], opt);
		if(clusterInfected)
		    polygon.bindPopup('Force of Infection: ' + clusterForceOfInfection.toFixed(3));
		else
		    polygon.bindPopup('Risk Exposure: ' + clusterRiskExposure.toFixed(3));
		
		cluster.polygon          = polygon;
	    }
	    
	    //update cluster
	    cluster.infected         = clusterInfected;
	    cluster.riskExposure     = clusterRiskExposure;
	    cluster.population       = clusterPopulation;
	    cluster.activeCases      = clusterActiveCases;
	    cluster.estActiveCases   = clusterEstActiveCases;
	    cluster.forceOfInfection = clusterForceOfInfection;
	    cluster.color            = color;
	    
	    //
	    count += 1;
	}
	//
	clusters.push(cluster);
    });
}

function updatePolygons(){
    clusters.forEach(cluster=>{
	let color = undefined;
	let polygon = cluster.polygon;
	if(polygon != undefined){
	    if(showClusterRiskExposure){
		let colorScale = d3.scaleQuantize().domain(riskExposureColorScale.domain()) ;
		if(cluster.infected){
		    colorScale.range(d3.schemeReds[5]);
		    color = colorScale(cluster.forceOfInfection);
		}
		else{
		    colorScale.range(d3.schemeBlues[5]);
		    color = colorScale(cluster.riskExposure);
		}
	    }
	    else{
		color = cluster.infected?'red':'blue';
	    }

	    polygon.options.color = color;
	    
	    if(showPolygons){
		polygon.removeFrom(map);
		polygon.addTo(map);
		polygon.bringToBack()
	    }
	    else
		polygon.removeFrom(map);
	}
    });
}

function updateThreshold() {
    //
    updateGroupIds();
    //
    updateLinks();
    //
    updatePolygons();
    //
    updateNodes();
    //
    scatterplot.update();
}

function getProbInfection(node){
    return node.active_cases/node.population_2010;
}

function buildCoords(){

    //remove cities
    if(bairrosMode){
	var citiesToRemove = {
	    'Abreu e Lima':1,
	    'Araçoiaba':1,
	    'Cabo de Santo Agostinho':1,
	    'Camaragibe':1,
	    'Ilha de Itamaracá':1,
	    'Itapissuma':1,
	    'Jaboatão dos Guararapes':1,
	    'Moreno':1,
	    'Olinda':1,
	    'Paulista':1,
	    'São Lourenço da Mata':1
	};
	graph = graph.filter(city=>{return !(city.name in citiesToRemove)})
    }
    
    //
    nodes = {};
    graph.forEach(node =>{
	nodes[node.name] = {"group":0,
			    "name":node.name,
			    "population_2010":node.population_2010,
			    "lat": node.lat,
			    "lng": node["long"],
			    "riskExposure":0,
			    "cluster":undefined,
			    "active_cases":node.active_cases,'est_active_cases':node.est_active_cases, inEdges:{}, outEdges:{}};
    });

    //
    let listNodes = [];
    graph.forEach(node =>{
	listNodes.push(nodes[node.name]);
	let probInfection = getProbInfection(node);
	let myNode        = nodes[node.name];
	//
	for(let i in node.edge_weights){
	    //
	    let t = i.slice(5); //neighborh
	    let otherNode = nodes[t];
	    if(bairrosMode){
		if(t in citiesToRemove)
		    continue;
	    }
	    //
	    if(node.edge_weights[i]>0){
		let weight = 100*node.edge_weights[i];
		myNode.outEdges[t]           = weight;
		otherNode.inEdges[node.name] = weight;
	    }
	    //
	    nodes[t].riskExposure += (probInfection * node.edge_weights[i]);
	}

    });

    //fix color scales
    ////
    casosConfirmadosColorScale.domain(d3.extent(listNodes, d=>getIndicator(d,'cases')) );
    ////
    casosPCColorScale.domain(d3.extent(listNodes,d=>getIndicator(d,'casesPC')));
    ////
    let exposures = [];
    for(let name in nodes){
	exposures.push(nodes[name].riskExposure.push);
    }
    riskExposureColorScale.domain(d3.extent(exposures));



    //
    graph.forEach(nn =>{
	let node = nodes[nn.name];
	let coords = [node.lat,node.lng];	
	var circle = L.circleMarker(coords,{
	    color: 'black',
	    weight: defaultStyle.weight,
	    fillColor: '#bebada',
	    fillOpacity: defaultStyle.fillOpacity,
	    radius: defaultStyle.radius
	});
	//
	//circle.options.clusterInfected = true; //???????
	//circle.options.infected        = (node.est_active_cases > 0);
	//suffix = (isInfected(node)?'Force of Infection: ' + node.forceOfInfection.toFixed(3):'Risk Exposure: ' + node.riskExposure.toFixed(3));
	circle.bindPopup('Name: ' + node.name + '</br>' + 'Active Cases: ' + node.active_cases + '</br>' + 'Estimated Active Cases: ' + node.est_active_cases);

	//
	nodeMarkers[node.name] = circle;
    });
    
    //
    let opacityScale = d3.scaleLinear().domain([0,100]).range([0,1]);
    for(let origin in nodes){
	let node = nodes[origin];
	
	for(let destination in node.outEdges){
	    let otherNode = nodes[destination];

	    if(origin != destination){
		let weight = node.outEdges[destination];
		
		//create graphic representation
		let latlngs = [[node.lat,node.lng],[otherNode.lat,otherNode.lng]];
		let line = L.polyline(latlngs, {'color': 'gray','weight':10*opacityScale(weight)+1,'value':weight,'opacity':0.1});
		let decorator = L.polylineDecorator(line, {
		    patterns: [
			{offset: '95%', repeat: 0, symbol: L.Symbol.arrowHead({pixelSize: 12, polygon: true, pathOptions: {color: 'gray', stroke: true}})}
		    ]
		});
		//
		line.decorator = decorator;
		lines[origin+"_"+destination] = line;
	    }

	}
    }
}

buildCoords();

// default values
threshold    = (+d3.select("#threshold").node().value)/10;
showPolygons = (d3.select("#polygonsCB").node().checked);
d3.select("#thSliderValue").text((threshold) + "%");
option = 'cluster';


//
loadInterface();
