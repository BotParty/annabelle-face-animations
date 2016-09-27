/* global window */

(function () {
    'use strict';
    window.robotface.animationengine = {};

    var setTimeout = window.setTimeout;
    var requestAnimationFrame = window.requestAnimationFrame;
    var ANIMATION_ENGINE = window.robotface.animationengine;

    // This animation engine ignores messages and instead changes
    // faces randomly on requestAnimationFrame
    ANIMATION_ENGINE.createFaceBenchmarkAnimationEngine = function (faceController) {
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

    ANIMATION_ENGINE.createSingleRandomFaceAnimationEngine = function (faceController) {
        faceController.setRandomFaceEmotion();

        return {
            processMessage: function () {
                // Ignore messages
            }
        };
    };

    ANIMATION_ENGINE.createCycleAnimationEngine = function (faceController) {
        var FACE_CHANGE_PERIOD_MS = 1500;
        var emotions = faceController.getAllFaceEmotions();
        var currEmotionIndex = 0;
        var lastTime;
        var PART_ANIMATION_PERIOD_MS = 300;

        requestAnimationFrame(function advanceAnimation (currTime) {
            if (lastTime === undefined) {
                lastTime = currTime;
            }

            if (currTime - lastTime > PART_ANIMATION_PERIOD_MS) {
                lastTime = currTime;
            }

            var animationPosition = (currTime - lastTime) / PART_ANIMATION_PERIOD_MS;
            faceController.setAnimationPositionForPart('mouth', animationPosition);
            faceController.setAnimationPositionForPart('eyes', animationPosition);
            requestAnimationFrame(advanceAnimation);
        });

        setTimeout(function setNextFace () {
            faceController.setFaceEmotion(emotions[currEmotionIndex]);

            currEmotionIndex += 1;

            if (currEmotionIndex >= emotions.length) {
                currEmotionIndex = 0;
            }

            setTimeout(setNextFace, FACE_CHANGE_PERIOD_MS);
        }, FACE_CHANGE_PERIOD_MS);

        return {
            processMessage: function () {
                // Ignore messages
            }
        };
    };

    ANIMATION_ENGINE.createDirectMessageAnimationEngine = function (faceController) {
        var currentEmotion = faceController.getFaceEmotion();
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
}());
