var initialization = {
        location: {
            lat: 28.7041,
            lng: 77.1048973
        },
        radius: 180,
        query: 'Gas Station'
    },
    map,
    infoWindow,
    marker, markers = [],
    venueClick = {},
    foursquareuri = '',
    display = '',
    venueFilter = [],
    vMarkerPos;

    var viewModel = function() {
    //scope alias
    var self = this;
    var geocoder = new google.maps.Geocoder();
    this.searchMe = function() {
      self.geoAddr(geocoder, map);
  }
    self.geoAddr = function(geocoder, resultsMap) {
            var address = document.getElementById('location').value;
            geocoder.geocode({
                'address': address
            }, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    resultsMap.setCenter(results[0].geometry.location);

                    initialization.location = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    };
                    self.searchTxt('');
                    self.placesArray([]);
                    self.clearMarkers();
                    markers = [];
                    self.runQuery(map);
                } else {
                    alert('Geocode was not successful for the following reason: ' + status);
                }
            });
        },
        self.runQuery = function(map) {
            //passing a callback method,to handle the results object and a google.maps.places.PlacesServiceStatus response.
            var service = new google.maps.places.PlacesService(map);
            service.textSearch(initialization, self.callback);
        },
        self.callback = function(result, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (i = 0, len = result.length; i < len; i++) {
                    self.pushVenue(result[i]);
                    self.createMarker(result[i]);
                }
            } else alert("Places request failed, status=" + status)
        },
        self.pushVenue = function(place) {
            self.placesArray.push(place.name);
        },
        //creating PlacesServiceStatus.textSearch() method, mareker and infowindow
        self.createMarker = function(place) {
            loc = place.geometry.location;
            marker = new google.maps.Marker({
                position: loc,
                animation: google.maps.Animation.DROP,
                map: map,
                icon: 'image/marker.png'
            });

            self.callAjax(place, marker);
            markers.push(marker);
        },

        self.callAjax = function(place, marker) {
            // Setting up foursquar IDs
            var ClientID = 'YDFWPRMR2KZOS15HMNLNAFG0IBLPGE4JSTATT1KMKBD445DE',
                ClientSecret = 'PFCVGZFD34KCK1SA4KYY4LDQFBTXO2KQ1OR0SG0GO21XFM20'

            //FourSquare Search API
            foursquareuri = 'https://api.foursquare.com/v2/venues/search?client_id=' + ClientID + '&client_secret=' + ClientSecret + '&v=20161219&ll=' + place.geometry.location.lat() +
                ',' + place.geometry.location.lng() +
                '&query=' + place.name + '&limit=1';

            $.getJSON(foursquareuri, function(data) {
                placeDetail = data.response.venues[0];

                if (placeDetail) {
                    self.placeAddress(placeDetail.location.hasOwnProperty('address') ? placeDetail.location.address : 'Address not found');

                    self.placeLink(placeDetail.hasOwnProperty('url') ? placeDetail.url : 'No url Found');

                    if (self.placeLink() === 'No url Found') {
                        display = '<span class="gas-station">' + place.name + '</span>' + '<div class="gasdealer-detail">Gas Dealer Detail on Foursquare:<span class="foursquare-detail"><p class="address"> Address: ' + self.placeAddress() + '</p>' +
                            '<span>URL: ' + self.placeLink() + '</span>' + '<p class="category"> Category: ' + placeDetail.categories[0].name + '</p></span></div>';
                    } else {
                        display = '<span class="gas-station">' + place.name + '</span>' + '<div class="gasdealer-detail">Gas Dealer Detail on Foursquare:<span class="foursquare-detail"><p class="address">Address: ' + self.placeAddress() + '</p>' +
                            '<a href=' + self.placeLink() + '>' + self.placeLink() + '</a>' + '<p class="Category"> Category: ' + placeDetail.categories[0].name + '</p></span></div>';
                    }
                } else {
                    console.log(place.name + ' not found');
                    display = '<span class="gas-station">' + place.name + '</span>' + '<div class="gasdealer-detail">Place Not found in foursquare database</div>';
                }
                marker.displayProp = display;
                google.maps.event.addListener(marker, 'click', function(marker, display) {
                    return function() {
                        //setting bounce animation
                        marker.setAnimation(google.maps.Animation.BOUNCE);
                        setTimeout(function() {
                            marker.setAnimation(null);
                        }, 1400);
                        infoWindow.setContent(display);
                        infoWindow.open(map, this);
                    };
                }(marker, display));

            }).fail(function() {
		 	alert("Error Occured while loading Foursquare API. Try again, later");
	             });
        },

        /* observable properties for data-binding, search function and event handlers*/
        self.searchTxt = ko.observable(''),
        self.placesArray = ko.observableArray([]),
        self.markerArray = ko.observableArray([]),
        self.placeAddress = ko.observable(''),
        self.placeLink = ko.observable(''),
        self.allMarkers = function(map) {
            for (var i = 0; i < markers.length; i++) {
                markers[i].setMap(map);
            }
        },
        self.oneMarker = function(pos) {
            markers[pos].setMap(map);
            self.markerArray.push(markers[pos]);

        },
        self.clearMarkers = function() {
            self.allMarkers(null);
            self.markerArray([]);
        },
        self.filteredSearch = function() {
            var filter = self.searchTxt().toLowerCase();
            if (!filter) {
                self.allMarkers(map);
                self.markerArray(markers);
                return self.placesArray();
            } else {
                self.clearMarkers();
                venueFilter = [];
                //knockout's utility fuction have been used here for live searching
                return ko.utils.arrayFilter(this.placesArray(), function(venue) {
                    if (venue.toLowerCase().indexOf(filter.toLowerCase()) >= 0) {
                        //puts venues to other array
                        venueFilter.push(venue);
                        //will get venue positions
                        vMarkerPos = self.placesArray().indexOf(venue);
                        //new marker for all  filter venues
                        self.oneMarker(vMarkerPos);
                        return venueFilter;
                    }
                });
            }
        },
        self.clickVenueItem = function(index) {
            venueClick = self.markerArray()[index];
            if (venueClick.getAnimation() !== null) {
                venueClick.setAnimation(null);
            } else {
                venueClick.setAnimation(google.maps.Animation.BOUNCE);
                infoWindow.setContent(venueClick.displayProp);
                infoWindow.open(map, venueClick);
                setTimeout(function() {
                    venueClick.setAnimation(null);
                }, 2000);
            }
        },

        google.maps.event.addDomListener(window, 'load', self.runQuery(map));
};

function initMap() {
    "use strict";
    var mapOptions = {
            center: initialization.location,
            zoom: 12
        },
        elemMap = document.getElementById('my-map');
    map = new google.maps.Map(elemMap, mapOptions);
    infoWindow = new google.maps.InfoWindow();
    google.maps.event.addDomListener(window, 'resize', function() {
        var center = map.getCenter();
        google.maps.event.trigger(map, 'resize');
        map.setCenter(center);
    });
    ko.applyBindings(new viewModel());
}

// error handling function for google map
function mapError() {
    "use strict";
    document.getElementById('my-map').innerHTML = "<span class='map-error'>Error Ocuured. Please try again later</span>";
}
