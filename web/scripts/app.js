var app = (function () {
    var mapCanvas = document.getElementById("map-canvas");
    var map, geocoder, firstMarker = true;
    var markersArr = {}, addressArr = {};
    var eventColorArr = ["#EF9A9A", "#B39DDB", "#81D4FA", "#A5D6A7", "#FFF59D", "#FFAB91", "#F48FB1", "#9FA8DA", "#80DEEA", "#C5E1A5", "#FFE082", "#CE93D8", "#90CAF9", "#80CBC4", "#E6EE9C", "#FFCC80"];    

    function sxswEvent(eventData) {
        var self = this;

        self.title = $.trim(eventData.Title);
        self.startDate = $.trim(eventData.StartDate);
        self.endDate = $.trim(eventData.EndDate);
        self.startTime = $.trim(eventData.StartTime);
        self.endTime = $.trim(eventData.EndTime);
        self.dayOfWeek = $.trim(eventData.DayOfWeek);
        self.duration = $.trim(eventData.Duration);
        self.description = $.trim(eventData.Description);
        self.where = $.trim(eventData.Where);
        self.address = $.trim(eventData.Address) + " Austin, Texas";
        self.calendar = $.trim(eventData.Calendar);
        self.preferred = $.trim(eventData.Preferred);
        self.pillar = ($.trim(eventData.Pillar)).toLowerCase();        
    }

    function codeAddress(sxswEvent, callback) {
        var address = $.trim(sxswEvent.address);
        if ((address in addressArr)) {
            callback(addressArr[address]);
        }
        else {
            geocoder = new google.maps.Geocoder();
            geocoder.geocode({
                'address': address
            }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    callback(results[0].geometry.location);
                }
                else {
                    alert('Geocode was not successful for the following reason: ' + status);
                }
            });
        }
    }

    function placeMarker(position, event, filteredEvents, showExtraInfo) {
        // check that this marker doesn't already exist in the markers array. We don't need to draw it again.
        if (!(event.address in markersArr)) {
            // draw a new marker
            var marker = new google.maps.Marker({
                map: map,
                position: position,                
            });

            var contentString = buildInfoWindow(filteredEvents, showExtraInfo);

            var infowindow = new google.maps.InfoWindow({
                content: contentString
            })

            google.maps.event.addListener(marker, "click", function () {
                infowindow.open(map, marker);
            })

            markersArr[event.address] = marker;
        }
    }

    function buildInfoWindow(events, showExtraInfo) {
        var contentString;

        if (showExtraInfo)
            contentString = "<div><table border='1'><tr><th>Calendar</th><th>Event</th><th>Date</th><th>Time</th><th>Duration</th></tr>"
        else
            contentString = "<div><table border='1'><tr><th>Calendar</th><th>Event</th><th>Duration</th></tr>";

        var eventName = "", color = "";
        for (var i = 0; i < events.length; i++) {
            if (eventName !== events[i].title) {
                eventName = events[i].title;
                color = eventColorArr[i % eventColorArr.length];
            }

            contentString += "<tr><td>";
            contentString += events[i].calendar;
            contentString += "</td><td style='background-color:" + color + ";'>";
            contentString += events[i].title;
            contentString += "</td><td style='background-color:" + color + ";'>";

            if (showExtraInfo) {
                contentString += events[i].startDate;
                contentString += "</td><td style='background-color:" + color + ";'>";
                contentString += events[i].startTime;
                contentString += "</td><td style='background-color:" + color + ";'>";
            }

            contentString += events[i].duration;
            contentString += "</td></tr>";
        }

        contentString += "</table></div>";
        return contentString;
    }

    function EventsViewModel() {
        var self = this;

        self.sxswEvents = ko.observableArray([]);
        self.people = ko.observableArray(["All"]);
        self.times = ko.observableArray([]);
        self.dates = ko.observableArray([]);
        self.pillars = ko.observableArray(["BI/Analytics", "Entrepreneurs", "Design (UX, Visualization)", "Emerging Tech", "Mobile + Emerge", "IoT + Emerge + Wearables", "Getting Ideas to Stick, Spur Innovation, Ideation", "Branding Storytelling", "Visual/Data Storytelling", "Diversity in STEM"]);
        self.locations = ko.observableArray([]);
        self.selectedPerson = ko.observable("");
        self.selectedDate = ko.observable("");
        self.selectedTime = ko.observable("");
        self.selectedPillar = ko.observable("");
        self.placeOrPillarTabActive = ko.observable(false);
        self.specificPillarTab = ko.observable("");
        self.filterPreferred = ko.observable(false);

        self.targetEvents = ko.computed(function () {
            var person = (self.selectedPerson() === "All") ? "" : self.selectedPerson();

            var filteredEvents = ko.utils.arrayFilter(self.sxswEvents(), function (event) {
                return ((event.calendar.indexOf(person) > -1) && (event.startDate.indexOf(self.selectedDate()) > -1) && (event.startTime.indexOf(self.selectedTime()) > -1) && (event.pillar.indexOf(self.selectedPillar().toLowerCase()) > -1));
            });

            if (self.filterPreferred()) {
                return ko.utils.arrayFilter(filteredEvents, function (event) { return (event.preferred === "TRUE") });
            }

            return filteredEvents;
        });

        self.tabClick = function (data, event) {
            if (event.target.text === "Place") {
                self.placeOrPillarTabActive(true);
                self.selectedPillar("");
                self.specificPillarTab("");
                self.cascadeNames(true);
                appUtilities.hidePillarList();
                appUtilities.showPersonList();
                appUtilities.showAllPersonItem();
                appUtilities.showDateList();
                appUtilities.hideTimeList();
                appUtilities.clickAllPersonItem();
            }
            else {
                self.placeOrPillarTabActive(false);
                if (event.target.text === "Time") {
                    self.selectedPillar("");
                    self.selectedPerson("");
                    self.specificPillarTab("");
                    self.filterPreferred(false);                    
                    appUtilities.hidePillarList();
                    appUtilities.hidePersonList();
                    appUtilities.showDateList();
                    appUtilities.showTimeList();
                    appUtilities.clickFirstDateItem();
                }

                if (event.target.text === "Name") {
                    self.selectedPillar("");
                    self.specificPillarTab("");
                    self.cascadeNames(true);
                    appUtilities.hidePillarList();
                    appUtilities.showPersonList();
                    appUtilities.showDateList();
                    appUtilities.hideAllPersonItem();
                    appUtilities.showTimeList();
                    appUtilities.clickFirstPersonItem();
                }

                if (event.target.text === "Pillars by Day") {
                    self.placeOrPillarTabActive(true);
                    self.filterPreferred(false);
                    self.specificPillarTab("Day");
                    appUtilities.showPillarList();
                    appUtilities.showDateList();
                    appUtilities.hidePersonList();
                    appUtilities.hideTimeList();
                    appUtilities.clickFirstPillarItem();                    
                }

                if (event.target.text === "Pillars by Name") {
                    self.placeOrPillarTabActive(true);
                    self.filterPreferred(false);
                    self.specificPillarTab("Name");
                    self.selectedDate("");
                    appUtilities.showPillarList();
                    appUtilities.showPersonList();
                    appUtilities.hideDateList();
                    appUtilities.hideTimeList();
                    appUtilities.clickFirstPillarItem();
                }
            }            
        }

        self.addDate = function (startDate) {            
            if (self.dates.indexOf(startDate) < 0)
                self.dates.push(startDate);            
        };

        self.addTime = function (startTime) {
            if (self.times.indexOf(startTime) < 0)
                self.times.push(startTime);
        };

        self.clearDates = function () {
            self.dates.removeAll();
        }

        self.clearTimes = function () {
            self.times.removeAll();
        }

        self.clearMarkers = function () {
            for (var key in markersArr) {
                markersArr[key].setMap(null);
            }
            markersArr = [];
        }

        self.cascadeNames = function (reset) {
              
            $.each(self.people(), function (index, item) {
                $("#person-list li:eq(" + index + ")").show();
            });

            if (!(reset)) {
                var filteredEvents = ko.utils.arrayFilter(self.sxswEvents(), function (event) {
                    return (event.pillar.indexOf(self.selectedPillar().toLowerCase()) > -1);
                });

                var newNameArr = [];
                $.each(filteredEvents, function (index, item) {
                    if (newNameArr.indexOf(item.calendar) < 0)
                        newNameArr.push(item.calendar);
                });

                var diff = $(self.people()).not(newNameArr).get();

                $.each(diff, function (index, item) {
                    var personIndex = $.inArray(item, self.people());
                    $("#person-list li:eq(" + personIndex + ")").hide();
                });
            }
        }

        self.clickPillarItem = function (data, event) {
            self.selectedPillar(data);

            if (self.specificPillarTab() === "Day")
                self.clickPersonItem("", null);
            else {
                self.cascadeNames(false);
                appUtilities.clickFirstPersonItem();
            }
        }

        self.clickPersonItem = function (data, event) {                        
            self.selectedPerson(data);

            if (self.specificPillarTab() !== "Name") {                
                self.clearDates();
                var person = (self.selectedPerson() === "All") ? "" : data;
                var filteredEvents = ko.utils.arrayFilter(self.sxswEvents(), function (event) {
                    return ((event.calendar.indexOf(person) > -1) && (event.pillar.indexOf(self.selectedPillar().toLowerCase()) > -1));
                });

                $.each(filteredEvents, function (index, item) {
                    self.addDate(item.startDate);
                });
                appUtilities.clickFirstDateItem();
            }
            else {
                self.clickDateItem("", null);
            }

            
        }

        self.clickDateItem = function (data, event) {                        
            self.selectedDate(data);            
            if (self.placeOrPillarTabActive()) {                
                self.loadMap("", null);
            }
            else {                
                self.clearTimes();
                var person = (self.selectedPerson() === "All") ? "" : self.selectedPerson();                
                var filteredEvents = ko.utils.arrayFilter(self.sxswEvents(), function (event) {
                    return ((event.startDate === data) && (event.calendar.indexOf(person) > -1));
                });

                $.each(filteredEvents, function (index, item) {
                    self.addTime(item.startTime);
                });
                
                appUtilities.clickFirstTimeItem();                
            }                  
        };

        self.loadMap = function (data, event) {                      
            self.clearMarkers();
            self.selectedTime(data);
            var index = 0;

            function loadEvents() {
                if (index < self.targetEvents().length) {
                    firstMarker = (index > 0) ? false : true;

                    var event = self.targetEvents()[index];
                    codeAddress(event, function (latLong) {
                        addressArr[event.address] = latLong;
                        placeMarker(latLong, event, ko.utils.arrayFilter(self.targetEvents(), function (item) { return item.address === event.address }), self.placeOrPillarTabActive());

                        if (firstMarker) map.setCenter(latLong);

                        ++index;
                        loadEvents();
                    });
                }
            }
            
            loadEvents();
        }

        self.filterForPreferredEvents = function () {
            self.clearMarkers();
            $.each(self.targetEvents(), function (index, value) {
                placeMarker(addressArr[value.address], value, ko.utils.arrayFilter(self.targetEvents(), function (item) { return item.address === value.address }), self.placeOrPillarTabActive());
            });
            return true;
        }

        $.getJSON("/content/data/Final_Events.json", function (data) {            
            var mappedEvents = $.map(data, function (item) {
                if (self.people.indexOf($.trim(item.Calendar)) < 0) {
                    self.people.push($.trim(item.Calendar));
                }                
                self.addDate($.trim(item.StartDate));
                return new sxswEvent(item)
            });
            self.sxswEvents(mappedEvents);
            appUtilities.clickFirstDateItem();
        });
    }

    window.mobilecheck = function () {
        var check = false;
        (function (a, b) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    }

    var appUtilities = (function () {
        return {
            clickAllPersonItem : function() {
            $("#personlist li:eq(0)").addClass("active").find("a").trigger("click");
            },
            clickFirstPersonItem: function () {
                $("#personlist li:eq(1)").addClass("active").find("a").trigger("click");
            },
            clickFirstDateItem: function () {
                $("#datelist li").first().addClass("active").find("a").trigger("click");
            },
            clickFirstTimeItem: function () {
                $("#time-list li").first().addClass("active").find("a").trigger("click");
            },
            clickFirstPillarItem: function(){
                $("#pillarlist li").first().addClass("active").find("a").trigger("click");
            },
            hidePersonList: function () {
                $("#personlist").hide();
            },
            showPersonList: function(){
                $("#personlist").show();
            },
            hideDateList: function() {
                $("#datelist").hide();
            },
            showDateList: function() {
                $("#datelist").show();
            },
            hideTimeList: function () {
                $("#timelist").hide();
            },
            showTimeList: function () {
                $("#timelist").show();
            },
            showPillarList: function(){
                $("#pillarlist").show();
            },
            hidePillarList: function(){
                $("#pillarlist").hide();
            },
            hideAllPersonItem: function () {
                $("#person-list li:eq(0)").hide();
            },
            showAllPersonItem: function () {
                $("#person-list li:eq(0)").show();
            }
        }
    })();

    function initMap() {        
        var zoom = ((window.mobilecheck()) ? 14 : 15);

        var mapOptions = {
            center: new google.maps.LatLng(30.268515, -97.741725),
            zoom: zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        map = new google.maps.Map(mapCanvas, mapOptions);

        google.maps.event.addDomListener(window, "resize", function () {
            var center = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
        });
    }

    function initEventHandlers() {
        $("ul.picklist").on("click", "li a", function () {
            $(this).parent().parent().find("li").removeClass("active");
            $(this).parent().addClass("active");
        });
    }

    return {
        viewModel: EventsViewModel,
        initMap: initMap,
        initEventHandlers: initEventHandlers
    };
})();

$(function () {
    $(window).resize(function () {
        var h = $(window).height(),
            offsetTop = 60; // Calculate the top offset

        $('#map-canvas').css('height', (h - offsetTop));
    }).resize();

    ko.applyBindings(new app.viewModel());
    app.initEventHandlers();    
    google.maps.event.addDomListener(window, 'load', app.initMap());    
});