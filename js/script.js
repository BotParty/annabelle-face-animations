

(function () {
    'use strict';

    console.log('[Lifecycle] JavaScript loading');

    /*
     * Helper functions
     */
    
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
        if (document.readyState !== 'loading') {
            readyCallback();
        } else {
            document.addEventListener('DOMContentLoaded', readyCallback);
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
        var partNames = {};
        var emotionNames = {};

        // structure: frames.part.emotion = [array of frame elements sorted by frame number]
        var frames = {};

        // Face can show one emotion for now
        var currentEmotion;

        // structure: currentFrames.part = frame reference
        var currentFrames = {};

        var setFaceEmotion = function (emotion) {
            var STARTING_FRAME = 0;

            if (emotionNames[emotion] === undefined) {
                console.error('[FaceController] Ignoring attempt to set invalid emotion', emotion);
                return;
            }

            currentEmotion = emotion;

            Object.keys(currentFrames).forEach(function (partName) {
                if (currentFrames[partName] !== undefined) {
                    currentFrames[partName].removeAttribute('data-selected');
                }

                currentFrames[partName] = frames[partName][currentEmotion][STARTING_FRAME];

                if (currentFrames[partName] !== undefined) {
                    currentFrames[partName].setAttribute('data-selected', '');
                }
            });
        };

        var setFaceRandomEmotion = function () {
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

            Array.prototype.slice.call(faceElement.querySelectorAll('[data-part]')).forEach(function (el) {
                partNames[el.dataset.part] = el.dataset.part;
            });
            
            Array.prototype.slice.call(faceElement.querySelectorAll('[data-emotion]')).forEach(function (el) {
                emotionNames[el.dataset.emotion] = el.dataset.emotion;
            });

            // hehe, lol, i wonder how long this monstrosity takes ¯\_(ツ)_/¯
            Object.keys(partNames).forEach(function (partName) {
                frames[partName] = {};
                currentFrames[partName] = undefined;

                Object.keys(emotionNames).forEach(function (emotionName) {
                    frames[partName][emotionName] = [];

                    var query = '[data-part="' + partName + '"] [data-emotion="' + emotionName + '"][data-frame]';
                    var currFrames = Array.prototype.slice.call(faceElement.querySelectorAll(query));

                    if (currFrames.length === EMPTY_ARRAY) {
                        console.error('[FaceController] missing frames for part', partName, 'and emotion', emotionName);
                    }

                    currFrames.forEach(function (currFrame) {
                        frames[partName][emotionName][currFrame.dataset.frame] = currFrame;
                    });
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
                faceEmotion = emotionNames[FIRST_EMOTION];
            }

            currentEmotion = faceEmotion;
            faceElement.dataset.emotion = currentEmotion;

            // Clear any selected frames
            var selectedFrames = Array.prototype.slice.call(faceElement.querySelectorAll('[data-frame][data-selected]'));
            selectedFrames.forEach(function (frame) {
                frame.removeAttribute('data-selected');
            });

            // Set the initial emotion
            setFaceEmotion(currentEmotion);
        };

        gatherParts();
        setupInitialState();

        return {
            setFaceEmotion: setFaceEmotion,
            setFaceRandomEmotion: setFaceRandomEmotion
        };
    };

    var createMessageProcessor = function () {
        // Message format is a JSON string representing the following:
        /*
        {
            "emotion": "angry" / "sad",
            "isTalking": true / false
        }
        */
        var parseCommandMessage = function (message) {
            var command;

            try {
                command = JSON.parse(message);
            } catch (err) {
                console.log('[Message] Could not parse JSON, ignoring. Error message:', err);
                return undefined;
            }

            if (typeof command.emotion !== 'string') {
                console.log('[Message] Command has invalid emotion:', command.emotion);
                return undefined;
            }

            if (typeof command.isTalking !== 'boolean') {
                console.log('[Message] Command has invalid isTalking parameter:', command.isTalking);
                return undefined;
            }

            return command;
        };

        var processMessage = function (message) {
            var command = parseCommandMessage(message);

            if (command === undefined) {
                return;
            }


        };

        return processMessage;
    };

    var createPollingHTTPConnectionManager = function (dataUrl, messageCallback) {
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
                return response.text();
            }).then(function (data) {
                messageCallback(data);
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

        var faceController = createFaceController(els.face);
        var messageProcessor = createMessageProcessor();
        var connectionManager = createPollingHTTPConnectionManager(DATA_ENDPOINT_URL, messageProcessor);

        els.fullscreenButton.addEventListener('click', function () {
            requestFullscreen(els.face);
        });

        if (searchParams.has('noconnect') === false) {
            connectionManager.start();
        }

        requestAnimationFrame(function setRandomFace () {
            faceController.setFaceRandomEmotion();
            requestAnimationFrame(setRandomFace);
        });
    };

    // Start-up main after the DOM has loaded
    domReady(main);
}());