//widgets
let map = undefined;
let bandeiras = {};
let rawData = {};
//color scales
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7', '#ffffb3', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']);
let casosConfirmadosColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let casosPCColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let riskExposureColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);

//
let mapIDBoundary = {};
let layerBoundaries = undefined;
let currentDate = undefined;

//
var selectedPopup = L.popup();

///////////// MAP

function updateBoundaries() {

    //
    let showLegend = false;
    let scale = d3.scaleOrdinal().domain([5,4,3,2,1]).range([d3.rgb(255,0,30).hex(),
							     d3.rgb(255,156,56).hex(),
							     d3.rgb(255,186,0).hex(),
							     d3.rgb(0,210,182).hex(),
							     d3.rgb(71,104,255).hex()]);

    //
    for(key in mapIDBoundary){
	let boundary = mapIDBoundary[key];
	if(bandeiras[key]>0)
	    boundary.options.fillColor = scale(bandeiras[key]);
	else
	    boundary.options.fillColor = "gray";
	boundary.options.fillOpacity = 0.8;
	boundary.options.weight = 1;
	boundary.options.color = "gray";
	boundary.addTo(map);
    }

    updateLegend(scale);
	
}
function updateLegend(scale) {
		//
	let canvas = d3.select("#legendDiv");
	canvas.selectAll("div")
		.remove();

	if(scale == undefined)
	return;

    //
    let legendData = [];//[{ "color": "white", "label": "0" }];
    let values = scale.domain();
    let colors = scale.range();
	
	values.forEach((d, i) => {
	    legendData.push({ "color": colors[i], "label": "Classe " + values[i]});
	});

    canvas.append("b")
	.text("Bandeiras");

    
	let elements = canvas.selectAll("div")
		.data(legendData)
		.enter()
		.append("div")
		.selectAll("i")
		.data(d => [d])
		.enter();

	elements
		.append("i")
		.attr("style", d => "border: 1px solid #000;background: " + d.color);
	elements
		.append("label")
		.text(d => d.label);

	//	 .attr("style",function(d){debugger});

	//update legend
	//;

	// loop through our density intervals and generate a label with a colored square for each interval
	// for (var i = 0; i < grades.length; i++) {
	//     div.innerHTML +=
	// 	'<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
	// 	grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
	// }
}

function boundaryClicked(cluster) {
	//
//	let index = clusters.indexOf(cluster);
//	scatterplot.setSelected(index);
}

function loadInterface() {
    //////// MAP
    let w = this.outerWidth;
    let h = this.outerHeight;

    d3.select("#map").attr("style","width:1000px;height:800px;");
	map = L.map('map').setView([-8.07792545411762, -34.89995956420899], 12);

	var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		maxZoom: 20,
		attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	}).addTo(map);

	//
	layerBoundaries = L.geoJson(boundaries);
	for (let key in layerBoundaries._layers) {
	    //
	    let item = layerBoundaries._layers[key]
	    if(item.feature.properties.bairro_nome in rawData){
		let data = rawData[item.feature.properties.bairro_nome];
		
		item.bindPopup("Nome: " + data.name + "</br>" + "Densidade Demográfica: " + data["densidade demografica 2019 (hab/km2)"] + "</br>"+ "Bandeira: " + data["Bandeira"]);
		
		//
		mapIDBoundary[item.feature.properties.bairro_nome] = item;
	    }
	    else{
		item.bindPopup("Nome: " + item.feature.properties.bairro_nome
			       + "Bandeira: 0");
		
		//
		mapIDBoundary[item.feature.properties.bairro_nome] = item;
	    }
	}

	// //
	// for (let n in nodes) {
	// 	let node = nodes[n];
	// 	node.boundary.on("click", function () { boundaryClicked(node.cluster) });
	// }

	//legend
	var legend = L.control({ position: 'bottomright' });
	legend.onAdd = function (map) {

		var div = L.DomUtil.create('div', 'info legend');
		div.setAttribute("id", "legendDiv");
		//     grades = [0, 10, 20, 50, 100, 200, 500, 1000],
		//     labels = [];

		// // loop through our density intervals and generate a label with a colored square for each interval
		// for (var i = 0; i < grades.length; i++) {
		//     div.innerHTML +=
		// 	'<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
		// 	grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
		// }

		return div;
	};
    legend.addTo(map);

    updateBoundaries();
}

function updateDate() {
	for (let name in nodes) {
		let node = nodes[name];
		node["active_cases"] = casesByDate[name][currentDate];
		node['est_active_cases'] = estimateCasesByDate[name][currentDate];
		//
		let circle = nodeMarkers[name];
		circle.bindPopup('Name: ' + node.name + '</br>' + 'Active Cases: ' + node.active_cases + '</br>' + 'Estimated Active Cases: ' + node.est_active_cases);
	}
	updateThreshold();
	barChartOptionChanged(barChart.getSelectedOption());
}

//generate random data
let names = boundaries.features.map(d=>d.properties.bairro_nome);
currentDate = '2020-06-10';

names.forEach(n=>{
    bandeiras[n] = -1;//Math.ceil(Math.random()*10000)%5 + 1;
});

d3.csv("../data/bandeiras.csv").then(function(data){
    //
    data.forEach(item=>{
	if(item.name in bandeiras){
	    bandeiras[item.name] = +item.Class;
	    rawData[item.name]   = item;
	}
	else{
	    console.log(item.name);
	}
    });

    //
    loadInterface();

});
