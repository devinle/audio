'use strict';

/**
 * @module @10up/Audio
 *
 * @description
 *
 * Create an audio UI.
 *
 * @param {string} selector Element selector for audio container.
 * @param {Object} options Object of optional callbacks.
 */
export default class Audio {

	/**
	 * @function constructor
	 * Constructor method for this class.
	 *
	 * @param {string} selector - class or id
	 * @param {Object} options - options object
	 */
	constructor ( selector, options = {} ) {

		// Exit if element not provided
		if ( ! selector && 'string' !== typeof selector ) return;

		// Merge settings and options
		this.settings = {
			onPlay: null, // receives player intance
			onPause: null, // receives player intance
			onStop: null, // receives player intance
			onError: null, // receives player intance
			debug: false, // set true for console logging
			localStorage: true, // offline mode
			sessionStorage: true,  // memory mode
			...options,
		};

		// Set prefix for logging
		this.prefix = '@10up/Audio';

		// Reference local storage
		this.localStorage = this.settings.localStorage && window.localStorage || null;

		// Reference session storage
		this.sessionStorage = this.settings.sessionStorage && window.sessionStorage || null;

		// Initialize
		this.initialize( selector );
	}

	/**
	 * @function log
	 * Used to publish message types to the console when debugging
	 *
	 * @param {string} message - message for console
	 * @type {string} messageType - type of console
	 */
	log( message, messageType = 'log' ) {

		// If debugging, and console available, output message
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
	 * @function initialize
	 * Start initialization of player(s)
	 *
	 * @param {string} selector - class or id
	 * @returns {null}
	 */
	initialize ( selector ) {

		// Get all matching elements in the DOM
		const elements = document.querySelectorAll( selector );

		// If no elements found exit
		if ( ! elements ) return;

		// Loop through and setup individual players
		for( let i = 0, lng = elements.length, player; i < lng; i++ ) {

			// Destructure player element
			player = elements[i].querySelector( 'audio' );

			// If no player found skip current iteration
			if ( ! player ) {
				this.log( 'No <audio> element found.', 'error' );
				continue;
			}

			// Hide built in controls
			player.removeAttribute( 'controls' );

			let template = this.myTemplate('test');

			this.appendMarkup(elements[i], template)

			// Bind all native <audio> listeners
			this.setupNativeListeners( elements[i], player );

			// Bind custom controls
			this.bindCustomControls( elements[i], player );

			// Check if local store has history on this player
			this.maybeInitFromStorage( player );
		}
	}

	/**
	 * @function setupListeners
	 * Bind listeners to a player instance
	 *
	 * @param {Object} element - container housing <audio> player
	 * @param {Object} player - Player instance
	 */
	setupNativeListeners( element, player ) {
		player.addEventListener( 'loadstart', () => this.handleLoadStart( player ) );
		// player.addEventListener( 'ended', () => this.log( 'ended' ) );
		player.addEventListener( 'pause', () => this.handlePause( player ) );
		player.addEventListener( 'play', () => this.handlePlay( player ) );
		// player.addEventListener( 'playing', () => this.log( 'playing' ) );
		// player.addEventListener( 'progress', () => this.log( 'downloading' ) );
		// player.addEventListener( 'seeking', () => this.log( 'seeking' ) );
		// player.addEventListener( 'seeked', () => this.log( 'seeking complete' ) );
		player.addEventListener( 'timeupdate', () => this.handleTimeUpdate( player ) );
		player.addEventListener( 'volumechange', event => this.handleVolume( element, event ) );
		player.addEventListener( 'error', () => this.handleError( player ) );
	}

	/**
	 * @function maybeInitFromStorage
	 * Used to fetch player instance values from local storage.
	 *
	 * @param {Object} player - <audio> player inside of the container
	 */
	maybeInitFromStorage( player ) {

		// If no local storage exit
		if ( ! this.localStorage ) return;

		// Destructure currentSrc from player instance as key ref from storage
		const { currentSrc } = player;

		// Fetch player values from localStorage
		const cache = this.localStorage.getItem( currentSrc );

		// If no cache exit
		if ( ! cache ) return;

		// Destructure values from cache
		const {
			time = null,
			volume = null,
		} = JSON.parse( cache );

		// If time is found, set time
		if ( time ) {
			this.currentTime( player, time );
		}

		// If volume is found, set volume
		if ( volume ) {
			this.volume( player, volume );
		}
	}

	/**
	 * @function saveToStorage
	 * Used to save the player instance values to local storage.
	 *
	 * @param {Object} player - <audio> player inside of the container
	 * @returns {Object} - local storage value
	 */
	saveToStorage( player ) {

		// Destructure currentSrc from player instance as key for storage
		const { currentSrc } = player;

		// Set local storage for time, volume and paused
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
	 * @function bindCustomControls
	 * Delegates actions by listening to the player instance container
	 *
	 * @param {Object} element - container housing <audio> player
	 * @param {Object} player - <audio> player inside of the container
	 */
	bindCustomControls( element, player ) {

		// Delegate click to player container (element)
		element.addEventListener( 'click', e => {

			// Determine click action
			const action = e.target.getAttribute( 'data-action' );

			// If no action exit
			if ( ! action ) return;

			// If this class contains a method of action, run it
			if (
				this[ action ] &&
				'function' === typeof this[ action ]
			) {
				this[ action ]( player, e.target.value );
			}
		} );
	}

	/**
	 * @function handleCallback
	 * All custom callbacks pipe through here first. This normalizes a
	 * safety check to test if the method exists, and also sets up
	 * a player parameter that is provided to each custom event handler
	 *
	 * @param {string} eventName - Name of event callback to trigger
	 * @returns {function} - Callback method
	 */
	handleCallback( eventName = null ) {

		// Exit if no eventName provided
		if ( ! eventName || 'string' !== typeof eventName ) return;

		// Return
		return player =>
			(
				this.settings[ eventName ] &&
				'function' === typeof this.settings[ eventName ] &&
				this.settings[ eventName ]( player )
			);
	}

	/**
	 * @function handleTimeUpdate
	 * Handle the timeupdate event
	 *
	 * @param {Object} player - Player instance
	 */
	handleTimeUpdate( player ) {
		this.saveToStorage( player );
		this.log( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * @function handleVolume
	 * Handle the volume event
	 *
	 * @param {Object} element - Player instance container
	 * @param {Object} event - Event object
	 */
	handleVolume( element, event ) {

		// Destructure volume from event
		const { volume = null } = event.target;

		// If no volume found exit
		if ( ! volume ) return;

		// Get volume slider controller
		const volumeSlider = element.querySelector( '.audio__volume' );

		// Update its volume setting
		volumeSlider.value = volume;

		this.log( `volume updated ${volume}` );
	}

	/**
	 * @function handleLoadStart
	 * Handle the loadstart event
	 *
	 * @param {Object} player - Player instance
	 */
	handleLoadStart( player ) {
		this.log( `load started ${player}` );
	}

	/**
	 * @function handlePlay
	 * Handle the play event
	 *
	 * @param {Object} player - Player instance
	 */
	handlePlay( player ) {

		// Callback
		this.handleCallback( 'onPlay' )( player );
	}

	/**
	 * @function handlePause
	 * Handle the play event
	 *
	 * @param {Object} player - Player instance
	 */
	handlePause( player ) {

		// Callback
		this.handleCallback( 'onPause' )( player );
	}

	/**
	 * @function handleError
	 * Handle the error event
	 *
	 * @param {Object} player - Player instance
	 */
	handleError( player ) {

		// Callback
		this.handleCallback( 'onError' )( player );
	}

	/**
	 * @function getDuration
	 * GETTER: duration of player instance
	 *
	 * @param {Object} player - Player instance
	 */
	getDuration( player ) {
		return player.duration;
	}

	/**
	 * @function getCurrentTime
	 * GETTER: currentTime of player instance
	 *
	 * @param {Object} player - Player instance
	 */
	getCurrentTime( player ) {
		return player.currentTime;
	}

	/**
	 * @function getCurrentVolume
	 * GETTER: volume of player instance
	 *
	 * @param {Object} player
	 */
	getCurrentVolume( player ) {
		return player.volume;
	}

	/**
	 * @function getPaused
	 * GETTER: is player paused
	 *
	 * @param {Object} player
	 */
	getPaused( player ) {
		return player.paused;
	}

	/**
	 * @function currentTime
	 * SETTER: set player instance currentTime
	 *
	 * @param {Object} player - Player instance
	 * @param {number} value - Time in seconds to set player to
	 */
	currentTime( player, value = 0 ) {
		player.currentTime = value;
	}

	/**
	 * @function volume
	 * SETTER: set player instance volume
	 *
	 * @param {Object} player - Player instance
	 * @param {float} value - Volume level 0.0 - 1.0
	 */
	volume( player, value = 0.5 ) {
		player.volume = value;
	}

	/**
	 * @function play
	 * METHOD: play the player instance
	 *
	 * @param {Object} player - Player instance
	 */
	play( player ) {
		player.play();
	}

	/**
	 * @function pause
	 * METHOD: pause the player instance
	 *
	 * @param {Object} player - Player instance
	 */
	pause( player ) {
		player.pause();
	}

	/**
	 * @function mute
	 * METHOD: mute the player instance
	 *
	 * @param {Object} player - Player instance
	 */
	mute( player ) {

		// Toggle the muted setting
		player.muted = ! player.muted;
	}

	/**
	 * @function stop
	 * METHOD: stop the player instance
	 *
	 * @param {Object} player - Player instance
	 */
	stop( player ) {

		// Must choose pause, no stop API
		player.pause();

		// Reset time
		this.currentTime( player, 0 );

		// Custom callback handler
		this.handleCallback( 'onStop' )( player );
	}

	/**
	 * @function addTextTrack
	 * add a text track to a specified element
	 *
	 * @param {Object} player - Player instance
	 * @param {string} kind - subtitles|caption|descriptions|chapters|metadata
	 * @param {string} label - used to identify the track
	 * @param {string} language - two letter language code
	 * @returns {null}
	 */
	addTextTrack ( player, kind, label, language='en' ) {
		player.addTextTrack( kind, label, language );
	}

	/**
	 * @function myTemplate
	 * add button to controls
	 *
	 * @param {string} tag - type of button adding to the controls
	 */
	myTemplate ( tag ) {
		return `<button data-action="${tag}" class="audio__${tag}">${tag}</button>`;
	}

	/**
	 * @function appendMarkup
	 * append markup to audio controls container
	 *
	 */
	appendMarkup ( element, template ) {
		const audioContainer = element.querySelector( '.audio__controls' );
		audioContainer.appendChild(template) 
	}
}
