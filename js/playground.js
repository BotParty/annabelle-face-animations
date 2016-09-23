
// var domListToArray = function (domList) {
//     return Array.prototype.slice.call(domList);
// };

// var nullClear = function (vals) {
//     if (Array.isArray(vals)) {
//         return vals.map(function (val) {
//             if (val === null){
//                 return undefined;
//             }
//             return val;
//         });
//     }

//     if (vals === null) {
//         return undefined;
//     }

//     return vals;
// };


// // WebSocket Default Server Url
// var WS_DEFAULT_URL = 'ws://localhost:64526';

// // Reconnection Timeout (milliseconds)
// var RECONNECT_TIMEOUT = 250;

// var createConnectionManager = function (webSocketUrl, commandCallback) {
//     if (typeof webSocketUrl !== 'string' || typeof commandCallback !== 'function') {
//         throw new Error('[WebSocket] A websocket url and message command callback function required');
//     }

//     var socket, socketOpen, socketClose, socketError;

//     var create = function () {
//         if (socket !== undefined) {
//             console.info('[WebSocket] create already called, ignoring');
//             return;
//         }

//         console.info('[WebSocket] create', webSocketUrl);

//         socket = new WebSocket(webSocketUrl);
//         socket.addEventListener('open', socketOpen);
//         socket.addEventListener('message', commandCallback);
//         socket.addEventListener('close', socketClose);
//         socket.addEventListener('error', socketError);
//     };

//     var remove = function () {
//         console.info('[WebSocket] remove');

//         if (socket !== undefined) {
//             socket.removeEventListener('open', socketOpen);
//             socket.removeEventListener('message', commandCallback);
//             socket.removeEventListener('close', socketClose);
//             socket.removeEventListener('error', socketError);
//             socket.close();
//             socket = undefined;
//         }
//     };

//     var reconnect = function () {
//         console.info('[WebSocket] reconnect');
//         remove();
//         setTimeout(create, RECONNECT_TIMEOUT);
//     };

//     socketOpen = function (evt) {
//         console.info('[WebSocket] open', evt);
//         // No opening message
//     };

//     socketClose = function (evt) {
//         console.info('[WebSocket] close', evt);
//         reconnect();
//     };

//     socketError = function (evt) {
//         console.info('[WebSocket] error', evt);
//         reconnect();
//     };

//     var send = function (message) {
//         if (socket !== undefined) {
//             console.info('[WebSocket] Attempted to send message when no connection, ignoring');
//             return;
//         }

//         socket.send(message);
//     };

//     return {
//         send: send,
//         start: create
//     };
// };

// var validCommands = function (commands) {
//     var isValid = true;

//     if (Array.isArray(commands) === false) {
//         console.log('[Message] Expected an array of commands', commands);
//         isValid = false;
//     }

//     commands.forEach(function (command) {
//         if (typeof command.emotion !== 'string') {
//             console.log('[Message] Invalid emotion, received', command.emotion);
//             isValid = false;
//         }

//         if (typeof command.isTalking !== 'boolean') {
//             console.log('[Message] Talking state must be boolean, received:', command.isTalking);
//             isValid = false;
//         }
//     });

//     return isValid;
// };

// parse parts string
// var partsArray = faceElement.dataset.parts.match(/\S+/g);
