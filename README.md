
Project D.A.D.O. (Data and Analysis for Decisions and Operations) was developed in partnership with Recife city hall and 
Porto Digital to help in the development of Business Intelligence and Analytics strategies in the fight against the pandemic. The
working groups, formed by researchers, engineers and epidemiologists, had the support of companies in Porto Digital, such as Incognia and Neurotech.

## Description

For better management and monitoring of an epidemic spread it is crucial to develop spatiotemporal analysis tools. 
Many dashboards encountered in the literature do not consider how the geolocation characteristics and travel patterns may 
influence the spread of the virus. This work brings interactive widgets that are capable to cross information about mobility patterns, 
geolocation characteristics and epidemiological variables so that health officials can understand how these factors act during an ongoing
pandemic to manage it, and to make better decisions to minimize the damage of future outbreaks. 

To do so, our system uses a mobility network, generated through anonymized mobile location data, which enables the division of a
region into representative clusters. The clusters' aggregated socioeconomic, demographic, and epidemiological indicators can be
analyzed through multiple coordinated views. We demonstrate the use of this tool through a case study based on a
region that has been significantly affected by the pandemic. The proposed tool was built and verified by experts assembled to give
scientific recommendations to policymakers. Our analysis shows how a policymaker could use the tool to evaluate different 
isolation scenarios considering the trade-off between economic activity and the pandemic's spread, where the practical insights can also
be used in a future outbreak.

## How to setup the tool for your region

After cloning the project, it is necessary to configure and application and import the required datasets. Here, the data of bairrosRecife 
application (https://nivan.github.io/covidClusters/bairrosRecife/) will be used as an example. Each application needs two files: 

- index.html: mainly used to import libraries and datasets 
- main.js: contains the code of the multiple coordinate views widgets. 

It is also necessary to create a 'data' directory containing the required datasets. In general, our approach requires two datasets:

- **Boundaries of a location**: Each location have geographical boundaries defined by a polygon. For the bairrosRecife application, 
  /data/boundariesBairros.js   contains the boundaries of each district of Recife. This dataset is included in the index.html as 
  <script src="../data/boundariesBairros.js"></script>.
- **Location variables**: Each location contains mobility, socioeconomic, demographic and epidemiological variables (MSDE). For the bairrosRecife application, 
  /data/boundariesBairros.js contains the MSDE variables of each district of Recife. This dataset is included in the index.html as 
  <script src="../data/boundariesBairros.js"></script>.
  
 The final step is to update the centroid and zoom properties of the leaflet map, according to the region that is being studied.

