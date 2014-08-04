var mapOptions = {};

/*
 * MyMap creates a OpenLayers map object and adds basic features and a BaseLayer to it.
 */
function MyMap(){
    var map = new OpenLayers.Map('map',mapOptions);
    this.map = map;
    //Add control elements
    this.map.addControl(new OpenLayers.Control.LayerSwitcher());
    //Add the BaseLayer map
    this.addWMSLayer("Worldmap OSGeo", "http://vmap0.tiles.osgeo.org/wms/vmap0?", {layers: 'basic'},
                     {},isBaseLayer=true);
    };


/*
 * Create a Layer for a WMS and automatically add it to the map.
 * BaseLayers can be switched with only one being active at a time. Non BaseLayers can 
 * be active in parallel.
 */
MyMap.prototype.addWMSLayer = function(name, url, params, options, isBaseLayer){
    wmsLayer = new OpenLayers.Layer.WMS(name, url, params, options);
    wmsLayer.isBaseLayer = isBaseLayer;
    this.map.addLayer(wmsLayer);
    };



