/*
 * Intersection method based on https://gist.github.com/jamiehs/3364281
 */
function intersection(a,b){
    return $.map(a, function(x){return $.inArray(x, b) < 0 ? null : x;});
}

/*
 * MyMap creates a OpenLayers map object and adds basic features and a BaseLayer to it.
 *
 */
function MyMap(){
    var _this = this;
    var mapOptions = {eventListeners:{"changelayer": function(event){_this.updateOverlays()}}};
    var map = new OpenLayers.Map('map',mapOptions);
    this.map = map;
    //While map stores all Layers for the time update only the overlays are of interest. 
    //To prevent recalculating which ones are overlays every time they are stored in the overlays
    //variable.
    this.overlays = {};
    this.visibleOverlays = [];//used to store which overlays are visible.
    //Add control elements
    this.layerSwitcher = new OpenLayers.Control.LayerSwitcher();
    this.map.addControl(this.layerSwitcher);
    this.frameIndex=0;
    this.frameTimes = [];
    //Add the BaseLayer map
    this.addWMSBaseLayer("Worldmap OSGeo", "http://vmap0.tiles.osgeo.org/wms/vmap0?",
                         {layers: 'basic'}, {});
    $("#nextframe").click(function(){_this.nextFrame();});
    $("#timeslider").on("input change", function(){_this.frameFromSlider();});
    };

/*
 * Updates the information about timesteps and visible overlays. Should be run on each
 * change of selected Overlays. 
 */
MyMap.prototype.updateOverlays = function(){
    this.visibleOverlays = [];
    for (name in this.overlays){
        var overlay = this.overlays[name];
        if(overlay.visibility){
            this.visibleOverlays.push(overlay);}}
    this.frameTimes = [];
    if (this.visibleOverlays.length > 0){
        this.frameTimes = this.visibleOverlays[0].timesteps;
        for (var i=1; i < this.visibleOverlays.length; i++){
            this.frameTimes = intersection(this.frameTimes, this.visibleOverlays[i].timesteps);}}
    //update the sliders maximum value
    $("#timeslider").attr('max', this.frameTimes.length);
    };

/*
 * Change the parameters such that the next frame with a new time will be generated,
 * if a valid time value exists. 
 */
MyMap.prototype.nextFrame = function(){
    this.frameIndex+=1;
    $("#timeslider").val(this.frameIndex);
    this.showFrame();};

MyMap.prototype.frameFromSlider = function(){
    this.frameIndex = parseInt($("#timeslider").val());
    this.showFrame();};

MyMap.prototype.showFrame = function(){
    if (this.frameIndex >= this.frameTimes.length){ 
        this.frameIndex = 0;}
    if (this.frameTimes.length != 0){
        var time = this.frameTimes[this.frameIndex];
        $("#abc").html(time);
        for (var i=0; i < this.visibleOverlays.length; i++){
            overlay = this.visibleOverlays[i];
            overlay.mergeNewParams({'time':time});}}};


/*
 * Add a BaseLayer to the map. Only one BaseLayer can be active at a time (selected with radiobox).
 * @param {string} name Name of the BaseLayer in the GUI (e.g. EUR-44-tasmax)
 * @param {string} url The WMS url
 * @param {json} params The OpenLayers params (e.g. {layers:"basic"})
 * @param {json} options The OpenLayers options.
 */
MyMap.prototype.addWMSBaseLayer = function(name, url, params, options){
    wmsLayer = new OpenLayers.Layer.WMS(name, url, params, options);
    wmsLayer.isBaseLayer = true;
    //wmsLayer.wrapDateLine= true;
    this.map.addLayer(wmsLayer);};

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
    wmsLayer.timesteps = this.getTimesteps(layerName, url);
    this.overlays[name] = wmsLayer;
    this.map.addLayer(wmsLayer);
    this.updateOverlays()};

/*
 * Make an WPS call with layer (variable) name and the WMS url.
 * @param {string} layerName The name of the to view variable (e.g. tasmax)
 * @param {string} wmsurl The url to the WMS service without a query.
 */
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
    return xhr.responseText.split(",");};
