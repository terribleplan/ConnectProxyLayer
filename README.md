ConnectProxyLayer
=================
Connect proxy layer is a piece of connect middleware that allows you to send requests on to another end server. Additionally, you can define functions for the proxy to use to modify the request in-flight. If you do not specify interceptors the proxy will simply pipe data from the input, and proxy the response.

Using Interceptors
------------------
####Header
The header interceptor allows you to determine whether the requests needs additional transformation based upon information available in the headers and URL of the request.
```js
function header(localRequest, next, proxy, pump)
```
* localRequest - The http.incomingRequest that the server recieved. Use this to read headers and URL information.
* next - The connect "next" object, used to skip this route and continue the connect chain.
* proxy - A function that takes no arguments, telling the server to "proxy" the request to allow for request modifications.
* pump - A function that takes no arguments, telling the server to pump the request directly into the remote connection.

####Input
The input interceptor is what is called to transform "Proxied" requests to the server.
```js
function input(localRequest, requestBody, localResponse, next, proxy)
```
* localRequest - The http.incomingRequest that the server recieved. Use this to read headers and URL information.
* requestBody - The string that was sent to the proxy server.
* localResponse - The http.outgoingMessage that is to be sent to the client.
* next - The connect "next" object, used to skip this route and continue the connect chain.
* proxy - A function that will execute the request to the server, this must be called like.
```js
proxy(localRequest, requestBody, localResponse, nxt);
```

####Output
The output interceptor is called to modify response data from the server before it is sent to the client.
```js
function output(remoteResponse, responseBody, localResponse, next, send)
```
* remoteResponse - The http.incomingMessage from the remote server.
* responseBody - The response string sent by the remote server.
* localResponse - The http.outgoingMessage that is to be sent to the client.
* next - The connect "next" object, used to skip this route and continue the connect chain.
* send - A function that will send the response to the client, and must be called like
```js
send(localResponse, remoteResponse, responseBody);
```

###NB
To use the "input" interceptor you must define a header interceptor and call proxy(), because the default behavior is to pump the request.

License
=======
This software is provided under a BSD 2-Clause license.
