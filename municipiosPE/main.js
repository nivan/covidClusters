//widgets
let map = undefined;
let barChart = undefined;
let scatterplot = undefined;

//color scales
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7', '#ffffb3', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']);
let casosConfirmadosColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let casosPCColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let riskExposureColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);

//
let layerBoundaries = undefined;

//
let totalPopulation = 0;
let dates = undefined;
let currentDate = undefined;
let casesByDate = {};
let estimateCasesByDate = {};
//
let option;
let threshold = 0;
let showSingletons = true;
let showPolygons = false;
let showGraph = false;
let showBoundaries = false;
let defaultStyle = {
	"weight": 0.5,
	"fillOpacity": 1.0,
	"radius": 5
};
let infectedNodes = {};

// graph
let nodes = []; // {name:,{...}}
let links = []; // [{"source", "target", "value"}]

//markers
let nodeMarkers = {}; // name -> marker
let lines = {}; // n1_n2-> lineMarker
let clusters = [];
let clusterPolygons = [];

//
var selectedPopup = L.popup();



/////////////BAR CHART

function isInfected(node) {
	return node.active_cases > 0;
}

function scatterplotOptionChanged(opt) {
	
	if (scatterplot) {
		let mydata = [];
		clusters.forEach((cluster, i) => {
			if (cluster.size > 1 || showSingletons) {
				//
				let populations = cluster.nodes.map((d, i) => {
					return [nodes[d].population_2019, d]
				});
				populations.sort(function (a, b) { return b[0] - a[0] });
				let mostPopulous = populations[0][1];
				//
				let x = getClusterIndicator(cluster, opt[0]);
				let y = getClusterIndicator(cluster, opt[1]);
				if (x != undefined && y != undefined) {
					mydata.push([x, y, cluster.color, i, mostPopulous]);
				}
			}
		});
		//
		scatterplot.setXAxisLabel(opt[2]);
		scatterplot.setYAxisLabel(opt[3]);
		scatterplot.setData(mydata);
	}
}

function barChartOptionChanged(opt) {
	let data = [];
	if (opt.value == 'cases') {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node.active_cases });
		}
		barChart.setXAxisLabel('Num Active Cases');
	}
	else if (opt.value == 'casesPC') {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node.active_cases / node.population_2019 });
		}
		barChart.setXAxisLabel('Active Cases Per Capita');
	}
	else if (opt.value == 'riskExposure') {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node.RiskExposure });
		}
		barChart.setXAxisLabel('Risk Exposure');
	}
	else if (opt.value == 'rendaPC') {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node.rdpc["mean"] });
		}
		barChart.setXAxisLabel('Per Capita Income');
	}
	else if (opt.value == 'rendaPCNZ') {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node.rdpct["mean"] });
		}
		barChart.setXAxisLabel('Per Capita Income (NZ)');
	}
	else {
		for (let name in nodes) {
			let node = nodes[name];
			data.push({ 'key': name, 'value': node[opt.value] });
		}
		barChart.setXAxisLabel(opt.text);
	}


	data = data.sort(function (a, b) { return b.value - a.value }).slice(0, 7);
	barChart.setData(data);
}

function barSelectedCallback(d) {
	let node = nodes[d];
	selectedPopup.setLatLng({ lat: node.lat, lng: node.lng })
		.setContent("Name: " + d)
		.openOn(map);

}

function loadBarChart() {

	//
	let opts = [{ "text": "Casos Ativos", "value": "cases" },
	{ "text": "Casos Ativos Per Capita", "value": "casesPC" },
	{ "text": "Salário médio mensal dos trabalhadores formais", "value": "salMedFor" },
	{ "text": "IDH", "value": "idhm" },
	{ "text": "Unidades de Saúde SUS", "value": "unidSus" },
	{ "text": "População ocupada (%)", "value": "popOcup" },
	{ "text": "PIB per capita", "value": "pibPC" },
	{ "text": "Pop. com rendimento menor 1/2 salário", "value": "popRendNom" }
	];


	let myDiv = d3.select("#barchartDiv");

	barChart = new BarChartWidget(d3.select("#barchartDiv"), opts, "barChart", barChartOptionChanged);
	barChart.setSelectionCallback(barSelectedCallback);

	//
	barChartOptionChanged(barChart.getSelectedOption());
}

function scatterPointSelected(id) {
	if (id == undefined) {
		selectedPopup.removeFrom(map);
	}
	else {
		let selCluster = clusters[id];
		let node = nodes[selCluster.nodes[0]];

		//{lat: 51.49901887040356, lng: -0.08342742919921876}
		let suffix = (selCluster.infected) ? 'Force of Infection: ' + selCluster.forceOfInfection.toFixed(3) : 'Risk Exposure: ' + selCluster.riskExposure.toFixed(3);
		selectedPopup.setLatLng({ lat: node.lat, lng: node.lng })
			.setContent("Cluster selecionado " + "</br>" +
				"No Municípios: " + selCluster.size + "</br>" +
				"População: " + selCluster.population +
				"Casos Ativos: " + selCluster.activeCases + "</br>" +
				suffix
			)
			.openOn(map);
	}
	//nodeMarkers[selCluster.nodes[0]].openPopup();

}

function loadScatterplot() {
	let opts = [{ "text": "Casos Ativos", "value": "cases" },
	{ "text": "Casos Ativos Per Capita", "value": "casesPC" },
	{ "text": "População", "value": "population" },
	{ "text": "Exposição ao Risco", "value": "riskExposure" },
	{ "text": "Força da Infecção", "value": "foi" },
	{ "text": "Salário médio mensal dos trabalhadores formais", "value": "salMedFor" },
	{ "text": "IDH", "value": "idhm" },
	{ "text": "No Unidades de Saúde SUS", "value": "unidSus" },
	{ "text": "População ocupada (%)", "value": "popOcup" },
	{ "text": "PIB per capita", "value": "pibPC" },
	{ "text": "Pop. com rendimento menor 1/2 salário", "value": "popRendNom" }
	];
	opts.sort(function (x, y) {
		let nameA = x.text;
		let nameB = y.text;

		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		// names must be equal
		return 0;
	});

	scatterplot = new ScatterplotWidget(d3.select("#scatterDiv"), opts, "scat", scatterplotOptionChanged);
	scatterplot.setSelectionCallback(scatterPointSelected);
}



///////////// MAP


function getClusterIndicator(cluster, indName) {

	if (indName == 'cases') {
		return cluster.activeCases;
	}
	else if (indName == 'population') {
		return cluster.population;
	}
	else if (indName == 'casesPC') {
		return cluster.activeCases / cluster.population;
	}
	else if (indName == 'riskExposure') {
		if (cluster.infected)
			return undefined;
		else
			return cluster.riskExposure;
	}
	else if (indName == 'foi') {
		if (cluster.infected)
			return cluster.forceOfInfection;
		else
			return undefined;
	}
	else if (indName == 'rdpct' || indName == 'domvulneracomid') {
		let result = 0;
		cluster.nodes.forEach(n => {
			let node = nodes[n];
			result += ((node.population_2019 / cluster.population) * node[indName]["mean"]);
		});
		return result;
	}
	else {
		let result = 0;
		cluster.nodes.forEach(n => {
			let node = nodes[n];
			result += ((node.population_2019 / cluster.population) * node[indName]);
		});
		return result;
	}
}

function getIndicator(node, indName) {

	if (indName == 'cases') {
		return node.est_active_cases;
	}
	else if (indName == 'casesPC') {
		return node.est_active_cases / node.population_2019;
	}
	else if (indName == 'riskExposure') {
		if (isInfected(node))
			return undefined;
		else
			return node.riskExposure;
	}
	else if (indName == 'foi') {
		if (isInfected(node))
			return node.forceOfInfection;
		else
			return undefined;
	}
	else {
		debugger
	}
}

function updateNodes() {
	for (let name in nodes) {
		let node = nodes[name];
		var circle = nodeMarkers[node.name];
		circle.removeFrom(map);
	}


	if (showGraph) {

		clusters.forEach(cl => {
			cl.nodes.forEach(n => {
				var circle = nodeMarkers[n];
				circle.options.fillColor = circle.options.clusterColor;
				if (cl.size > 1 || showSingletons) {
					circle.addTo(map);
					circle.bringToFront();
				}
			});
		});


	}


}

function updateLinks() {

	for (let key in lines) {
		let line = lines[key];
		line.removeFrom(map);
		line.decorator.removeFrom(map);
	}

	//add lines
	let opacityScale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
	for (let key in lines) {
		let line = lines[key];
		if (showGraph && line.options.value > threshold) {
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

	}
}

function updateBoundaries() {

	//
	let nodesList = [];
	for (let n in nodes) {
		let node = nodes[n];
		nodesList.push(node);
		node.boundary.removeFrom(map);
	}
	//clear boundaries
	let scale = undefined;
	if (showBoundaries) {
		//
		if (option == 'cluster') {
			clusters.forEach(cluster => {
				cluster.nodes.forEach(n => {
					let node = nodes[n];

					if (cluster.size > 1 || showSingletons) {
						node.boundary.options.fillColor = cluster.color;
						node.boundary.options.fillOpacity = 0.8;
						node.boundary.options.weight = 1;
						node.boundary.options.color = "gray";
						node.boundary.addTo(map);
						node.boundary.bringToBack()
					}
				});
			});
		}
		else if (option == 'apl') {
			let aplScale = d3.scaleOrdinal().domain(["nenhum", "Laticínios", "Gesso", "Confecção", "Vitivinicultura"]).range(['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0']);
			clusters.forEach(cluster => {
				cluster.nodes.forEach(n => {
					let node = nodes[n];

					if (cluster.size > 1 || showSingletons) {
						node.boundary.options.fillColor = aplScale(node.apl);
						node.boundary.options.fillOpacity = 0.8;
						node.boundary.options.weight = 1;
						node.boundary.options.color = "gray";
						node.boundary.addTo(map);
						node.boundary.bringToBack()
					}
				});
			});

			updateLegend(aplScale, true);
		}
		else {
			scale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
			if (option == 'cases') {
				let domain = d3.extent(nodesList, d => d.active_cases);
				scale.domain(domain);
				clusters.forEach(cluster => {
					cluster.nodes.forEach(n => {
						let node = nodes[n];
						if (cluster.size > 1 || showSingletons) {
							let coeff = node.active_cases;
							let color = coeff == 0 ? 'white' : scale(coeff);
							node.boundary.options.fillColor = color;
							node.boundary.options.fillOpacity = 0.8;
							node.boundary.options.weight = 1;
							node.boundary.options.color = "gray";
							node.boundary.addTo(map);
							node.boundary.bringToBack()
						}
					});
				});
			}
			else if (option == 'casesPC') {
				let domain = d3.extent(nodesList, d => d.active_cases / d.population_2019);
				scale.domain(domain);
				clusters.forEach(cluster => {
					cluster.nodes.forEach(n => {
						let node = nodes[n];
						if (cluster.size > 1 || showSingletons) {
							let coeff = node.active_cases / node.population_2019;
							let color = coeff == 0 ? 'white' : scale(coeff);
							node.boundary.options.fillColor = color;
							node.boundary.options.fillOpacity = 0.8;
							node.boundary.options.weight = 1;
							node.boundary.options.color = "gray";
							node.boundary.addTo(map);
							node.boundary.bringToBack()
						}
					});
				});
			}
			else {
				let domain = d3.extent(nodesList, d => d[option]);
				scale.domain(domain);
				clusters.forEach(cluster => {
					cluster.nodes.forEach(n => {
						let node = nodes[n];
						if (cluster.size > 1 || showSingletons) {
							let coeff = node[option];
							let color = coeff == 0 ? 'white' : scale(coeff);
							node.boundary.options.fillColor = color;
							node.boundary.options.fillOpacity = 0.8;
							node.boundary.options.weight = 1;
							node.boundary.options.color = "gray";
							node.boundary.addTo(map);
							node.boundary.bringToBack()
						}
					});
				});
			}
			updateLegend(scale, false);
		}
	}
}
function updateLegend(scale, discreteLegend) {
	//
	let canvas = d3.select("#legendDiv");
	canvas.selectAll("div")
		.remove();

	if (scale == undefined)
		return;

	if (discreteLegend) {
		//
		debugger
		let legendData = [];
		let domain = scale.domain();
		domain.forEach(d=>{
			legendData.push({ "color": scale(d), "label": d });
		});
	
		let elements = canvas.selectAll("div")
			.data(legendData)
			.enter()
			.append("div")
			.selectAll("i")
			.data(d => [d])
			.enter();
		debugger
		elements
			.append("i")
			.attr("style", d => "border: 1px solid #000;background: " + d.color);
		elements
			.append("label")
			.text(d => d.label);
	}
	else {
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
	}

}

function boundaryClicked(cluster) {
	//
	let index = clusters.indexOf(cluster);
	scatterplot.setSelected(index);
}

function loadInterface() {
	//
	let colorByOptions = [
		{ "value": "cluster", "text": "Cluster ID" },
		{ "value": "apl", "text": "APL" },
		{ "value": "cases", "text": "Active Cases" },
		{ "value": "casesPC", "text": "Active Cases Per Capita" },
		{ "text": "Salário médio mensal dos trabalhadores formais", "value": "salMedFor" },
		{ "text": "IDH", "value": "idhm" },
		{ "text": "No Unidades de Saúde SUS", "value": "unidSus" },
		{ "text": "População ocupada (%)", "value": "popOcup" },
		{ "text": "PIB per capita", "value": "pibPC" },
		{ "text": "Pop. com rendimento menor 1/2 salário", "value": "popRendNom" }
	];


	d3.select("#colorSelect")
		.selectAll("option")
		.data(colorByOptions)
		.enter()
		.append("option")
		.attr("value", d => d.value)
		.text(d => d.text)

	//////// CONTROLS
	d3.select("#threshold").on("change", function (v) {
		//console.log(+this.value);
		d3.select("#thSliderValue").text((+this.value) / 10 + "%");
		threshold = (+this.value) / 10;
		updateThreshold();
	});

	d3.select("#showBoundariesCB").on("change", function (v) {
		showBoundaries = this.checked;
		updateBoundaries();
	});

	d3.select("#singletonsCB").on("change", function (v) {
		showSingletons = this.checked;
		updateThreshold();
	});

	d3.select("#polygonsCB").on("change", function (v) {
		showPolygons = this.checked;
		updatePolygons();
	});

	d3.select("#colorSelect").on("change", function () {
		option = this.selectedOptions[0].value;
		updateBoundaries();

	});

	d3.select("#graphCB").on("change", function () {
		showGraph = this.checked;
		updateLinks();
		updateNodes();
	});


	//////// MAP
	map = L.map('map').setView([-9.069551294233216, -39.12231445312501], 7);

	var Stadia_AlidadeSmooth = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		maxZoom: 20,
		attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
	}).addTo(map);

	//
	layerBoundaries = L.geoJson(munPE);
	for (let key in layerBoundaries._layers) {
		let item = layerBoundaries._layers[key];
		if (item.feature.properties.name in nodes) {
			nodes[item.feature.properties.name].boundary = item;
			item.addTo(map);
			let center = item.getCenter();
			nodes[item.feature.properties.name].lat = center.lat;
			nodes[item.feature.properties.name].lng = center.lng;
			nodeMarkers[item.feature.properties.name].setLatLng(center);
			item.removeFrom(map);
		}
		else
			console.log(item.feature.properties.name);
	}

	for (let key in lines) {
		let tokens = key.split("_");
		let nOrigin = tokens[0];
		let nDestination = tokens[1];
		let nodeOrigin = nodes[nOrigin];
		let nodeDestination = nodes[nDestination];
		let line = lines[key];
		line.setLatLngs([[nodeOrigin.lat, nodeOrigin.lng], [nodeDestination.lat, nodeDestination.lng]]);
	}

	//
	for (let n in nodes) {
		let node = nodes[n];
		node.boundary.on("click", function () {
			boundaryClicked(node.cluster)
		});
	}

	//
	var credits = L.control({ position: 'bottomleft' });
	credits.onAdd = function(){
		var div = L.DomUtil.create('div', 'info legend');
		div.setAttribute("id", "creditsDiv");
		return div;
	};
	credits.addTo(map);
	d3.select("#creditsDiv")
	.append("a")
	.attr("href","http://www.cin.ufpe.br/")
	.attr("target","_blank")
		.append("img")
		.attr("height",50)
		.attr("src","../data/cinLogo.png");

	
	d3.select("#creditsDiv")
		.append("img")
		.attr("height",30)
		.attr("src","../data/inlocoLogo.png");

	d3.select("#creditsDiv")
		.append("div")
		.append("text");

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

	//
	loadBarChart();

	//
	loadScatterplot();

	//
	updateThreshold();

	//
	scatterplotOptionChanged(["casesPC", "unidSus", "Casos Ativos Per Capita", "No Unidades de Saúde SUS"]);
}

function connectedComponents(adj) {
	let numVertices = adj.length
	let visited = new Array(numVertices)
	for (let i = 0; i < numVertices; ++i) {
		visited[i] = false
	}
	let components = []
	for (let i = 0; i < numVertices; ++i) {
		if (visited[i]) {
			continue
		}
		let toVisit = [i]
		let cc = [i]
		visited[i] = true
		while (toVisit.length > 0) {
			let v = toVisit.pop()
			let nbhd = adj[v]
			for (let j = 0; j < nbhd.length; ++j) {
				let u = nbhd[j]
				if (!visited[u]) {
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

function updateGroupIds() {
	//var cc = require("connected-components")

	let mapCityIndex = {};
	let mapIndexCity = {};
	let adjList = [];
	let nodeStrength = {};
	//
	let i = 0;
	for (const name in nodes) {
		let node = nodes[name];
		nodeStrength[name] = 0;
		mapCityIndex[node.name] = i;
		mapIndexCity[i] = node.name;
		adjList.push([]);
		i += 1;
	}
	//
	for (const source in nodes) {
		let node = nodes[source];
		for (const target in node.outEdges) {
			let weight = node.outEdges[target];
			if (weight > threshold) {
				//
				nodeStrength[source] += weight;
				if (source != target) //garante que arcos só somam uma vez
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
	clusters.forEach(cl => {
		if (cl.polygon != undefined) {
			cl.polygon.removeFrom(map);
		}
		cl.nodes.forEach(n => { n.cluster = undefined; });
	});
	clusters = [];


	//
	let ccs = connectedComponents(adjList);
	let count = 0;
	ccs.forEach(cc => {
		let cluster = { size: cc.length, polygon: undefined, infected: false, riskExposure: 0, population: 0, activeCases: 0, estActiveCases: 0, forceOfInfection: 0, nodes: [] };
		if (cc.length == 1) {
			//singleton
			let name = mapIndexCity[cc[0]];
			let node = nodes[name];
			node.cluster = cluster;
			//update clusters
			cluster.infected = isInfected(node);
			cluster.riskExposure = node.riskExposure;
			cluster.population = node.population_2019;
			cluster.activeCases = node.active_cases;
			cluster.estActiveCases = node.est_active_cases;
			cluster.forceOfInfection = (cluster.estActiveCases / cluster.population) * (node.name in node.outEdges ? node.outEdges[node.name] : 0);
			cluster.nodes = [name];
			//show cluster as singletons
			let color = "#bebada";
			nodeMarkers[name].options.clusterColor = color;
			nodeMarkers[name].options.singleton = true;
			cluster.color = color;
		}
		else {
			//
			let clusterInfected = false;
			let clusterRiskExposure = 0;
			let clusterPopulation = 0;
			let clusterActiveCases = 0;
			let clusterEstActiveCases = 0;
			let clusterForceOfInfection = 0;
			let clusterStrength = 0;
			let clusterPoints = [];
			let color = clusterColorScale(count % 11);//clusterColorScale(d3.min(cc)%11);
			//
			cluster.nodes = cc.map(i => mapIndexCity[i]);
			cc.forEach(index => {
				let name = mapIndexCity[index];
				let node = nodes[name];
				node.cluster = cluster;
				//
				clusterPopulation += node.population_2019;
				clusterActiveCases += node.active_cases;
				clusterEstActiveCases += node.est_active_cases;
				clusterRiskExposure += node.riskExposure;
				clusterStrength += nodeStrength[name];
				clusterInfected = clusterInfected || isInfected(node);
				//
				nodeMarkers[name].options.clusterColor = color;
				nodeMarkers[name].options.singleton = false;
				//
				let leafletLatLng = nodeMarkers[name].getLatLng();
				clusterPoints.push(turf.point([leafletLatLng.lat, leafletLatLng.lng]));
			});

			clusterForceOfInfection = (clusterEstActiveCases / clusterPopulation) * (clusterStrength / cc.length);

			//Compute hull
			clusterPoints = turf.featureCollection(clusterPoints);
			let options = { units: 'kilometers', maxEdge: 150 };
			let myhull = turf.concave(clusterPoints, options);
			//let myhull = turf.convex(clusterPoints);	    
			//
			if (myhull == undefined) {
				cluster.polygon = undefined;
			}
			else {
				//POLYGON
				let opt = clusterInfected ? { color: 'red' } : { color: 'blue' };
				opt['opacity'] = 1;
				opt['riskExposure'] = clusterRiskExposure;
				opt['infected'] = clusterInfected;
				let polygon = L.polygon(myhull.geometry.coordinates[0], opt);
				let str = "Population: " + clusterPopulation + "</br>" +
					"Percentage of Population: " + (100 * clusterPopulation / totalPopulation).toFixed(3) + "%<br>";
				if (clusterInfected)
					str += 'Force of Infection: ' + clusterForceOfInfection.toFixed(3);
				else
					str += 'Risk Exposure: ' + clusterRiskExposure.toFixed(3);

				polygon.bindPopup(str);
				cluster.polygon = polygon;
			}

			//update cluster
			cluster.infected = clusterInfected;
			cluster.riskExposure = clusterRiskExposure;
			cluster.population = clusterPopulation;
			cluster.activeCases = clusterActiveCases;
			cluster.estActiveCases = clusterEstActiveCases;
			cluster.forceOfInfection = clusterForceOfInfection;
			cluster.color = color;

			//
			count += 1;
		}
		//
		clusters.push(cluster);
	});
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

function getProbInfection(node) {
	return node.active_cases / node.population_2019;
}

function updateDate() {
	for (let name in nodes) {
		let node = nodes[name];
		node["active_cases"] = casesByDate[name][currentDate];
		node['est_active_cases'] = estimateCasesByDate[name][currentDate];
		//
		let circle = nodeMarkers[name];
		circle.bindPopup('Nome: ' + node.name + '</br>' + 'Casos ativos: ' + node.active_cases + '</br>' + 'Casos Ativos Estimados: ' + node.est_active_cases);
	}
	updateThreshold();
	barChartOptionChanged(barChart.getSelectedOption());
}



function buildCoords() {

	//
	dates = [];
	for (let i = 0; i < graph[0].active_cases.length; ++i) {
		if (i % 2 == 0)
			dates.push(graph[0].active_cases[i][0]);
	}
	currentDate = dates[0];

	d3.select("#dateSelect")
		.selectAll("option")
		.data(dates)
		.enter()
		.append("option")
		.attr("value", d => d)
		.text(d => d);

	d3.select("#dateSelect")
		.on("change", function () {
			currentDate = this.selectedOptions[0].value;
			updateDate();
		});

	//
	nodes = {};
	graph.forEach(node => {
		//
		let cases = {};
		let estCases = {};
		node.active_cases.forEach(x => {
			cases[x[0]] = x[1];
			estCases[x[0]] = x[1] / 0.2;
		});
		casesByDate[node.name] = cases;
		estimateCasesByDate[node.name] = estCases;

		//
		nodes[node.name] = {
			"group": 0,
			"name": node.name,
			"population_2019": node.population_2019,
			"lat": node.lat,
			"lng": node["long"],
			"riskExposure": 0,
			"cluster": undefined,
			"active_cases": cases[currentDate],
			'est_active_cases': estCases[currentDate],
			// "sobre60": node["SOBRE"]["SOBRE60"],
			// "rdpc": node["RDPC"].RDPC,
			// "rdpct": node["RDPCT"],
			// "pagro": node["P_AGRO"],
			// "pcom": node["P_COM"],
			// "pconstr": node["P_CONSTR"],
			// "pextr": node["P_EXTR"],
			// "pserv": node["P_SERV"],
			// "psiup": node["P_SIUP"],
			// "ptransf": node["P_TRANSF"],
			// "prmaxidoso": node["T_RMAXIDOSO"],
			// "domvulneracomid": node["DOMVULNERACOMID"],
			"salMedFor": node["Salário médio mensal dos trabalhadores formais"],
			"idhm": node["Índice de Desenvolvimento Humano Municipal (IDHM)"],
			"unidSus": +node["Unidades de Saúde SUS"],
			"popOcup": +node["População ocupada (%)"],
			"pibPC": +node["PIB per capita"],
			"popRendNom": +node["Percentual da população com rendimento nominal mensal per capita de até 1/2 salário mínimo (%)"],
			"apl": node["APL"],
			// "idhme": node["IDHM_E"],
			// "idhml": node["IDHM_L"],
			// "idhmr": node["IDHM_R"],
			inEdges: {},
			outEdges: {}
		};
		//
		totalPopulation += nodes[node.name].population_2019;
	});

	//
	let listNodes = [];
	graph.forEach(node => {
		listNodes.push(nodes[node.name]);
		let probInfection = getProbInfection(nodes[node.name]);
		let myNode = nodes[node.name];
		//
		for (let i in node.edge_weights) {
			//
			let t = i.slice(5); //neighborh
			let otherNode = nodes[t];

			//
			if (node.edge_weights[i] > 0) {
				let weight = 100 * node.edge_weights[i];
				myNode.outEdges[t] = weight;
				otherNode.inEdges[node.name] = weight;
			}
			//
			if (nodes[t] == undefined)
				debugger
			nodes[t].riskExposure += (probInfection * node.edge_weights[i]);
		}

	});

	//fix color scales
	////
	casosConfirmadosColorScale.domain(d3.extent(listNodes, d => getIndicator(d, 'cases')));
	////
	casosPCColorScale.domain(d3.extent(listNodes, d => getIndicator(d, 'casesPC')));
	////
	let exposures = [];
	for (let name in nodes) {
		exposures.push(nodes[name].riskExposure.push);
	}
	riskExposureColorScale.domain(d3.extent(exposures));



	//
	graph.forEach(nn => {
		let node = nodes[nn.name];
		let coords = [node.lat, node.lng];
		var circle = L.circleMarker(coords, {
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
	let opacityScale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
	for (let origin in nodes) {
		let node = nodes[origin];

		for (let destination in node.outEdges) {
			let otherNode = nodes[destination];

			if (origin != destination) {
				let weight = node.outEdges[destination];

				//create graphic representation
				let latlngs = [[node.lat, node.lng], [otherNode.lat, otherNode.lng]];
				let line = L.polyline(latlngs, { 'color': 'gray', 'weight': 10 * opacityScale(weight) + 1, 'value': weight, 'opacity': 0.1 });
				let decorator = L.polylineDecorator(line, {
					patterns: [
						{ offset: '95%', repeat: 0, symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: true, pathOptions: { color: 'gray', stroke: true } }) }
					]
				});
				//
				line.decorator = decorator;
				lines[origin + "_" + destination] = line;
			}

		}
	}
}

//
buildCoords();

// default values
threshold = (+d3.select("#threshold").node().value) / 10;
showPolygons = (d3.select("#polygonsCB").node().checked);
showGraph = (d3.select("#graphCB").node().checked);
showBoundaries = (d3.select("#showBoundariesCB").node().checked);
d3.select("#thSliderValue").text((threshold) + "%");
option = 'cluster';


//
loadInterface();
