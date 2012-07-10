/*! Copyright (c) 2012 Nicholas White (http://www.nickandjerry.com/)
 * Licensed under the MIT License (see LICENSE). If the LICENSE was not
 * included along with this source code, it can be obtained via:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Version: 1.0.0
 *
 * Requires: 1.4.3+ (might work for earlier versions)
 */


(function(jQuery) {
    // Cache the map from CSS3 to vendor-prefixed version for this browser.
    var SUPPORTED_PROP_MAP = {};
    function supported_style(prop) {
        // This function is derived from:
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
     *
     * NB: I generally only use it on one dom element.  While it should work
     * when run on multiple, I'm not sure what the expected behavior of
     * step and complete callbacks will be.
     */
    jQuery.fn.cssAnimate = function(params, options, opt_easing, opt_complete) {
        var transition_param = supported_style('transition');
        if (!transition_param) return this.animate(params, options, opt_easing, opt_complete);

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
            // After the browser has had a chance to deal with any side-effects
            // from that transition, we set the real values for the transition.
            transition_css[transition_param] = transition_attributes.join(', ');
            $obj.css(transition_css);
            // And immediately set the desired CSS for the end of animation.
            $obj.css(css_params);

            var start_time = now();
            var last_time = now();
            function step_func() {
                var n = now();
                var elapsed = n - start_time, lag = n - last_time;
                if (options.step && lag > 50) {
                    last_time = n;
                    // Note: the only value passed into step() is a completion percentage
                    // This does not match the spec from jquery.animate!!
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
                $obj.unbind('stop_css_anim');
                $obj = null;
                transition_css = null;
                step_func = null;
                complete = null;
            }
            $obj[0].addEventListener(transition_end, complete, true);

            $obj.bind('stop_css_anim', function() {
                // Note that stopping will actually set the css to the final
                // state, rather than stopping at the current css state.
                transition_css[transition_param] = transition_attributes_initial.join(', ');
                $obj.css(transition_css);
            });
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

    // Overload jQuery.fn.stop to stop css animations as well as jquery ones.

    var orig_stop = jQuery.fn.stop;
    jQuery.fn.stop = function() {
        if (this.data('css_animated')) {
            this.trigger('stop_css_anim');
        }
        var args = Array.prototype.slice.apply(arguments);
        orig_stop.apply(this, args);
        return this;
    };

})(jQuery);
