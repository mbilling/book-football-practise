import * as request from 'request';
import * as moment from 'moment';
import * as repl from 'repl';
declare var Promise;

let username = 'busterfb';
let password = 'cb292lmo'
let baseUrl = `http://${username}:${password}@api.holdsport.dk`;

let userId = 482185; // buster
let targetDay = 'tuesday';
let targetTime = '05:00';       // Activity time we want to book
let checkInterval = 1;
let dayBookingOpens = 1;        // sunday = 0
let jobDoneThisWeek = false;

let Get = (options) => {
    options['headers'] = {
        'Accept': 'application/json'
    }
    return new Promise((resolve, reject) => {
        request(options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body));
            }
        })
    });
}

let Post = (options) => {
    options['method'] = 'POST';
    options['headers'] = {
        'Content-Type': 'application/json'
    }
    return new Promise((resolve, reject) => {
        request.post(options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(body), response);
            }
        })
    });
}

let Put = (options) => {
    options['method'] = 'PUT';
    options['headers'] = {
        'Content-Type': 'application/json'
    }
    return new Promise((resolve, reject) => {
        request.put(options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body, response);
            }
        })
    });
}


let checkDay = () => {

    let nextCheckDate = moment().add(1, 'w');
    nextCheckDate.hour(0).minute(30).second(0);
    let nextRun = moment.duration(nextCheckDate.diff(moment()), 'milliseconds');
    let now = moment();
    if (now.day() == dayBookingOpens) {    // 1 = monday
        jobDoneThisWeek = false;
        try {
            console.log(`Start check @ ${now.format('YYYY-MM-DD hh:mm:ss')}`);
            checkAvailableTraining();
        }
        catch (err) {
            console.log(JSON.stringify(err));
        }
    }
    if (jobDoneThisWeek) {
        let nextCheckDate = moment(moment().add(1, 'w').format('YYYY-MM-DD 00:01:00'));
        nextCheckDate = nextCheckDate.set('hour', 0).set('minute', 1).set('seconds', 0);
        let nextRun = moment.duration(nextCheckDate, 'milliseconds');
        setTimeout(checkDay, nextRun);
    } else
        setTimeout(checkDay, checkInterval);
}
setTimeout(checkDay, checkInterval);
checkInterval = 60000;

let checkAvailableTraining = () => {
    Get({ url: `${baseUrl}/v1/teams` }).then((result) => {
        //    console.log(JSON.stringify(result));
        return Get({ url: `${baseUrl}/v1/teams/${result[0].id}/activities` })
    }).then((activities: any) => {

        let foundActivities = 0;
        let signedActivities = 0;
        for (var i = 0; i < activities.length; i++) {
            let result = investigateActivity(activities[i]);
            foundActivities += result.foundActivities;
            signedActivities += result.signedActivities;
        }
        console.log(`Found ${foundActivities} and signed up to ${signedActivities}`)

    }, (reason) => {
        console.log(JSON.stringify(reason));
    })
}

let investigateActivity = (activity) => {
    let foundActivities = 0,
        signedActivities = 0,
        startMoment = moment(activity.starttime).format('YYYY-MM-DD hh:mm');

    if (activity.event_type_id == 2 && activity.name.toLowerCase().indexOf(' u6 ') != -1) { // 2 = Træning
        foundActivities++;
        if (activity.actions.length > 0) {
            for (let j = 0; j < activity.actions.length; j++) {
                let action = activity.actions[j];
                if (moment(activity.starttime).format('hh:mm') == targetTime && action.activities_user && action.activities_user.name.toLowerCase() == 'tilmeld') {
                    // tilmeld os hvis det er den tidligere træning tirsdag :)
                    signedActivities++;
                    delete action.activities_user.name;
                    signupActivity(activity.action_path, JSON.stringify(action)).then((result, response) => {
                        if(response.status == 201)
                            console.log(`${JSON.stringify(activity.name)} @ ${startMoment} blev booket`);
                        else
                            console.log(`${JSON.stringify(activity.name)} ${JSON.stringify(response)}`)
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
    }
}

let signupActivity = (path, action) => {

    return Put({ url: `${baseUrl}${path}`, body: action });
}

