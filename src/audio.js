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
	 * @param {string} selector - class
	 * @param {Object} options - options object
	 */
	constructor ( selector, options = {} ) {

		// Exit if element not provided
		if (
			( ! selector && 'string' !== typeof selector ) ||
			0 > selector.indexOf( '.' )
		) {
			this.log( 'Be sure to pass in a valid class selector. ie: \'.audio\'', 'error' );
			return;
		}

		// Merge settings and options
		this.settings = {
			className: selector,
			name: selector.replace( '.', '' ),
			labels: {
				play: 'Play',
				stop: 'Stop',
				pause: 'Pause',
				mute: 'Mute',
				volume: 'Volume',
			},
			onloadstart: null,
			onplay: null,
			onpause: null,
			onstop: null,
			onerror: null,
			onended: null,
			onplaying: null,
			onprogress: null,
			onseeking: null,
			onseeked: null,
			ontimeupdate: null,
			onvolumechange: null,
			showMute: false,
			showStop: false,
			debug: false, // set true for console logging
			localStorage: true, // offline mode
			...options,
		};

		// Set prefix for logging
		this.prefix = '@10up/Audio';

		// Reference local storage
		this.localStorage = this.settings.localStorage && window.localStorage || null;

		// list of supported native audio events
		this.supportedEvents = [
			'loadstart',
			'ended',
			'pause',
			'play',
			'playing',
			'progress',
			'seeking',
			'seeked',
			'timeupdate',
			'volumechange',
			'error'
		];

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
	 * Start initialization of player(s)
	 *
	 * @param {string} selector - class or id
	 * @returns {null}
	 */
	initialize ( selector ) {

		// Get all matching elements in the DOM
		const elements = document.querySelectorAll( selector );

		// If no elements found exit
		if ( ! elements.length ) return;

		// Loop through and setup individual players
		for( let i = 0, lng = elements.length, player; i < lng; i++ ) {

			// get required native player element
			player = elements[i].querySelector( 'audio' );

			// If no player found skip current iteration
			if ( ! player ) {
				this.log( 'No <audio> element found.', 'error' );
				continue;
			}

			// Add custom UI controls (play, pause, stop, mute, volume)
			this.addCustomControls( elements[i], player );

			// Bind handlers to the custom UI controls
			this.addCustomControlsListeners( elements[i], player );

			// Bind all native supported listeners to their associated custom callbacks
			this.bindCustomCallbacks( elements[i], player );

			// Check if local store has history on this player
			this.maybeInitFromStorage( player );
		}
	}

	/**
	 * @function addCustomControls
	 * Customize the UI controls of the audio player
	 *
	 * @param {Object} element - container housing <audio> player
	 * @param {Object} player - Player instance
	 */
	addCustomControls( element, player ) {

		// Hide built in controls
		player.removeAttribute( 'controls' );

		// Add Play
		const templatePlay = this.buttonFactory( 'play' );
		templatePlay && this.appendTemplate( element, templatePlay );

		// Add Pause
		const templatePause = this.buttonFactory( 'pause' );
		templatePause && this.appendTemplate( element, templatePause );

		// Maybe Add Stop
		if( this.settings.showStop ) {
			const templateStop = this.buttonFactory( 'stop' );
			templateStop && this.appendTemplate( element, templateStop );
		}

		// Maybe Add Mute
		if( this.settings.showMute ) {
			const templateMute = this.buttonFactory( 'mute' );
			templateMute && this.appendTemplate( element, templateMute );
		}

		// Add Volume
		const templateVolume = this.volumeFactory();
		templateVolume && this.appendTemplate( element, templateVolume );
	}

	/**
	 * @function addCustomControlsListeners
	 * Delegates actions by listening to each player instance's container
	 *
	 * @param {Object} element - container housing <audio> player
	 * @param {Object} player - <audio> player inside of the container
	 */
	addCustomControlsListeners( element, player ) {

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
	 * @function bindCustomCallbacks
	 * Bind listeners to a player instance using native audio player events
	 *
	 * @param {Object} element - container housing <audio> player
	 * @param {Object} player - Player instance
	 */
	bindCustomCallbacks( element, player ) {

		// loop through supported events
		for( let i = 0, fn = null, lng = this.supportedEvents.length; i < lng; i++ ) {

			// catch timeupdate or volumechange, else business as usual
			switch( this.supportedEvents[i] ) {

					case 'timeupdate':
						fn = () => this.timeupdateHandler( player );
						break;

					case 'volumechange':
						fn = e => this.volumechangeHandler( element, e );
						break;

					default:
						fn = () => this.customCallBackHandler( `on${this.supportedEvents[i]}` )( player );
						break;
			}

			// if function is defined, bind it
			if ( fn ) {
				player.addEventListener(
					this.supportedEvents[i],
					fn
				);
			}
		}
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
	 * @function customCallBackHandler
	 * All custom callbacks pipe through here first. This normalizes a
	 * safety check to test if the method exists, and also sets up
	 * a player parameter that is provided to each custom event handler
	 *
	 * @param {string} eventName - Name of event callback to trigger
	 * @returns {function} - Callback method (typically on<name> ie. onplay)
	 */
	customCallBackHandler( eventName = null ) {

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
	 * @function timeupdateHandler
	 * Handle the timeupdate event
	 *
	 * @param {Object} player - Player instance
	 */
	timeupdateHandler( player ) {
		this.saveToStorage( player );
		this.customCallBackHandler( 'ontimeupdate' );
		this.log( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * @function volumechangeHandler
	 * Handle the volume event
	 *
	 * @param {Object} element - Player instance container
	 * @param {Object} event - Event object
	 */
	volumechangeHandler( element, event ) {

		// Destructure volume from event
		const { volume = null } = event.target;

		// If no volume found exit
		if ( ! volume ) return;

		// Get volume slider controller
		const volumeSlider = element.querySelector( `${this.settings.className}__volume` );

		// If no volumeSlider, abandon
		if ( !volumeSlider ) return;

		// Update its volume setting
		volumeSlider.value = volume;

		this.log( `volume updated ${volume}` );
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
		this.customCallBackHandler( 'onstop' )( player );
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
	 * @function buttonFactory
	 * Build custom button controls
	 *
	 * @param {string} tag - type of button adding to the controls
	 * @returns {object} - custom button element
	 */
	buttonFactory ( tag ) {

		// just be sure the required settings exists
		if ( !this.settings.labels || !this.settings.labels[tag] ) {
			this.log( 'This plugin requires settings.labels. Be sure you have not accidentally removed the built in presets.', 'error' );
			return false;
		}

		// make button
		const makeButton = document.createElement( 'button' );

		// place label setting as label
		const text = document.createTextNode( this.settings.labels[tag] );

		// build out component
		makeButton.appendChild( text );

		// setup data-action for binding purposes
		makeButton.setAttribute( 'data-action', tag );

		// add classname BEM style
		makeButton.setAttribute( 'class', `${this.settings.name}__${tag}` );

		// return
		return makeButton;
	}

	/**
	 * @function volumeFactory
	 * build volume slider control
	 * @returns {object} Volume element
	 */
	volumeFactory () {

		// generate a unique id
		const uid = `volume-${this.uid()}`;

		// build input
		const input = document.createElement( 'input' );
		input.setAttribute( 'id', uid );
		input.setAttribute( 'data-action', 'volume' );
		input.setAttribute( 'type', 'range' );
		input.setAttribute( 'min', '0' );
		input.setAttribute( 'max', '1' );
		input.setAttribute( 'step', '0.1' );
		input.setAttribute( 'value', '0.5' );
		input.setAttribute( 'class', `${this.settings.name}__volume` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings.labels['volume'] );
		label.appendChild( text );
		label.setAttribute( 'for', uid );
		label.appendChild( input );
		return label;
	}

	/**
	 * @function appendTemplate
	 * append markup to audio controls container
	 *
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
