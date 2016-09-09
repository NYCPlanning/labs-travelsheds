    mapboxgl.accessToken = 'pk.eyJ1IjoiY3dob25nbnljIiwiYSI6ImNpczF1MXdrdjA4MXcycXA4ZGtyN2x5YXIifQ.3HGyME8tBs6BnljzUVIt4Q';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v9',
        zoom: 10,
        minZoom: 1,
        center: [-74.024849,40.705628],
        pitch: 0
    })

    map.on('style.load', function() {

      map.addSource('subway-lines', {
        type: 'raster',
        tiles: ['https://cartocdn-ashbu.global.ssl.fastly.net/cwhong/api/v1/map/cwhong@4dff0d5e@e3f7aba54afc7cda617961b8152d7560:1468296486061/1/{z}/{x}/{y}.png'],
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

      map.addLayer({
        "id": "dropped-pin",
        "type": "circle",
        "source": "dropped-pin",
        "paint": {
            "circle-radius": 4,
            "circle-color": "steelblue"
        }
      });

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
          'fill-opacity': 0.6     
        }
      });      


      map.on('click', function(e){
        console.log(e)
        map.getSource('dropped-pin').setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [e.lngLat.lng, e.lngLat.lat]
          }
        })

        getIsochrone(e.lngLat);
      })  
    })



function getIsochrone(lngLat) {
  console.log(lngLat)
  var apiCall = Mustache.render('https://{{host}}/otp/routers/default/isochrone?routeId=default&batch=true&fromPlace={{lat}},{{lng}}&date=2016/09/25&time=12:00:00&mode=TRANSIT,WALK&cutoffSec=900&cutoffSec=1800&cutoffSec=2700', {
      lat: lngLat.lat,
      lng: lngLat.lng,
      host: 'otp.reallysimpleopendata.com'
  })

  $.getJSON(apiCall, function(geojson) {
    console.log(geojson)

    map.getSource('transitsheds').setData(geojson)



  })
}

