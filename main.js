//data
let map = undefined;
let threshold = 0;
let showSingletons = true;

let defaultStyle = {
    "weight" : 0.5,
    "fillOpacity" : 1.0,
    "radius" : 5
};

//
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7','#ffffb3','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd','#ccebc5','#ffed6f']);

//
let cityNodes = []; // [{name, group}]
let coords    = {}; // name -> [latitude,longitude]
//
let edges = {};     // n1_n2 -> weight
let cityLinks = []; // [{"source", "target", "value"}]

//markers
let cityMarkers = {}; // name -> marker
let lines       = {}; // n1_n2-> lineMarker


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
	if(!showSingletons){
	    if(circle.options.singleton){
		circle.removeFrom(map);
	    }
	    else{
		circle.addTo(map);
		circle.bringToFront();
	    }
	}
	else{
	    circle.addTo(map);
	    circle.bringToFront();
	}
    });
}

function updateLinks(){
    //add lines
    let opacityScale = d3.scaleLinear().domain([0,100]).range([0,1]);
    for(let key in edges){
	let x = key.indexOf("_");
	let origin = key.slice(0,x);
	let destination = key.slice(x+1);
	let line = lines[key];
	if(origin != destination){
	    if(edges[key] > threshold){
		//
		line.addTo(map);
	    }
	    else{
		line.removeFrom(map);
	    }
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


    //////// MAP
    map = L.map('map').setView([-8.042232671243832, -34.91455078125001], 12);

    var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
	maxZoom: 20,
	attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
    }).addTo(map);
    

    updateLinks();
    updateNodes();
    
}

function connectedComponents(adj) {
  var numVertices = adj.length
  var visited = new Array(numVertices)
  for(var i=0; i<numVertices; ++i) {
    visited[i] = false
  }
  var components = []
  for(var i=0; i<numVertices; ++i) {
    if(visited[i]) {
      continue
    }
    var toVisit = [i]
    var cc = [i]
    visited[i] = true
    while(toVisit.length > 0) {
      var v = toVisit.pop()
      var nbhd = adj[v]
      for(var j=0; j<nbhd.length; ++j) {
        var u = nbhd[j]
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

    //console.log(adjList);
    //console.log(connectedComponents(adjList))
    let ccs = connectedComponents(adjList);
    let count = 0;
    ccs.forEach(cc=>{
	if(cc.length > 1){
	    let color = clusterColorScale(count%11);
	    cc.forEach(index=>{
		let name = mapIndexCity[index];
		cityMarkers[name].options.fillColor = color;
		cityMarkers[name].options.singleton = false;
		//
		cityMarkers[name].removeFrom(map);
		cityMarkers[name].addTo(map);
	    });
	    count += 1;
	}
	else{
	    let name = mapIndexCity[cc[0]];
	    cityMarkers[name].options.fillColor = "#bebada";
		cityMarkers[name].options.singleton = true;
	    cityMarkers[name].removeFrom(map);
	    cityMarkers[name].addTo(map);
	}
    });
}

function updateThreshold() {
    //
    updateGroupIds();
    //
    updateLinks();
    //
    updateNodes();
}

function buildCoords(){
    
    //
    cityNodes = graphCities.cities.map(city=>{
	return {"id":city.name,"group":0};
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
	    let line = L.polyline(latlngs, {color: 'red',weight:5*opacityScale(edges[key])+1});
	    lines[key] = line;
	}
    }
}

buildCoords();

loadInterface();
