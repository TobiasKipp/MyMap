/*
 * Intersection method based on https://gist.github.com/jamiehs/3364281
 */
function intersection(a,b){
    return $.map(a, function(x){return $.inArray(x, b) < 0 ? null : x;});
}

/*
 * Add a getWeek method to Date using the ISO defintion of week.
 *
 * Taken from http://weeknumber.net/how-to/javascript
 * "License":
 * This script is released to the public domain and may be used, modified and
 * distributed without restrictions. Attribution not necessary but appreciated.
 * Source: http://weeknumber.net/how-to/javascript 
 */
Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
   date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
                        - 3 + (week1.getDay() + 6) % 7) / 7);
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
    $("#startframe").click(function(){_this.startFrame();});
    $("#endframe").click(function(){_this.endFrame();});
    var animationTimer;
    $("#animateGif").click(function(){_this.startGifAnimation();});
    $("#animate").click(function(){
        if (animationTimer === undefined){
            animationTimer=setInterval(function(){_this.runAnimation();},
                                       parseInt($("#frequency").val()));
            $("#animate").val("stop");}
        else{
            clearInterval(animationTimer);
            $("#animate").val("animate");
            animationTimer=undefined;}});
    $("#timeslider").on("input change", function(){_this.frameFromSlider();});
    //TODO: Tooltip for slider$("#timeslider").on("mousemove", function(event){ console.log(event);});
    };

MyMap.prototype.startGifAnimation = function(){
    start = $("#startframevalue").html();
    end = $("#endframevalue").html();
    aggregation = $("#aggregation").val();
    var times = this.filterTimesteps(this.frameTimes, aggregation, start, end);
    var time = times.join(",");
    for (var i = 0; i < this.visibleOverlays.length; i++){
        var overlay = this.visibleOverlays[i];
        var animatedurl = overlay.url+"?"
        animatedurl += "TIME="+time;
        animatedurl += "&TRANSPARENT=true";
        animatedurl += "&FORMAT=image/gif";
        //animatedurl += "&FORMAT=application/openlayers";
        console.log(animatedurl);
        wmsLayer = new OpenLayers.Layer.WMS("animate"+overlay.name, animatedurl, {layers:"tasmax"},{singleTile: true, ratio: 1, buffer: 1});
        wmsLayer.isBaseLayer = false;
        this.map.addLayer(wmsLayer);
        }
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
    $("#timeslider").attr("max",this.frameTimes.length);
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
    

MyMap.prototype.startFrame = function(){
    $("#startframevalue").html(this.frameTimes[this.frameIndex]);
    };

MyMap.prototype.endFrame = function(){
    $("#endframevalue").html(this.frameTimes[this.frameIndex]);
    };

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
    this.addTimesteps(wmsLayer);
    this.overlays[name] = wmsLayer;
    this.map.addLayer(wmsLayer);
    };


/*
 * Get capabilities, add the timesteps property to the overlay and then update the overlays.
 * @param {OpenLayers.Layer} overlay The Layer object which will have the timesteps property added.
 */
MyMap.prototype.addTimesteps = function(overlay){
    //Extract needed variables from the Layer overlay.
    var wmsurl = overlay.url;
    var layerName = overlay.params.LAYERS;
    var version = overlay.params.VERSION;
    //Prepare for the request
    var wmsFormat = new OpenLayers.Format.WMSCapabilities({version: version});
    var _this = this;
    OpenLayers.Request.GET({
        url: wmsurl,
        params:{
            SERVICE: 'WMS',
            VERSION: version,
            REQUEST: 'GetCapabilities'},
        success: function(response){
            var wmsCaps = wmsFormat.read(response.responseXML);
            var layers = wmsCaps.capability.layers;
            var layer;
            for (var i=0; i < layers.length; i++){
                if (layers[i].name === layerName){
                    layer = layers[i];
                    break;}}
            if (layer != undefined) {
                var timesteps = layer.dimensions.time.values;
                //The first timestep might look like "\n              2001-..."
                //and should be like "2001-..."
                timesteps[0]=timesteps[0].replace(/\n| /g,"");
                overlay.timesteps = timesteps;
                //now that the values for timesteps are set the overlay information has to be 
                //updated.
                _this.updateOverlays()
                }}});

};

/*
 * Filter a given timesteps array to contain only timesteps matching to the 
 * aggregation from start to end.
 *
 * @param {Date compatible Array} timesteps An array of values that can be parsed by Date. 
 * @param {string} aggregation The step size selectable from ["daily", "weekly", "monthly", "yearly"] 
 * @param {Date compatible} start The start time. Any timestep before it is ignored.
 * @param {Date compatible} end The end time. Any timestep after it is ignored.
 * @param {boolean} sort Set to true if the timesteps are not sorted.
 */

MyMap.prototype.filterTimesteps = function(timesteps, aggregation, start, end, sort){
    var validAggregations = ["daily", "weekly", "monthly", "yearly"];
    if (validAggregations.indexOf(aggregation) === -1 ){
        throw ("Aggregation "+aggregation+" is not in "+validAggregations.join(", "));}
    startDate = new Date(start);
    endDate = new Date(end);

    //sort the data
    if (sort === undefined) sort = false;
    var sortedTimesteps;
    var filteredTimesteps = [];
    var lastAddedDate;
    if (sort) sortedTimesteps = timesteps.sort();
    else sortedTimesteps = timesteps;
    //find the starting index
    var j;
    for (var i=0; i < sortedTimesteps.length; i++){
        var currentDate = new Date(sortedTimesteps[i]);
        //as long as it is before start date get the next Date
        if (currentDate < startDate) continue;
        lastAddedDate = currentDate;
        j = i;
        break;}
    //Add the first element to the list
    filteredTimesteps.push(sortedTimesteps[j]);
    //Search the rest of dates for matching according to aggregation.
    for (var i =j+1; i < sortedTimesteps.length; i++){
        var currentDate = new Date(sortedTimesteps[i]);
        //if it is past the end date stop looking for further timesteps.
        if (currentDate > endDate) break;
        //The current date is now between start and end date
        if (aggregation == "daily"){
            if (currentDate.getDate() == lastAddedDate.getDate()) continue;}
        else if (aggregation == "weekly"){
            if (currentDate.getWeek() == lastAddedDate.getWeek()) continue;}
        else if (aggregation == "monthly"){
            if (currentDate.getMonth() == lastAddedDate.getMonth()) continue;}
        else if (aggregation == "yearly"){
            if (currentDate.getYear() == lastAddedDate.getYear()) continue;}
        lastAddedDate = currentDate;
        filteredTimesteps.push(sortedTimesteps[i]);
        }
    return filteredTimesteps;

};


/*
 * Derived from hardware build in self test, the method will run some tests.
 * They can later be transferred to a real unittest/itegrationtest.
 */
MyMap.prototype.bist = function(){
    var testsOkay = 0;
    var testsFail = 0;
    function test(condition, errormessage){
        if(condition) testsOkay++;
        else{
            testsFail++;
            console.log(errormessage);}};
    //quick and dirty equal for arrays of basic types
    function arrayEqual(a1,a2){
        if (a1.length == a2.length){
            for (var i = 0; i < a1.length; i++){
                if(a1[i] !== a2[i]) return false;}}
        else return false;
        return true;};
     
    //test arrayEqual
    function testArrayEqual(x,y){test(arrayEqual(x,y), 
                             ("Error in arrayEqual: " + x + " and " + y + " should be equal"))};
    function testArrayNotEqual(x,y){test(!arrayEqual(x,y), 
                             ("Error in arrayEqual: " + x + " and " + y + " should not be equal"))};
    var a = [1,2];
    var b = [2,3];
    var c = [1,2];
    var d = [1,2,3];
    var e = [1,"2"];
    testArrayNotEqual(a,b);
    testArrayEqual(a,c);
    testArrayNotEqual(a,d);
    testArrayNotEqual(a,e);
    //Test filter_timesteps
    function testFilterTimesteps(filteredTimesteps, assumedFT){
             if(arrayEqual(filteredTimesteps, assumedFT)) testsOkay++;
             else{
                 testsFail++;
                 console.log("Error: MyMap.prototype.filter_timesteps returned "+
                             "[" + filteredTimesteps.join(", ") + "]" +
                             " instead of [" + assumedFT.join(", ") + "]");}};
    var timesteps = ["2001-01-01T12:00:00.000Z", "2001-01-03T12:00:00.000Z","2001-01-05T12:00:00.000Z"];
    //start and end do not match with a timestep
    var filteredTimesteps = this.filterTimesteps(timesteps, "daily", "2001-01-02", "2001-01-04");
    var assumedFT = [timesteps[1]];
    testFilterTimesteps(filteredTimesteps, assumedFT);
    //start is before the first timestep and end is before the last timestep but at the same day.
    //the last element should not be part of the filterd items.
    var filteredTimesteps2 = this.filterTimesteps(timesteps, "daily", "2001-01-01", "2001-01-05")
    var assumedFT2 = [timesteps[0], timesteps[1]];
    testFilterTimesteps(filteredTimesteps2, assumedFT2);
    //test weekly (week 1,2,2,4,4,4)
    var timestepsW = ["2001-01-01T12:00:00.000Z", "2001-01-13T12:00:00.000Z",
                      "2001-01-14T12:00:00.000Z", "2001-01-22T12:00:00.000Z",
                      "2001-01-23T12:00:00.000Z", "2001-01-24T12:00:00.000Z"];
    var filteredTimestepsW = this.filterTimesteps(timestepsW, "weekly", "2001-01-01", "2001-08-05")
    var assumedFTW = [timestepsW[0], timestepsW[1], timestepsW[3]];
    testFilterTimesteps(filteredTimestepsW, assumedFTW);
    //test monthly 
    var timestepsM = ["2001-01-01T12:00:00.000Z", "2001-02-13T12:00:00.000Z",
                      "2001-02-14T12:00:00.000Z", "2001-06-22T12:00:00.000Z",
                      "2001-06-23T12:00:00.000Z", "2001-11-24T12:00:00.000Z"];
    var filteredTimestepsM = this.filterTimesteps(timestepsM, "monthly", "2001-01-01", "2001-08-05")
    var assumedFTM = [timestepsM[0], timestepsM[1], timestepsM[3]];//timestepsM[5] is after end
    testFilterTimesteps(filteredTimestepsM, assumedFTM);
    //test yearly 
    var timestepsY = ["2001-01-01T12:00:00.000Z", "2001-02-13T12:00:00.000Z",
                      "2002-02-14T12:00:00.000Z", "2002-06-22T12:00:00.000Z",
                      "2006-06-23T12:00:00.000Z", "2007-11-24T12:00:00.000Z"];
    var filteredTimestepsY = this.filterTimesteps(timestepsY, "yearly", "2001-01-01", "2011-08-05")
    var assumedFTY = [timestepsY[0], timestepsY[2], timestepsY[4], timestepsY[5]];
    testFilterTimesteps(filteredTimestepsY, assumedFTY);
    //Summary of all tests
    console.log("=================================================");
    console.log("PASSED: " + testsOkay);
    console.log("FAILED: " + testsFail);
};

//    if (timesteps == None or len(timesteps) == 0):
//        return []
//    timesteps.sort()
//    work_timesteps = within_date_range(timesteps, start, end)
//    
//    new_timesteps = [work_timesteps[0]]
//
//    for index in range(1,len(work_timesteps)):
//        current = date_parser.parse(new_timesteps[-1])
//        candidate = date_parser.parse(work_timesteps[index])
//    
//        if current.year < candidate.year:
//            new_timesteps.append(work_timesteps[index])
//        elif current.year == candidate.year:
//            if aggregation == "daily":
//                if current.timetuple()[7] == candidate.timetuple()[7]:
//                    continue
//            elif aggregation == "weekly":
//                if current.isocalendar()[1] == candidate.isocalendar()[1]:
//                    continue
//            elif aggregation == "monthly":
//                if current.month == candidate.month:
//                    continue
//            elif aggregation == "yearly":
//                if current.year == candidate.year:
//                    continue
//            # all checks passed
//            new_timesteps.append(work_timesteps[index])
//        else:
//            continue
//    return new_timesteps
