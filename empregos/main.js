//widgets
let map = undefined;
let bairros = {};
let currentMap = {};
// let barChart = undefined;
// let scatterplot = undefined;

//color scales
// let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7', '#ffffb3', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']);
// let casosConfirmadosColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
// let casosPCColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
// let riskExposureColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);

//
//
//
// let totalPopulation = 0;
// let dates = undefined;
// let currentDate = undefined;
// let casesByDate = {};
// let estimateCasesByDate = {};
//
// let option;
// let threshold = 0;
// let showSingletons = true;
// let showPolygons = false;
// let showGraph = false;
// let showBoundaries = false;
// let defaultStyle = {
// 	"weight": 0.5,
// 	"fillOpacity": 1.0,
// 	"radius": 5
// };
//
let layerBoundaries = undefined;
let mapNameBoundary = {};
let mapActivityBairro = {};
//
var selectedPopup = L.popup();

function updateBoundaries() {

	//
	let showLegend = false;

	for(let bairro in mapNameBoundary){
		mapNameBoundary[bairro].removeFrom(map);
	}


	//clear boundaries
	let scale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
	let domain = d3.extent(Object.keys(currentMap).map(c => currentMap[c]));
	scale.domain(domain);

	for (let bairro in currentMap) {
		let coeff = currentMap[bairro];
		let color = coeff == 0 ? 'white' : scale(coeff);
		let boundary = mapNameBoundary[bairro];
		boundary.options.fillColor = color;
		boundary.options.fillOpacity = 0.8;
		boundary.options.weight = 1;
		boundary.options.color = "gray";
		boundary.addTo(map);

		//
		let str = "Bairro: " + bairro + "</br>" + "Total Atividades: " + coeff;
		boundary.bindPopup(str);
		boundary.bringToBack()
	}


	updateLegend(scale, showLegend);

}
function updateLegend(scale) {
	//
	let canvas = d3.select("#legendDiv");
	canvas.selectAll("div")
		.remove();

	if (scale == undefined)
		return;

	//
	let legendData = [];//[{ "color": "white", "label": "0" }];
	let values = scale.thresholds();
	let colors = scale.range();
	let formatter = d3.format(".2s");//d3.format(".3e");

	values.forEach((d, i) => {
		if (i == 0) {
			legendData.push({ "color": colors[i], "label": "<" + formatter(values[i]) });
		}
		else {
			legendData.push({ "color": colors[i], "label": "[" + formatter(values[i - 1]) + "; " + formatter(values[i]) + "]" });
		}
	});
	legendData.push({ "color": colors[values.length], "label": "[" + formatter(values[values.length - 1]) + "; ∞]" });
	legendData.reverse();


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
	let index = clusters.indexOf(cluster);
	scatterplot.setSelected(index);
}

function loadMap() {
	//////// MAP
	map = L.map('map').setView([-8.07792545411762, -34.89995956420899], 12);

	var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		maxZoom: 20,
		attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	}).addTo(map);

	//
	layerBoundaries = L.geoJson(boundaries);
	for (let key in layerBoundaries._layers) {
		let item = layerBoundaries._layers[key];
		let name = item.feature.properties.bairro_nome_ca;
		if (!(item.feature.properties.bairro_nome_ca in bairros))
			console.log(name)
		mapNameBoundary[name] = item;
	}

	//
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
}

function selectionChanged() {
	//
	let activitySelected = d3.select(this).data()[0][0];
	let activityValues = mapActivityBairro[activitySelected];

	for (let key in currentMap) {
		if (this.checked)
			currentMap[key] += activityValues["bairros"][key];
		else
			currentMap[key] -= activityValues["bairros"][key];
	}

	updateBoundaries();
}

function beautifyText(s) {
	let size = s.length;
	let bugger = s[0].toUpperCase();
	for (let i = 1; i < size; ++i) {
		bugger += s[i].toLowerCase();
	}
	return bugger;
}

function loadActivitiesSelection() {
	let div = d3.select("#barchartDiv");
	div.append("span").text("Atividades");

	let dt = Object.keys(mapActivityBairro).map(c => [c, mapActivityBairro[c].desc]);
	dt.sort(function (a, b) {
		if (a[1] < b[1])
			return -1;
		if (a[1] > b[1])
			return 1;
		return 0;
	});

	let cbs = div.selectAll("input")
		.data(dt)
		.enter()
		.append("div")
		.selectAll("input")
		.data(d => [d]);

	cbs.enter().append("input")
		.attr("type", "checkbox")
		.attr("id", d => "a" + d[0])
		.on("change", selectionChanged);

	cbs.enter().append("span").text(d => beautifyText(d[1]));

	// 	<input type="checkbox" id="singletonsCB" class="filled-in"
	// 	name="singletonCB" checked></input>
	// <span>Show Singletons</span>
}

function loadInterface() {
	//
	let atividadesOptions = [{ "value": "cluster", "text": "A1" },
	{ "value": "cluster", "text": "A1" },
	{ "value": "cluster", "text": "A1" },
	{ "value": "cluster", "text": "A1" },
	{ "value": "cluster", "text": "A1" }];


	loadMap();

	loadActivitiesSelection();

}

function updatePolygons() {
	clusters.forEach(cluster => {
		let color = undefined;
		let polygon = cluster.polygon;
		if (polygon != undefined) {
			color = cluster.infected ? 'red' : 'blue';
			polygon.options.color = color;

			if (showPolygons) {
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
	updateBoundaries();
	//
	updateNodes();
	//
	scatterplot.update();
}

//
//buildCoords();

// default values
// threshold = (+d3.select("#threshold").node().value) / 10;
// showPolygons = (d3.select("#polygonsCB").node().checked);
// showGraph = (d3.select("#graphCB").node().checked);
// showBoundaries = (d3.select("#showBoundariesCB").node().checked);
// d3.select("#thSliderValue").text((threshold) + "%");
// option = 'cluster';

d3.csv("../data/atividades.csv").then(function (data) {
	//
	let aux = data.map(d => d.Bairro);
	aux.forEach(d => {
		bairros[d] = 1;
		currentMap[d] = 0;
	});

	//
	data.forEach(item => {
		if (!(item.Ativ_PE in mapActivityBairro)) {
			//
			let counter = {};
			for (let bairro in bairros) {
				counter[bairro] = 0;
			}
			//
			mapActivityBairro[item.Ativ_PE] = { "bairros": counter, "desc": item.Desc_Ativ_PE };
		}

		//
		mapActivityBairro[item.Ativ_PE]["bairros"][item.Bairro] = +item["Qtd Vínculos Ativos"];
	});
	//
	loadInterface();
}
)


