// We wrap everything in the shorthand of jQuery's $(document).ready() function
// to make sure all css is loaded and applied before our js kicks in
$(function() {


    // Our design is responsive, so we need to account for it
    // when drawing the svg vector map. Since in our css we define
    // the max-width of the map container, let's get that width and use that as
    // basis for the map's size.
    var width = height = $("#pres_map").width();

    // Let's get the data first
    $.getJSON("https://elections.accessmo.org/federal", function(data){
        // And only after we get it, can we draw a map with it.

        // Get the date when it was last updated
        // Variable "updated" is a date object, you can start reading here on how to use it:
            // http://stackoverflow.com/questions/3552461/how-to-format-a-javascript-date
        var updated = new Date(data.last_updated);
        $("#updated").text(updated);

        // Let's re-factor the structure of data we got to make it work snappier with D3:

        // Create variables that will help us access candidate info easier
        var president_candidates = {}
        var senate_candidates = {}

        // Container to hold new, re-factored data
        var clear_data = {}

        function refactorCounties(origianl_array){

            // Okay, what this does, basically, is turns couty code and candidate ids into object key names.
            // Makes it easier to reference further on.
            var new_counties = {}
            $.each(origianl_array, function(index, county){

                new_counties[county.fips] = {
                    "reporting_precincts": county.reporting_precincts,
                    "total_precincts": county.total_precincts,
                };
                $.each(county.candidates, function(i, candidate){
                    new_counties[county.fips][candidate.id] = candidate.votes;
                })

            });
            return new_counties;
            // Just do console.log(new_counties) if you need to see what this function really does to data
        }

        function populateCandidates(candidates_array){
            var new_candidates = {};
            $.each(candidates_array, function(i, candidate){
                new_candidates[candidate.id] = {
                    "name": candidate.name,
                    "party": candidate.party,
                    "votes": candidate.votes
                }
            });
            return new_candidates;
        };

        function getWinnerID(county_data){
            // Sometimes numbers for precincts can be higher, than votes count, so let's delete those for now
            delete county_data.reporting_precincts;
            delete county_data.total_precincts;

            var winner_id;
            var vote_nums_array = [];
            $.each(county_data, function(i,num){
                vote_nums_array.push(num);
            });
            var max_vote_count = Math.max.apply(null, vote_nums_array);
            $.each(county_data, function(i,num){
                if ( num == max_vote_count ){
                    winner_id = i
                }
                
            });
            return winner_id
        };




        $.each(data.races, function(index, race){
            if (race.title == "U.S. President and Vice President") {
                // First, let's populate candidate info variables
                president_candidates = populateCandidates(race.candidates);
                // Now let's update the new data var
                clear_data["president"] = refactorCounties(race.counties);
            } else {
                senate_candidates = populateCandidates(race.candidates);
                clear_data["senate"] = refactorCounties(race.counties);
            }
        });


        function createMap(container, race, moTopoCounty){
            var div = d3.select(container);
            var svg,
                path;

            svg = div.append("svg")
                .attr("width", width)
                .attr("height", height)
                .on("mouseout", function(){
                    // Clear all containers when user cursor leaves map
                    $("#infobox").find("span").text("");
                });
            
            path = d3.geoPath();
            
            path.projection(d3.geoAlbersUsa());
            
            geo = topojson.feature(moTopoCounty, moTopoCounty.objects.mo_county_slice);
            
            path.projection().fitSize([width, height], geo);

            svg.append('g')
                .attr('class', 'counties')
                .selectAll('path')
                .data(geo.features)
                .enter()
                .append("path")
                .attr("d", path)
                .style("fill", "rgba(0,0,0,0.2)")
                .style("stroke", "#fff");
         
                svg.selectAll("path")
                    .on('mouseover', function(d){

                        $("#county_name").text( d.properties.NAME );

                        if (race == "president"){
                            
                            var county_president_data = clear_data.president[d.properties.COUNTYFP];
                            var president_winner = president_candidates[ getWinnerID(county_president_data) ];
                            
                            $("#pres_candidate_name").text( president_winner.name );
                            $("#pres_party").text( president_winner.party );
                            $("#pres_votes").text( president_winner.votes );
                            $("#pres_precinct").text( county_president_data.reporting_precincts );

                        } else { //that is if race is for the senate

                            var county_senate_data = clear_data.senate[d.properties.COUNTYFP];
                            var senate_winner = senate_candidates[ getWinnerID(county_senate_data) ];

                            $("#sen_candidate_name").text( senate_winner.name );
                            $("#sen_party").text( senate_winner.party );
                            $("#sen_votes").text( senate_winner.votes );
                            $("#sen_precinct").text( county_senate_data.reporting_precincts );

                        }

                    })
                    .transition()
                    .duration(500)
                    .style("fill", function(d){
                        // #bf0000 - red
                        // #003fbf - blue

                        if (race == "president"){


                            if(clear_data.president[d.properties.COUNTYFP]){

                                var president_winner = president_candidates[ getWinnerID(clear_data.president[d.properties.COUNTYFP]) ];
                                var party = president_winner.party;

                                // If winner is Democrat
                                if (party == "Democratic") {
                                    return "#003fbf";
                                // or a Republican
                                } else if (party == "Republican") {
                                    return "#bf0000";
                                // or someone else
                                } else {
                                    return "#cfcfd1" //gray
                                }

                                
                            }

                        } else { //that is if race is for the senate

                            if(clear_data.senate[d.properties.COUNTYFP]){

                                var senate_winner = senate_candidates[ getWinnerID(clear_data.senate[d.properties.COUNTYFP]) ];
                                var senate_party = senate_winner.party;

                                // If winner is Democrat
                                if (senate_party == "Democratic") {
                                    return "#003fbf";
                                // or a Republican
                                } else if (senate_party == "Republican") {
                                    return "#bf0000";
                                // or someone else
                                } else {
                                    return "#cfcfd1" //gray
                                }


                            }

                        }

                        return "#ff0000";

                    });


        };

        d3.json('data/mo_topo_county.json', function(moTopoCounty){

            createMap("#pres_map", "president", moTopoCounty);
            createMap("#sen_map", "senate", moTopoCounty);
            
        });

    });

});