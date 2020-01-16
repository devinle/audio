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
	 * @param {object} options - options object
	 * @returns {null}
	 * */
	constructor ( selector, options = {} ) {

		// Exit if element not provided
		if ( ! selector && 'string' !== typeof selector ) return;

		// Merge settings and options
		this.settings = {
			onPlay: null, // receives player intance
			onPause: null, // receives player intance
			onStop: null, // receives player intance
			onError: null, // receives player intance
			console: false, // set true for console logging
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
	 * @function logError
	 * Used to publish error message to the console
	 *
	 * @param {string} message - message for console
	 * @type {string} messageType - type of console
	 */
	logMessage( message, messageType = 'log' ) {

		// If console available, output message
		if ( this.settings.console ) {
			console &&
			console[ messageType ] &&
			'function' === typeof console[ messageType ] &&
			console[ messageType ]( `${this.prefix}: ${message}` );
		}
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
		for( let i = 0, lng = elements.length; i < lng; i++ ) {

			// Destructure player element
			const player = elements[i].querySelector( 'audio' );

			if ( ! player ) {
				return this.logMessage( 'No <audio> element found.', 'error' );
			}

			// Hide build in controls
			player.removeAttribute( 'controls' );

			console.log( 'dfsdfjhsdkjhskd', player.currentSrc );

			// Bind all custom container elements
			this.setupControlsListeners( elements[i], player );

			// Bind all native <audio> listeners
			this.setupNativeListeners( player );

		}
	}

	/**
	 * @function setupListeners
	 * Bind listeners to a player instance
	 *
	 * @param {object} player - Player instance
	 */
	setupNativeListeners( player ) {
		player.addEventListener( 'loadstart', () => this.handleLoadStart( player ) );
		player.addEventListener( 'ended', () => console.log( 'ended' ) );
		player.addEventListener( 'pause', () => this.handlePause( player ) );
		player.addEventListener( 'play', () => this.handlePlay( player ) );
		player.addEventListener( 'playing', () => console.log( 'playing' ) );
		player.addEventListener( 'progress', () => console.log( 'downloading' ) );
		player.addEventListener( 'seeking', () => console.log( 'seeking' ) );
		player.addEventListener( 'seeked', () => console.log( 'seeking complete' ) );
		player.addEventListener( 'timeupdate', () => this.handleTimeUpdate( player ) );
		player.addEventListener( 'volumechange', () => console.log ( 'volume changed' ) );
		player.addEventListener( 'error', () => this.handleError( player ) );
	}

	/**
	 *
	 * @param {object} player - <audio> player inside of the container
	 */
	maybeDoStorage( player ) {
		if ( ! this.localStorage ) {
			return;
		}
		const src = player.currentSrc;
		const cache = this.localStorage.getItem( src );
		this.localStorage.setItem( src, JSON.stringify( cache ) );
		// this.logMessage( src );
	}

	/**
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
			} )
		);
	}

	/**
	 * @function setupContainerListeners
	 * Bind listeners to the player instance container
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - <audio> player inside of the container
	 */
	setupControlsListeners( element, player ) {

		// Custom Play button bindings
		const play = element.querySelector( '.audio__play' );
		if ( play ) {
			play.addEventListener( 'click', () => this.play( player ) );
		}

		// Custom Stop button bindings
		const stop = element.querySelector( '.audio__stop' );
		if ( stop ) {
			stop.addEventListener( 'click', () => this.stop( player ) );
		}

		// Custom Pause button bindings
		const pause = element.querySelector( '.audio__pause' );
		if ( pause ) {
			pause.addEventListener( 'click', () => this.pause( player ) );
		}
	}

	/**
	 * @function handleCallback
	 * Higher order function to decorate with eventName.
	 * Useful for shared callback logic.
	 *
	 * @param {string} eventName - Name of event callback to trigger
	 * @returns {function} - Callback method
	 */
	handleCallback( eventName = null ) {

		// Exit if no eventName provided
		if ( ! eventName || 'string' !== typeof eventName ) return;

		// Return
		return ( player ) => {
			if (
				this.settings[ eventName ] &&
				'function' === typeof this.settings[ eventName ]
			) {
				this.settings[ eventName ]( player );
			}
		};
	}

	/**
	 * @function handleTimeUpdate
	 * Handle the timeupdate event
	 *
	 * @param {object} player - Player instance
	 */
	handleTimeUpdate( player ) {
		this.saveToStorage( player );
		//this.logMessage( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * @function handleLoadStart
	 * Handle the loadstart event
	 *
	 * @param {object} player - Player instance
	 */
	handleLoadStart( player ) {
		this.logMessage( `load started ${player}` );
	}

	/**
	 * @function handlePlay
	 * Handle the play event
	 *
	 * @param {object} player - Player instance
	 */
	handlePlay( player ) {

		// Callback
		this.handleCallback( 'onPlay' )( player );
	}

	/**
	 * @function handlePause
	 * Handle the play event
	 *
	 * @param {object} player - Player instance
	 */
	handlePause( player ) {

		// Callback
		this.handleCallback( 'onPause' )( player );
	}

	/**
	 * @function handleError
	 * Handle the error event
	 *
	 * @param {object} player - Player instance
	 */
	handleError( player ) {

		// Callback
		this.handleCallback( 'onError' )( player );
	}

	/**
	 * @function getDuration
	 * Get the player instance duration
	 *
	 * @param {object} player - Player instance
	 */
	getDuration( player ) {
		return player.duration;
	}

	/**
	 * @function getCurrentTime
	 * Get the player instance current time
	 *
	 * @param {object} player - Player instance
	 */
	getCurrentTime( player ) {
		return player.currentTime;
	}

	/**
	 * @function setCurrentTime
	 * Set the player instance current time.
	 * Useful when stopping, to reset to 0.
	 *
	 * @param {object} player - Player instance
	 * @param {number} value - Time in seconds to set player to
	 */
	setCurrentTime( player, value = 0 ) {
		player.currentTime = value;
	}

	/**
	 *
	 * @param {object} player
	 */
	getCurrentVolume( player ) {
		return player.volume;
	}

	/**
	 * @function setVolume
	 * Set the player instance volume
	 *
	 * @param {object} player - Player instance
	 * @param {float} value - Volume level 0.0 - 1.0
	 */
	setVolume( player, value = 0.5 ) {
		player.volume = value;
	}

	/**
	 * @function play
	 * Make the player instance play
	 *
	 * @param {object} player - Player instance
	 */
	play( player ) {
		player.play();
	}

	/**
	 * @function pause
	 * Make the player instance pause
	 *
	 * @param {object} player - Player instance
	 */
	pause( player ) {
		player.pause();
	}

	/**
	 * @function stop
	 * Make the player instance stop
	 *
	 * @param {object} player - Player instance
	 */
	stop( player ) {
		player.pause();
		this.setCurrentTime( player, 0 );
		this.handleCallback( 'onStop' )( player );
	}

	/**
	 * @function addTextTrack
	 * add a text track to a specified element
	 *
	 * @param {object} player - Player instance
	 * @param {string} kind - subtitles|caption|descriptions|chapters|metadata
	 * @param {string} label - used to identify the track
	 * @param {string} language - two letter language code
	 * @returns {null}
	 */
	addTextTrack ( player, kind, label, language='en' ) {
		player.addTextTrack( kind, label, language );
	}
}
