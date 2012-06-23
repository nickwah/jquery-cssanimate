/*! Copyright (c) 2012 Nicholas White (http://www.nickandjerry.com/)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Version: 1.0.0
 *
 * Requires: 1.4.3+ (might work for earlier versions)
 */


(function(jQuery) {
    // Cache the map from CSS3 to vendor-prefixed version for this browser.
    var SUPPORTED_PROP_MAP = {};
    function supported_style(prop) {
        // This function is from:
        // http://api.jquery.com/jQuery.cssHooks/

        if (SUPPORTED_PROP_MAP[prop]) return SUPPORTED_PROP_MAP[prop];
        var vendorProp, supportedProp,
        // capitalize first character of the prop to test vendor prefix
        capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
        prefixes = [ "Moz", "Webkit", "O", "ms" ],
        div = document.createElement( "div" );

        if ( prop in div.style ) {
            // browser supports standard CSS property name
            supportedProp = prop;
        } else {
            // otherwise test support for vendor-prefixed property names
            for ( var i = 0; i < prefixes.length; i++ ) {
                vendorProp = prefixes[i] + capProp;
                if ( vendorProp in div.style ) {
                    supportedProp = '-' + prefixes[i].toLowerCase() + '-' + prop;
                    break;
                }
            }
        }

        // avoid memory leak in IE
        div = null;

        // cache the mapping from css3 property to the supported name for it
        SUPPORTED_PROP_MAP[prop] = supportedProp;

        return supportedProp;
    }

    /*
     * Can be used roughly like $.fn.animate(params, options).
     */
    jQuery.fn.cssAnimate = function(params, options, opt_easing, opt_complete) {
        var transition_param = supported_style('transition');
        if (!transition_param) return this.animate(params, options);

        this.data('css_animated', 1);

        if (options && (typeof options) != 'object') {
            options = {duration: options, easing: opt_easing, complete: opt_complete};
        } else {
            options = options || {};
        }
        options.duration = options.duration || 800;
        options.easing = options.easing || 'linear';
        var duration_secs = ' ' + (options.duration / 1000) + 's ' + options.easing;
        var $obj = this;
        var css_params = {};
        var transition_attributes = [], transition_attributes_initial = [];
        for (var name in params) {
            if (!params.hasOwnProperty(name)) continue;
            var supported_name = supported_style(name);
            css_params[supported_name] = params[name];
            transition_attributes.push(supported_name + duration_secs);
            transition_attributes_initial.push(supported_name + ' 0s');
        }
        var transition_css = {};
        transition_css[transition_param] = transition_attributes_initial.join(', ');

        // We have to apply the transition params with a duration of 0s first otherwise it'll animate from 0
        $obj.css(transition_css);
        window.setTimeout(function() {
            transition_css[transition_param] = transition_attributes.join(', ');
            $obj.css(transition_css);
            $obj.css(css_params);

            var start_time = now();
            var last_time = now();
            function step_func() {
                var n = now();
                var elapsed = n - start_time, lag = n - last_time;
                if (options.step && lag > 50) {
                    last_time = n;
                    options.step.apply($obj[0], [elapsed / options.duration]);
                }
                if (elapsed < options.duration) {
                    setTimeout(step_func, 5);
                }
            }
            if (options.step) window.setTimeout(step_func, 50);

            var transition_end = 'transitionend';
            if (transition_param == '-webkit-transition') transition_end = 'webkitTransitionEnd';
            else if (transition_param == '-o-transition') transition_end = 'oTransitionEnd';
            else if (transition_param == '-ms-transition') transition_end = 'MSTransitionEnd';
            var completed = false;
            function complete() {
                // If $obj is multiple elements, we only run complete once
                if (completed) return;
                completed = true;
                transition_css[transition_param] = 'none'; // TODO preserve initial value
                $obj.css(transition_css);
                $obj.data('css_animated', null);
                if (options.complete) options.complete.apply($obj[0]);
                $obj[0].removeEventListener(transition_end, complete, true);
                $obj = null;
                transition_css = null;
                step_func = null;
                complete = null;
            }
            $obj[0].addEventListener(transition_end, complete, true);
        }, 1);
        return this;
    };

    // We overload :animated to match for both css animated and regular
    // jQuery animated elements.

    jQuery.expr.filters.animated = function( elem ) {
        if ($(elem).data('css_animated')) return true;
        return jQuery.grep(jQuery.timers, function( fn ) {
            return elem === fn.elem;
        }).length;
    };

})(jQuery);
