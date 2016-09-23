

(function () {
    'use strict';
    console.log('script running');
    
    var findElementsById = function (elementNames) {
        var elements = {
        };

        elementNames.forEach(function (elementName) {
            var queryResult = document.getElementById(elementName);
            if (queryResult === null) {
                console.log('Cannot find element with name', elementName);
            } else {
                elements[elementName] = queryResult;
            }
        });

        return elements;
    };

    var domReady = function (fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    };

    var makeFullscreenPointerLockCommand = function () {
        var testElement = document.body;
        var noop = function () {};
        
        var fullscreenFunction = testElement.requestFullscreen ||
            testElement.mozRequestFullScreen ||
            testElement.webkitRequestFullscreen ||
            testElement.msRequestFullscreen ||
            noop;

        if (fullscreenFunction === noop) {
            console.log('[Fullscreen] No API found');
        }

        var pointerlockFunction = testElement.requestPointerLock ||
            testElement.mozRequestPointerLock ||
            noop;

        if (pointerlockFunction === noop) {
            console.log('[PointerLock] No API found');
        }

        return function (el) {
            fullscreenFunction.call(el);
            pointerlockFunction.call(el);
        };
    };


    /*
    {
        "emotion": "angry" / "sad",
        "isTalking": true / false
    }
    */
    // var validateCommandMessage = function (message) {
    //     if (typeof message.emotion !== 'string') {
    //         console.log('[WebSocket:Message] Invalid emotion, received', message.emotion);
    //     }

    //     if (typeof message.isTalking !== 'boolean') {
    //         console.log('[WebSocket:Message] Talking state must be boolean, received:', message.isTalking);
    //     }
    // };

    // var parseCommandMessage = function (evt) {
    //     var data;

    //     try {
    //         data = JSON.parse(evt.data);
    //     } catch (err) {
    //         console.log('[WebSocket:Message] Could not parse JSON, ignoring. Error message:', err);
    //         return;
    //     }

    //     validateCommandMessage(data);
    // };

    // var createConnectionManager = function (webSocketUrl, commandCallback) {
    //     fetch('/status/face').then(commandCallback).then
    //     var getState = function () {

    //     };

    //     return {
    //         start: start
    //     };
    // };

    var main = function () {
        console.log('page started');

        var requestFullscreen = makeFullscreenPointerLockCommand();
        var els = findElementsById([
            'controls',
            'fullscreenButton',
            'face'
        ]);

        // var connectionManager = createConnectionManager(WS_DEFAULT_URL, parseCommandMessage);

        els.fullscreenButton.addEventListener('click', function () {
            requestFullscreen(els.face);
        });

        // connectionManager.start();
    };

    domReady(main);
}());