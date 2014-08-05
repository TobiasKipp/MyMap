/*
 * Intersection method based on https://gist.github.com/jamiehs/3364281
 */
function intersection(a,b){
    return $.map(a, function(x){return $.inArray(x, b) < 0 ? null : x;});
}


var mapOptions = {};

/*
 * MyMap creates a OpenLayers map object and adds basic features and a BaseLayer to it.
 */
function MyMap(){
    var map = new OpenLayers.Map('map',mapOptions);
    this.timesteps = {};
    this.layers = {};
    this.map = map;
    //Add control elements
    this.layerSwitcher = new OpenLayers.Control.LayerSwitcher();
    this.map.addControl(this.layerSwitcher);
    this.frameIndex=0;
    this.frameTimes = [];
    //Add the BaseLayer map
    this.addWMSBaseLayer("Worldmap OSGeo", "http://vmap0.tiles.osgeo.org/wms/vmap0?",
                         {layers: 'basic'}, {});
    var _this = this;
    $("#nextframe").click(function(){_this.nextFrame();});
    };

MyMap.prototype.nextFrame = function(){
    //TODO: Move find visible overlays and frameTimes update to an event or something, to save
    //unnecessary processing at every step.
    //find visible overlays
    visibleOverlays = []
    for (name in this.timesteps){
        var states = this.layerSwitcher.layerStates;
        for (key in states){
            if(states[key].name===name){
                if(states[key].visibility===true){
                    visibleOverlays.push(name);}}}}
    //create the list of time values available in all visible overlays.
    this.frameTimes = [];
    if (visibleOverlays.length > 0){
        this.frameTimes = this.timesteps[visibleOverlays[0]];
        for (i=1; i < visibleOverlays.length; i++){
            this.frameTimes = intersection(this.frameTimes, this.timesteps[visibleOverlays[i]]) ;
            }
        }
    this.frameIndex+=1;
    if (this.frameIndex > this.frameTimes.length){ 
        this.frameIndex = 0;
        }
    //Only update if there is a common time on all overlays.
    if (this.frameTimes.length != 0){
        var time = this.frameTimes[this.frameIndex];
        $("#abc").html(time);
        for (i=0; i < visibleOverlays.length; i++){
            this.layers[visibleOverlays[i]].mergeNewParams({'time':time});
            }
        }

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
 * @param {string} name The name of the layer in the select list (e.g. EUR-44-tasmax)
 * @param {string} url The url to the WMS with the specific file. (e.g copy WMS line from THREDDS)
 * @param {string} layerName the name of Layer (e.g. tasmax)
 * @param {json} options For details see OpenLayers documentation. (Default = {}) 
 */

MyMap.prototype.addWMSOverlay = function(name, url, layerName, options){
    if (options === undefined){
        options = {};};
    params = {layers: layerName, transparent:true};
    wmsLayer = new OpenLayers.Layer.WMS(name, url, params, options);
    wmsLayer.isBaseLayer = false;
    //wmsLayer.opacity = 1;
    this.timesteps[name] = this.getTimesteps(layerName, url);
    this.layers[name] = wmsLayer;
    this.map.addLayer(wmsLayer);
    }


MyMap.prototype.getTimesteps = function(layerName, wmsurl){
    var processName = "WMS.GetTimesteps";
    var wpsUrl = "http://localhost:12345/wps";
    var request = (wpsUrl + '?dataInputs=layer_name=' + layerName + ';wms_url=' + wmsurl + 
                   '&service=WPS&version=1.0.0&request=execute&rawdataoutput=timesteps&identifier=' + 
                   processName);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", request, false);
    xhr.setRequestHeader("pragma", "no-cache");
    xhr.send(null);
    return xhr.responseText.split(",");
    };
