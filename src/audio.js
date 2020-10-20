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
			( ! selector && 'string' !== typeof selector ) ||
			0 > selector.indexOf( '.' )
		) {
			this.log( 'Be sure to pass in a valid class selector. ie: \'.audio\'', 'error' );
			return;
		}

		// Set prefix for logging
		this.prefix = '@10up/Audio';

		// list of supported native audio events
		this.supportedEvents = [
			'play',
			'pause',
			'stop',
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

		// produce callbacks from supported events
		this.supportedCallbacks = this.supportedEvents.reduce( ( map, obj ) => {
			map[`on${obj}`] = null;
			return map;
		}, {} );

		// Merge settings and options
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

		// Initialize
		this.initialize( selector );
	}

	/**
	 * @function log
	 * Used to publish message types to the console when debugging
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
	 * @function uid
	 * Generate a unique id
	 *
	 * @returns {string} unique id
	 */
	uid() {
		return ( performance.now().toString( 36 )+Math.random().toString( 36 ) ).replace( /\./g,'' );
	}

	/**
	 * @function initialize
	 * Start initialization of player(s). Each player containing the selector class
	 * will pass through this initialize method.
	 *
	 * @param {string} selector - class or id
	 * @returns {null}
	 */
	initialize ( selector ) {
		const elements = document.querySelectorAll( selector );
		if ( ! elements.length ) return;
		for( let i = 0, lng = elements.length, player; i < lng; i++ ) {
			player = elements[i].querySelector( 'audio' );
			if ( ! player ) {
				this.log( 'No native <audio> element found.', 'error' );
				continue;
			}

			// add custom control buttons
			this.addCustomAudioControls( elements[i], player );

			// add listeners to allow custom controls to interface with audio
			this.addEventListenersToCustomControls( elements[i], player );

			// enable custom callbacks on supported native audio events
			this.bindCustomCallbacksToNativeAudioEvents( elements[i], player );

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
	 * Add a play button
	 * @param {object} element - custom audio element
	 */
	addPlayButton( element ) {
		this.appendTemplate( element, this.buttonFactory( 'play' ) );
	}

	/**
	 * Add a pause button
	 * @param {object} element - custom audio element
	 */
	addPauseButton( element ) {
		this.appendTemplate( element, this.buttonFactory( 'pause' ) );
	}

	/**
	 * Maybe add a volume button
	 * @param {object} element - custom audio element
	 */
	maybeAddVolumeButton( element ) {
		if( this.settings.showVolume ) {
			this.appendTemplate( element, this.volumeFactory() );
		}
	}

	/**
	 * Maybe add a stop button
	 * @param {object} element - custom audio element
	 */
	maybeAddStopButton( element ) {
		if( this.settings.showStop ) {
			this.appendTemplate( element, this.buttonFactory( 'stop' ) );
		}
	}

	/**
	 * Maybe add a mute button
	 * @param {object} element - custom audio element
	 */
	maybeAddMuteButton( element ) {
		if( this.settings.showMute ) {
			this.appendTemplate( element, this.buttonFactory( 'mute' ) );
		}
	}
	/**
	 * Maybe add timer
	 * @param {object} element - custom audio element
	 */
	maybeAddTimer( element ) {
		if( this.settings.showTimer ) {
			this.appendTemplate( element, this.timerFactory( 'currentTime' ) );
			this.appendTemplate( element, this.timerFactory( 'totalTime' ) );
		}
	}
	/**
	 * Maybe add scrubber
	 * @param {object} element - custom audio element
	 */
	maybeAddScrubber( element ) {
		if ( this.settings.showScrubber ) {
			this.appendTemplate( element, this.scrubberFactory() );
		}
	}

	/**
	 * @function addCustomAudioControls
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
	 * @function addEventListenersToCustomControls
	 * Custom controls require handlers. This delegates listeners to the main
	 * audio container that wraps the custom controls.
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - <audio> player inside of the container
	 */
	addEventListenersToCustomControls( element, player ) {
		element.addEventListener( 'click', e => {
			const action = e.target.getAttribute( 'data-player-action' );
			if (
				action &&
				this[ action ] &&
				'function' === typeof this[ action ]
			) {
				this[ action ]( player, e.target.value );
			}
		} );
	}

	/**
	 * @function bindCustomCallbacksToNativeAudioEvents
	 * Enables custom callback listeners for native audio events
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - player instance
	 */
	bindCustomCallbacksToNativeAudioEvents( element, player ) {

		// loop through supported events
		for( let i = 0, lng = this.supportedEvents.length, fn = null; i < lng; i++ ) {

			// catch timeupdate or volumechange, else business as usual
			switch( this.supportedEvents[i] ) {

					case 'timeupdate':
						fn = () => this.timeupdateHandler( element, player );
						break;

					case 'volumechange':
						fn = e => this.volumechangeHandler( element, player, e );
						break;

					default:
						fn = () => this.customCallBackHandler( `on${this.supportedEvents[i]}` )( player );
						break;
			}

			player.addEventListener(
				this.supportedEvents[i],
				fn
			);
		}
	}

	/**
	 * @function maybeInitFromStorage
	 * Used to fetch and set player instance values from local storage.
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

		// If no cache exit
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
	 * @function customCallBackHandler
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
	 * @function saveToStorage
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
	 * @function timeupdateHandler
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

		const currentTimeElement = element.querySelector( `${this.settings.className}__currentTime` );
		if( currentTimeElement ) {
			currentTimeElement.value = currentTimeFormat;
		}

		const totalTimeElement = element.querySelector( `${this.settings.className}__totalTime` );
		if( totalTimeElement ) {
			totalTimeElement.value = totalTimeFormat;
		}

		const scrubberElement = element.querySelector( `${this.settings.className}__scrubber` );
		if ( scrubberElement ) {
			scrubberElement.value = Math.floor( currentTimeInSeconds );
			scrubberElement.setAttribute( 'max', Math.floor( totalTimeInSeconds ) );
		}

		this.saveToStorage( player );

		// invoke custom callback
		this.customCallBackHandler( 'ontimeupdate', player );
		this.log( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * @function volumechangeHandler
	 * Handle the volume event
	 *
	 * @param {object} element - player instance container
	 * @param {object} player - native player instance
	 * @param {object} event - Event object
	 */
	volumechangeHandler( element, player, event ) {
		const { volume = null } = event.target;
		if ( ! volume ) return;

		// Get volume slider controller
		const volumeSlider = element.querySelector( `${this.settings.className}__volume` );
		if ( !volumeSlider ) return;
		volumeSlider.value = volume;

		// invoke custom callback
		this.customCallBackHandler( 'onvolumechange' )( player );
		this.log( `volume updated ${volume}` );
	}

	/**
	 * @function getDuration
	 * get duration of player instance
	 *
	 * @param {object} player - player instance
	 */
	getDuration( player ) {
		return player.duration;
	}

	/**
	 * @function getCurrentTime
	 * get currentTime of player instance
	 *
	 * @param {object} player - player instance
	 */
	getCurrentTime( player ) {
		return player.currentTime;
	}

	/**
	 * @function getCurrentVolume
	 * get volume of player instance
	 *
	 * @param {object} player
	 */
	getCurrentVolume( player ) {
		return player.volume;
	}

	/**
	 * @function getPaused
	 * check if player paused
	 *
	 * @param {object} player
	 */
	getPaused( player ) {
		return player.paused;
	}

	/**
	 * @function currentTime
	 * set player instance currentTime
	 *
	 * @param {object} player - player instance
	 * @param {number} value - Time in seconds to set player to
	 */
	currentTime( player, value = 0 ) {
		player.currentTime = value;
	}

	/**
	 * @function volume
	 * set player instance volume
	 *
	 * @param {object} player - player instance
	 * @param {float} value - Volume level 0.0 - 1.0
	 */
	volume( player, value = 0.5 ) {
		player.volume = value;
	}

	/**
	 * @function play
	 * play the player instance
	 *
	 * @param {object} player - player instance
	 */
	play( player ) {
		player.play();
	}

	/**
	 * @function seeking
	 * play the player instance
	 *
	 * @param {object} player - player instance
	 * @param {int} value - value from seek control
	 */
	seeking( player, value ) {
		player.currentTime = value;
	}

	/**
	 * @function pause
	 * pause the player instance
	 *
	 * @param {object} player - player instance
	 */
	pause( player ) {
		player.pause();
	}

	/**
	 * @function mute
	 * mute the player instance
	 *
	 * @param {object} player - player instance
	 */
	mute( player ) {
		player.muted = !player.muted;
	}

	/**
	 * @function stop
	 * stop the player instance
	 *
	 * @param {object} player - player instance
	 */
	stop( player ) {
		player.pause();
		this.currentTime( player, 0 );
		this.customCallBackHandler( 'onstop' )( player );
	}

	/**
	 * @function addTextTrack
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
	 * @function buttonFactory
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
		makeButton.setAttribute( 'data-player-action', tag );
		makeButton.setAttribute( 'class', `${this.settings.name}__${tag}` );

		return makeButton;
	}

	/**
	 * @function volumeFactory
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
		input.setAttribute( 'data-player-action', 'volume' );
		input.setAttribute( 'type', 'range' );
		input.setAttribute( 'min', '0' );
		input.setAttribute( 'max', '1' );
		input.setAttribute( 'step', '0.1' );
		input.setAttribute( 'value', '0.5' );
		input.setAttribute( 'class', `${this.settings.name}__volume` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings.volumeLabel );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * @function timerFactory
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
		input.setAttribute( 'class', `${this.settings.name}__${timerType}` );
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
	 * @function scrubberFactory
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
		input.setAttribute( 'data-player-action', 'seeking' );
		input.setAttribute( 'type', 'range' );
		input.setAttribute( 'min', '0' );
		input.setAttribute( 'step', '1' );
		input.setAttribute( 'class', `${this.settings.name}__scrubber` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings.scrubberLabel );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * @function appendTemplate
	 * append markup to audio controls container
	 */
	appendTemplate ( element, template ) {
		let audioContainer = element.querySelector( `${this.settings.className}__controls` );

		if ( !audioContainer ) {
			audioContainer = document.createElement( 'div' );
			audioContainer.setAttribute( 'class', `${this.settings.name}__controls` );
			element.appendChild( audioContainer );
		}

		audioContainer.appendChild( template );
	}
}
