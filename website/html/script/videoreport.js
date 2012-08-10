(function (window, undefined) {
    var vid = document.querySelector("#videocontainer video");
    if ( !vid ) {
        return;
    }
    // The name of the video source, excluding type, using capturing parenthesis
    var video_src       = vid.getElementsByTagName("source")[0].src.match(/\/([^/]+)\.[a-z]{3,4}$/)[1],
        video_reporting = false,
        video_duration  = false,
        video_start_at  = 0,
        video_first_run = true,
        video_progress  = $("#vidprogress"),
        video_status    = wtglobal_old_status;

    // Starting video position, from global variable in inline script
    // Timeout used to remove this error:
    //     "InvalidStateError: An attempt was made to use an object that is not, or is no longer, usable"
    // TODO: Find better solution
    setTimeout( function () {
        // Can I remove video_duration or is it truly a performance saver? INVESTIGATE
        video_duration = vid.duration;
        if ( wtglobal_start_video_at > 0 && wtglobal_old_status !== "finished" ) {
            vid.currentTime = wtglobal_start_video_at;
        }
        console.log("Duration: " + video_duration);
    }, 150);
    
    // Tell old status
    var status_string = {
        begun : "Påbörjad",
        skipped : "Överhoppad",
        finished : "Färdigsedd",
        unset : "Ej påbörjad"
    };
    video_progress.html("Status för denna video: " + status_string[video_status]);

    // wtglobal_old_progressdata holds data from previous pageviews
    
    var create_report = function () {

        // Prepare an object to send via XHR to server
        var reportobj = {};
        reportobj.src       = video_src;
        reportobj.viewTotal = 0;
        reportobj.stops     = [];
        reportobj.status    = video_status;
        // Previous data
        var data  = {};
        // TODO Check that old data exists and is not corrupt
        if (
            wtglobal_old_progressdata.stops     && 
            wtglobal_old_progressdata.viewTotal && 
            wtglobal_old_progressdata.firstStop
        ) {
            data.prev = {
                stops: wtglobal_old_progressdata.stops,
                viewTotal: wtglobal_old_progressdata.viewTotal,
                firstStop: wtglobal_old_progressdata.firstStop
            };
        } else {
            data.prev = {
                stops: null,
                viewTotal: null,
                firstStop: null
            };
        }

        if ( typeof vid.played === "undefined" ) {
            video_progress.html("Kan inte mäta ditt tittande. (video.played attributet stöds inte)");

            // Keep old data in order not to accidenally set them to null
            // Code duplicated below FIXME
            reportobj.stops     = data.prev.stops;
            reportobj.viewTotal = data.prev.viewTotal;
            reportobj.firstStop = data.prev.firstStop;
            console.log("Only old data - played attribute not supported: " + JSON.stringify(reportobj));
            return reportobj;
        } else {

            // How many snippets have been watched this time?
            var snippets  = vid.played.length;

            // Has anything been played at all since page load?
            if ( !snippets ) {
                // Code duplication FIXME
	            // Keep old data in order not to accidenally set them to null
	            reportobj.stops     = data.prev.stops;
	            reportobj.viewTotal = data.prev.viewTotal;
	            reportobj.firstStop = data.prev.firstStop;
	            console.log("Only old data - no new snippets: " + JSON.stringify(reportobj));
	            return reportobj;
            }
            
            // Current stops, temporary array
            data.cur = {};
            data.cur.stops = [];
            for ( var i = 0; i < snippets; i += 1 ) {
                data.cur.stops[i] = { "start": vid.played.start(i), "end": vid.played.end(i) };
            }
            
            // Was there any old data? If not, no need to merge
            
            // si = stops index
            var si   = {};
            si.merge = 0,
            si.prev  = 0,
            si.cur   = 0;

            if ( data.prev.stops ) {
	            
	            if ( data.prev.stops[si.prev].start <= data.cur.stops[si.cur].start ) {
	                var use   = 'prev',
	                    other = 'cur';
	            } else {
	                var use   = 'cur',
	                    other = 'prev';
	            }
	            while ( si.merge < 8 && (data.prev.stops[si.prev] && data.cur.stops[si.cur]) ) {
	                console.log("Using: " + use);
	                console.log("si[cur]: " + si['cur']);
	                console.log("si[prev]: " + si['prev']);
	    
	                reportobj.stops[si.merge]       = {};
	                reportobj.stops[si.merge].start = data[use].stops[si[use]].start;
	    
	                while ( data[use].stops[si[use]].end > data[other].stops[si[other]].start - 0.2 ) {
	                    // Subtract 0.2 above to get a little margin
	                    if ( data[other].stops[si[other]].end < data[use].stops[si[use]].end ) {
	                        si[other] += 1;
	                        if ( typeof data[other].stops[si[other]] === "undefined" ) {
	                            console.log("Breaking - no more other = "+ other);
	                            break;
	                        }
	                    } else {
	                        // Switch roles, the other end is further up
	                        var temp = use;
	                        use = other;
	                        other = temp;
	                        console.log("switcherooo, use is now: " + use);
	                    }
	                }
	    
	                reportobj.stops[si.merge].end = data[use].stops[si[use]].end;
	                si.merge += 1;
	    
	                // Find next lowest start
	                si[use] += 1;
	                if ( data.prev.stops[si.prev] && data.cur.stops[si.cur] ) {
	                    if ( data.prev.stops[si.prev].start <= data.cur.stops[si.cur].start ) {
	                        var use   = 'prev',
	                            other = 'cur';
	                    } else {
	                        var use   = 'cur',
	                            other = 'prev';
	                    }
	                }
	            }
	            // Any more old stops?
	            while ( data.prev.stops[si.prev] ) {
	                console.log("adding lone prev: " + si.prev + ":" + JSON.stringify(data.prev.stops[si.prev]));
	                console.log("si.merge: " + si.merge);
	                reportobj.stops[si.merge] = data.prev.stops[si.prev];
	                si.prev  += 1;
	                si.merge += 1;
	            }
            }

            while ( data.cur.stops[si.cur] ) {
                console.log("adding lone cur: " + si.cur + ":" + JSON.stringify(data.cur.stops[si.cur]));
                console.log("si.merge: " + si.merge);
                reportobj.stops[si.merge] = data.cur.stops[si.cur];
                si.cur   += 1;
                si.merge += 1;
            }
    
            reportobj.firstStop = reportobj.stops[0].end;
            console.log("P:" + JSON.stringify(data.prev.stops));
            console.log("C:" + JSON.stringify(data.cur.stops));
            console.log("M:" + JSON.stringify(reportobj.stops));
    
            // Calculate total watch length
            for ( var i = 0; i < si.merge; i += 1 ) {
                reportobj.viewTotal += reportobj.stops[i].end - reportobj.stops[i].start;
            }
            // Less than 10 seconds left = It is finished
            if ( reportobj.viewTotal >= video_duration - 10 ) {
                video_status     = 'finished';   // Inter function communication
                reportobj.status = video_status;
                // No need to enable skip button any more
                $('#skipvid').attr("disabled", "disabled");
            }
            reportobj.percentage_complete = Math.floor(100 * reportobj.viewTotal / video_duration);
        }
        return reportobj;
    }
    
    var send_video_report = function() {
        var reportobj = create_report();
        if ( reportobj.percentage_complete ) {
            video_progress.html("Du har sett " + reportobj.percentage_complete + " % av videon");
        }
        reportdata = JSON.stringify(reportobj);
        $.post('./api/videoreport.php', { "reportdata": reportdata }, reportSuccessCallback);
        if ( video_status === "finished" ) {
	        console.log("Video finished, reporting stops");
	        video_reporting && clearInterval(video_reporting);
	        video_reporting = false;
        }
    }
    // TODO: Handle failure....
    function reportSuccessCallback(serverdata) {
        // console.log("Report received by server");
        console.log("Server status message was: " + serverdata);
    }

    $(vid).on('playing', function() {
        if ( video_first_run ) {
            video_first_run = false;
            if ( video_status === "unset" ) {
                video_status = "begun";
            }
        }
        if ( typeof vid.played !== "undefined" ) {
            // Report every 10th second
            video_reporting = setInterval(send_video_report, 4000);
        }
    });
    $(vid).on('pause', function() {
        console.log("Video paused");
        video_reporting && clearInterval(video_reporting);
        send_video_report();
        video_reporting = false;
    });
    $(vid).on('ended', function() {
        console.log("Video ended");
        video_reporting && clearInterval(video_reporting);
        send_video_report();
        video_reporting = false;
    });
    // Skip this video manually
    var manual_skip = function () {
            console.log("Skipping this video");
            $(this).attr("disabled", "disabled");
            if ( video_status === "unset" || video_status === "begun" ) {
                video_status = "skipped";
            }
            video_reporting && clearInterval(video_reporting);
            send_video_report();
            video_reporting = false;
            
            // Load next video = page reload
            window.location.reload();
    };
    if ( video_status === "unset" || video_status === "begun" ) {
        $('#skipvid').removeAttr("disabled").on('click', manual_skip);
    }
    if ( video_status === "skipped" || video_status === "finished" ) {
        $('#unskipvid').removeAttr("disabled").on('click', function () {
            console.log("Setting video as unseen");
            $(this).attr("disabled", "disabled");
            video_status = "unset";
            
            // Set all old data to nothing
            wtglobal_old_progressdata = 0;
            
            // Tell server to delete DB record
            $.post('./api/videoreport.php', { "reset": video_src }, reportSuccessCallback);
            
            // Enable skip button, but do not re-register event listener twice TODO
            $('#skipvid').removeAttr("disabled").on('click', manual_skip);
        });
    }
    
})(window);
