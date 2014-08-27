/*
 * A minimal WPS client implementation with only functionality required to add
 * the animation to the map.
 */

/*
 * Get the attribute with the given name from the DOM attributes list.
 */
function getAttribute(attributesContainingNode, attributeName){
    var attributes = attributesContainingNode.attributes;
    for (var i = attributes.length-1; i >=0 ; i--){
        if (attributes[i].nodeName === attributeName){
            var statusLocation = attributes[i].nodeValue;
            return statusLocation;
        }
    }
    return ""
}



function WpsClient(wpsUrl, wpsoutputsPort, proxyport, myMap){
    this.wpsUrl = wpsUrl;
    this.wpsoutputsPort = wpsoutputsPort;
    this.proxyport = proxyport;
    this.timeout;
    this.myMap = myMap;
    this.delay = 2000;//time between request for WPS status in ms.
    this.addCounter = 0;//A pseudo lock to prevent adding more often than intended.
    _this = this;
    $("#animateGif").click(function(){
        _this.addGifAnimation();
        });
};

WpsClient.prototype.addGifAnimation = function(){
    var wpsurl = "http://localhost:12345/wps";
    var wmsUrls = this.myMap.getVisibleWMSLayersUrls();
    var startTime = $("#startframe").val();
    var endTime = $("#endframe").val();
    var frameDuration = parseFloat($("#period").val())/1000.0;
    var aggregation = $("#aggregation").val();
    var layerName = $("#wmsLayerName").val();
    var imageLayerName = $("#imageLayerName").val();
    this.addCounter++;
    this.addAnimation(wmsUrls, startTime, endTime, frameDuration, aggregation, layerName,
                           imageLayerName);
};

WpsClient.prototype.addAnimation = function(wmsUrls, startTime, endTime, frameDuration,
                                            aggregation, layerName, imageLayerName){
    console.log(this.addCounter);
    var wmsUrlsString = wmsUrls[0];
    for (var i = 1; i < wmsUrls.length; i++){
        wmsUrlsString += ";wms_urls=" + wmsUrls[i];
    }
    wmsUrlsString += ";"
    var url = ("http://localhost:12345/wps?request=execute&service=WPS&version=1.0.0"+
              "&identifier=WMS.GifAnimationMultiWMS" +
              "&datainputs=" + 
              "wms_urls=" + wmsUrlsString +
              ";start_time=" + startTime +
              ";end_time=" + endTime +
              ";frame_duration=" + frameDuration +
              ";aggregation=" + aggregation +
              ";layer_name=" + layerName
              );
    url += "&storeExecuteResponse=true&status=true"//ensure it runs async
    //find status location
    console.log(url)
    var statusLocationContainingXML = getURL(url);
    var statusLocation = this.getStatusLocation(statusLocationContainingXML);
    //CORS workaround on statusLocation
    statusLocation = statusLocation.replace(":"+this.wpsoutputsPort, ":"+this.proxyport)
    var finished = false;
    console.log(this.addCounter);
    this.HandleProcessFinished(statusLocation, finished, imageLayerName);
}

/*
 * Get the statusLocation attribute from the root element from an XML repsonse text.
 */
WpsClient.prototype.getStatusLocation = function(xmlString){
    var xml = $.parseXML(xmlString);
    return getAttribute($(xml).children()[0], "statusLocation");
}

WpsClient.prototype.isProcessFinished = function(url,finished){
    var responseText = getURL(url);
    var hasException = (responseText.indexOf("<ows:ExceptionText>") > -1);
    if (hasException) {
        console.log("WPS process failed to generate a response. Check if all inputs are provided");
        this.addCounter--;
    }
    finished = (responseText.indexOf("<wps:ProcessSucceeded>") > -1);
    if(!finished && !hasException){
        this.showProcessStatus(responseText);
    }
    return finished
}

WpsClient.prototype.showProcessStatus = function(responseText){
    $xml = $($.parseXML(responseText));
    $progressElement = $xml.find("wps\\:ExecuteResponse wps\\:Status wps\\:ProcessStarted");
    var percentCompleted = getAttribute($progressElement[0], "percentCompleted");
    $("#WPSProgress").html("Generating animation. Progress:" + percentCompleted + "%"); 
};

WpsClient.prototype.getReference = function(processSucceededResponse, outputname){
    var xml = $.parseXML(processSucceededResponse);
    var reference;
    $xml = $(xml)
    $xml.children("wps\\:ExecuteResponse").children("wps\\:ProcessOutputs").children("wps\\:Output").each(
        function(){
            if ($(this).children("ows\\:Identifier")[0].textContent === outputname){
                reference = getAttribute($(this).children("wps\\:Reference")[0], "href");
            }
        });
    return reference;
}

/*
 * Request the status URL and check if the process is in a finished state.
 * TODO: The current implementation assumes that the process always succeeds.
 *
 * Due to JavaScript not offering a real sleep method the method simply 
 * uses branches and timeouts to emulate a sleep.
 */
WpsClient.prototype.HandleProcessFinished = function(url, finished, imageLayerName){
    console.log("****" + this.addCounter);
    if (this.addCounter >0){
        var _this = this;
        this.timeout = setTimeout(function(){finished = _this.isProcessFinished(url,finished)}, this.delay);
        if (finished) {
            this.addCounter--;
            clearTimeout(this.timeout);
            processSucceededResponse = getURL(url);
            imageref = this.getReference(processSucceededResponse, "animated_gif");
            this.myMap.addImage(imageLayerName, imageref);
        }
        else{
            setTimeout(function(){_this.HandleProcessFinished(url, finished, imageLayerName)}, this.delay);
        }
    }
    
}

