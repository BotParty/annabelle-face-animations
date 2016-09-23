/* global window */

(function () {
    'use strict';
    var console = window.console;
    var document = window.document;
    var URLSearchParams = window.URLSearchParams;

    var FACE_CONTROLLER = window.robotface.facecontroller;
    var CONNECTION_MANAGER = window.robotface.connectionmanager;
    var ANIMATION_ENGINE = window.robotface.animationengine;

    console.log('[Lifecycle] JavaScript loading');

    /*
     * Helper functions
     */

    // Yes I know ids are added to the window object, I refuse to use them XD
    var findElementsById = function (elementNames) {
        var elements = {};

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

    var domReady = function (readyCallback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', readyCallback);
        } else {
            readyCallback();
        }
    };

    var createFullscreenPointerLockCommand = function () {
        var testElement = document.body;
        var noop = function () {
            // Intentionally left blank
        };

        var fullscreenFunction = testElement.requestFullscreen ||
            testElement.mozRequestFullScreen ||
            testElement.webkitRequestFullscreen ||
            testElement.msRequestFullscreen ||
            noop;

        var pointerlockFunction = testElement.requestPointerLock ||
            testElement.mozRequestPointerLock ||
            noop;

        if (fullscreenFunction === noop) {
            console.log('[Fullscreen] No Fullscreen API found');
        }

        if (pointerlockFunction === noop) {
            console.log('[PointerLock] No Pointer Lock API found');
        }

        return function (el) {
            fullscreenFunction.call(el);
            pointerlockFunction.call(el);
        };
    };

    var createMessageValidator = function (messageProcessor) {
        // Parses the JSON message and verifies the following fields.
        // Returns undefined if the message is invalid.
        // {
        //     "emotion": <string>,
        //     "isTalking": <boolean>
        // }
        var processMessage = function (message) {
            if (typeof message !== 'object' || message === null) {
                console.error('[Validator] Message should be an object with keys:', message);
                return;
            }

            if (typeof message.emotion !== 'string') {
                console.error('[Validator] Message has invalid emotion:', message.emotion);
                return;
            }

            if (typeof message.isTalking !== 'boolean') {
                console.error('[Validator] Message has invalid isTalking parameter:', message.isTalking);
                return;
            }

            messageProcessor.processMessage(message);
        };

        return {
            processMessage: processMessage
        };
    };

    var main = function () {
        console.log('[Lifecycle] Main running');

        var DATA_ENDPOINT_URL = '/status/face';
        var searchParams = new URLSearchParams(document.location.search);

        var requestFullscreen = createFullscreenPointerLockCommand();
        var els = findElementsById([
            'controls',
            'fullscreenButton',
            'toggleLargeFaceButton',
            'face'
        ]);

        // Data flow: connectionManager -> messageValidator -> animationEngine -> faceController
        var faceController = FACE_CONTROLLER.createFaceController(els.face);

        var animationEngine;

        if (searchParams.has('benchmark')) {
            animationEngine = ANIMATION_ENGINE.createFaceBenchmarkAnimationEngine(faceController);
        } else if (searchParams.has('random')) {
            animationEngine = ANIMATION_ENGINE.createSingleRandomFaceAnimationEngine(faceController);
        } else {
            animationEngine = ANIMATION_ENGINE.createDirectMessageAnimationEngine(faceController);
        }

        // Helpful for debugging for now
        window.animationEngine = animationEngine;

        var messageValidator = createMessageValidator(animationEngine);
        var connectionManager = CONNECTION_MANAGER.createPollingHTTPConnectionManager(DATA_ENDPOINT_URL, messageValidator);

        els.fullscreenButton.addEventListener('click', function () {
            requestFullscreen(els.face);
            els.face.classList.add('large-face');
        });

        els.toggleLargeFaceButton.addEventListener('click', function () {
            els.face.classList.toggle('large-face');
        });

        if (searchParams.has('noconnect') === false) {
            connectionManager.start();
        }
    };

    // Start-up main after the DOM has loaded
    domReady(main);
}());
