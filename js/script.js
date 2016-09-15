var isochroneFC


zip.workerScriptsPath = 'js/zipWorkerScripts/'



$('.download-button').click(function() {

  var options = {
    folder: 'myshapes',
    types: {
        point: 'mypoints',
        polygon: 'mypolygons',
        line: 'mylines'
    }
  }

  //create a mapshaper dataset from geojson FeatureCollection
  var msDataset = mapshaper.internal.importGeoJSON(isochroneFC, {
    auto_snap:false,
    files:['input.json'],
    no_repair:false
  })

  //create an array of ArrayBuffers (one per file in the shapefile)
  var files = mapshaper.internal.exportShapefile(msDataset, {
    format: "shapefile"
  })

  //manually create a .prj file for WGS84
  var crsString = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
 
  var buf = new ArrayBuffer(crsString.length*2)
  var bufView = new Uint16Array(buf);

  for (var i=0, strLen=crsString.length; i<strLen; i++) {
    bufView[i] = crsString.charCodeAt(i);
  }

  files.push({
    content: buf,
    filename: '.prj'
  })
  

  saveZipFile('travelsheds.zip',files, function(){
  })

  //combine all files into a zip archive
  //from mapshaper-gui.js
 function saveZipFile(zipfileName, files, done) {
    var toAdd = files;
    try {
      zip.createWriter(new zip.BlobWriter("application/zip"), addFile, zipError);
    } catch(e) {
      // TODO: show proper error message, not alert
      done("This browser doesn't support Zip file creation.");
    }

    function zipError(msg) {
      var str = "Error creating Zip file";
      if (msg) {
        str += ": " + (msg.message || msg);
      }
      done(str);
    }

    function addFile(archive) {
      if (toAdd.length === 0) {
        archive.close(function(blob) {
          saveBlob(zipfileName, blob, done);
        });
      } else {
        var obj = toAdd.pop(),
            blob = new Blob([obj.content], { type: "text/plain" });
        archive.add('travelsheds' + obj.filename, new zip.BlobReader(blob), function() {addFile(archive);});
      }
    }
  }

  //start the download
  function saveBlob(filename, blob, done) {
    //IE11 & Edge
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(csvData, exportFilename);
    } else {
        //In FF link must be added to DOM to be clicked
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);    
        link.click();
        //document.body.removeChild(link);    
    }
    done();
  }

})
  
    mapboxgl.accessToken = 'pk.eyJ1IjoiY3dob25nbnljIiwiYSI6ImNpczF1MXdrdjA4MXcycXA4ZGtyN2x5YXIifQ.3HGyME8tBs6BnljzUVIt4Q';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v9',
        zoom: 10,
        minZoom: 1,
        center: [-74.024849,40.705628],
        pitch: 0
    })
    map.addControl(new mapboxgl.Navigation());

    //manually instantiate cartodb map


    map.on('style.load', function() {    
      $.ajax({
        type: 'POST',
        url: 'https://cwhong.carto.com/api/v1/map/named/tpl_230e29ac_7640_11e6_89c5_0e05a8b3e3d7',
        dataType : "text",
        contentType: "application/json",
        success: function(data) { 
          data = JSON.parse(data);
          var layergroupid = data.layergroupid

          setupMapLayers(layergroupid)
        }
      })
    })

    function setupMapLayers(layergroupid) {
      map.addSource('subway-lines', {
        type: 'raster',
        tiles: ['https://cwhong.carto.com/api/v1/map/' + layergroupid + '/{z}/{x}/{y}.png'],
        tileSize: 256
      })

      map.addLayer({
            "id": "subway-lines",
            "type": "raster",
            "source": "subway-lines",
            "minzoom": 0,
            "maxzoom": 22
      })

      map.addSource('dropped-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: null
        }
      })



      map.addSource('transitsheds', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: null
        }
      })

      map.addLayer({
        "id": "transitsheds",
        "type": "fill",
        "source": "transitsheds",
        "paint": {
          'fill-color': 'steelblue',
          'fill-opacity': 0.3,
          'fill-outline-color': 'gray'     
        }
      });    

      map.addLayer({
        "id": "dropped-pin2",
        "type": "circle",
        "source": "dropped-pin",
        "paint": {
            "circle-radius": 6,
            "circle-color": "gray"
        }
      }); 

      map.addLayer({
        "id": "dropped-pin",
        "type": "circle",
        "source": "dropped-pin",
        "paint": {
            "circle-radius": 5,
            "circle-color": "orange"
        }
      }); 

      


      map.on('click', function(e){

        $('#loading-overlay').fadeIn()
        map.setLayoutProperty('transitsheds', 'visibility', 'none')

        map.getSource('dropped-pin').setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [e.lngLat.lng, e.lngLat.lat]
          }
        })

        getIsochrone(e.lngLat);
      }) 
    }

    
  



function getIsochrone(lngLat) {

  var apiCall = Mustache.render('https://{{host}}/otp/routers/default/isochrone?routeId=default&batch=true&fromPlace={{lat}},{{lng}}&date=2016/09/25&time=12:00:00&mode={{mode}}', {
      lat: lngLat.lat,
      lng: lngLat.lng,
      host: 'otp.reallysimpleopendata.com',
      mode: mode
  })

  cutoffs.forEach(function(cutoff) {
    var seconds = cutoff * 60
    apiCall += '&cutoffSec=' + seconds
  })

  console.log('Fetching isochrones...', apiCall)

  $.getJSON(apiCall, function(geojson) {

    isochroneFC = geojson

    map.getSource('transitsheds').setData(geojson)
    map.setLayoutProperty('transitsheds', 'visibility', 'visible')
    $('#loading-overlay').fadeOut()

  })
}

window.mode = 'TRANSIT,WALK'

$( ".mode-select" ).change(function(e) {
  mode=e.target.value
});
