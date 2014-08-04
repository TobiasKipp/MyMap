var mapOptions = {};

/*
 * MyMap creates a OpenLayers map object and adds basic features and a BaseLayer to it.
 */
function MyMap(){
    var map = new OpenLayers.Map('map',mapOptions);
    this.timesteps = {};
    this.map = map;
    //Add control elements
    this.map.addControl(new OpenLayers.Control.LayerSwitcher());
    //Add the BaseLayer map
    this.addWMSBaseLayer("Worldmap OSGeo", "http://vmap0.tiles.osgeo.org/wms/vmap0?",
                         {layers: 'basic'}, {});
    };

/*
 * Add a BaseLayer to the map. Only one BaseLayer can be active at a time (selected with radiobox).
 */
MyMap.prototype.addWMSBaseLayer = function(name, url, params, options){
    wmsLayer = new OpenLayers.Layer.WMS(name, url, params, options);
    wmsLayer.isBaseLayer = true;
    this.map.addLayer(wmsLayer);
    };


/*
 * Add an Overlay that contains timesteps. 
 * For now the timesteps will be extracted from the WMS file using an external process.
 */

MyMap.prototype.addWMSOverlay = function(name, url, params, options){
    wmsLayer = new OpenLayers.Layer.WMS(name, url, params, options);
    wmsLayer.isBaseLayer = false;
    this.timesteps[wmsLayer.name] = this.getTimesteps(wmsLayer, url);
    this.map.addLayer(wmsLayer);
    };


MyMap.prototype.getTimesteps = function(layer, wmsurl){
    var processName = "WMS.GetTimesteps";
    var wpsUrl = "http://localhost:12345/wps";
    var request = (wpsUrl + '?dataInputs=layer_name=' + layer.name + ';wms_url=' + wmsurl + 
                   '&service=WPS&version=1.0.0&request=execute&rawdataoutput=timesteps&identifier=' + 
                   processName);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", request, false);
    xhr.setRequestHeader("pragma", "no-cache");
    xhr.send(null);
    return xhr.responseText.split(",");
    };
