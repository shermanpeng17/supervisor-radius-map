var protocol;

if (window.location.protocol == "https:") {
  protocol = "https";
} else {
  protocol = "http";
}

var theServerName = window.location.host;
if (theServerName == "50.17.237.182") {
    theServerNameNice = "sfplanninggis.org"
}
var map;
var dynamicMap;
var layerDefs;
var view;



require(["esri/Map","esri/Color", "esri/layers/GraphicsLayer", "esri/geometry/projection",
    "esri/geometry/Extent", "esri/views/MapView", "esri/geometry/support/webMercatorUtils",
    "esri/Graphic", "esri/tasks/support/BufferParameters", 
    "esri/tasks/GeometryService", "esri/geometry/geometryEngine", 
    "esri/geometry/SpatialReference", "esri/layers/FeatureLayer", 
    "esri/layers/MapImageLayer", "esri/widgets/BasemapToggle", 
    "esri/renderers/SimpleRenderer", "esri/tasks/IdentifyTask", 
    "esri/tasks/support/IdentifyParameters", "esri/geometry/geometryEngine", 
    "esri/geometry/Polygon", "esri/tasks/QueryTask", "esri/tasks/support/Query", 
    "esri/renderers/SimpleRenderer", "esri/geometry/Point", "esri/geometry/geometryEngineAsync",
    "esri/tasks/support/PrintTemplate", "esri/tasks/PrintTask", "esri/tasks/support/PrintParameters",
    "esri/core/watchUtils", "esri/layers/support/LabelClass"
],  function (Map, Color, GraphicsLayer, projection, Extent, MapView, webMercatorUtils,
    Graphic, BufferParameters,
    GeometryService, geometryEngine, SpatialReference, FeatureLayer, 
    MapImageLayer, BasemapToggle, SimpleRenderer, IdentifyTask, 
    IdentifyParameters, geometryEngine, Polygon, QueryTask, Query, SimpleRenderer, Point, geometryEngineAsync,
    PrintTemplate, PrintTask, PrintParameters, watchUtils, LabelClass) {

    var MapCtrl = function() {
        var map, view, currMatchingFeaturesArr;
        var buffersGraphicLayer = new GraphicsLayer();
        var searchItem = "";
        map = new Map({
            basemap: "topo"
        });
    
        view = new MapView({
            map: map,  // References a Map instance
            container: "map",
            center: [-122.45, 37.76],
            zoom: 13,
        });

        view.popup.collapseEnabled = false

        var poposArtURL = protocol + "://sfplanninggis.org/arcgiswa/rest/services/SupervisorRadiusMap/MapServer";

        mapImageLayer = new MapImageLayer({
            url: poposArtURL,
            opacity: 1,
        });
        map.add(mapImageLayer);
        view.when(function () {
            view.on("click", executeIdentifyTask);
            view.watch("popup.visible", function (newVal, oldVal) {
                if (newVal === true) {
                    if (isOnMobile()) {
                        changeMapHeightAndHandleTabDisplay(newVal);
                        changePopFooterForMobile();
                    }
                }
                view.popup.collapsed = false;
              });           

        });

        mapImageLayer.when(function() {
 
        })

        // mapImageLayer.when(function() {
        //     watchUtils.when(view, "stationary", function() {
        //         var viewZoom = view.zoom;
        //         console.log(viewZoom)
        //         if (viewZoom >= 17) {
        //             var parcelLayerVisible = mapImageLayer.findSublayerById(1).visible;
        //             if (! parcelLayerVisible) {
        //                 console.log("turning on parcel layer")
        //                 mapImageLayer.findSublayerById(1).visible = true;
        //             }
        //         } else {
        //             mapImageLayer.findSublayerById(1).visible = false;
        //         }
        //     })
        // })

  

        var basemapToggle = new BasemapToggle({
            view: view,
            nextBasemap: "hybrid"
        });
        view.ui.add(basemapToggle, "top-right");

        function executeIdentifyTask(event) {
            buffersGraphicLayer.removeAll();
            view.graphics.items = [];

            view.popup.clear();
            //create identify tasks and setup parameters
            identifyTask = new IdentifyTask(poposArtURL);
    
            identifyParams = new IdentifyParameters();
            identifyParams.tolerance = 1;
            identifyParams.returnGeometry = true;
            identifyParams.layerIds = [0, 1];
            identifyParams.layerOption = "all";
            identifyParams.width = view.width;
            identifyParams.height = view.height;
            identifyParams.geometry = event.mapPoint;
            identifyParams.mapExtent = view.extent;
            identifyTask.execute(identifyParams).then(function (response) {
                var results = response.results;
                var parcelLabelLayerName = "Parcel Labels";
                for (var i = 0; i < results.length; i++) {
                    var currLayerName = results[i].layerName;
                    if (currLayerName === parcelLabelLayerName) {
                        handleClickOnParcel(results[i]);
                        this.addBuffersAroundSearchLocation();
                    }
                }
            })
        }

        function addBufferOfSpecifiedDistanceFeetHelper(geom, buffDistance, ) {
            var tmp = new Polygon(geom)
            var bufferedGeom = geometryEngine.geodesicBuffer(tmp, buffDistance, "feet");
            var polygon = new Polygon(bufferedGeom)
            var bufferColor = {
                type: 'simple-fill',
                color: [33, 33, 35, 0],
                style: 'solid',
                outline: {
                  color: [255, 0, 0, 1],
                  width: 2
                }
            };
            var polygonGraphic = new Graphic({
                geometry: polygon,
                symbol: bufferColor
            });
            return polygonGraphic;
        }

        function addBuffersAroundSearchLocationHelper(geom) {
            var buffer300Feet = addBufferOfSpecifiedDistanceFeetHelper(geom, 300);
            var buffer500Feet = addBufferOfSpecifiedDistanceFeetHelper(geom, 500);
            var buffer1000Feet = addBufferOfSpecifiedDistanceFeetHelper(geom, 1000)
            buffersGraphicLayer.addMany([buffer300Feet, buffer500Feet, buffer1000Feet]);
            view.goTo(
                {
                target: buffer1000Feet,
                }
            )
            map.add(buffersGraphicLayer);
        }

        function addPolygonToView(geometry) {
            var parcelColors = {
                type: 'simple-fill',
                color: [146, 148, 150, 0.25],
                style: 'solid',
                outline: {
                color: [79, 102, 238, 1],
                width: 2
                }
            };

        
            var polygonGraphic = new Graphic({
                geometry: geometry,
                symbol: parcelColors
            });
            view.graphics.add(polygonGraphic)
        }

        function getParcelPopupHtml(blocklot) {
            var popupHtml = "";
            popupHtml += '<div class="popup-parcel-information-container"' + 'title= id="test">'
            popupHtml += '<table class="status-section">'
            popupHtml +=
              '<div class="cannabis-permit-container">' +
              '<div class="align-left retail-name">' + blocklot + '</div>' 
             
            popupHtml += '</div>'
            return popupHtml
        }

        function handleClickOnParcel(parcelLabelResult) {

            var parcelGeometry = parcelLabelResult.feature.geometry;
            var parcelAttributes = parcelLabelResult.feature.attributes;
            var mapBlockLot = parcelAttributes.mapblklot;
            searchItem = mapBlockLot;
            var popupHtml = getParcelPopupHtml(mapBlockLot);
            view.popup.open({
                title: "",
                content: popupHtml,
            });
            addPolygonToView(parcelGeometry);
            addBuffersAroundSearchLocationHelper(parcelGeometry)
        }

        return {
            searchGISDataForMatch: function(searchStr) {
                var poposMapServerUrl = "http://sfplanninggis.org/arcgiswa/rest/services/POPOS_And_PublicArt/MapServer/0";
                var artMapServerUrl = "http://sfplanninggis.org/arcgiswa/rest/services/POPOS_And_PublicArt/MapServer/1";
                searchStr = searchStr.toLowerCase();
                var query = new Query();
                var queryTask = new QueryTask({
                    url: poposMapServerUrl
                });
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.where = "lower(NAME)  like'" + searchStr + "%'"
        
                var queryTaskPromise1 = queryTask.execute(query);
        
                var query = new Query();
                var queryTask = new QueryTask(artMapServerUrl);
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.where = "lower(Name)   like'" + searchStr + "%'";
                var queryTaskPromise2 = queryTask.execute(query);
                return Promise.all([queryTaskPromise1, queryTaskPromise2])
            },

            setMatchedFeatures: function(featuresArr) {
                currMatchingFeaturesArr = featuresArr
            },

            clearViewGraphics: function() {
                view.graphics.items = [];
                buffersGraphicLayer.removeAll();

            },
            
            zoomToPoint: function (pointGeom) {
                var point = new Point({
                    x: pointGeom.longitude,
                    y: pointGeom.latitude
                });
                view.goTo(
                    {
                    target: point,
                    zoom: 20
                    }
                )
            },

            updateLayerVisibility: function(id, isVisible) {
                mapImageLayer.findSublayerById(0).visible = isVisible;
            },

            setSearchTerm: function(str) {
                searchItem = str;
            },

            makeMapPDF: function(searchStr) {

                var theprintparams = new PrintParameters();

                theprintparams.view =view;
        
        
                var theprinturl="https://sfplanninggis.org/arcgiswa/rest/services/SecurePrinting5/GPServer/Export%20Web%20Map";
        
                var theprintTask = new PrintTask(theprinturl);

                ptemplate = new PrintTemplate({
                    scalePreserved: true,
                    attributionVisible: false,
                    exportOptions: {width: 2700, height: 2700, dpi: 300  },
                    format: "png32",
                    layout: "map-only",
                    showLabels: false,
                });

                
                theprintparams.template = ptemplate;
        
                $('#PrintModal').modal('hide');
        
                var waitSpinner='<div style="width:100%; text-align:center;"><i class="fa fa-spinner fa-spin fa-3x fa-fw"></i></div>'
                $('#modalContent').html("<big>Please wait, generating printable report.</big><br><br>"+waitSpinner);
                $('#PIMModal').modal('show');
        
                // theprintTask.execute(theprintparams, printResultCallback,printResultCallback);
                theprintTask.execute(theprintparams)
                .then(function(res) {
                    // console.log(res.url);
                    // window.open(res.url)
                    var mapImageUrl = res.url;
                    var pdf = new  jsPDF('p', 'pt', 'letter');
                    var pageWidth = pdf.internal.pageSize.width;

               
                    var img = new Image();
                    img.src = mapImageUrl;
                    img.style.height ="181px";
                    img.style.width ="183px";
                    img.crossOrigin="anonymous"
                    img.onload = function() {
                        try {
                            var imageHeight = 550
                            var imageWidth = 550;
                            var imageFromLeftCenter = (pageWidth - 550) / 2

                            
                            var mapTitle = $("#map-pdf-title").val();
                            if (mapTitle != "") {
                                pdf.text(mapTitle, imageFromLeftCenter, 30);
                            }

                            pdf.addImage(img,'PNG', imageFromLeftCenter, 50, imageHeight, imageWidth);
                            pdf.save("download.pdf")
                            cancelSpinner();
                        }
                        catch (e) {
                            alert("An error occured while trying to produce a PDF. Please contact CPC.GIS@sfgov.org")
                        }
                    }
                })
            },

            handleSelectingPoposLocation(id) {
                var clickedItem = currMatchingFeaturesArr.filter(function(item) {
                    return item.attributes.OBJECTID == id
                })[0];
                var geometry = clickedItem.geometry;
                var attributes = clickedItem.attributes;
                var isPopos = false;
                if (attributes.hasOwnProperty("popos_address")) {
                    isPopos = true;
                }
                var point = new Point({
                    x: geometry.longitude,
                    y: geometry.latitude
                });
                this.showPopup(attributes, isPopos, geometry)
                this.zoomToPoint(geometry);                
                view.goTo(
                    {
                    target: point,
                    zoom: 20
                    }
                )
                document.querySelector('.close').click();
            },

  
            applyPoposLayerFilter(inputFilters) {
                var isMultipleFilter = false;
                var isIndoor = false;
                var isOutdoor = false;
                var isOpenAllTime = false;
                var filterItems = [];
                for (var i = 0; i < inputFilters.length; i++) {
                    var currInput = inputFilters[i];
                    var currInputVal = currInput.value;
                    if (currInput.checked) {
  
                        switch(currInputVal) {
                            case "indoor":
                                filterItems.push("Indoor = 'Y'")
                                isIndoor = true;
                                break;
                            case "outdoor":
                                filterItems.push("Indoor = ''")

                                isOutdoor = true;

                                break;
                            case "food-available":
                                filterItems.push("Food = 'Y'")

                                break;
                            case "restroom":
                                filterItems.push("Restroom = 'Y'")

                                break;
                            case "seating":
                                filterItems.push("Seating = 'Y'")

                                break;
                            case "open-always":
                                filterItems.push("Hours_Type = 'Open At All Times'")

                                break;
                            case "open-business-hr":
                                filterItems.push("Hours_Type = 'Open Business Hours'")

                                break;
                            default:
                                break;
                        }
                        isMultipleFilter = true;
                    }
                }
                if (isIndoor && isOutdoor) {
                    filterItems = filterItems.slice(2);
                }
                var filterExpression = filterItems.join(" and ");
                var poposLayer = mapImageLayer.findSublayerById(0);
                poposLayer.definitionExpression = filterExpression
            },


            addBuffersAroundSearchLocation: function(geom) {
                addBuffersAroundSearchLocationHelper(geom)
            },

            addPolygonGraphicToView: function(geom) {
                var polygonColor = {
                    type: 'simple-fill',
                    color: [33, 33, 35, 0],
                    style: 'solid',
                    outline: {
                      color: [79, 102, 238, 1],
                      width: 2
                    }
                };

                var displayPolygon = new Polygon(geom);
                var polygonGraphic = new Graphic({
                    geometry: displayPolygon,
                    symbol: polygonColor,
                })
                view.graphics.add(polygonGraphic);

            }, 

            showPopup: function(attributes, isPopos, popupPointLocation) {
                cancelSpinner();
                var point = new Point({
                    x: popupPointLocation.longitude,
                    y: popupPointLocation.latitude
                });
                var popupHtml = "";
                var title = "";
                var picFile = attributes.pic_file;
                var SEATING_No = attributes.SEATING_No;
                var Hours_Type = attributes.Hours_Type;
                if (isPopos) {
                    var SEATING_No = attributes.seating_no;
                    var Hours_Type = attributes.hours_type;
                    var TYPE = attributes.type;
                    var FOOD_SERVICE = attributes.food_service;
                    var RESTROOMS = attributes.restrooms;
                    var LOCATION = attributes.location;
                    var Description = attributes.description;
                    var Subject_To_Downtown_PLN = attributes.subject_to_downtown_pln;
                    var Motion_File = attributes.motion_file;
                    var name = attributes.name;
                    var POPOS_ADDRESS = attributes.popos_address;
                    title = "POPOS"
                    popupHtml += "<table width=97%>"
                    popupHtml += "<tr><th class='text-center'style='background-color: rgb(87,130,0)' width=97%>" + name + " </th></tr>"
                    popupHtml += "<tr><td align='center'>" + POPOS_ADDRESS +  "</td></tr>"
                    popupHtml += "<tr><td align='center'><img style='border: #000000 1px solid;' width='300px' src='https://sfplanning.s3.amazonaws.com/maps/POPOS/" + picFile + "'/></td></tr></table>"
                    popupHtml += "<table><tr><td><table border=0 > <tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Type:</b></td><td style='font-size:8pt;'>" + TYPE + "</td></tr>"
        
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Hours:</b></td><td style='font-size:8pt;'>" + Hours_Type + "</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Seating:</b></td><td style='font-size:8pt;'>" + SEATING_No + "</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Food:</b></td><td style='font-size:8pt;'>" + FOOD_SERVICE + " </td></tr>"
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Restrooms:</b></td><td style='font-size:8pt;'>" + RESTROOMS + "</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Location:</b></td><td style='font-size:8pt;'>" + LOCATION +"</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Description:</b></td><td style='font-size:8pt;'>" + Description + " </td></tr>"
                    popupHtml += "<tr valign=top><td colspan=2 align='left' style='font-size:8pt;'><b>Subject to Downtown Plan: </b>" + Subject_To_Downtown_PLN + "</td></tr>"
                    popupHtml += "<tr valign=top><td colspan=2 align='left' style='font-size:8pt;'><a target='_blank' href='" + Motion_File + "'>Read Planning Approval Document</a></td></tr>"
                    popupHtml += "</table>"
        
                    popupHtml = popupHtml.replace(/Null/gi, "&nbsp");
                } else {
  
                    var popupHtml = ""

                    var picFile = attributes.pic_file;
                    picFile = encodeURI(picFile)
                    
                    var picUrl = "https://sfplanning.s3.amazonaws.com/maps/POPOS/" + picFile;
                    var name = attributes.name;
                    var poposAddress = attributes.popos_address;
                    var hourType = attributes.hours_type;
                    var seatingNo = attributes.seating_no;
                    var foodService = attributes.food_service;
                    var restrooms = attributes.restrooms;
                    var location = attributes.location;
                    var description = attributes.description
                    var type = attributes.type;
                    var description = attributes.description
                    var motionFile = attributes.motion_file
                    var subjectToDowntownPlan = attributes.subject_to_downtown_pln;

                    var popupHtml = ""
                    var type = attributes.type;
                    var medium = attributes.medium;
                    var location = attributes.location;
                    var requiredArt = attributes.requiredart;
                    var artistLink = attributes.artistlink;
                    var name = attributes.name;
                    var title = attributes.title;
                    popupHtml += "<table width=97%>"
                    popupHtml += "<tr class='text-center'><th width=97%>" + name + " </th></tr>"
                    // popupHtml += "<tr><td align='center'>" +  title+ "</td></tr>"
                    popupHtml += "<tr><td align='center'><img style='border: #000000 1px solid;' width='300px' src='https://sfplanning.s3.amazonaws.com/maps/PublicArt/" + picFile + "'/></td></tr></table>"


                    popupHtml += "<table><tr><td><table border=0 > <tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Type:</b></td><td style='font-size:8pt;'>" + type+" </td></tr>"

                    popupHtml += "<tr valign=top><td align='left' valign='top' style='font-size:8pt;'><b>Medium:</b></td><td align='left' style='font-size:8pt;'>" + medium + "</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' valign='top' style='font-size:8pt;'><b>Location:</b></td><td align='left' style='font-size:8pt;'>" + location + "</td></tr>"
                    popupHtml += "<tr valign=top height='100%'><td align='left' valign='top' style='font-size:8pt;'><b>Accessibility:</b></td><td align='left' style='font-size:8pt;'>open space and artwork are always accessible</td></tr>"
                    popupHtml += "<tr valign=top><td align='left' valign='top' style='font-size:8pt;'><b>Required Art:</b></td><td align= 'left' style='font-size:8pt;'>" + requiredArt + "</td></tr>"
                    
                    popupHtml += "<tr valign=top><td align='left' valign='top' style='font-size:8pt;'><b>Artist Link:</b></td><td align= 'left' style='font-size:8pt;'><a target='_blank' href='" + artistLink +"'>" + artistLink + "</a></td></tr>"

                    popupHtml += "</table>"


                    // popupHtml += "<table width=97%>"
                    // popupHtml += "<tr><th style='background-color: rgb(87,130,0)' width=97%>" + name + " </th></tr>"
                    // popupHtml += "<tr><td align='center'>" + poposAddress + "</td></tr>"
                    // popupHtml += "<tr><td align='center'><img style='border: #000000 1px solid;' width='300px' src=" + picUrl + "></td></tr></table>"

                    // popupHtml += "<table><tr><td><table border=0 > <tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Type:</b></td><td style='font-size:8pt;'>" + type + "</td></tr>"

                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Hours:</b></td><td style='font-size:8pt;'>" + hourType + "</td></tr>"
                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Seating:</b></td><td style='font-size:8pt;'>" + seatingNo + "</td></tr>"
                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Food:</b></td><td style='font-size:8pt;'>" + foodService + " </td></tr>"
                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Restrooms:</b></td><td style='font-size:8pt;'>" + restrooms +"</td></tr>"
                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Location:</b></td><td style='font-size:8pt;'>" + location + "</td></tr>"
                    // popupHtml += "<tr valign=top><td align='left' style='font-size:8pt; width:70px'><b>Description:</b></td><td style='font-size:8pt;'>" + description + " </td></tr>"
                    // popupHtml += "<tr valign=top><td colspan=2 align='left' style='font-size:8pt;'><b>Subject to Downtown Plan: </b>" +subjectToDowntownPlan+"</td></tr>"

                    // popupHtml += "<tr valign=top><td colspan=2 align='left' style='font-size:8pt;'><a target='_blank' href='" + motionFile + "'>Read Planning Dept Ordinance</a></td></tr>"
                    // popupHtml += "</table>"

                    // popupHtml = popupHtml.replace(/Null/gi, "&nbsp");
                }
                view.popup.open({
                    title: title,
                    content: popupHtml,
                    location: point
                });
            }
        }
   

    }();

    var App = function() {
        function handleOneMatchOnSearch(feature) {
            var featureGeometry = feature.geometry;
            var attributes = feature.attributes;

            var isPopos = false;
            if (attributes.hasOwnProperty("popos_address")) {
                isPopos = true;
            }
            MapCtrl.showPopup(attributes, isPopos, featureGeometry)
            MapCtrl.zoomToPoint(featureGeometry);
        }

        function handleMultipleMatchOnSearch(features) {
            var multipleResultTitleStr = 'Multiple Results';
            
            var modalHtml = ""
            features.forEach(function(feature) {
                var isPopos = false;
                var attributes = feature.attributes;
                var name = attributes.name;
                var title = attributes.popos_address;
                var type;
                var objectId = attributes.OBJECTID;
                if (attributes.hasOwnProperty("popos_address")) {
                    isPopos = true;
                    type = "Popos";
                } else {
                    type = "Public Art";
                    title = attributes.title;
                    name = attributes.name;
                }
                modalHtml += "<div id='" + objectId + "'class='messi-button-container'><button class='btn btn-sm multiple-business-selection'><p class=multiple-business-selection__name>" + name + " (" + type + ")" + '</p><p class =multiple-business-selection__address>' + title + "</p></button></div>"
            });
            cancelSpinner();

            $(".modal-body").html(modalHtml);
            $(".modal-title").html(multipleResultTitleStr);
            $("#modalDisplay").modal('show');
        }

        function searchWithGeocoder(addressStr) {
            var geocoderSearchUrl = "https://sfplanninggis.org/cpc_geocode/?search=" + addressStr;
            return $.get(geocoderSearchUrl)
            .then(function(res) {
                var jsonData = JSON.parse(res);
                if (jsonData.features.length !== 0) {
                    var geometry = jsonData.features[0].geometry;
                    MapCtrl.addPolygonGraphicToView(geometry);
                    MapCtrl.addBuffersAroundSearchLocation(geometry)
                    return true;
                } else {
                    return false
                }
            });
        } 

        function handleNoMatchesFound() {
            var bodyDisplayStr = 'Please try again';
            var titleDisplayStr = 'No results found';
            $(".modal-body").html(bodyDisplayStr);
            $(".modal-title").html(titleDisplayStr);
            $("#modalDisplay").modal('show');
        }

        function handleSubmittingFeedback() {

            var windowNav = window.navigator;
            var browserInfo = encodeURI(windowNav.userAgent);
            var operatingSystemInfo1 = encodeURI(windowNav.oscpu);
            var operatingSystemInfo2 = encodeURI(windowNav.platform);
            var finalOperatingSystemInfo = operatingSystemInfo1 === undefined ? operatingSystemInfo1 : operatingSystemInfo2;


            var nVer = navigator.appVersion;
            var nAgt = navigator.userAgent;
            var browserName = navigator.appName;
            var fullVersion = '' + parseFloat(navigator.appVersion);
            var majorVersion = parseInt(navigator.appVersion, 10);
            var nameOffset, verOffset, ix;

            function getBrowserInformation() {
                console.log(nAgt.indexOf('Trident'))
                // In Opera, the true version is after "Opera" or after "Version"
                if ((verOffset = nAgt.indexOf("Opera")) != -1) {
                    browserName = "Opera";
                    fullVersion = nAgt.substring(verOffset + 6);
                    if ((verOffset = nAgt.indexOf("Version")) != -1)
                        fullVersion = nAgt.substring(verOffset + 8);
                }
                // In MSIE, the true version is after "MSIE" in userAgent
                else if ((verOffset = nAgt.indexOf("MSIE")) != -1) {
                    browserName = "Microsoft-Internet-Explorer";
                    fullVersion = nAgt.substring(verOffset + 5);
                }
                else if (nAgt.indexOf('Trident') != -1) {
                    browserName = "Microsoft-Internet-Explorer";
                    fullVersion = nAgt.substring(verOffset + 5);
                    console.log(browserName);
                    console.log(fullVersion)
                }
                // In Chrome, the true version is after "Chrome" 
                else if ((verOffset = nAgt.indexOf("Chrome")) != -1) {
                    browserName = "Chrome";
                    fullVersion = nAgt.substring(verOffset + 7);
                }
                // In Safari, the true version is after "Safari" or after "Version" 
                else if ((verOffset = nAgt.indexOf("Safari")) != -1) {
                    browserName = "Safari";
                    fullVersion = nAgt.substring(verOffset + 7);
                    if ((verOffset = nAgt.indexOf("Version")) != -1)
                        fullVersion = nAgt.substring(verOffset + 8);
                }
                // In Firefox, the true version is after "Firefox" 
                else if ((verOffset = nAgt.indexOf("Firefox")) != -1) {
                    browserName = "Firefox";
                    fullVersion = nAgt.substring(verOffset + 8);
                }
                // In most other browsers, "name/version" is at the end of userAgent 
                else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) <
                    (verOffset = nAgt.lastIndexOf('/'))) {
                    browserName = nAgt.substring(nameOffset, verOffset);
                    fullVersion = nAgt.substring(verOffset + 1);
                    if (browserName.toLowerCase() == browserName.toUpperCase()) {
                        browserName = navigator.appName;
                    }
                }
                // trim the fullVersion string at semicolon/space if present
                if ((ix = fullVersion.indexOf(";")) != -1)
                    fullVersion = fullVersion.substring(0, ix);
                if ((ix = fullVersion.indexOf(" ")) != -1)
                    fullVersion = fullVersion.substring(0, ix);

                majorVersion = parseInt('' + fullVersion, 10);
                if (isNaN(majorVersion)) {
                    if (browserName != 'Microsoft-Internet-Explorer') {
                        fullVersion = '' + parseFloat(navigator.appVersion);
                        majorVersion = parseInt(navigator.appVersion, 10);
                    }
                }

            }
            var name = encodeURI(document.getElementById('inputName').value);
            var email = encodeURI(document.getElementById('inputEmail').value);
            var emailSubject = encodeURI(document.getElementById('inputSubject').value);
            var feedbackMessage = encodeURI(document.getElementById('feedbackMessage').value);
            getBrowserInformation();
            var urlOfWebsite = encodeURI(window.location.href);
            var data = {
                name: name,
                email: email,
                emailSubject: emailSubject,
                feedbackMessage: feedbackMessage,
                urlOfWebsite: urlOfWebsite,
                browserInfo: browserInfo,
                finalOperatingSystemInfo: finalOperatingSystemInfo,
                browserName: browserName,
                majorVersion: fullVersion,
            };
    
    
            var phpUrl = '//' + theServerName + '/Feedback/send-feedback.php';
            if (theServerName != "127.0.0.1:5500") {
                $.post(phpUrl, data, function(returnData) {
                    console.log(returnData)
                })
                .fail(function(err) {
                });
        
                $('.modal-body').html('Thank you for your feedback <br>');
                var modalFooter = document.querySelector('.modal-footer');
                var submitButton = document.getElementById('form-submit-button')
                modalFooter.removeChild(submitButton);
            }

        }

        return {
            initialize: function() {
                $("#searchbox").submit(function(e) {
                    MapCtrl.clearViewGraphics();
                    
                    callLoadSpinner();
                    e.preventDefault();
                    var inputString = $("#addressInput").val();
                    MapCtrl.setSearchTerm(inputString)
                    MapCtrl.searchGISDataForMatch(inputString)
                    .then(function(queryResponse) {            
                        var matchingFeatures = [];
                        for (var i = 0; i < queryResponse.length; i++) {
                            var features = queryResponse[i].features;
                            for (var j = 0; j < features.length; j++) {
                                matchingFeatures.push(features[j]);
                            }
                        }
            
                        if (matchingFeatures.length == 1) {
                            handleOneMatchOnSearch(matchingFeatures[0]);
                        } else if (matchingFeatures.length > 1) {
                            // show popup choices
                            handleMultipleMatchOnSearch(matchingFeatures);
                            MapCtrl.setMatchedFeatures(matchingFeatures);
                        } else {
                            searchWithGeocoder(inputString).then(function(geocodeSucess) {
                                cancelSpinner();
                                $(".tab-display-container").css('display', 'none');
                                resetMobibleTagLogosToDefault();
                                if (!geocodeSucess) {
                                    handleNoMatchesFound();
                                }
                            });
                        }
                    });
                });

                $('input[type=checkbox]').change(function (e) {
                    var className = e.target.className;
                    var isChecked = e.target.checked;
                    var idName = e.target.id;
                    if (className.indexOf("layer-selection") != -1) {
                        MapCtrl.updateLayerVisibility(idName, isChecked)
                    } 
              
                });

                document.addEventListener("click", function(event) {
                    var currClassName = event.target.className;
                    var currElementId = event.target.id;

                    var multipleSelectionOption = 'multiple-business-selection';
                    var multipleSelectionOptionName = 'multiple-business-selection';
                    var multipleSelectionOptionAddress = 'multiple-business-selection__address'

                    var clickedOnClosePopupButton = currClassName.indexOf('esri-popup__button') !== -1 ||
                    currClassName.indexOf('esri-popup__icon esri-icon-close') !== -1;
                    var multipleLocationsClass = "multiple-business";
                    if (currClassName.indexOf(multipleLocationsClass) != -1) {
                        var elementWithId = event.target.closest("div");
                        var selectedLocationId = elementWithId.id;
                        MapCtrl.handleSelectingPoposLocation(selectedLocationId);
                    }


                    if (clickedOnClosePopupButton) {
                        if (isOnMobile()) {
                            changeToNewMapHeight();
                        }
                    }

                    if (currElementId == "form-submit-button") {
                        handleSubmittingFeedback();
                    }

                });

                $('input[type=checkbox]').change(function (e) {
                    var className = e.target.className;
                    var isChecked = e.target.checked;
                    var idName = e.target.id;
                    if (className.indexOf("layer-selection") != -1) {
                        MapCtrl.updateLayerVisibility(idName, isChecked)
                    } else if (className.indexOf("popos-filter") != -1) {
                        var poposFilterInputs = $("input.popos-filter")
                        MapCtrl.applyPoposLayerFilter(poposFilterInputs);
                    }
              
                });

                $(".printmap").click(function() {
                    var inputString = $("#addressInput").val();
                    MapCtrl.makeMapPDF(inputString);
                    callLoadSpinner();
                })
            },
        }
    }();
    
    App.initialize();
});


function resetMobibleTagLogosToDefault() {
    $('#locations-logo').attr('src', 'images/Location.svg')
    $('#legend-logo').attr('src', 'images/legend.svg');
    var tabDisplayContainerChildren = $(".tab-container").children();

    for (var i = 0; i < tabDisplayContainerChildren.length; i++) {
        tabDisplayContainerChildren[i].classList.remove('selected');
    }
}


function isOnMobile() {
    var windowWidth = window.innerWidth;
    return windowWidth < 544 ? true : false;
}

function changePopFooterForMobile() {
    var esriPopupFooter = $('.esri-popup__footer--has-actions');
    esriPopupFooter.css({
      'position': 'absolute',
      'width': '100%',
      'top': '-46px',
      'border-bottom-right-radius': '0px',
      'border-bottom-left-radius': '0px'
    })
  }

function changeMapHeightAndHandleTabDisplay (popupIsVisible) {
    var contentContainerHeight = $(".content-container").height();
    var tabHeightsAtBottomOfScreen = 60;
    
    if (popupIsVisible) {
      var popupHeight = $(".esri-popup__main-container").height();
      var newMapHeight = contentContainerHeight - popupHeight - tabHeightsAtBottomOfScreen;
    } else {
      var newMapHeight = contentContainerHeight - tabHeightsAtBottomOfScreen;
    }
    $(".tab-display-container").css('display', 'none');

    $(".map-container").css('height', newMapHeight.toString());
    resetMobibleTagLogosToDefault();
  }


function callLoadSpinner() {
    $('#spinnerLargeMap').show();
    $('#map').addClass('disabledDIV');
  }
  
function cancelSpinner() {
    $('#spinnerLargeMap').hide();
    $('#map').removeClass('disabledDIV');
}
  
function highLightTabClicked(event) {
    var imageChild = event.querySelector('img');
    var imageId = imageChild.id;
    var imageSrc = document.querySelector('#' + imageId).getAttribute('src');
    var legendAlreadySelected = event.classList.contains('selected')
    if (legendAlreadySelected) {
        var nonActiveLogoSrc = imageSrc.replace('-active', '');
        $('#' + imageId).attr('src', nonActiveLogoSrc);
        $('.tab-display-container').css('display', 'none');
        event.classList.remove('selected');

    } else {
        var legendElements = $('.legend-element');
        $('.tab-display-container').css('display', 'block');
        for (var i = 0; i < legendElements.length; i++) {
        legendElements[i].classList.remove('selected');
        }
        event.classList.add('selected');
    }
}


function changeToNewMapHeight() {
    var mobileMenuHeight = $('.menu-mobile').height();
    var contentContainerHeight = $('.content-container').height();
    var newMapHeight = contentContainerHeight - mobileMenuHeight;
    $('.map-container').css('height', newMapHeight.toString());
}
  
function showLegendOnMobileTab() {
    $('#mobile-legend').css('display', 'block');
    $('#filter-container').css('display', 'none');
    $('#legend-logo').attr('src', 'images/legend-active.svg');
    $('#locations-logo').attr('src', 'images/Location.svg');
}
  
function showFilterOnMobileTab() {
    $('#mobile-legend').css('display', 'none');
    $('#filter-container').css('display', 'block');
    $('#locations-logo').attr('src', 'images/Location-active.svg')
    $('#legend-logo').attr('src', 'images/legend.svg');
}


function feedback() {
    $('#exampleModal').modal('show');
    console.log('showing')
}