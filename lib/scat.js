class Scatterplot{
    constructor(container,widgetID,screenX,screenY,totalWidth,totalHeight) {
	this.renderingArea =
	    {x:screenX,y:screenY,
	     width:totalWidth,height:totalHeight};
	this.margins = {left:65,right:15,
			top:5,bottom:5};
	this.canvasWidth = this.renderingArea.width - this.margins.left - this.margins.right;
	this.canvasHeight = this.renderingArea.height - this.margins.top - this.margins.bottom;
	this.widgetID = widgetID;
	//
	this.canvas = container
	    .append("g")
	    .attr("id","plot_" + widgetID)
	    .attr("transform","translate("+
		  (this.renderingArea.x+this.margins.left) + ", " + (this.renderingArea.y+this.margins.top) + ")");
	//
	this.data = [];	
	//Criacao da escala do eixo X e do objeto eixo X
	this.xScale = d3.scaleLinear()
	    .range([0,this.canvasWidth]);
	this.xAxis  = d3.axisBottom(this.xScale);
	//
	this.xAxis.tickFormat(d3.format(".2"))
	this.xAxis.ticks(5);
	//
	this.canvas
	    .append("g")
	    .attr("class","xAxis")
	    .attr("transform","translate(0," + this.canvasHeight  + ")");

	//Criacao da escala do eixo Y e do objeto eixo Y
	this.yScale = d3.scaleLinear()
	    .range([this.canvasHeight,0]);
	this.yAxis  = d3.axisLeft(this.yScale);
	//
	this.yAxis.tickFormat(d3.format(".2"));
	this.yAxis.ticks(5);
	//
	this.canvas
	    .append("g")
	    .attr("class","yAxis");
	//
	this.selectionCallback = undefined;

	//Criacao do grupo relativo a operacao de brush e implementacao do brush
	var plot = this;
	var brushGroup = this.canvas.append("g").attr("class","brush");
	this.brush = d3.brush()
	    .on("start",function(){
		plot.canvas.selectAll("circle").attr("fill","black");
	    })
	    .on("brush",function(){
		var selectedPoints = [];
		var selection = d3.event.selection;
		plot.canvas.selectAll("circle")
		    .attr("fill",function(d,i){
			var x = plot.xScale(d[0]);
			var y = plot.yScale(d[1]);
			if(selection[0][0]<=x && x<=selection[1][0] && //Checagem para observar se ponto esta dentro da selecao
			   selection[0][1] <= y && y <= selection[1][1]){ //do brush, mudando a cor para laranja em caso positivo
			    selectedPoints.push(i);
			    return "orange";
			}
			else
			    return "black";
		    });
		//
		if(plot.selectionCallback)
		    plot.selectionCallback(selectedPoints);
	    });
	brushGroup.call(this.brush);

	//
	this.canvas.append("text").attr("id",widgetID + "_labelXAxis");
	this.canvas.append("text").attr("id",widgetID + "_labelYAxis");
	this.canvas.append("text").attr("id",widgetID + "_title");
	this.xLabel = "";
	this.yLabel = "";
	this.title = "";

	//
	this.updatePlot();
    }
    
    setXAxisLabel(xLabel) {
	this.xLabel = xLabel;
    }

    setSelected(indices){
	this.canvas.selectAll("circle")
	    .attr("fill",function(d,i){
		if(indices.indexOf(i) != -1){
		    return "blue";
		}
		else{
		    return "black";
		}
	    })
    }
    
    setSelectionCallback(f){
	this.selectionCallback = f;
    }
    
    setTitle(t){
	this.title = t;
    }


    setYAxisLabel(yLabel) {
	this.yLabel = yLabel;
    }
    
    //Funcao que recebe novos dados e ajusta scatterplot (eixos  e pontos) de acordo
    setData(newData) {
	//
	this.data = newData;
	//
	this.xScale.domain(d3.extent(newData,d=>d[0]));
	this.yScale.domain(d3.extent(newData,d=>d[1]));
	//
	this.updatePlot();
    }

    updateAxis() {
	var canvasWidth = this.canvasWidth;
	var canvasHeight = this.canvasHeight;

	//text label for the x axis
	this.xAxis.tickFormat(d3.format(".0s"));
	this.xAxis(this.canvas.select(".xAxis"));
	this.canvas.select("#" + this.widgetID + "_labelXAxis")
	    .attr("x",(canvasWidth/2.0))
	    .attr("y",(canvasHeight + this.margins.top + 30))
	    .style("text-anchor", "middle")
	    .text(this.xLabel);

	//text label for the y axis
	this.yAxis.tickFormat(d3.format(".0s"));
	this.yAxis(this.canvas.select(".yAxis"));
	this.canvas.select("#" + this.widgetID + "_labelYAxis")
	    .attr("transform", "rotate(-90)")
	    .attr("y", 23- this.margins.left)
	    .attr("x",0 - (canvasHeight / 2))
	    .style("text-anchor", "middle")
	    .text(this.yLabel);

	//
	this.canvas.select("#" + this.widgetID + "_title")
	    .attr("x",(canvasWidth/2.0))
	    .attr("y",5)
	    .style("text-anchor", "middle")
	    .text(this.title);
    }    
    
    updateDots() {
	var circles = this.canvas.selectAll("circle").data(this.data);
	circles.exit().remove();
	var plot = this;
	circles
	    .enter()
	    .append("circle")
	    .merge(circles)
	    .attr("cx",d=>plot.xScale(d[0]))
	    .attr("cy",d=>plot.yScale(d[1]))
	    .attr("r",5)
	    .attr("stroke","black")
	    .attr("fill",d=>d[2]);
    }
    
    updatePlot(){
	this.updateAxis();
	this.updateDots();
    }       
}
