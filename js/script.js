/* global window */

(function () {
    'use strict';
    var console = window.console;
    var document = window.document;
    var requestAnimationFrame = window.requestAnimationFrame;
    var URLSearchParams = window.URLSearchParams;
    var setTimeout = window.setTimeout;
    var fetch = window.fetch;

    console.log('[Lifecycle] JavaScript loading');

    /*
     * Helper functions
     */

    var findParentWithDatasetName = function (element, datasetName) {
        var currParent;
        for (currParent = element.parentElement; currParent !== null; currParent = currParent.parentElement) {
            if (currParent.dataset[datasetName] !== undefined) {
                return currParent;
            }
        }

        return undefined;
    };

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

    var makeFullscreenPointerLockCommand = function () {
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

    var createFaceController = function (faceElement) {
        // Base config
        var defaultConfig = {
            startingFrame: 0
        };

        // KeyKey maps to look-up names
        var partNames = {};
        var emotionNames = {};

        // Current emotion of face used for all parts
        var currentEmotion;

        // Current selected frames
        // currentFrames[partName] = frameReference
        var currentFrames = {};

        // Creates a config object extending from another object
        var createAndPopulateConfig = function (element, parentConfig) {
            var config = Object.create(parentConfig);

            Object.keys(defaultConfig).forEach(function (name) {
                if (element.dataset[name] !== undefined) {
                    if (isFinite(element.dataset[name])) {
                        config[name] = parseFloat(element.dataset[name]);
                    } else {
                        config[name] = element.dataset[name];
                    }
                }
            });

            return config;
        };

        // Reference Trees
        var element = {
            // face = faceReference
            face: faceElement,
            // parts[partName] = partReference
            parts: {},
            // emotions[partName][emotionName] = emotionReference
            emotions: {},
            // frames[partName][emotionName][frameIndex] = frameReference
            frames: {}
        };

        var config = {
            // face = faceConfig
            face: createAndPopulateConfig(element.face, defaultConfig),
            // parts[partName] = partConfig
            parts: {},
            // emotions[partName][emotionName] = emotionConfig
            emotions: {},
            // frames[partName][emotionName][frameIndex] = frameConfig
            frames: {}
        };

        // This function is sketchy at best, does nothing to handle errors in dom setup
        // Also hammers the dom pretty hard with queries
        // I swear I can do this performantly, I just don't want to right now o.o
        var gatherParts = function () {
            var EMPTY_ARRAY = 0;

            console.time('[FaceController] gather parts');

            Array.prototype.slice.call(element.face.querySelectorAll('[data-part]')).forEach(function (partElement) {
                var partName = partElement.dataset.part;

                partNames[partName] = partName;

                element.parts[partName] = partElement;
                element.emotions[partName] = {};
                element.frames[partName] = {};

                config.parts[partName] = createAndPopulateConfig(partElement, config.face);
                config.emotions[partName] = {};
                config.frames[partName] = {};
            });

            Array.prototype.slice.call(element.face.querySelectorAll('[data-emotion]')).forEach(function (emotionElement) {
                var emotionName = emotionElement.dataset.emotion;
                var parentPartElement = findParentWithDatasetName(emotionElement, 'part');
                var parentPartName = parentPartElement.dataset.part;

                emotionNames[emotionName] = emotionName;

                element.emotions[parentPartName][emotionName] = emotionElement;
                element.frames[parentPartName][emotionName] = [];

                config.emotions[parentPartName][emotionName] = createAndPopulateConfig(emotionElement, config.parts[parentPartName]);
                config.frames[parentPartName][emotionName] = [];
            });

            // hehe, lol, i wonder how long this monstrosity takes ¯\_(ツ)_/¯
            Object.keys(partNames).forEach(function (partName) {
                currentFrames[partName] = undefined;

                Object.keys(emotionNames).forEach(function (emotionName) {
                    var query = '[data-part="' + partName + '"] [data-emotion="' + emotionName + '"] [data-frame]';
                    var frameElements = Array.prototype.slice.call(element.face.querySelectorAll(query));

                    if (frameElements.length === EMPTY_ARRAY) {
                        console.error('[FaceController] missing frames for part', partName, 'and emotion', emotionName);
                        return;
                    }

                    frameElements.forEach(function (frameElement) {
                        var frameIndex = frameElement.dataset.frame;
                        element.frames[partName][emotionName][frameIndex] = frameElement;
                        config.frames[partName][emotionName][frameIndex] = createAndPopulateConfig(frameElement, config.emotions[partName][emotionName]);
                    });

                    // TODO Need to verify continuity of array
                });
            });

            console.timeEnd('[FaceController] gather parts');

            console.group('FaceController] Detected pieces');
            console.log('[FaceController]: parts', Object.keys(partNames).join(', '));
            console.log('[FaceController]: emotions', Object.keys(emotionNames).join(', '));
            console.log('[FaceController]: elements', element);
            console.log('[FaceController]: config', config);
            console.groupEnd();
        };

        // Animations have a startingFrame, direction, and a cycle
        // startingFrame: 0, 1, 2, 'last'
        // cycle: 'loop' or 'reverse' //not implemented
        // direction: 'increment' or 'decrement' //not implemented
        // Animation position is a fractional completion from 0 - 1
        var setAnimationPositionForPart = function (partName, position) {
            if (partNames[partName] === undefined) {
                console.error('[FaceController] Attempting to reset invalid part', partName);
                return;
            }

            var numFrames = element.frames[partName][currentEmotion].length;
            var startIndex = config.emotions[partName][currentEmotion].startingFrame;

            if (startIndex === 'last') {
                startIndex = numFrames - 1;
            } else if (startIndex < 0 || startIndex > numFrames - 1) {
                startIndex = 0;
            }

            // Assumes loop and increment for now
            // var frameIndex = Math.floor((startIndex + ((position * numFrames) - 1)) % (numFrames - 1));
            var frameIndex = Math.floor((startIndex + ((numFrames - 1) * position)) % numFrames);
            console.log(frameIndex);
            var newFrame = element.frames[partName][currentEmotion][frameIndex];

            if (currentFrames[partName] !== newFrame) {
                if (currentFrames[partName] !== undefined) {
                    currentFrames[partName].removeAttribute('data-selected');
                }

                currentFrames[partName] = newFrame;
                currentFrames[partName].setAttribute('data-selected', 0);
            }

            // // If a current frame has not been chosen yet use a temporary one
            // if (currentFrames[partName] === undefined) {
            //     currentFrames[partName] = element.frames[partName][currentEmotion][0];
            //     currentFrames[partName].setAttribute('data-selected', '');
            // }

            // var startingFrameIndex = config.parts[partName].startingFrame;

            // var startingFrame = element.frames[partName][currentEmotion][startingFrameIndex];

            // if (currentFrames[partName] !== startingFrame) {
            //     currentFrames[partName].removeAttribute('data-selected');
            //     currentFrames[partName] = startingFrame;
            //     currentFrames[partName].setAttribute('data-selected', '');
            // }
        };

        var setFaceEmotion = function (emotionName) {
            if (emotionNames[emotionName] === undefined) {
                console.error('[FaceController] Ignoring attempt to set invalid emotion', emotionName);
                return;
            }

            if (currentEmotion === emotionName) {
                return;
            }

            currentEmotion = emotionName;
            element.face.dataset.emotion = currentEmotion;

            Object.keys(currentFrames).forEach(function (partName) {
                setAnimationPositionForPart(partName, 0.0);
            });
        };

        var setRandomFaceEmotion = function () {
            var emotionArr = Object.keys(emotionNames);
            var randomEmotionIndex = Math.round(Math.random() * (emotionArr.length - 1));
            var randomEmotion = emotionArr[randomEmotionIndex];
            setFaceEmotion(randomEmotion);
        };

        var setupInitialState = function () {
            var FIRST_EMOTION = 0;

            // Get a valid starting emotion for the face
            var faceEmotion = emotionNames[element.face.dataset.emotion];

            if (faceEmotion === undefined) {
                faceEmotion = Object.keys(emotionNames)[FIRST_EMOTION];
            }

            // Clear any selected frames
            var selectedFrames = Array.prototype.slice.call(element.face.querySelectorAll('[data-frame][data-selected]'));
            selectedFrames.forEach(function (frame) {
                frame.removeAttribute('data-selected');
            });

            // Set the initial emotion
            setFaceEmotion(faceEmotion);
        };

        gatherParts();
        setupInitialState();

        return {
            setFaceEmotion: setFaceEmotion,
            setRandomFaceEmotion: setRandomFaceEmotion,
            setAnimationPositionForPart: setAnimationPositionForPart,
            get currentEmotion () {
                return currentEmotion;
            }
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

    var createPollingHTTPConnectionManager = function (dataUrl, messageProcessor) {
        var POLLING_INTERVAL_MS = 250,
            FETCH_IMMEDIATELY_MS = 0;
        var HTTP_SUCCESS_MIN = 200,
            HTTP_SUCCESS_MAX = 299;

        var STATES = Object.freeze({
            READY: 'READY',
            RUNNING: 'RUNNING',
            STOPPING: 'STOPPING'
        });

        var state = STATES.READY;

        // Interesting, can't abort a running fetch: https://github.com/whatwg/fetch/issues/27
        var fetchData = function () {
            if (state !== STATES.RUNNING && state !== STATES.STOPPING) {
                console.error('[Fetch] Expected to be RUNNING or STOPPING but instead in following state:', state);
            }

            if (state === STATES.STOPPING) {
                state = STATES.READY;
                console.log('[Fetch] Finished stopping requests');
                return;
            }

            fetch(dataUrl).then(function (response) {
                if (response.status >= HTTP_SUCCESS_MIN && response.status <= HTTP_SUCCESS_MAX) {
                    return response;
                }
                throw new Error(response.statusText);
            }).then(function (response) {
                return response.json();
            }).then(function (message) {
                messageProcessor.processMessage(message);
                setTimeout(fetchData, POLLING_INTERVAL_MS);
            }).catch(function (error) {
                console.error('[Fetch] Request failure', error);
                setTimeout(fetchData, POLLING_INTERVAL_MS);
            });
        };

        var start = function () {
            if (state !== STATES.READY) {
                console.error('[Fetch] Cannot start requests, must be in READY state, but in state', state);
                return;
            }

            setTimeout(fetchData, FETCH_IMMEDIATELY_MS);
        };

        var stop = function () {
            if (state !== STATES.RUNNING) {
                console.error('[Fetch] Cannot stop requests, must be in RUNNING state, but in state', state);
                return;
            }

            state = STATES.STOPPING;
            console.log('[Fetch] Stopping requests');
        };

        return {
            start: start,
            stop: stop
        };
    };

    // This animation engine ignores messages and instead changes
    // faces randomly on requestAnimationFrame
    var createFaceBenchmarkAnimationEngine = function (faceController) {
        requestAnimationFrame(function randomFace () {
            faceController.setRandomFaceEmotion();
            requestAnimationFrame(randomFace);
        });
        return {
            processMessage: function () {
                // Ignore messages
            }
        };
    };

    var createSingleRandomFaceAnimationEngine = function (faceController) {
        faceController.setRandomFaceEmotion();

        return {
            processMessage: function () {
                // Ignore messages
            }
        };
    };

    var createDirectMessageAnimationEngine = function (faceController) {
        var currentEmotion = faceController.currentEmotion;
        var isTalking = false;

        faceController.setAnimationPositionForPart('mouth', 0.0);
        faceController.setAnimationPositionForPart('eyes', 0.0);

        // Would love a more advanced blinking model but this works for now:
        // between each blink is an interval of 2–10 seconds; actual rates vary by individual averaging around 10 blinks per minute in a laboratory setting
        // source: https://en.wikipedia.org/wiki/blinking

        // For now no blinking and just talk when mouth open
        requestAnimationFrame(function processAnimations () {
            faceController.setFaceEmotion(currentEmotion);

            if (isTalking) {
                faceController.setAnimationPositionForPart('mouth', 1);
            } else {
                faceController.setAnimationPositionForPart('mouth', 0);
            }

            requestAnimationFrame(processAnimations);
        });

        var processMessage = function (message) {
            isTalking = message.isTalking;
            currentEmotion = message.emotion;
        };

        return {
            processMessage: processMessage
        };
    };

    var main = function () {
        console.log('[Lifecycle] Main running');

        var DATA_ENDPOINT_URL = '/status/face';
        var searchParams = new URLSearchParams(document.location.search);

        var requestFullscreen = makeFullscreenPointerLockCommand();
        var els = findElementsById([
            'controls',
            'fullscreenButton',
            'toggleLargeFaceButton',
            'face'
        ]);

        // Data flow: connectionManager -> messageValidator -> animationEngine -> faceController
        var faceController = createFaceController(els.face);

        var animationEngine;

        if (searchParams.has('benchmark')) {
            animationEngine = createFaceBenchmarkAnimationEngine(faceController);
        } else if (searchParams.has('random')) {
            animationEngine = createSingleRandomFaceAnimationEngine(faceController);
        } else {
            animationEngine = createDirectMessageAnimationEngine(faceController);
        }

        // Helpful for debugging for now
        window.animationEngine = animationEngine;

        var messageValidator = createMessageValidator(animationEngine);
        var connectionManager = createPollingHTTPConnectionManager(DATA_ENDPOINT_URL, messageValidator);

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
