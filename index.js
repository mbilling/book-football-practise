"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var request = require("request");
var moment = require("moment");
var username = 'busterfb';
var password = 'cb292lmo';
var baseUrl = "http://" + username + ":" + password + "@api.holdsport.dk";
var userId = 482185; // buster
var targetDay = 'tuesday';
var targetTime = '05:00'; // Activity time we want to book
var checkInterval = 1;
var dayBookingOpens = 1; // sunday = 0
var jobDoneThisWeek = false;
var Get = function (options) {
    options['headers'] = {
        'Accept': 'application/json'
    };
    return new Promise(function (resolve, reject) {
        request(options, function (err, response, body) {
            if (err) {
                reject(err);
            }
            else {
                resolve(JSON.parse(body));
            }
        });
    });
};
var Post = function (options) {
    options['method'] = 'POST';
    options['headers'] = {
        'Content-Type': 'application/json'
    };
    return new Promise(function (resolve, reject) {
        request.post(options, function (err, response, body) {
            if (err) {
                reject(err);
            }
            else {
                resolve(JSON.parse(body), response);
            }
        });
    });
};
var Put = function (options) {
    options['method'] = 'PUT';
    options['headers'] = {
        'Content-Type': 'application/json'
    };
    return new Promise(function (resolve, reject) {
        request.put(options, function (err, response, body) {
            if (err) {
                reject(err);
            }
            else {
                resolve(body, response);
            }
        });
    });
};
var checkDay = function () {
    var nextCheckDate = moment().add(1, 'w');
    nextCheckDate.hour(0).minute(30).second(0);
    var nextRun = moment.duration(nextCheckDate.diff(moment()), 'milliseconds');
    var now = moment();
    if (now.day() == dayBookingOpens) {
        jobDoneThisWeek = false;
        try {
            console.log("Start check @ " + now.format('YYYY-MM-DD hh:mm:ss'));
            checkAvailableTraining();
        }
        catch (err) {
            console.log(JSON.stringify(err));
        }
    }
    if (jobDoneThisWeek) {
        var nextCheckDate_1 = moment(moment().add(1, 'w').format('YYYY-MM-DD 00:01:00'));
        nextCheckDate_1 = nextCheckDate_1.set('hour', 0).set('minute', 1).set('seconds', 0);
        var nextRun_1 = moment.duration(nextCheckDate_1, 'milliseconds');
        setTimeout(checkDay, nextRun_1);
    }
    else
        setTimeout(checkDay, checkInterval);
};
setTimeout(checkDay, checkInterval);
checkInterval = 60000;
var checkAvailableTraining = function () {
    Get({ url: baseUrl + "/v1/teams" }).then(function (result) {
        //    console.log(JSON.stringify(result));
        return Get({ url: baseUrl + "/v1/teams/" + result[0].id + "/activities" });
    }).then(function (activities) {
        var foundActivities = 0;
        var signedActivities = 0;
        for (var i = 0; i < activities.length; i++) {
            var result = investigateActivity(activities[i]);
            foundActivities += result.foundActivities;
            signedActivities += result.signedActivities;
        }
        console.log("Found " + foundActivities + " and signed up to " + signedActivities);
    }, function (reason) {
        console.log(JSON.stringify(reason));
    });
};
var investigateActivity = function (activity) {
    var foundActivities = 0, signedActivities = 0, startMoment = moment(activity.starttime).format('YYYY-MM-DD hh:mm');
    if (activity.event_type_id == 2 && activity.name.toLowerCase().indexOf(' u6 ') != -1) {
        foundActivities++;
        if (activity.actions.length > 0) {
            for (var j = 0; j < activity.actions.length; j++) {
                var action = activity.actions[j];
                if (moment(activity.starttime).format('hh:mm') == targetTime && action.activities_user && action.activities_user.name.toLowerCase() == 'tilmeld') {
                    // tilmeld os hvis det er den tidligere træning tirsdag :)
                    signedActivities++;
                    delete action.activities_user.name;
                    signupActivity(activity.action_path, JSON.stringify(action)).then(function (result, response) {
                        if (response.status == 201)
                            console.log(JSON.stringify(activity.name) + " @ " + startMoment + " blev booket");
                        else
                            console.log(JSON.stringify(activity.name) + " " + JSON.stringify(response));
                    });
                }
            }
        }
    }
    if (signedActivities > 0) {
        jobDoneThisWeek = true;
    }
    return {
        foundActivities: foundActivities,
        signedActivities: signedActivities
    };
};
var signupActivity = function (path, action) {
    return Put({ url: "" + baseUrl + path, body: action });
};
//# sourceMappingURL=index.js.map