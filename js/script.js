let map;
let lngLat;
let isochroneFC;
zip.workerScriptsPath = 'js/zipWorkerScripts/';

function saveBlob(filename, blob, done) {
  // IE11 & Edge
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(blob, filename);
  } else {
    // In FF link must be added to DOM to be clicked
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    // document.body.removeChild(link);
  }
  done();
}

function getIsochrone() {
  $('#loading-overlay').fadeIn();
  map.setLayoutProperty('transitsheds', 'visibility', 'none');

  map.getSource('dropped-pin').setData({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lngLat.lng, lngLat.lat],
    },
  });

  $('.download-button').attr('disabled', true);


  // prepare a date
  const day = $('.day-select').val();
  const hour = $('.hour-select').val();

  let date = '2018/05/21';

  if (day === 'saturday') date = '2018/05/19';
  if (day === 'sunday') date = '2018/05/20';

  const time = `${hour}:00:00`;


  let apiCall = Mustache.render('https://{{host}}/otp/routers/default/isochrone?routeId=default&batch=true&fromPlace={{lat}},{{lng}}&date={{{date}}}&time={{time}}&mode={{mode}}', {
    host: 'otp.planninglabs.nyc',
    lat: lngLat.lat,
    lng: lngLat.lng,
    date,
    time,
    mode,
  });

  cutoffs.forEach((cutoff) => {
    // check if valid integer
    if (Number.isInteger(cutoff)) {
      const seconds = cutoff * 60;
      apiCall += `&cutoffSec=${seconds}`;
    }
  });

  console.log('Fetching isochrones...', apiCall);

  $.getJSON(apiCall, (geojson) => {
    isochroneFC = geojson;

    map.getSource('transitsheds').setData(geojson);
    map.setLayoutProperty('transitsheds', 'visibility', 'visible');
    $('#loading-overlay').fadeOut();
    $('.download-button').attr('disabled', false);
    $('.redraw-button').attr('disabled', false);

    $('.message').hide();
    $('.clear-button').show();
  });
}

function setupMapLayers(map, layergroupid) {
  map.addSource('transportation', {
    type: 'vector',
    tiles: [`https://planninglabs.carto.com/api/v1/map/${layergroupid}/{z}/{x}/{y}.mvt`],
  });

  const subwayLayers = subwayLayerGroup.layers.map(layer => layer.layer);

  subwayLayers.forEach((layer) => {
    map.addLayer(layer);
  });

  map.addSource('dropped-pin', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: null,
    },
  });

  map.addSource('transitsheds', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: null,
    },
  });

  map.addLayer({
    id: 'transitsheds',
    type: 'fill',
    source: 'transitsheds',
    paint: {
      'fill-color': 'steelblue',
      'fill-opacity': 0.3,
      'fill-outline-color': 'gray',
    },
  });

  map.addLayer({
    id: 'dropped-pin2',
    type: 'circle',
    source: 'dropped-pin',
    paint: {
      'circle-radius': 6,
      'circle-color': 'gray',
    },
  });

  map.addLayer({
    id: 'dropped-pin',
    type: 'circle',
    source: 'dropped-pin',
    paint: {
      'circle-radius': 5,
      'circle-color': 'orange',
    },
  });


  map.on('click', (e) => {
    lngLat = e.lngLat;
    getIsochrone();
  });
}

map = new mapboxgl.Map({
  container: 'map',
  style: '//raw.githubusercontent.com/NYCPlanning/labs-gl-style/master/data/style.json',
  zoom: 10,
  minZoom: 1,
  center: [-74.024849, 40.705628],
  pitch: 0,
});
map.addControl(new mapboxgl.NavigationControl());

// manually instantiate cartodb vector tile
map.on('style.load', () => {
  $.ajax({
    type: 'POST',
    url: 'https://planninglabs.carto.com/api/v1/map',
    dataType: 'text',
    data: JSON.stringify({
      version: '1.3.0',
      layers: [
        {
          id: 'subway-routes',
          type: 'mapnik',
          options: {
            cartocss_version: '2.3.0',
            cartocss: '#layer { polygon-fill: #FFF; }',
            sql: 'SELECT the_geom_webmercator, rt_symbol FROM mta_subway_routes_v0',
          },
        },
        {
          id: 'subway-stops',
          type: 'mapnik',
          options: {
            cartocss_version: '2.3.0',
            cartocss: '#layer { polygon-fill: #FFF; }',
            sql: 'SELECT the_geom_webmercator, name FROM mta_subway_stops_v0',
          },
        },
        {
          id: 'subway-entrances',
          type: 'mapnik',
          options: {
            cartocss_version: '2.3.0',
            cartocss: '#layer { polygon-fill: #FFF; }',
            sql: 'SELECT the_geom_webmercator FROM mta_subway_entrances_v0',
          },
        },
      ],
    }),
    contentType: 'application/json',
    success(res) {
      const { layergroupid } = JSON.parse(res);
      setupMapLayers(map, layergroupid);
    },
  });
});

// Event Handlers

window.mode = 'TRANSIT,WALK';

$('.mode-select').change((e) => {
  mode = e.target.value;
});

$('.clear-button').click(() => {
  map.getSource('transitsheds').setData({
    type: 'FeatureCollection',
    features: [],
  });

  map.getSource('dropped-pin').setData({
    type: 'Feature',
    geometry: null,
  });

  // disable download buttons
  $('.download-button').attr('disabled', true);
  $('.redraw-button').attr('disabled', true);

  // restore default message
  $('.message').show();
  $('.clear-button').hide();
});

$('.redraw-button').click(() => {
  getIsochrone();
});

$('.download-shp').click(() => {
  const options = {
    folder: 'myshapes',
    types: {
      point: 'mypoints',
      polygon: 'mypolygons',
      line: 'mylines',
    },
  };

  // create a mapshaper dataset from geojson FeatureCollection
  const msDataset = mapshaper.internal.importGeoJSON(isochroneFC, {
    auto_snap: false,
    files: ['input.json'],
    no_repair: false,
  });

  // create an array of ArrayBuffers (one per file in the shapefile)
  const files = mapshaper.internal.exportShapefile(msDataset, {
    format: 'shapefile',
  });

  // combine all files into a zip archive
  // from mapshaper-gui.js
  function saveZipFile(zipfileName, filesToZip, done) {
    const toAdd = filesToZip;

    function addFile(archive) {
      if (toAdd.length === 0) {
        archive.close((blob) => {
          saveBlob(zipfileName, blob, done);
        });
      } else {
        const obj = toAdd.pop();
        const blob = new Blob([obj.content], { type: 'text/plain' });
        archive.add(`travelsheds${obj.filename}`, new zip.BlobReader(blob), () => { addFile(archive); });
      }
    }

    function zipError(msg) {
      let str = 'Error creating Zip file';
      if (msg) {
        str += `: ${msg.message || msg}`;
      }
      done(str);
    }

    try {
      zip.createWriter(new zip.BlobWriter('application/zip'), addFile, zipError);
    } catch (e) {
      // TODO: show proper error message, not alert
      done("This browser doesn't support Zip file creation.");
    }
  }

  saveZipFile('travelsheds.zip', files, () => {});
});


$('.download-geojson').click(() => {
  // prepare blob from geojson
  const blob = new Blob([JSON.stringify(isochroneFC)], { type: 'text/plain' });
  saveBlob('travelsheds.geojson', blob, () => {});
});
