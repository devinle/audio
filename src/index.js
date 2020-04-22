import Audio from './audio';

if ( 'object' !== typeof window.TenUp ) {
	window.TenUp = {};
}

window.TenUp.audio = Audio;


new window.TenUp.audio( '.audio', {
	onPlay: player => console.log( 'custom play function', player ),
	onPause: player => console.log( 'custom pause function', player ),
	onStop: player => console.log( 'custom stop function', player ),
	onError: player => console.log( 'custom error function', player ),
	showStop: false,
	showMute: false,
	debug: true,
} );
