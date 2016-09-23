// Firebug to make it easier to debug on tablets or mobile
// Setup for local usage https://groups.google.com/forum/#!topic/firebug/2eTvxtQE7vg

// Can't figure out how to get firebug to actually install closed (it seems to ignore the option)
// so instead injecting it only if 'debug' is in the query string
(function () {
    'use strict';

    var searchParams = new URLSearchParams(document.location.search);
    
    if (searchParams.has('debug')) {
        var firebugElement = document.createElement('script');
        firebugElement.src = 'firebug-lite/build/firebug-lite.js';
        
        // Can use if okay having the script load asynchronously (might lose some console logs)
        // document.head.insertBefore(firebugElement, document.currentScript.nextSibling);

        // Have to use document.write if want to load synchronously :(
        document.write(firebugElement.outerHTML);
    }

}());