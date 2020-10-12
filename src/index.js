import Audio from './audio';

if ( 'object' !== typeof window.TenUp ) {
	window.TenUp = {};
}

window.TenUp.audio = Audio;

new window.TenUp.audio( '.audio', {
	onplay: player => console.log( 'custom play function', player ),
	onpause: player => console.log( 'custom pause function', player ),
	onstop: player => console.log( 'custom stop function', player ),
	onerror: player => console.log( 'custom error function', player ),
	onvolumechange: player => console.log( 'custom volume function', player ),
	debug: true,
} );
