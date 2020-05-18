class BarChartWidget{

    constructor(container,options,id,optionChangedCallback){
	this.container = container;
	this.options = options;
	this.id = id;
	this.optionChangedCallback = optionChangedCallback;
	this.init();
    }

    init(){
	let valueColumns = this.options;//
	let barChartDiv = this.container;
	let dropDownMenu = barChartDiv.append('div').append("select")
	    .attr("id",this.id + "ValueOption").attr("name",this.id + "ValueOption");
	dropDownMenu.selectAll("option")
            .data(valueColumns)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 0)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text);

	//
	let that = this;
	dropDownMenu.on("change",function(){
	    that.optionChangedCallback(this.selectedOptions[0].value);
	});
	
	//
	let svg = barChartDiv.append('svg').attr('width',300).attr('height',400);
	this.chart = new RowChart(svg,"rowChart",0,0,300,400);
    }

    getSelectedOption(){
	return d3.select('#' + this.id + "ValueOption").node().selectedOptions[0].value;
    }

    setXAxisLabel(xLabel){
	this.chart.setXAxisLabel(xLabel);
    }
    
    setYAxisLabel(yLabel){
	this.chart.setYAxisLabel(yLabel);
    }
    
    setData(dt){
	this.chart.setData(dt);
    }
}
