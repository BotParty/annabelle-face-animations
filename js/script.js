

(function () {
    'use strict';

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
        // frames[partName][emotionName] = [array of frame elements sorted by frame number]
        var frames = {};

        // setup tree for inheriting config
        var defaultConfig = {
            startingFrame: 0
        };

        var partNames = {};
        var emotionNames = {};

        // Face can show one emotion at a time
        var currentEmotion;

        // currentFrames[partName] = reference to current frame
        var currentFrames = {};

        var createAndPopulateRobotConfig = function (element, parentRobotConfig) {
            var robotConfig = Object.create(parentRobotConfig);

            Object.keys(defaultConfig).forEach(function (name) {
                if (element.dataset[name] !== undefined) {
                    robotConfig[name] = JSON.parse(element.dataset[name]);
                }
            });

            return robotConfig;
        };

        var setFaceEmotion = function (emotion) {
            if (emotionNames[emotion] === undefined) {
                console.error('[FaceController] Ignoring attempt to set invalid emotion', emotion);
                return;
            }

            if (currentEmotion === emotion) {
                return;
            }

            currentEmotion = emotion;
            faceElement.dataset.emotion = currentEmotion;

            Object.keys(currentFrames).forEach(function (partName) {
                resetFrameForPart(partName);
            });
        };

        var setRandomFaceEmotion = function () {
            var emotionArr = Object.keys(emotionNames);
            var randomEmotionIndex = Math.round(Math.random() * (emotionArr.length - 1));
            var randomEmotion = emotionArr[randomEmotionIndex];
            setFaceEmotion(randomEmotion);
        };

        // This function is sketchy at best, does nothing to handle errors in dom setup
        // Also hammers the dom pretty hard with queries
        // I swear I can do this performantly, I just don't want to right now o.o
        var gatherParts = function () {
            var EMPTY_ARRAY = 0;

            console.time('[FaceController] gather parts');

            Array.prototype.slice.call(faceElement.querySelectorAll('[data-part]')).forEach(function (partElement) {
                partNames[partElement.dataset.part] = partElement.dataset.part;
                partElement.robotConfig = createAndPopulateRobotConfig(partElement, faceElement.robotConfig);
            });

            Array.prototype.slice.call(faceElement.querySelectorAll('[data-emotion]')).forEach(function (emotionElement) {
                emotionNames[emotionElement.dataset.emotion] = emotionElement.dataset.emotion;

                var parentPart = findParentWithDatasetName(emotionElement, 'part');
                emotionElement.robotConfig = createAndPopulateRobotConfig(emotionElement, parentPart.robotConfig);
            });

            // hehe, lol, i wonder how long this monstrosity takes ¯\_(ツ)_/¯
            Object.keys(partNames).forEach(function (partName) {
                frames[partName] = {};
                currentFrames[partName] = undefined;

                Object.keys(emotionNames).forEach(function (emotionName) {
                    frames[partName][emotionName] = [];

                    var query = '[data-part="' + partName + '"] [data-emotion="' + emotionName + '"] [data-frame]';
                    var currFrames = Array.prototype.slice.call(faceElement.querySelectorAll(query));

                    if (currFrames.length === EMPTY_ARRAY) {
                        console.error('[FaceController] missing frames for part', partName, 'and emotion', emotionName);
                        return;
                    }

                    var parentEmotion = findParentWithDatasetName(currFrames[0], 'emotion');

                    currFrames.forEach(function (currFrame) {
                        frames[partName][emotionName][currFrame.dataset.frame] = currFrame;
                        currFrame.robotConfig = createAndPopulateRobotConfig(currFrame, parentEmotion.robotConfig);
                    });

                    // TODO Need to verify continuity of array
                });
            });

            console.timeEnd('[FaceController] gather parts');

            console.group('FaceController] Detected pieces');
            console.log('[FaceController]: parts', Object.keys(partNames).join(', '));
            console.log('[FaceController]: emotions', Object.keys(emotionNames).join(', '));
            console.log('[FaceController]: frames', frames);
            console.groupEnd();
        };

        var setupInitialState = function () {
            var FIRST_EMOTION = 0;

            // Get a valid starting emotion for the face
            var faceEmotion = emotionNames[faceElement.dataset.emotion];

            if (faceEmotion === undefined) {
                faceEmotion = Object.keys(emotionNames)[FIRST_EMOTION];
            }

            // Clear any selected frames
            var selectedFrames = Array.prototype.slice.call(faceElement.querySelectorAll('[data-frame][data-selected]'));
            selectedFrames.forEach(function (frame) {
                frame.removeAttribute('data-selected');
            });

            // Set the initial emotion
            setFaceEmotion(faceEmotion);
        };

        var resetFrameForPart = function (partName) {
            if (partNames[partName] === undefined) {
                console.error('[FaceController] Attempting to reset invalid part', partName);
                return;
            }

            // If a current frame has not been chosen yet use a temporary one
            if (currentFrames[partName] === undefined) {
                currentFrames[partName] = frames[partName][currentEmotion][0];
                currentFrames[partName].setAttribute('data-selected', '');
            }

            var startingFrameIndex = currentFrames[partName].robotConfig.startingFrame;

            if (startingFrameIndex === 'last') {
                startingFrameIndex = frames[partName][currentEmotion].length - 1;
            }

            var startingFrame = frames[partName][currentEmotion][startingFrameIndex];

            if (currentFrames[partName] !== startingFrame) {
                currentFrames[partName].removeAttribute('data-selected');
                currentFrames[partName] = startingFrame;
                currentFrames[partName].setAttribute('data-selected', '');
            }
        };

        faceElement.robotConfig = createAndPopulateRobotConfig(faceElement, defaultConfig);
        gatherParts();
        setupInitialState();

        return {
            setFaceEmotion: setFaceEmotion,
            setRandomFaceEmotion: setRandomFaceEmotion,
            resetFrameForPart: resetFrameForPart,
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

        faceController.resetFrameForPart('mouth');
        faceController.resetFrameForPart('eyes');

        // Would love a more advanced blinking model but this works for now:
        // between each blink is an interval of 2–10 seconds; actual rates vary by individual averaging around 10 blinks per minute in a laboratory setting
        // source: https://en.wikipedia.org/wiki/blinking

        // For now no blinking and just talk when mouth open
        requestAnimationFrame(function processAnimations () {
            faceController.setFaceEmotion(currentEmotion);

            if (isTalking) {
                faceController.nextFrameForPart('mouth');
            } else {
                faceController.resetFrameForPart('mouth');
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
        });

        if (searchParams.has('noconnect') === false) {
            connectionManager.start();
        }
    };

    // Start-up main after the DOM has loaded
    domReady(main);
}());
