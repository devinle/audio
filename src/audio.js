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

		// Exit if element not provided
		if (
			( ! selector && 'string' !== typeof selector ) ||
			0 > selector.indexOf( '.' )
		) {
			this.log( 'Be sure to pass in a valid class selector. ie: \'.audio\'', 'error' );
			return;
		}

		// Set prefix for logging
		this.prefix = '@10up/Audio';

		// Merge settings and options
		this.settings = {
			className: selector,
			name: selector.replace( '.', '' ),
			playLabel: 'Play',
			stopLabel: 'Stop',
			pauseLabel: 'Pause',
			muteLabel: 'Mute',
			volumeLabel: 'Volume',
			currentTimeLabel: 'Current Time',
			totalTimeLabel: 'Total Time',
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
			showMute: true,
			showStop: true,
			showTimer: true,
			showVolume: true,
			debug: false, // set true for console logging
			localStorage: true, // offline mode
			...options,
		};

		// cache
		this.cache = {};

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
			this.addCustomControls( elements[i], player );
			this.delegateCustomControlsListeners( elements[i], player );
			this.bindCustomCallbacks( elements[i], player );
			player.addEventListener( 'loadstart', () => this.maybeInitFromStorage( player ) );
		}
	}

	/**
	 * Add a play button
	 * @param {object} element - custom audio element
	 */
	addPlayButton( element ) {
		const templatePlay = this.buttonFactory( 'play' );
		templatePlay && this.appendTemplate( element, templatePlay );
	}

	/**
	 * Add a pause button
	 * @param {object} element - custom audio element
	 */
	addPauseButton( element ) {
		const templatePause = this.buttonFactory( 'pause' );
		templatePause && this.appendTemplate( element, templatePause );
	}

	/**
	 * Maybe add a volume button
	 * @param {object} element - custom audio element
	 */
	maybeAddVolumeButton( element ) {
		if( this.settings.showVolume ) {
			const templateVolume = this.volumeFactory();
			templateVolume && this.appendTemplate( element, templateVolume );
		}
	}

	/**
	 * Maybe add a stop button
	 * @param {object} element - custom audio element
	 */
	maybeAddStopButton( element ) {
		if( this.settings.showStop ) {
			const templateStop = this.buttonFactory( 'stop' );
			templateStop && this.appendTemplate( element, templateStop );
		}
	}

	/**
	 * Maybe add a mute button
	 * @param {object} element - custom audio element
	 */
	maybeAddMuteButton( element ) {
		if( this.settings.showMute ) {
			const templateMute = this.buttonFactory( 'mute' );
			templateMute && this.appendTemplate( element, templateMute );
		}
	}
	/**
	 * Maybe add timer
	 * @param {object} element - custom audio element
	 */
	maybeAddTimer( element ) {
		if( this.settings.showTimer ) {
			const currentTimeTemplate = this.timerFactory( 'currentTime' );
			currentTimeTemplate && this.appendTemplate( element, currentTimeTemplate );

			const totalTimeTemplate = this.timerFactory( 'totalTime' );
			totalTimeTemplate && this.appendTemplate( element, totalTimeTemplate );
		}
	}

	/**
	 * @function addCustomControls
	 * Customize the UI controls of the audio player
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - Player instance
	 */
	addCustomControls( element, player ) {

		// Hide native controls
		player.removeAttribute( 'controls' );

		// Add custom controls
		this.addPlayButton( element );
		this.addPauseButton( element );
		this.maybeAddStopButton( element );
		this.maybeAddMuteButton( element );
		this.maybeAddVolumeButton( element );
		this.maybeAddTimer( element );

	}

	/**
	 * @function delegateCustomControlsListeners
	 * Delegates actions by listening to each player instance's container.
	 * If the target action method exists, invoke. This sets up the audio container
	 * as the event delegator.
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - <audio> player inside of the container
	 */
	delegateCustomControlsListeners( element, player ) {
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
	 * @function bindCustomCallbacks
	 * Bind native audio element events to custom callbacks.
	 *
	 * @param {object} element - container housing <audio> player
	 * @param {object} player - Player instance
	 */
	bindCustomCallbacks( element, player ) {

		// loop through supported events
		for( let i = 0, lng = this.supportedEvents.length, fn = null; i < lng; i++ ) {

			// catch timeupdate or volumechange, else business as usual
			switch( this.supportedEvents[i] ) {

					case 'timeupdate':
						fn = () => this.timeupdateHandler( element, player );
						break;

					case 'volumechange':
						fn = e => this.volumechangeHandler( element, e );
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
		if ( ! cache ) return;

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
	 * @function timeupdateHandler
	 * Handle the timeupdate event
	 *
	 * @param {object} element - Player container
	 * @param {object} player - Native Player instance
	 */
	timeupdateHandler( element, player ) {
		this.saveToStorage( player );

		const currentTime = this.getCurrentTime( player );
		const duration = this.getDuration( player );

		const currentTimeElement = element.querySelector( `${this.settings.className}__currentTime` );
		if ( currentTimeElement ) {
			const minutes = Math.floor( currentTime / 60 );
			const seconds = Math.floor( currentTime - minutes * 60 );
			currentTimeElement.value = `${minutes}:${seconds}`;
		}

		const totalTime = element.querySelector( `${this.settings.className}__totalTime` );
		if ( totalTime ) {
			const dMinutes = Math.floor( duration / 60 );
			const dSeconds = Math.floor( duration - dMinutes * 60 );
			totalTime.value = `${dMinutes}:${dSeconds}`;
		}

		this.customCallBackHandler( 'ontimeupdate' );
		this.log( `time updated ${this.getCurrentTime( player )}` );
	}

	/**
	 * @function volumechangeHandler
	 * Handle the volume event
	 *
	 * @param {object} element - Player instance container
	 * @param {object} event - Event object
	 */
	volumechangeHandler( element, event ) {
		const { volume = null } = event.target;
		if ( ! volume ) return;

		// Get volume slider controller
		const volumeSlider = element.querySelector( `${this.settings.className}__volume` );
		if ( !volumeSlider ) return;
		volumeSlider.value = volume;

		this.customCallBackHandler( 'onvolumechange' );
		this.log( `volume updated ${volume}` );
	}

	/**
	 * @function getDuration
	 * get duration of player instance
	 *
	 * @param {object} player - Player instance
	 */
	getDuration( player ) {
		return player.duration;
	}

	/**
	 * @function getCurrentTime
	 * get currentTime of player instance
	 *
	 * @param {object} player - Player instance
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
	 * @param {object} player - Player instance
	 * @param {number} value - Time in seconds to set player to
	 */
	currentTime( player, value = 0 ) {
		player.currentTime = value;
	}

	/**
	 * @function volume
	 * set player instance volume
	 *
	 * @param {object} player - Player instance
	 * @param {float} value - Volume level 0.0 - 1.0
	 */
	volume( player, value = 0.5 ) {
		player.volume = value;
	}

	/**
	 * @function play
	 * play the player instance
	 *
	 * @param {object} player - Player instance
	 */
	play( player ) {
		player.play();
	}

	/**
	 * @function pause
	 * pause the player instance
	 *
	 * @param {object} player - Player instance
	 */
	pause( player ) {
		player.pause();
	}

	/**
	 * @function mute
	 * mute the player instance
	 *
	 * @param {object} player - Player instance
	 */
	mute( player ) {
		if ( player.muted ) {
			this.volume( player, this.cache.volume );
			player.muted = false;
		} else {
			this.cache.volume = this.getCurrentVolume( player );
			this.volume( player, 0 );
			player.muted = true;
		}
	}

	/**
	 * @function stop
	 * stop the player instance
	 *
	 * @param {object} player - Player instance
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
	 * @param {object} player - Player instance
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
	 * @returns {object} Volume element
	 */
	timerFactory ( timerType ) {

		// generate a unique id
		const uid = `timer-${this.uid()}`;

		// build input
		const input = document.createElement( 'input' );
		input.setAttribute( 'id', uid );
		input.setAttribute( 'type', 'text' );
		input.setAttribute( 'class', `${this.settings.name}__${timerType}` );

		// build label
		const label = document.createElement( 'label' );
		const text = document.createTextNode( this.settings[`${timerType}Label`] );
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
