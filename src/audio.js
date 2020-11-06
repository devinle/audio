'use strict';

/**
 * @module @10up/Audio
 *
 * @description
 *
 * Create an audio UI.
 *
 * @param {string} selector Element selector for audio container.
 * @param {object} options Object of optional callbacks.
 */
export default class Audio {

	/**
	 * @function constructor
	 * Constructor method for this class.
	 *
	 * @param {string} selector - class
	 * @param {object} options - options object
	 */
	constructor ( selector, options = {} ) {

		// selector of class string required
		if (
			!selector ||
			'string' !== typeof selector ||
			0 !== selector.indexOf( '.' )
		) {
			this.log( 'Be sure to pass in a valid class selector. ie: \'.audio\'', 'error' );
			return;
		}

		// store className
		this.className = selector;

		// store name
		this.name = selector.replace( '.', '' );

		// Set prefix for logging
		this.prefix = '@10up/Audio';

		// list of supported native audio events used to define
		// available custom callbacks
		this.supportedNativeEvents = [
			'play',
			'pause',
			'error',
			'loadstart',
			'ended',
			'playing',
			'progress',
			'seeking',
			'seeked',
			'timeupdate',
			'volumechange',
		];

		// create available custom callbacks from supported events
		this.supportedCallbacks = this.supportedNativeEvents.reduce( ( map, obj ) => {
			map[`on${obj}`] = null;
			return map;
		}, {} );

		// merge settings and options
		this.settings = {
			className: selector,
			name: selector.replace( '.', '' ),
			playLabel: 'Play',
			stopLabel: 'Stop',
			pauseLabel: 'Pause',
			muteLabel: 'Mute',
			volumeLabel: 'Volume',
			scrubberLabel: 'Scrub Timeline',
			currentTimeLabel: 'Current Time',
			totalTimeLabel: 'Total Time',
			showMute: true,
			showStop: true,
			showTimer: true,
			showVolume: true,
			showScrubber: true,
			debug: false, // set true for console logging
			localStorage: true, // offline mode
			...this.supportedCallbacks,
			...options,
		};

		// Reference local storage
		this.localStorage = this.settings.localStorage && window.localStorage || null;

		this.initialize();
	}

	/**
	 * Logging when in debug mode
	 *
	 * @param {string} message - message for console
	 * @param {string} messageType - type of console to trigger
	 */
	log( message, messageType = 'log' ) {
		this.settings.debug &&
		window.console &&
		window.console[ messageType ] &&
		'function' === typeof window.console[ messageType ] &&
		window.console[ messageType ](
			`%c${this.prefix}:%c ${message}`,
			'background: red; color: white;',
			'background: white; color: black;'
		);
	}

	/**
	 * Generate a unique id
	 *
	 * @returns {string} unique id
	 */
	uid() {
		return ( performance.now().toString( 36 )+Math.random().toString( 36 ) ).replace( /\./g,'' );
	}

	/**
	 * initialization of player(s)–each player containing the selector class
	 * will pass through this initialize method
	 *
	 * @returns {null}
	 */
	initialize () {
		const elements = document.querySelectorAll( this.className );
		if ( ! elements.length ) return;
		for( let i = 0, lng = elements.length, player; i < lng; i++ ) {
			player = elements[i].querySelector( 'audio' );
			if ( ! player ) {
				this.log( `No native <audio> element found in element containing class: ${this.className}`, 'error' );
				continue;
			}

			// builds out the custom player in the DOM (buttons, scrubbers, etc)
			this.addCustomAudioControls( elements[i], player );

			// add listeners to custom player controls
			this.addCustomEventListeners( elements[i], player );

			// add callbacks for all supported native events
			this.addAllowedCustomCallbacks( elements[i], player );

			// fires when loading has begun
			player.addEventListener( 'loadstart', () => {

				// preset volume
				this.volume( player );

				// attempt to load from local storage
				this.maybeInitFromStorage( player );
			} );

			// fires when we know duration
			player.addEventListener( 'durationchange', () => {

				// update timing
				this.timeupdateHandler( elements[i], player );
			} );
		}
	}

	/**
	 * add a play button
	 * @param {object} element - custom audio element
	 */
	addPlayButton( element ) {
		this.appendTemplate( element, this.buttonFactory( 'play' ) );
	}

	/**
	 * add a pause button
	 * @param {object} element - custom audio element
	 */
	addPauseButton( element ) {
		this.appendTemplate( element, this.buttonFactory( 'pause' ) );
	}

	/**
	 * maybe add a volume button
	 * @param {object} element - custom audio element
	 */
	maybeAddVolumeButton( element ) {
		if( this.settings.showVolume ) {
			this.appendTemplate( element, this.volumeFactory() );
		}
	}

	/**
	 * maybe add a stop button
	 * @param {object} element - custom audio element
	 */
	maybeAddStopButton( element ) {
		if( this.settings.showStop ) {
			this.appendTemplate( element, this.buttonFactory( 'stop' ) );
		}
	}

	/**
	 * maybe add a mute button
	 * @param {object} element - custom audio element
	 */
	maybeAddMuteButton( element ) {
		if( this.settings.showMute ) {
			this.appendTemplate( element, this.buttonFactory( 'mute' ) );
		}
	}
	/**
	 * maybe add timer
	 * @param {object} element - custom audio element
	 */
	maybeAddTimer( element ) {
		if( this.settings.showTimer ) {
			this.appendTemplate( element, this.timerFactory( 'currentTime' ) );
			this.appendTemplate( element, this.timerFactory( 'totalTime' ) );
		}
	}
	/**
	 * maybe add scrubber
	 * @param {object} element - custom audio element
	 */
	maybeAddScrubber( element ) {
		if ( this.settings.showScrubber ) {
			this.appendTemplate( element, this.scrubberFactory() );
		}
	}

	/**
	 * Add custom audio controls to interface with the Audio component
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - player instance
	 */
	addCustomAudioControls( element, player ) {

		// Hide native controls
		player.removeAttribute( 'controls' );

		// Add custom controls
		this.addPlayButton( element );
		this.addPauseButton( element );
		this.maybeAddStopButton( element );
		this.maybeAddMuteButton( element );
		this.maybeAddVolumeButton( element );
		this.maybeAddTimer( element );
		this.maybeAddScrubber( element );
	}

	/**
	 * Add custom event handler to custom control event listener
	 *
	 * @param {object} event - event object
	 * @param {object} player - player instance
	 */
	addCustomEventHandler( event, player ) {
		const { target, type } = event;
		const action = target.getAttribute( `data-player-${type}` );

		if (
			action &&
			this[ action ] &&
			'function' === typeof this[ action ]
		) {
			this[ action ]( player, target.value );
		}
	}

	/**
	 * Custom controls require handlers. This delegates listeners to the main
	 * custom audio container that wraps these custom controls
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - <audio> player inside of the container
	 */
	addCustomEventListeners( element, player ) {
		element.addEventListener( 'click', e => this.addCustomEventHandler( e, player ) );
		element.addEventListener( 'change', e => this.addCustomEventHandler( e, player ) );
		element.addEventListener( 'mousedown', e => this.maybeScrubbing( e, player ) );
		element.addEventListener( 'mouseup', e => this.maybeScrubbing( e, player ) );
	}

	/**
	 * This custom player provides an API based on the supported native events.
	 * This method adds the 'on' callbacks and binds them to the supported native events
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - player instance
	 */
	addAllowedCustomCallbacks( element, player ) {

		// loop through supported events
		for( let i = 0, lng = this.supportedNativeEvents.length, fn = null; i < lng; i++ ) {

			// catch timeupdate or volumechange, else business as usual
			switch( this.supportedNativeEvents[i] ) {

					case 'timeupdate':
						// time adds required logic, then calls exposed callback
						fn = () => this.timeupdateHandler( element, player );
						break;

					case 'volumechange':
						// volumechange requires unique logic, then calls exposed callback
						fn = e => this.volumechangeHandler( element, player, e );
						break;

					default:
						fn = () => this.customCallBackHandler( `on${this.supportedNativeEvents[i]}` )( player );
						break;
			}

			// bind native event to custom callback
			player.addEventListener(
				this.supportedNativeEvents[i],
				fn
			);
		}
	}

	/**
	 * Used to fetch and set player instance values from local storage.
	 * Data is saved to the audio src key
	 *
	 * @param {object} player - <audio> player inside of the container
	 */
	maybeInitFromStorage( player ) {

		// If no local storage exit
		if ( ! this.localStorage ) return;

		// Destructure currentSrc from player instance as key ref from storage
		const { currentSrc } = player;

		// Fetch player values from localStorage
		const cache = this.localStorage.getItem( currentSrc );

		// If no cache, make initial save
		if ( ! cache ) {
			this.saveToStorage( player );
		}

		// Destructure values from cache
		const {
			time = null,
			volume = null,
			paused = null,
		} = JSON.parse( cache );

		if ( time ) {
			this.currentTime( player, time );
		}

		if ( volume ) {
			this.volume( player, volume );
		}

		if ( paused ) {
			this.pause( player );
		}
	}

	/**
	 * All custom callbacks pipe through here first. This normalizes a
	 * safety check to test if the method exists, and also sets up
	 * a player parameter that is provided to each custom event handler
	 *
	 * @param {string} eventName - Name of event callback to trigger
	 * @returns {function} - Callback method
	 */
	customCallBackHandler( eventName = null ) {

		// Exit if no eventName provided
		if ( ! eventName || 'string' !== typeof eventName ) return;

		return player =>
			(
				this.settings[ eventName ] &&
				'function' === typeof this.settings[ eventName ] &&
				this.settings[ eventName ]( player )
			);
	}

	/**
	 * Used to save the player instance values to local storage.
	 *
	 * @param {object} player - <audio> player inside of the container
	 * @returns {object} - local storage value
	 */
	saveToStorage( player ) {
		const { currentSrc } = player;
		this.localStorage.setItem(
			currentSrc,
			JSON.stringify( {
				time: this.getCurrentTime( player ),
				volume: this.getCurrentVolume( player ),
				paused: this.getPaused( player ),
			} )
		);
	}

	/**
	 * Used to calculate hours from seconds
	 * @param {int} time - seconds
	 */
	getHours( time ) {
		if ( 3600 <= time ) {
			return time / 3600;
		}
		return false;
	}

	/**
	 * Used to calculate minutes from seconds
	 * @param {int} time - seconds
	 */
	getMinutes( time ) {
		if ( 60 <= time ) {
			return time / 60;
		}
		return false;
	}

	/**
	 * Used to return time string hh:mm:ss
	 * @param {int} time - time in seconds
	 * @returns {string} - {hh:}mm:ss
	 */
	getTimeFormat( time ) {

		// initialize hours, minutes, seconds
		let hoursPassed = this.getHours( time ) || '';
		let minutesPassed;
		let secondsPassed;

		// minutes and seconds
		if ( hoursPassed ) {
			hoursPassed = `${Math.floor( hoursPassed )}:`;
			minutesPassed = Math.floor( this.getMinutes( time % 3600 ) ) || '';
			secondsPassed = Math.floor( time % 3600 % 60 );
		} else {
			minutesPassed = Math.floor( this.getMinutes( time ) ) || '';
			secondsPassed = Math.floor( time % 60 );
		}

		// prefixes '0' if required
		minutesPassed = hoursPassed ? `0${minutesPassed}` : minutesPassed;
		secondsPassed = 10 > secondsPassed ? `:0${secondsPassed}` : `:${secondsPassed}`;

		// return literal
		return `${hoursPassed}${minutesPassed}${secondsPassed}`;
	}

	/**
	 * Handle the timeupdate event
	 *
	 * @param {object} element - Player container
	 * @param {object} player - Native player instance
	 */
	timeupdateHandler( element, player ) {
		const currentTimeInSeconds = this.getCurrentTime( player );
		const currentTimeFormat = this.getTimeFormat( currentTimeInSeconds );
		const totalTimeInSeconds = this.getDuration( player );
		const totalTimeFormat = this.getTimeFormat( totalTimeInSeconds );

		const currentTimeElement = element.querySelector( `${this.className}__currentTime` );
		if( currentTimeElement ) {
			currentTimeElement.value = currentTimeFormat;
		}

		const totalTimeElement = element.querySelector( `${this.className}__totalTime` );
		if( totalTimeElement ) {
			totalTimeElement.value = totalTimeFormat;
		}

		const scrubberElement = element.querySelector( `${this.className}__scrubber` );
		if ( scrubberElement ) {
			scrubberElement.value = Math.floor( currentTimeInSeconds );
			scrubberElement.setAttribute( 'max', Math.floor( totalTimeInSeconds ) );
		}

		this.saveToStorage( player );

		// invoke custom callback
		this.customCallBackHandler( 'ontimeupdate' )( player );
		this.log( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * Handle the volume event
	 *
	 * @param {object} element - player instance container
	 * @param {object} player - native player instance
	 * @param {object} event - event object
	 */
	volumechangeHandler( element, player, event ) {
		const { volume = null } = event.target;
		if ( ! volume ) return;

		// Get volume slider controller
		const volumeSlider = element.querySelector( `${this.className}__volume` );
		if ( !volumeSlider ) return;
		volumeSlider.value = volume;

		// invoke custom callback
		this.customCallBackHandler( 'onvolumechange' )( player );
		this.log( `volume updated ${volume}` );
	}

	/**
	 * get duration of player instance
	 *
	 * @param {object} player - player instance
	 */
	getDuration( player ) {
		return player.duration;
	}

	/**
	 * get currentTime of player instance
	 *
	 * @param {object} player - player instance
	 */
	getCurrentTime( player ) {
		return player.currentTime;
	}

	/**
	 * get volume of player instance
	 *
	 * @param {object} player
	 */
	getCurrentVolume( player ) {
		return player.volume;
	}

	/**
	 * check if player paused
	 *
	 * @param {object} player
	 */
	getPaused( player ) {
		return player.paused;
	}

	/**
	 * set player instance currentTime
	 *
	 * @param {object} player - player instance
	 * @param {number} value - Time in seconds to set player to
	 */
	currentTime( player, value = 0 ) {
		player.currentTime = value;
	}

	/**
	 * set player instance volume
	 *
	 * @param {object} player - player instance
	 * @param {float} value - Volume level 0.0 - 1.0
	 */
	volume( player, value = 0.5 ) {
		player.volume = value;
	}

	/**
	 * play the player instance
	 *
	 * @param {object} player - player instance
	 */
	play( player ) {
		player.play();
	}

	/**
	 * play the player instance
	 *
	 * @param {object} player - player instance
	 * @param {int} value - value from seek control
	 */
	seeking( player, value ) {
		player.currentTime = value;
	}

	/**
	 * Scrubbing while the player is playing can fight for control
	 * of the timeline. This alleviates the concern by pausing the playback
	 * whenever scrubbing takes place, restoring playback if required.
	 *
	 * @param {object} player - player instance
	 */
	maybeScrubbing( e, player ) {
		if ( e.target.classList.contains( `${this.name}__scrubber` ) ) {
			if ( !player.paused ) {
				player.setAttribute( 'data-was-playing', true );
				player.pause();
			} else if ( player.getAttribute( 'data-was-playing' ) ) {
				player.setAttribute( 'data-was-playing', false );
				player.play();
			}
		}
	}

	/**
	 * pause the player instance
	 *
	 * @param {object} player - player instance
	 */
	pause( player ) {
		player.pause();
	}

	/**
	 * mute the player instance
	 *
	 * @param {object} player - player instance
	 */
	mute( player ) {
		player.muted = !player.muted;
	}

	/**
	 * stop the player instance, not native to the audio component
	 * and so, requires a pause, and reset to the player. As well,
	 * requires adding the callback handler
	 *
	 * @param {object} player - player instance
	 */
	stop( player ) {
		player.pause();
		this.currentTime( player, 0 );
		this.customCallBackHandler( 'onstop' )( player );
	}

	/**
	 * add a text track to a specified element
	 *
	 * @param {object} player - player instance
	 * @param {string} kind - subtitles|caption|descriptions|chapters|metadata
	 * @param {string} label - used to identify the track
	 * @param {string} language - two letter language code
	 * @returns {null}
	 */
	addTextTrack ( player, kind, label, language='en' ) {
		player.addTextTrack( kind, label, language );
	}

	/**
	 * Build custom button controls
	 *
	 * @param {string} tag - type of button adding to the controls
	 * @returns {object|false} - custom button element or false
	 */
	buttonFactory ( tag ) {
		const label = this.settings[`${tag}Label`];
		if ( !label ) {
			this.log( 'This plugin requires settings.labels. Be sure you have not accidentally removed the built in presets.', 'error' );
			return false;
		}

		const makeButton = document.createElement( 'button' );
		const text = document.createTextNode( label );
		makeButton.appendChild( text );
		makeButton.setAttribute( 'data-player-click', tag );
		makeButton.setAttribute( 'class', `${this.name}__${tag}` );

		return makeButton;
	}

	/**
	 * build volume slider control
	 *
	 * @returns {object} Volume element
	 */
	volumeFactory () {

		// generate a unique id
		const uid = `volume-${this.uid()}`;

		// build input
		const input = document.createElement( 'input' );
		input.setAttribute( 'id', uid );
		input.setAttribute( 'data-player-change', 'volume' );
		input.setAttribute( 'type', 'range' );
		input.setAttribute( 'min', '0' );
		input.setAttribute( 'max', '1' );
		input.setAttribute( 'step', '0.1' );
		input.setAttribute( 'value', '0.5' );
		input.setAttribute( 'class', `${this.name}__volume` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings.volumeLabel );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * build timer display
	 *
	 * @param {string} timerType - Current or Duration
	 * @param {int} value - default value
	 * @returns {object} Volume element
	 */
	timerFactory ( timerType, value = 0 ) {

		// generate a unique id
		const uid = `timer-${this.uid()}`;

		// build input
		const input = document.createElement( 'input' );
		input.setAttribute( 'id', uid );
		input.setAttribute( 'type', 'text' );
		input.setAttribute( 'class', `${this.name}__${timerType}` );
		input.setAttribute( 'tabindex', '-1' );
		input.value = value;

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings[`${timerType}Label`] );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * build scrubber control
	 *
	 * @returns {object} Scrubber element
	 */
	scrubberFactory() {

		// generate a unique id
		const uid = `scrubber-${this.uid()}`;

		// build input
		const input = document.createElement( 'input' );
		input.setAttribute( 'id', uid );
		input.setAttribute( 'data-player-change', 'seeking' );
		input.setAttribute( 'type', 'range' );
		input.setAttribute( 'min', '0' );
		input.setAttribute( 'step', '1' );
		input.setAttribute( 'class', `${this.name}__scrubber` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings.scrubberLabel );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * append markup to audio controls container
	 */
	appendTemplate ( element, template ) {
		let audioContainer = element.querySelector( `${this.className}__controls` );

		if ( !audioContainer ) {
			audioContainer = document.createElement( 'div' );
			audioContainer.setAttribute( 'class', `${this.name}__controls` );
			element.appendChild( audioContainer );
		}

		audioContainer.appendChild( template );
	}
}
