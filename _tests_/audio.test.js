import Audio from '../src/audio.js';

it ( 'Initializes Audio with empty defaults object', () => {
	const audioPlayer = new Audio( '.audio' );
	expect( audioPlayer.defaults ).toEqual( {} );
} );

it ( 'Initializes Audio with specified options', () => {
	const audioPlayer = new Audio( '.audio', { test: 'true' } );
	expect( audioPlayer.defaults ).toEqual( { test: 'true' } );
} );
