//Load up what we always require
var qs = require('qs'), url = require('url');

//And provide a way to pass in options and get back a piece of connect middleware
module.exports = function middleware(endpoint, header, input, output) {

    //Figure out where and how we will be sending our request
    var parsedEndpoint = (typeof endpoint === "string" ? url.parse(endpoint) : endpoint);
    var parsedPath = ((parsedEndpoint.pathname.slice(-1) === "/") ? parsedEndpoint.pathname.slice(0, -1) : parsedEndpoint.pathname.slice(-1));
    var reqLib = (parsedEndpoint.protocol === "https:") ? require('https') : require('http');

    //Make sure we maintain context and don't rely on being called with the proper one
    //Also don't use bind because it is so slow, :(
    function createProxy(context) {
        return function (localRequest, requestBody, localResponse, nxt) {
            proxy(localRequest, requestBody, localResponse, nxt, context);
        }
    }

    function sendOutput(localResponse, remoteResponse, responseBody) {
        localResponse.writeHead(remoteResponse.statusCode, remoteResponse.headers);
        localResponse.end(responseBody);
    }

    //The meat and potatoes, here is where the request will be sent to the remote server, and the response read
    function proxy(localRequest, requestBody, localResponse, nxt, context) {

        if (typeof localRequest.query === "object") {
            var parsed = url.parse(localRequest.url);
            localRequest.url = parsed.pathname + "?" + qs.stringify(localRequest.query);
        }

        var requestLocation = parsedPath + localRequest.url;
        localRequest.headers.host = parsedEndpoint.hostname;
        if (parsedEndpoint.port) {
            localRequest.headers.host += ":" + parsedEndpoint.port
        }

        var req = {
            headers: localRequest.headers,
            host: parsedEndpoint.hostname,
            port: parsedEndpoint.port,
            path: requestLocation,
            method: localRequest.method
        };

        var remoteRequest = reqLib.request(req, function (remoteResponse) {

            //Read in all of the data
            var data = "";
            remoteResponse.on('data', function (chunk) {
                data += chunk;
            });

            remoteResponse.on('error', function (err) {
                nxt(err);
            });

            remoteResponse.on('end', function () {
                delete remoteResponse.headers['content-encoding'];
                output.call(context, remoteResponse, data, localResponse, nxt, sendOutput);
            });
        });

        remoteRequest.on('error', function (err) {
            nxt(err);
        });

        remoteRequest.end(requestBody);
    }

    //Ensure that our interceptors are at least a no-op
    if (typeof header !== "function") {
        header = function header(localRequest, next, proxy, pump) {
            pump(localRequest);
        }
    }

    if (typeof input !== "function") {
        input = function input(localRequest, requestBody, localResponse, nxt, proxy) {
            proxy(localRequest, requestBody, localResponse, nxt);
        }
    }

    if (typeof output !== "function") {
        output = function output(remoteResponse, responseBody, localResponse, nxt, send) {
            send(localResponse, remoteResponse, responseBody);
        }
    }

    return function (localRequest, localResponse, next) {
        //Create a scope for the user-defined functions
        var interceptContext = {};

        header.call(interceptContext, localRequest, next, function() {
            var localBody = "";
            localRequest.on('data', function (chunk) {
                localBody += chunk;
            });

            localRequest.on('error', function (err) {
                next(err);
            });

            localRequest.on('end', function () {
                //And kick off the process with it
                delete localRequest.headers['x-requested-with'];
                delete localRequest.headers['user-agent'];
                delete localRequest.headers['accept-encoding'];
                delete localRequest.headers['accept-language'];
                delete localRequest.headers['cookie'];
                localRequest.headers['Content-Type'] = localRequest.headers['content-type'];
                delete localRequest.headers['content-type'];
                input.call(interceptContext, localRequest, localBody, localResponse, next, createProxy(interceptContext));
            });
        }, function() {
            if (typeof localRequest.query === "object") {
                var parsed = url.parse(localRequest.url);
                localRequest.url = parsed.pathname + "?" + qs.stringify(localRequest.query);
            }

            var requestLocation = parsedPath + localRequest.url;
            localRequest.headers["host"] = parsedEndpoint.hostname + ":" + parsedEndpoint.port;

            var req = {
                headers: localRequest.headers,
                host: parsedEndpoint.hostname,
                port: parsedEndpoint.port,
                path: requestLocation,
                method: localRequest.method
            };

            var remoteRequest = reqLib.request(req, function (remoteResponse) {
                //Read in all of the data
                var data = "";
                remoteResponse.on('data', function (chunk) {
                    data += chunk;
                });

                remoteResponse.on('error', function (err) {
                    next(err);
                });

                remoteResponse.on('end', function () {
                    delete remoteResponse.headers['content-encoding'];
                    output.call(interceptContext, remoteResponse, data, localResponse, next, sendOutput);
                });
            });

            remoteRequest.on('error', function (err) {
                next(err);
            });

            localRequest.pipe(remoteRequest);
        });
    }
};
